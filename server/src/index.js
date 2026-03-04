import cors from 'cors';
import express from 'express';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { startBruteforceAttack, startDictionaryAttack, startHybridAttack } from './hashcatRunner.js';
import { buildMask, identifyHashType, scorePassword } from './securityTools.js';

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const DEFAULT_WORDLIST_PATH = process.env.WORDLIST_PATH || '/opt/wordlists/rockyou.txt';
const HC22000_REGEX = /^WPA\*(01|02)\*/i;
const WORDLIST_PRESETS = {
  rockyou_sample: process.env.WORDLIST_ROCKYOU_SAMPLE_PATH || '/opt/wordlists/rockyou_sample.txt',
  rockyou: process.env.WORDLIST_ROCKYOU_PATH || DEFAULT_WORDLIST_PATH,
  top_100k: process.env.WORDLIST_TOP_100K_PATH || '/opt/wordlists/top-100k.txt',
  probable_v2: process.env.WORDLIST_PROBABLE_V2_PATH || '/opt/wordlists/probable-v2-top1575.txt',
  wifi_defaults: process.env.WORDLIST_WIFI_DEFAULTS_PATH || '/opt/wordlists/wifi-defaults.txt'
};

if (process.env.WORDLIST_PRESETS_JSON) {
  try {
    const parsed = JSON.parse(process.env.WORDLIST_PRESETS_JSON);
    if (parsed && typeof parsed === 'object') {
      Object.assign(WORDLIST_PRESETS, parsed);
    }
  } catch (error) {
    console.warn('[wordlists] Failed to parse WORDLIST_PRESETS_JSON:', error.message);
  }
}

function resolveWordlistPath({ wordlistKey, wordlistPath }) {
  if (wordlistPath) {
    return wordlistPath;
  }

  if (wordlistKey && WORDLIST_PRESETS[wordlistKey]) {
    return WORDLIST_PRESETS[wordlistKey];
  }

  return DEFAULT_WORDLIST_PATH;
}

async function resolveExistingWordlist({ wordlistKey, wordlistPath }) {
  const requestedPath = resolveWordlistPath({ wordlistKey, wordlistPath });

  try {
    await fs.access(requestedPath);
    return {
      requestedPath,
      resolvedPath: requestedPath,
      fallbackUsed: false
    };
  } catch {
    // Fall back to default path when a selected preset path is unavailable.
  }

  if (requestedPath !== DEFAULT_WORDLIST_PATH) {
    try {
      await fs.access(DEFAULT_WORDLIST_PATH);
      return {
        requestedPath,
        resolvedPath: DEFAULT_WORDLIST_PATH,
        fallbackUsed: true
      };
    } catch {
      // Continue to hard failure below.
    }
  }

  return {
    requestedPath,
    resolvedPath: null,
    fallbackUsed: false
  };
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const jobs = new Map();
const controllers = new Map();

function isValidHc22000Hash(hashValue) {
  return typeof hashValue === 'string' && HC22000_REGEX.test(hashValue.trim());
}

function getJob(jobId) {
  return jobs.get(jobId);
}

function updateJob(jobId, patch) {
  const current = jobs.get(jobId);
  if (!current) return;

  jobs.set(jobId, {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  });
}

function appendJobLog(jobId, entry) {
  const current = jobs.get(jobId);
  if (!current) return;

  const nextLogs = [...current.logs, {
    ...entry,
    timestamp: new Date().toISOString()
  }].slice(-120);

  jobs.set(jobId, {
    ...current,
    logs: nextLogs,
    updatedAt: new Date().toISOString()
  });
}

app.get('/api/health', async (_req, res) => {
  const info = {
    status: 'ok',
    engine: 'real-hashcat',
    defaultWordlistPath: DEFAULT_WORDLIST_PATH,
    wordlistPresets: WORDLIST_PRESETS,
    time: new Date().toISOString()
  };

  try {
    await fs.access(DEFAULT_WORDLIST_PATH);
    info.wordlistReady = true;
  } catch {
    info.wordlistReady = false;
  }

  res.json(info);
});

app.post('/api/jobs', async (req, res) => {
  const VALID_ATTACK_MODES = ['dictionary', 'bruteforce', 'hybrid'];
  const {
    hashId,
    hash,
    hashMode = 22000,
    attackMode = 'dictionary',
    wordlistKey,
    wordlistPath,
    mask
  } = req.body || {};

  const normalizedHash = typeof hash === 'string' ? hash.trim() : '';

  if (!hashId || !normalizedHash) {
    return res.status(400).json({ message: 'hashId and hash are required.' });
  }

  if (!isValidHc22000Hash(normalizedHash)) {
    return res.status(400).json({
      message: 'Invalid hash format. Expected hc22000 line starting with WPA*01* or WPA*02*.'
    });
  }

  if (Number(hashMode) !== 22000) {
    return res.status(400).json({
      message: 'Real backend currently supports hash mode 22000 only.'
    });
  }

  if (!VALID_ATTACK_MODES.includes(attackMode)) {
    return res.status(400).json({
      message: `Invalid attackMode. Must be one of: ${VALID_ATTACK_MODES.join(', ')}`
    });
  }

  if ((attackMode === 'bruteforce' || attackMode === 'hybrid') && !mask) {
    return res.status(400).json({
      message: 'mask is required for bruteforce and hybrid attacks.'
    });
  }

  // Resolve wordlist for dictionary and hybrid modes
  let resolvedWordlistPath = null;
  let wordlistResolution = { requestedPath: null, resolvedPath: null, fallbackUsed: false };

  if (attackMode === 'dictionary' || attackMode === 'hybrid') {
    wordlistResolution = await resolveExistingWordlist({ wordlistKey, wordlistPath });
    resolvedWordlistPath = wordlistResolution.resolvedPath;
    if (!resolvedWordlistPath) {
      return res.status(400).json({
        message: `Wordlist not found: ${wordlistResolution.requestedPath}`
      });
    }
  }

  const jobId = randomUUID();
  const now = new Date().toISOString();

  jobs.set(jobId, {
    jobId,
    hashId,
    hashMode,
    attackMode,
    wordlistPath: resolvedWordlistPath,
    wordlistKey: wordlistKey || null,
    mask: mask || null,
    requestedWordlistPath: wordlistResolution.requestedPath,
    fallbackWordlistUsed: wordlistResolution.fallbackUsed,
    status: 'pending',
    progress: 0,
    speed: 0,
    candidatesTested: 0,
    candidatesTotal: 0,
    password: null,
    failReason: null,
    logs: [],
    createdAt: now,
    updatedAt: now,
    finishedAt: null
  });

  const finishHandler = (patch) => {
    updateJob(jobId, {
      ...patch,
      finishedAt: new Date().toISOString()
    });
    controllers.delete(jobId);
  };

  const commonOpts = {
    jobId,
    hashLine: normalizedHash,
    hashMode,
    onStatus: (patch) => updateJob(jobId, patch),
    onLog: (entry) => appendJobLog(jobId, entry),
    onFinish: finishHandler
  };

  let controller;

  if (attackMode === 'bruteforce') {
    controller = await startBruteforceAttack({ ...commonOpts, mask });
  } else if (attackMode === 'hybrid') {
    controller = await startHybridAttack({ ...commonOpts, wordlistPath: resolvedWordlistPath, mask });
  } else {
    controller = await startDictionaryAttack({ ...commonOpts, wordlistPath: resolvedWordlistPath });
  }

  controllers.set(jobId, controller);

  return res.status(202).json({
    jobId,
    statusUrl: `/api/jobs/${jobId}`,
    ...(resolvedWordlistPath ? { wordlistPath: resolvedWordlistPath } : {}),
    fallbackWordlistUsed: wordlistResolution.fallbackUsed
  });
});

app.get('/api/jobs', (_req, res) => {
  const summaries = Array.from(jobs.values())
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 100)
    .map((job) => ({
      jobId: job.jobId,
      hashId: job.hashId,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      finishedAt: job.finishedAt,
      failReason: job.failReason
    }));

  return res.json({ jobs: summaries });
});

app.get('/api/jobs/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: 'Job not found.' });
  }

  return res.json(job);
});

app.post('/api/jobs/:jobId/stop', (req, res) => {
  const { jobId } = req.params;
  const controller = controllers.get(jobId);
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ message: 'Job not found.' });
  }

  if (controller) {
    controller.stop();
    controllers.delete(jobId);
  }

  updateJob(jobId, {
    status: 'stopped',
    failReason: 'Stopped by user',
    finishedAt: new Date().toISOString()
  });

  return res.json({ ok: true });
});

app.post('/api/tools/hash-type', (req, res) => {
  const { hash } = req.body || {};
  if (!hash) {
    return res.status(400).json({ message: 'hash is required.' });
  }

  return res.json(identifyHashType(hash));
});

app.post('/api/tools/password-strength', (req, res) => {
  const { password } = req.body || {};
  return res.json(scorePassword(password || ''));
});

app.post('/api/tools/mask-builder', (req, res) => {
  const payload = req.body || {};
  return res.json(buildMask(payload));
});

app.listen(PORT, HOST, () => {
  console.log(`Hashcat API running on http://${HOST}:${PORT}`);
});
