const HASHCAT_API_BASE = import.meta.env.VITE_HASHCAT_BACKEND_URL || '';

function buildUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseValue = String(HASHCAT_API_BASE).trim();
  const normalizedBase = baseValue.replace(/\/+$/, '');

  if (!normalizedBase) {
    return `/api${normalizedPath}`;
  }

  const hasProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(normalizedBase);
  const absoluteBase = hasProtocol
    ? normalizedBase
    : (normalizedBase.startsWith('/') ? normalizedBase : `/${normalizedBase}`);

  const baseHasApiSuffix = /\/api$/i.test(absoluteBase);
  return baseHasApiSuffix
    ? `${absoluteBase}${normalizedPath}`
    : `${absoluteBase}/api${normalizedPath}`;
}

async function request(path, options = {}) {
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

export async function createBruteforceJob({ hashId, hash, hashMode = 22000, mask }) {
  return request('/jobs', {
    method: 'POST',
    body: JSON.stringify({
      hashId,
      hash,
      hashMode,
      attackMode: 'bruteforce',
      mask
    })
  });
}

export async function createHybridJob({ hashId, hash, hashMode = 22000, wordlistKey, mask }) {
  return request('/jobs', {
    method: 'POST',
    body: JSON.stringify({
      hashId,
      hash,
      hashMode,
      attackMode: 'hybrid',
      mask,
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

// ── WiFi Scanner API ─────────────────────────────────────────────────

export async function scanWifiNetworks() {
  return request('/wifi/scan');
}

export async function checkWifiTools() {
  return request('/wifi/tools');
}

export async function startWifiCapture({ bssid, ssid, channel, duration }) {
  return request('/wifi/capture', {
    method: 'POST',
    body: JSON.stringify({ bssid, ssid, channel, duration })
  });
}

export async function getCaptureStatus(captureId) {
  return request(`/wifi/captures/${captureId}`);
}

export async function stopWifiCapture(captureId) {
  return request(`/wifi/captures/${captureId}/stop`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function listCaptures() {
  return request('/wifi/captures');
}

export async function convertPcapFile(file) {
  const formData = new FormData();
  formData.append('pcapfile', file);

  const response = await fetch(buildUrl('/wifi/convert'), {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Upload failed with status ${response.status}`);
  }

  return response.json();
}
