import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const HASHCAT_BIN = process.env.HASHCAT_BIN || 'hashcat';
const CPU_LIMIT_BIN = process.env.CPU_LIMIT_BIN || 'cpulimit';
const DATA_DIR = process.env.DATA_DIR || '/srv/hashcat-data';
const DEFAULT_WORDLIST_PATH = process.env.WORDLIST_PATH || '/opt/wordlists/rockyou.txt';
const HASHCAT_WORKLOAD_PROFILE = process.env.HASHCAT_WORKLOAD_PROFILE || '1';
const HASHCAT_CPU_LIMIT_PERCENT = Number(process.env.HASHCAT_CPU_LIMIT_PERCENT || 30);
const HASHCAT_USE_CPULIMIT = process.env.HASHCAT_USE_CPULIMIT !== 'false';

function isCpuLimitEnabled() {
  return Number.isFinite(HASHCAT_CPU_LIMIT_PERCENT)
    && HASHCAT_CPU_LIMIT_PERCENT > 0
    && HASHCAT_CPU_LIMIT_PERCENT <= 100
    && HASHCAT_USE_CPULIMIT;
}

function calculateProgress(statusJson) {
  const progressArray = Array.isArray(statusJson.progress) ? statusJson.progress : null;
  if (!progressArray || progressArray.length < 2) return null;

  const tested = Number(progressArray[0]) || 0;
  const total = Number(progressArray[1]) || 0;
  const progress = total > 0 ? Math.min((tested / total) * 100, 100) : 0;

  let speed = 0;
  if (Array.isArray(statusJson.speed)) {
    if (Array.isArray(statusJson.speed[0])) {
      speed = Number(statusJson.speed[0][0]) || 0;
    } else {
      speed = Number(statusJson.speed[0]) || 0;
    }
  }

  return {
    progress,
    candidatesTested: tested,
    candidatesTotal: total,
    speed
  };
}

export async function startDictionaryAttack({
  jobId,
  hashLine,
  hashMode = 22000,
  wordlistPath = DEFAULT_WORDLIST_PATH,
  onStatus,
  onLog,
  onFinish
}) {
  const jobDir = path.join(DATA_DIR, jobId);
  await fs.mkdir(jobDir, { recursive: true });

  const hashFilePath = path.join(jobDir, 'target.hc22000');
  const outputFilePath = path.join(jobDir, 'cracked.txt');

  await fs.writeFile(hashFilePath, `${hashLine.trim()}\n`, 'utf8');

  const args = [
    '-m',
    String(hashMode),
    '-a',
    '0',
    '-w',
    HASHCAT_WORKLOAD_PROFILE,
    '--status',
    '--status-json',
    '--status-timer',
    '5',
    '--machine-readable',
    '--outfile-autohex-disable',
    '--outfile',
    outputFilePath,
    '--outfile-format',
    '2',
    hashFilePath,
    wordlistPath
  ];

  const spawnCommand = isCpuLimitEnabled() ? CPU_LIMIT_BIN : HASHCAT_BIN;
  const spawnArgs = isCpuLimitEnabled()
    ? ['-f', '-l', String(HASHCAT_CPU_LIMIT_PERCENT), '--', HASHCAT_BIN, ...args]
    : args;

  const processHandle = spawn(spawnCommand, spawnArgs, {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  onStatus?.({
    status: 'cracking',
    hashcatPid: processHandle.pid,
    progress: 0,
    candidatesTested: 0,
    candidatesTotal: 0,
    speed: 0,
    wordlistPath,
    resourceLimits: {
      cpuPercent: isCpuLimitEnabled() ? HASHCAT_CPU_LIMIT_PERCENT : null,
      workloadProfile: HASHCAT_WORKLOAD_PROFILE,
      via: isCpuLimitEnabled() ? CPU_LIMIT_BIN : 'hashcat'
    },
    hashMode
  });

  let finished = false;
  let stdoutBuffer = '';

  const completeJob = async (payload) => {
    if (finished) return;
    finished = true;
    onFinish?.(payload);
  };

  processHandle.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop() || '';

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const statusJson = JSON.parse(trimmed);
        const progressPayload = calculateProgress(statusJson);
        if (progressPayload) {
          onStatus?.({ ...progressPayload });
        }
      } catch {
        onLog?.({ stream: 'stdout', line: trimmed });
      }
    });
  });

  processHandle.stderr.on('data', (chunk) => {
    const message = chunk.toString().trim();
    if (message) {
      onLog?.({ stream: 'stderr', line: message });
    }
  });

  processHandle.on('error', async (error) => {
    if (isCpuLimitEnabled() && error.code === 'ENOENT') {
      await completeJob({
        status: 'failed',
        failReason: `CPU limiter binary not found: ${CPU_LIMIT_BIN}. Install it or set HASHCAT_USE_CPULIMIT=false.`,
        exitCode: null
      });
      return;
    }

    await completeJob({
      status: 'failed',
      failReason: `Failed to start hashcat: ${error.message}`,
      exitCode: null
    });
  });

  processHandle.on('close', async (exitCode) => {
    let crackedPassword = null;

    try {
      const outputData = await fs.readFile(outputFilePath, 'utf8');
      const firstLine = outputData.split('\n').find(Boolean);
      if (firstLine) {
        const passwordSegment = firstLine.split(':').slice(1).join(':');
        crackedPassword = passwordSegment || null;
      }
    } catch {
      // No cracked output file means no recovered password.
    }

    if (crackedPassword) {
      await completeJob({
        status: 'cracked',
        password: crackedPassword,
        exitCode
      });
      return;
    }

    const failReason = exitCode === 0
      ? 'Wordlist exhausted with no result'
      : `Hashcat exited with code ${exitCode}`;

    await completeJob({
      status: 'failed',
      failReason,
      exitCode
    });
  });

  return {
    stop: () => {
      if (!processHandle.killed) {
        processHandle.kill('SIGTERM');
      }
    }
  };
}
