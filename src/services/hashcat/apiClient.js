const HASHCAT_API_BASE = import.meta.env.VITE_HASHCAT_BACKEND_URL || '';

function buildUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBase = HASHCAT_API_BASE.replace(/\/+$/, '');

  if (!normalizedBase) {
    return `/api${normalizedPath}`;
  }

  const baseHasApiSuffix = /\/api$/i.test(normalizedBase);
  return baseHasApiSuffix
    ? `${normalizedBase}${normalizedPath}`
    : `${normalizedBase}/api${normalizedPath}`;
}

async function request(path, options = {}) {
  if (!HASHCAT_API_BASE) {
    throw new Error('Real hashcat backend URL is not configured. Set VITE_HASHCAT_BACKEND_URL (example: /api or http://localhost:8080).');
  }

  const response = await fetch(buildUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export function isRealHashcatEnabled() {
  return Boolean(HASHCAT_API_BASE);
}

export async function createDictionaryJob({ hashId, hash, hashMode = 22000, wordlistKey }) {
  return request('/jobs', {
    method: 'POST',
    body: JSON.stringify({
      hashId,
      hash,
      hashMode,
      attackMode: 'dictionary',
      ...(wordlistKey ? { wordlistKey } : {})
    })
  });
}

export async function getJobStatus(jobId) {
  return request(`/jobs/${jobId}`);
}

export async function stopJob(jobId) {
  return request(`/jobs/${jobId}/stop`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function detectHashType(hash) {
  return request('/tools/hash-type', {
    method: 'POST',
    body: JSON.stringify({ hash })
  });
}

export async function analyzePasswordStrength(password) {
  return request('/tools/password-strength', {
    method: 'POST',
    body: JSON.stringify({ password })
  });
}

export async function buildCustomMask(options) {
  return request('/tools/mask-builder', {
    method: 'POST',
    body: JSON.stringify(options)
  });
}
