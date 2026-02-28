/**
 * Hashcat Simulator - Core Cracking Engine
 * Simulates WiFi password cracking with realistic behavior
 */

// Hashcat modes for WPA/WPA2
export const HASH_MODES = {
  22000: { name: 'WPA-PBKDF2-PMKID+EAPOL', description: 'Modern WPA/WPA2' },
  2500: { name: 'WPA-EAPOL-PBKDF2', description: 'Legacy WPA/WPA2' },
  16800: { name: 'WPA-PMKID-PBKDF2', description: 'PMKID only' }
};

// Attack modes
export const ATTACK_MODES = {
  dictionary: { code: 0, name: 'Dictionary', flag: '-a 0' },
  bruteforce: { code: 3, name: 'Brute-force', flag: '-a 3' },
  hybrid: { code: 6, name: 'Hybrid', flag: '-a 6' }
};

// Mask characters
export const MASK_CHARS = {
  '?l': { chars: 'abcdefghijklmnopqrstuvwxyz', count: 26, description: 'Lowercase (a-z)' },
  '?u': { chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', count: 26, description: 'Uppercase (A-Z)' },
  '?d': { chars: '0123456789', count: 10, description: 'Digits (0-9)' },
  '?s': { chars: '!@#$%^&*()-_=+[]{}|;:,.<>?/', count: 32, description: 'Special chars' },
  '?a': { chars: null, count: 95, description: 'All printable chars' }
};

// Preset masks
export const PRESET_MASKS = [
  { nameKey: 'attack.presets.eightDigits', mask: '?d?d?d?d?d?d?d?d', keyspace: Math.pow(10, 8) },
  { nameKey: 'attack.presets.eightLowercase', mask: '?l?l?l?l?l?l?l?l', keyspace: Math.pow(26, 8) },
  { nameKey: 'attack.presets.commonPattern', mask: '?u?l?l?l?l?l?d?d', keyspace: 26 * Math.pow(26, 5) * 100 },
  { nameKey: 'attack.presets.wordPlusYear', mask: '?l?l?l?l?l?l?d?d?d?d', keyspace: Math.pow(26, 6) * 10000 },
  { nameKey: 'attack.presets.complexEight', mask: '?a?a?a?a?a?a?a?a', keyspace: Math.pow(95, 8) }
];

// Default wordlists
export const WORDLISTS = {
  rockyou_sample: {
    nameKey: 'wordlists.rockyouSample.name',
    descriptionKey: 'wordlists.rockyouSample.description',
    size: 10000,
    serverPath: '/opt/wordlists/rockyou_sample.txt'
  },
  rockyou: {
    nameKey: 'wordlists.rockyou.name',
    descriptionKey: 'wordlists.rockyou.description',
    size: 14344392,
    serverPath: '/opt/wordlists/rockyou.txt'
  },
  top_100k: {
    nameKey: 'wordlists.top100k.name',
    descriptionKey: 'wordlists.top100k.description',
    size: 100000,
    serverPath: '/opt/wordlists/top-100k.txt'
  },
  probable_v2: {
    nameKey: 'wordlists.probableV2.name',
    descriptionKey: 'wordlists.probableV2.description',
    size: 1575000,
    serverPath: '/opt/wordlists/probable-v2-top1575.txt'
  },
  wifi_defaults: {
    nameKey: 'wordlists.wifiDefaults.name',
    descriptionKey: 'wordlists.wifiDefaults.description',
    size: 5000,
    serverPath: '/opt/wordlists/wifi-defaults.txt'
  }
};

// Cracking session state
class CrackingSession {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.status = 'idle'; // idle, running, paused, completed, exhausted, stopped
    this.hashId = null;
    this.targetHash = null;
    this.attackMode = null;
    this.wordlist = null;
    this.mask = null;
    this.startTime = null;
    this.pauseTime = null;
    this.totalPauseTime = 0;
    this.speed = 0; // H/s
    this.progress = 0;
    this.candidatesTested = 0;
    this.candidatesTotal = 0;
    this.currentCandidate = '';
    this.foundPassword = null;
    this.eta = null;
    this.intervalId = null;
    this.logs = [];
    this.logSequence = 0;
  }
  
  getElapsedTime() {
    if (!this.startTime) return 0;
    const now = this.status === 'paused' ? this.pauseTime : Date.now();
    return (now - this.startTime - this.totalPauseTime) / 1000;
  }
  
  addLog(entryOrMessage, type = 'info') {
    const entry = typeof entryOrMessage === 'string'
      ? { message: entryOrMessage, type }
      : { ...entryOrMessage };
    this.logSequence += 1;

    this.logs.push({
      id: `simlog_${Date.now()}_${this.logSequence}`,
      timestamp: new Date().toISOString(),
      message: entry.message || '',
      key: entry.key || null,
      params: entry.params || null,
      type: entry.type || type
    });
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }
  }
}

// Singleton session
const session = new CrackingSession();

// Calculate keyspace for mask
export function calculateKeyspace(mask) {
  let keyspace = 1;
  const tokens = mask.match(/\?[ludsa]/g) || [];
  
  tokens.forEach(token => {
    if (MASK_CHARS[token]) {
      keyspace *= MASK_CHARS[token].count;
    }
  });
  
  return keyspace;
}

// Estimate time to crack
export function estimateTime(keyspace, speed) {
  if (speed === 0) return Infinity;
  return keyspace / speed; // seconds
}

// Format time for display
export function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '∞';
  
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  if (seconds < 31536000) return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  return `${(seconds / 31536000).toFixed(1)} years`;
}

// Format speed
export function formatSpeed(hashesPerSecond) {
  if (hashesPerSecond < 1000) return `${hashesPerSecond.toFixed(0)} H/s`;
  if (hashesPerSecond < 1000000) return `${(hashesPerSecond / 1000).toFixed(1)} kH/s`;
  if (hashesPerSecond < 1000000000) return `${(hashesPerSecond / 1000000).toFixed(2)} MH/s`;
  return `${(hashesPerSecond / 1000000000).toFixed(2)} GH/s`;
}

// Format large numbers
export function formatNumber(num) {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num < 1000000000000) return `${(num / 1000000000).toFixed(2)}B`;
  return `${(num / 1000000000000).toFixed(2)}T`;
}

// Generate random password candidate
function generateCandidate(mask) {
  let result = '';
  const tokens = mask.match(/\?[ludsa]/g) || [];
  
  tokens.forEach(token => {
    const charSet = MASK_CHARS[token];
    if (charSet && charSet.chars) {
      result += charSet.chars[Math.floor(Math.random() * charSet.chars.length)];
    } else if (token === '?a') {
      const printable = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?/';
      result += printable[Math.floor(Math.random() * printable.length)];
    }
  });
  
  return result;
}

// Dictionary attack simulation
function dictionaryTick(hash, onUpdate) {
  // Simulate testing ~500-2000 passwords per second
  const batchSize = 50 + Math.floor(Math.random() * 50);
  session.candidatesTested += batchSize;
  session.speed = 1000 + Math.floor(Math.random() * 1000);
  
  // Progress
  session.progress = Math.min((session.candidatesTested / session.candidatesTotal) * 100, 100);
  session.eta = estimateTime(session.candidatesTotal - session.candidatesTested, session.speed);
  
  // Current candidate (dummy)
  session.currentCandidate = generateCandidate('?l?l?l?l?l?d?d?d');
  
  // Check if we "found" the password
  // Simulate finding based on complexity (easy found faster)
  const findChance = hash.complexity === 'easy' ? 0.002 : 
                     hash.complexity === 'medium' ? 0.0005 : 0.0001;
  
  if (Math.random() < findChance && session.progress > 10) {
    session.foundPassword = hash.password;
    session.status = 'completed';
    session.addLog({
      key: 'activity.log.passwordFound',
      params: { password: hash.password },
      type: 'success'
    });
    clearInterval(session.intervalId);
    if (onUpdate) onUpdate({ ...session, found: true });
    return;
  }
  
  // Check if exhausted
  if (session.candidatesTested >= session.candidatesTotal) {
    session.status = 'exhausted';
    session.addLog({ key: 'activity.log.wordlistExhausted', type: 'warning' });
    clearInterval(session.intervalId);
    if (onUpdate) onUpdate({ ...session, exhausted: true, failReason: 'errors.wordlistExhausted' });
    return;
  }
  
  if (onUpdate) onUpdate({ ...session });
}

// Brute-force attack simulation
function bruteforceTick(hash, onUpdate) {
  // Simulate GPU cracking speed ~20-50 H/s for WPA
  const batchSize = 20 + Math.floor(Math.random() * 30);
  session.candidatesTested += batchSize;
  session.speed = 2000 + Math.floor(Math.random() * 3000);
  
  // Progress
  session.progress = Math.min((session.candidatesTested / session.candidatesTotal) * 100, 100);
  session.eta = estimateTime(session.candidatesTotal - session.candidatesTested, session.speed);
  
  // Current candidate (from mask)
  session.currentCandidate = generateCandidate(session.mask);
  
  // For numeric-only passwords, find much faster
  const isNumeric = hash.password && /^\d+$/.test(hash.password);
  const findChance = isNumeric ? 0.003 : 
                     hash.complexity === 'easy' ? 0.001 : 0.0001;
  
  if (Math.random() < findChance && session.progress > 5) {
    session.foundPassword = hash.password;
    session.status = 'completed';
    session.addLog({
      key: 'activity.log.passwordFound',
      params: { password: hash.password },
      type: 'success'
    });
    clearInterval(session.intervalId);
    if (onUpdate) onUpdate({ ...session, found: true });
    return;
  }
  
  if (session.candidatesTested >= session.candidatesTotal) {
    session.status = 'exhausted';
    session.addLog({ key: 'activity.log.keyspaceExhausted', type: 'warning' });
    clearInterval(session.intervalId);
    if (onUpdate) onUpdate({ ...session, exhausted: true, failReason: 'errors.keyspaceExhausted' });
    return;
  }
  
  if (onUpdate) onUpdate({ ...session });
}

// Start dictionary attack
export function startDictionaryAttack(hash, wordlistKey, onUpdate) {
  session.reset();
  
  const selectedWordlistKey = WORDLISTS[wordlistKey] ? wordlistKey : 'rockyou_sample';
  const wordlist = WORDLISTS[selectedWordlistKey];
  
  session.status = 'running';
  session.hashId = hash.id;
  session.targetHash = hash;
  session.attackMode = 'dictionary';
  session.wordlist = selectedWordlistKey;
  session.candidatesTotal = wordlist.size;
  session.startTime = Date.now();
  
  session.addLog({ key: 'activity.log.startDictionary', params: { ssid: hash.ssid } });
  session.addLog({
    key: 'activity.log.wordlistSelected',
    params: { wordlistKey: selectedWordlistKey, size: formatNumber(wordlist.size) }
  });
  session.addLog({ key: 'activity.log.hashType', params: { type: hash.type } });
  
  session.intervalId = setInterval(() => {
    if (session.status === 'running') {
      dictionaryTick(hash, onUpdate);
    }
  }, 100);
  
  return session;
}

// Start brute-force attack
export function startBruteforceAttack(hash, mask, onUpdate) {
  session.reset();
  
  const keyspace = calculateKeyspace(mask);
  
  session.status = 'running';
  session.hashId = hash.id;
  session.targetHash = hash;
  session.attackMode = 'bruteforce';
  session.mask = mask;
  session.candidatesTotal = Math.min(keyspace, 10000000); // Cap for simulation
  session.startTime = Date.now();
  
  session.addLog({ key: 'activity.log.startBruteforce', params: { ssid: hash.ssid } });
  session.addLog({ key: 'activity.log.maskSelected', params: { mask } });
  session.addLog({ key: 'activity.log.keyspaceValue', params: { keyspace: formatNumber(keyspace) } });
  session.addLog({ key: 'activity.log.hashType', params: { type: hash.type } });
  
  session.intervalId = setInterval(() => {
    if (session.status === 'running') {
      bruteforceTick(hash, onUpdate);
    }
  }, 100);
  
  return session;
}

// Start hybrid attack (wordlist + mask)
export function startHybridAttack(hash, wordlistKey, suffixMask, onUpdate) {
  session.reset();
  
  const selectedWordlistKey = WORDLISTS[wordlistKey] ? wordlistKey : 'rockyou_sample';
  const wordlist = WORDLISTS[selectedWordlistKey];
  const maskKeyspace = calculateKeyspace(suffixMask);
  const totalKeyspace = wordlist.size * maskKeyspace;
  
  session.status = 'running';
  session.hashId = hash.id;
  session.targetHash = hash;
  session.attackMode = 'hybrid';
  session.wordlist = selectedWordlistKey;
  session.mask = suffixMask;
  session.candidatesTotal = Math.min(totalKeyspace, 10000000);
  session.startTime = Date.now();
  
  session.addLog({ key: 'activity.log.startHybrid', params: { ssid: hash.ssid } });
  session.addLog({
    key: 'activity.log.hybridConfig',
    params: {
      wordlistKey: selectedWordlistKey,
      mask: suffixMask
    }
  });
  session.addLog({
    key: 'activity.log.totalKeyspace',
    params: { keyspace: formatNumber(totalKeyspace) }
  });
  
  session.intervalId = setInterval(() => {
    if (session.status === 'running') {
      // Similar to bruteforce but with wordlist base
      session.candidatesTested += 30 + Math.floor(Math.random() * 40);
      session.speed = 1500 + Math.floor(Math.random() * 2000);
      session.progress = Math.min((session.candidatesTested / session.candidatesTotal) * 100, 100);
      session.eta = estimateTime(session.candidatesTotal - session.candidatesTested, session.speed);
      session.currentCandidate = generateCandidate('?l?l?l?l') + generateCandidate(suffixMask);
      
      // Find chance
      const findChance = hash.complexity === 'easy' ? 0.002 : 0.0005;
      if (Math.random() < findChance && session.progress > 3) {
        session.foundPassword = hash.password;
        session.status = 'completed';
        session.addLog({
          key: 'activity.log.passwordFound',
          params: { password: hash.password },
          type: 'success'
        });
        clearInterval(session.intervalId);
        if (onUpdate) onUpdate({ ...session, found: true });
        return;
      }
      
      if (session.candidatesTested >= session.candidatesTotal) {
        session.status = 'exhausted';
        session.addLog({ key: 'activity.log.keyspaceExhausted', type: 'warning' });
        clearInterval(session.intervalId);
        if (onUpdate) onUpdate({ ...session, exhausted: true, failReason: 'errors.keyspaceExhausted' });
        return;
      }
      
      if (onUpdate) onUpdate({ ...session });
    }
  }, 100);
  
  return session;
}

// Pause attack
export function pauseAttack() {
  if (session.status === 'running') {
    session.status = 'paused';
    session.pauseTime = Date.now();
    session.addLog({ key: 'activity.log.attackPaused' });
  }
  return session;
}

// Resume attack
export function resumeAttack() {
  if (session.status === 'paused') {
    session.totalPauseTime += Date.now() - session.pauseTime;
    session.status = 'running';
    session.addLog({ key: 'activity.log.attackResumed' });
  }
  return session;
}

// Stop attack
export function stopAttack() {
  if (session.intervalId) {
    clearInterval(session.intervalId);
  }
  session.status = 'stopped';
  session.addLog({ key: 'activity.log.attackStopped', type: 'warning' });
  return session;
}

// Get current session
export function getSession() {
  return { ...session };
}

// Check if session is active
export function isSessionActive() {
  return session.status === 'running' || session.status === 'paused';
}

export default {
  HASH_MODES,
  ATTACK_MODES,
  MASK_CHARS,
  PRESET_MASKS,
  WORDLISTS,
  calculateKeyspace,
  estimateTime,
  formatTime,
  formatSpeed,
  formatNumber,
  startDictionaryAttack,
  startBruteforceAttack,
  startHybridAttack,
  pauseAttack,
  resumeAttack,
  stopAttack,
  getSession,
  isSessionActive
};
