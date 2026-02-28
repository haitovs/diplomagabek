import cors from 'cors';
import express from 'express';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { startDictionaryAttack } from './hashcatRunner.js';
import { buildMask, identifyHashType, scorePassword } from './securityTools.js';

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const DEFAULT_WORDLIST_PATH = process.env.WORDLIST_PATH || '/opt/wordlists/rockyou.txt';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const jobs = new Map();
const controllers = new Map();

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
  const {
    hashId,
    hash,
    hashMode = 22000,
    attackMode = 'dictionary',
    wordlistPath = DEFAULT_WORDLIST_PATH
  } = req.body || {};

  if (!hashId || !hash) {
    return res.status(400).json({ message: 'hashId and hash are required.' });
  }

  if (attackMode !== 'dictionary') {
    return res.status(400).json({
      message: 'Real backend currently supports dictionary attacks only.'
    });
  }

  try {
    await fs.access(wordlistPath);
  } catch {
    return res.status(400).json({
      message: `Wordlist not found: ${wordlistPath}`
    });
  }

  const jobId = randomUUID();
  const now = new Date().toISOString();

  jobs.set(jobId, {
    jobId,
    hashId,
    hashMode,
    attackMode,
    wordlistPath,
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

  const controller = await startDictionaryAttack({
    jobId,
    hashLine: hash,
    hashMode,
    wordlistPath,
    onStatus: (patch) => updateJob(jobId, patch),
    onLog: (entry) => appendJobLog(jobId, entry),
    onFinish: (patch) => {
      updateJob(jobId, {
        ...patch,
        finishedAt: new Date().toISOString()
      });
      controllers.delete(jobId);
    }
  });

  controllers.set(jobId, controller);

  return res.status(202).json({
    jobId,
    statusUrl: `/api/jobs/${jobId}`
  });
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
