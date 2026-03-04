/**
 * Hashcat constants and utility functions
 * Extracted from simulator.js — pure utilities with no simulation logic
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
