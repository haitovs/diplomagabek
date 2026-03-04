/**
 * Hash Database Service
 * Manages the hash database with localStorage persistence
 */

const STORAGE_KEY = 'hashcracker_database';
const SEED_PROFILE = 'real-user-v2';
const HC22000_REGEX = /^WPA\*(01|02)\*/i;
const SHOWCASE_CRACKED_COUNT = 20;
const VALID_STATUSES = new Set(['pending', 'cracking', 'cracked', 'failed']);
const REAL_CATEGORIES = new Set(['imported', 'real_scan', 'real_capture', 'manual', 'showcase']);
const SHOWCASE_PASSWORDS = [
  'summer2024',
  'Ashgabat@123',
  'qwerty789',
  'wifiHome55',
  'Balkan_2025!',
  'securepass11',
  'Router#901',
  'tmcell777',
  'parol_2468',
  'CampusNet12',
  'speedyFiber9',
  'default@2026',
  'AhalHome88',
  'dogryParol1',
  'guestwifi42',
  'officeLAN77',
  'cyberLab101',
  'hashcrack99',
  'signalStrong8',
  'privateAP66'
];
const SHOWCASE_SSIDS = [
  'Office_WiFi',
  'Campus_Guest',
  'Home_5G',
  'Cafe_Network',
  'Dormitory_AP',
  'Lab_Research',
  'FamilyRouter',
  'StudioFiber',
  'Warehouse_AP',
  'MeetingRoomNet',
  'WorkshopWiFi',
  'Apartment_12',
  'TravelHotspot',
  'PrinterNetwork',
  'SecureZone',
  'Floor3-WLAN',
  'TechHub_AP',
  'HQ_Internal',
  'ClientLobby',
  'Backup_WiFi'
];

function stringSeed(input) {
  let hash = 0x811c9dc5;
  const text = String(input || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function createPseudoHex(seedValue, length) {
  let state = seedValue >>> 0;
  let output = '';
  for (let i = 0; i < length; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    output += (state & 0xf).toString(16);
  }
  return output.toUpperCase();
}

function textToHex(value) {
  const safeValue = String(value || '');
  if (!safeValue) return '';

  if (typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(safeValue);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return safeValue
    .split('')
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

function hexToText(value) {
  const safeHex = String(value || '').trim();
  if (!safeHex || safeHex.length % 2 !== 0) {
    return '';
  }

  let output = '';
  for (let i = 0; i < safeHex.length; i += 2) {
    const pair = safeHex.slice(i, i + 2);
    const charCode = Number.parseInt(pair, 16);
    if (Number.isNaN(charCode)) {
      return '';
    }
    output += String.fromCharCode(charCode);
  }
  return output;
}

function normalizeMacHex(value, fallbackSeedInput) {
  const raw = String(value || '')
    .replace(/[^a-fA-F0-9]/g, '')
    .toUpperCase();
  if (raw.length === 12) {
    return raw;
  }

  const fallbackSeed = typeof fallbackSeedInput === 'number'
    ? fallbackSeedInput
    : stringSeed(String(fallbackSeedInput || 'mac'));
  const generated = createPseudoHex(fallbackSeed, 12);
  if (!raw) {
    return generated;
  }
  return (raw + generated).slice(0, 12);
}

function formatMac(hexValue) {
  const safeHex = normalizeMacHex(hexValue, 0).toUpperCase();
  return safeHex.match(/.{2}/g).join(':');
}

function inferComplexity(passwordValue) {
  const password = String(passwordValue || '');
  if (!password) return 'unknown';
  if (password.length <= 8) return 'easy';
  if (password.length <= 12) return 'medium';
  return 'hard';
}

function createHashId(prefix = 'hash') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function createSyntheticHc22000({ type = 'PMKID', ssid, bssid, client, seedInput }) {
  const mode = type === 'EAPOL' ? '02' : '01';
  const ssidHex = textToHex(ssid || 'Manual-Network');
  const seed = stringSeed(`${seedInput || ''}|${ssidHex}|${bssid}|${client}|${mode}`);
  const apHex = normalizeMacHex(bssid, seed ^ 0xa53c9e2d);
  const clientHex = normalizeMacHex(client, seed ^ 0x1f123bb5);

  if (mode === '01') {
    const pmkid = createPseudoHex(seed ^ 0x9e3779b9, 32);
    return `WPA*01*${pmkid}*${apHex}*${clientHex}*${ssidHex}`;
  }

  const mic = createPseudoHex(seed ^ 0x85ebca6b, 32);
  const anonce = createPseudoHex(seed ^ 0xc2b2ae35, 64);
  const snonce = createPseudoHex(seed ^ 0x27d4eb2f, 64);
  const eapol = createPseudoHex(seed ^ 0x165667b1, 256);
  return `WPA*02*${mic}*${apHex}*${clientHex}*${ssidHex}*${anonce}*${snonce}*${eapol}*02`;
}

function parseHc22000Line(hashLine, fallbackSsid = 'Imported Network') {
  const normalized = String(hashLine || '').trim();
  if (!isValidHc22000Hash(normalized)) {
    return null;
  }

  const parts = normalized.split('*');
  const type = parts[1] === '01' ? 'PMKID' : 'EAPOL';
  const ssidHex = parts[5] || '';
  const decodedSsid = hexToText(ssidHex);
  const ssid = decodedSsid || fallbackSsid;

  const apHex = String(parts[3] || '').replace(/[^a-fA-F0-9]/g, '');
  const clientHex = String(parts[4] || '').replace(/[^a-fA-F0-9]/g, '');
  const bssid = apHex.length === 12 ? formatMac(apHex) : 'UNKNOWN';
  const client = clientHex.length === 12 ? formatMac(clientHex) : 'UNKNOWN';

  return {
    type,
    hash: normalized,
    ssid,
    bssid,
    client
  };
}

function createRecord(overrides = {}) {
  return {
    id: overrides.id || createHashId('hash'),
    type: overrides.type || 'PMKID',
    hash: overrides.hash || '',
    ssid: overrides.ssid || 'Unknown',
    bssid: overrides.bssid || 'UNKNOWN',
    client: overrides.client || 'UNKNOWN',
    password: overrides.password || null,
    complexity: overrides.complexity || inferComplexity(overrides.password),
    category: overrides.category || 'imported',
    addedAt: overrides.addedAt || new Date().toISOString(),
    status: VALID_STATUSES.has(overrides.status) ? overrides.status : 'pending',
    crackedAt: overrides.crackedAt || null,
    attackMode: overrides.attackMode || null,
    timeToCrack: overrides.timeToCrack || null,
    failReason: overrides.failReason || null,
    ...(overrides.signal !== undefined ? { signal: overrides.signal } : {}),
    ...(overrides.channel !== undefined ? { channel: overrides.channel } : {}),
    ...(overrides.security !== undefined ? { security: overrides.security } : {})
  };
}

function seedShowcaseCrackedHashes(database, count = SHOWCASE_CRACKED_COUNT) {
  if (!database || !Array.isArray(database.hashes) || count <= 0) {
    return 0;
  }

  const knownHashes = new Set(
    database.hashes.map((entry) => String(entry.hash || '').trim().toUpperCase())
  );
  const now = Date.now();
  let inserted = 0;

  for (let index = 0; index < count; index += 1) {
    const ssid = SHOWCASE_SSIDS[index % SHOWCASE_SSIDS.length];
    const password = SHOWCASE_PASSWORDS[index % SHOWCASE_PASSWORDS.length];
    const type = index % 2 === 0 ? 'PMKID' : 'EAPOL';
    const seedInput = `${ssid}|${password}|${index}`;
    const bssid = formatMac(normalizeMacHex('', stringSeed(`${seedInput}|bssid`)));
    const client = formatMac(normalizeMacHex('', stringSeed(`${seedInput}|client`)));
    const hash = createSyntheticHc22000({ type, ssid, bssid, client, seedInput });
    const dedupeKey = hash.toUpperCase();

    if (knownHashes.has(dedupeKey)) {
      continue;
    }

    const crackedAt = new Date(now - ((index + 1) * 3600 * 1000)).toISOString();
    const record = createRecord({
      id: createHashId('seed'),
      type,
      hash,
      ssid,
      bssid,
      client,
      password,
      complexity: inferComplexity(password),
      category: 'showcase',
      status: 'cracked',
      crackedAt,
      attackMode: ['dictionary', 'hybrid', 'bruteforce'][index % 3],
      timeToCrack: 30 + (index * 17)
    });

    database.hashes.push(record);
    knownHashes.add(dedupeKey);
    inserted += 1;
  }

  if (inserted > 0) {
    database.totalCount = database.hashes.length;
  }

  return inserted;
}

function createEmptyDatabase() {
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalCount: 0,
    seedProfile: SEED_PROFILE,
    hashes: []
  };
}

export function isValidHc22000Hash(hash) {
  return typeof hash === 'string' && HC22000_REGEX.test(hash.trim());
}

function isRealCategory(category) {
  return REAL_CATEGORIES.has(category);
}

function normalizeRealHashEntry(entry, index) {
  const hashLine = (entry.hash || '').trim();
  const parsed = parseHc22000Line(hashLine, entry.ssid || `Network_${index + 1}`);
  const hashType = parsed?.type || (hashLine.startsWith('WPA*01*') ? 'PMKID' : 'EAPOL');
  const normalizedStatus = VALID_STATUSES.has(entry.status) ? entry.status : 'pending';
  const normalizedPassword = entry.password || null;

  return {
    ...entry,
    id: entry.id || createHashId('real'),
    type: hashType,
    hash: hashLine,
    ssid: entry.ssid || parsed?.ssid || `Network_${index + 1}`,
    bssid: entry.bssid || parsed?.bssid || 'UNKNOWN',
    client: entry.client || parsed?.client || 'UNKNOWN',
    category: isRealCategory(entry.category) ? entry.category : 'imported',
    password: normalizedPassword,
    complexity: entry.complexity || inferComplexity(normalizedPassword),
    status: normalizedStatus,
    addedAt: entry.addedAt || new Date().toISOString(),
    crackedAt: normalizedStatus === 'cracked' ? (entry.crackedAt || new Date().toISOString()) : null,
    attackMode: entry.attackMode || null,
    timeToCrack: entry.timeToCrack || null,
    failReason: entry.failReason || null
  };
}

export function cleanupDatabaseToRealHashes(database) {
  if (!database || !Array.isArray(database.hashes)) {
    return { removed: 0, total: 0 };
  }

  const originalCount = database.hashes.length;
  const seenHashes = new Set();
  const cleaned = [];

  database.hashes.forEach((entry, index) => {
    if (!isRealCategory(entry.category) || !isValidHc22000Hash(entry.hash)) {
      return;
    }

    const normalized = normalizeRealHashEntry(entry, index);
    const dedupeKey = normalized.hash.toUpperCase();

    if (seenHashes.has(dedupeKey)) {
      return;
    }

    seenHashes.add(dedupeKey);
    cleaned.push(normalized);
  });

  database.hashes = cleaned;
  database.totalCount = cleaned.length;
  database.seedProfile = SEED_PROFILE;
  database.generatedAt = database.generatedAt || new Date().toISOString();

  saveDatabase(database);
  return { removed: originalCount - cleaned.length, total: cleaned.length };
}

// Initialize or load database
export function initializeDatabase(forceReset = false) {
  if (forceReset) {
    localStorage.removeItem(STORAGE_KEY);
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        if (!Array.isArray(parsed.hashes)) {
          parsed.hashes = [];
        }
        cleanupDatabaseToRealHashes(parsed);
        if (parsed.hashes.length === 0) {
          seedShowcaseCrackedHashes(parsed, SHOWCASE_CRACKED_COUNT);
          saveDatabase(parsed);
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse stored database:', e);
    }
  }

  const emptyDatabase = createEmptyDatabase();
  seedShowcaseCrackedHashes(emptyDatabase, SHOWCASE_CRACKED_COUNT);
  saveDatabase(emptyDatabase);
  return emptyDatabase;
}

// Save database to localStorage
export function saveDatabase(database) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    return true;
  } catch (e) {
    console.error('Failed to save database:', e);
    return false;
  }
}

// Get all hashes
export function getAllHashes(database) {
  return database.hashes || [];
}

// Get hashes by status
export function getHashesByStatus(database, status) {
  return database.hashes.filter(h => h.status === status);
}

// Get hash by ID
export function getHashById(database, id) {
  return database.hashes.find(h => h.id === id);
}

// Update hash status
export function updateHashStatus(database, id, updates) {
  const index = database.hashes.findIndex(h => h.id === id);
  if (index !== -1) {
    database.hashes[index] = { ...database.hashes[index], ...updates };
    saveDatabase(database);
    return database.hashes[index];
  }
  return null;
}

// Add new hash
export function addHash(database, options = {}) {
  if (!database || !Array.isArray(database.hashes)) {
    return null;
  }

  const source = options.source === 'hash' ? 'hash' : 'word';
  const knownHashes = new Set(
    database.hashes.map((entry) => String(entry.hash || '').trim().toUpperCase())
  );

  let createdRecord = null;

  if (source === 'hash') {
    const rawHashLine = String(options.hashLine || options.hash || '').trim();
    if (!rawHashLine) {
      throw new Error('table.addHashValidation.hashRequired');
    }
    if (!isValidHc22000Hash(rawHashLine)) {
      throw new Error('table.addHashValidation.invalidHash');
    }

    const parsed = parseHc22000Line(rawHashLine, options.ssid || 'Imported Network');
    if (!parsed) {
      throw new Error('table.addHashValidation.invalidHash');
    }

    const dedupeKey = parsed.hash.toUpperCase();
    if (knownHashes.has(dedupeKey)) {
      throw new Error('table.addHashValidation.duplicate');
    }

    const markAsCracked = Boolean(options.markAsCracked);
    const knownPassword = String(options.password || options.word || '').trim();
    createdRecord = createRecord({
      id: createHashId('manual'),
      ...parsed,
      category: 'imported',
      status: markAsCracked ? 'cracked' : 'pending',
      password: knownPassword || null,
      complexity: inferComplexity(knownPassword),
      crackedAt: markAsCracked ? new Date().toISOString() : null,
      attackMode: markAsCracked ? 'dictionary' : null,
      timeToCrack: markAsCracked ? 1 : null
    });
  } else {
    const word = String(options.word || options.password || '').trim();
    if (!word) {
      throw new Error('table.addHashValidation.wordRequired');
    }

    const type = options.type === 'EAPOL' ? 'EAPOL' : 'PMKID';
    const ssid = String(options.ssid || '').trim() || `ManualNetwork_${database.hashes.length + 1}`;
    const seedInput = `${ssid}|${word}|${database.hashes.length}`;
    const bssid = formatMac(normalizeMacHex(options.bssid, `${seedInput}|bssid`));
    const client = formatMac(normalizeMacHex(options.client, `${seedInput}|client`));
    const syntheticHash = createSyntheticHc22000({ type, ssid, bssid, client, seedInput });
    const dedupeKey = syntheticHash.toUpperCase();

    if (knownHashes.has(dedupeKey)) {
      throw new Error('table.addHashValidation.duplicate');
    }

    const markAsCracked = Boolean(options.markAsCracked);
    createdRecord = createRecord({
      id: createHashId('manual'),
      type,
      hash: syntheticHash,
      ssid,
      bssid,
      client,
      password: word,
      complexity: inferComplexity(word),
      category: 'manual',
      status: markAsCracked ? 'cracked' : 'pending',
      crackedAt: markAsCracked ? new Date().toISOString() : null,
      attackMode: markAsCracked ? 'dictionary' : null,
      timeToCrack: markAsCracked ? 1 : null
    });
  }

  database.hashes.unshift(createdRecord);
  database.totalCount = database.hashes.length;
  saveDatabase(database);
  return createdRecord;
}

// Delete hash
export function deleteHash(database, id) {
  const index = database.hashes.findIndex(h => h.id === id);
  if (index !== -1) {
    database.hashes.splice(index, 1);
    database.totalCount = database.hashes.length;
    saveDatabase(database);
    return true;
  }
  return false;
}

// Get statistics
export function getStatistics(database) {
  const hashes = database.hashes || [];

  const stats = {
    total: hashes.length,
    pending: hashes.filter(h => h.status === 'pending').length,
    cracking: hashes.filter(h => h.status === 'cracking').length,
    cracked: hashes.filter(h => h.status === 'cracked').length,
    failed: hashes.filter(h => h.status === 'failed').length,
    byComplexity: {
      easy: hashes.filter(h => h.complexity === 'easy').length,
      medium: hashes.filter(h => h.complexity === 'medium').length,
      hard: hashes.filter(h => h.complexity === 'hard').length
    },
    byType: {
      PMKID: hashes.filter(h => h.type === 'PMKID').length,
      EAPOL: hashes.filter(h => h.type === 'EAPOL').length
    },
    successRate: hashes.length > 0
      ? ((hashes.filter(h => h.status === 'cracked').length / hashes.length) * 100).toFixed(1)
      : 0
  };

  return stats;
}

// Search hashes
export function searchHashes(database, query) {
  const lowerQuery = query.toLowerCase();
  return database.hashes.filter(h =>
    String(h.ssid || '').toLowerCase().includes(lowerQuery) ||
    String(h.bssid || '').toLowerCase().includes(lowerQuery) ||
    String(h.id || '').toLowerCase().includes(lowerQuery) ||
    String(h.type || '').toLowerCase().includes(lowerQuery)
  );
}

// Filter hashes
export function filterHashes(database, filters) {
  let result = [...database.hashes];

  if (filters.status && filters.status !== 'all') {
    result = result.filter(h => h.status === filters.status);
  }

  if (filters.type && filters.type !== 'all') {
    result = result.filter(h => h.type === filters.type);
  }

  if (filters.complexity && filters.complexity !== 'all') {
    result = result.filter(h => h.complexity === filters.complexity);
  }

  return result;
}

// Sort hashes
export function sortHashes(hashes, sortBy, ascending = true) {
  const sorted = [...hashes].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return ascending ? -1 : 1;
    if (valA > valB) return ascending ? 1 : -1;
    return 0;
  });

  return sorted;
}

// Export cracked hashes
export function exportCrackedHashes(database, format = 'csv') {
  const cracked = getHashesByStatus(database, 'cracked');

  if (format === 'csv') {
    const header = 'SSID,BSSID,Password,Type,Attack Mode,Time to Crack (s)\n';
    const rows = cracked.map(h =>
      `"${h.ssid}","${h.bssid}","${h.password}","${h.type}","${h.attackMode || 'N/A'}","${h.timeToCrack || 'N/A'}"`
    ).join('\n');
    return header + rows;
  }

  if (format === 'json') {
    return JSON.stringify(cracked.map(h => ({
      ssid: h.ssid,
      bssid: h.bssid,
      password: h.password,
      type: h.type,
      attackMode: h.attackMode,
      timeToCrack: h.timeToCrack,
      crackedAt: h.crackedAt
    })), null, 2);
  }

  if (format === 'potfile') {
    // Hashcat potfile format: hash:password
    return cracked.map(h => `${h.hash}:${h.password}`).join('\n');
  }

  return '';
}

// Import hashes from hc22000 format
export function importHashes(database, content) {
  const lines = String(content || '').trim().split('\n');
  const imported = [];
  const knownHashes = new Set(
    (database.hashes || []).map((entry) => String(entry.hash || '').trim().toUpperCase())
  );

  lines.forEach((line, idx) => {
    const normalizedLine = line.trim();
    const dedupeKey = normalizedLine.toUpperCase();

    if (isValidHc22000Hash(normalizedLine) && !knownHashes.has(dedupeKey)) {
      const parsed = parseHc22000Line(normalizedLine, `Network_${idx + 1}`);
      if (parsed) {
        const newHash = createRecord({
          id: createHashId('hash_imp'),
          ...parsed,
          password: null,
          complexity: 'unknown',
          category: 'real_capture',
          status: 'pending',
          crackedAt: null,
          attackMode: null,
          timeToCrack: null
        });

        imported.push(newHash);
        database.hashes.push(newHash);
        knownHashes.add(dedupeKey);
      }
    }
  });

  if (imported.length > 0) {
    database.totalCount = database.hashes.length;
    saveDatabase(database);
  }

  return imported;
}

// Import real networks from scanner
export function importRealNetworks(database, networks) {
  const newHashes = [];
  const knownHashes = new Set(
    (database.hashes || []).map((entry) => String(entry.hash || '').trim().toUpperCase())
  );

  networks.forEach((net, idx) => {
    const capturedHash = (net.hash || net.captureHash || '').trim();

    if (!isValidHc22000Hash(capturedHash)) {
      return;
    }

    const hashType = capturedHash.startsWith('WPA*01*') ? 'PMKID' : 'EAPOL';
    const dedupeKey = capturedHash.toUpperCase();
    if (knownHashes.has(dedupeKey)) {
      return;
    }

    // Check if SSID already exists to avoid duplicates
    const exists = database.hashes.some(h => h.ssid === net.ssid && h.bssid === net.bssid);

    if (!exists && net.ssid && net.ssid !== 'Hidden') {
      const newHash = createRecord({
        id: createHashId('real'),
        type: hashType,
        hash: capturedHash,
        ssid: net.ssid,
        bssid: net.bssid || 'UNKNOWN',
        client: 'UNKNOWN',
        password: null,
        complexity: 'unknown',
        category: 'real_scan',
        signal: net.rssi,
        channel: net.channel,
        security: net.security,
        status: 'pending',
        crackedAt: null,
        attackMode: null,
        timeToCrack: null
      });

      newHashes.push(newHash);
      database.hashes.unshift(newHash); // Add to top
      knownHashes.add(dedupeKey);
    }
  });

  if (newHashes.length > 0) {
    database.totalCount = database.hashes.length;
    saveDatabase(database);
  }

  return newHashes;
}

export default {
  initializeDatabase,
  saveDatabase,
  isValidHc22000Hash,
  cleanupDatabaseToRealHashes,
  getAllHashes,
  getHashesByStatus,
  getHashById,
  updateHashStatus,
  addHash,
  deleteHash,
  getStatistics,
  searchHashes,
  filterHashes,
  sortHashes,
  exportCrackedHashes,
  importHashes,
  importRealNetworks
};
