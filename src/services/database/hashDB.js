/**
 * Hash Database Service
 * Manages the hash database with localStorage persistence
 */

const STORAGE_KEY = 'hashcracker_database';
const SEED_PROFILE = 'real-only-v1';
const HC22000_REGEX = /^WPA\*(01|02)\*/i;
const REAL_CATEGORIES = new Set(['imported', 'real_scan', 'real_capture']);

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
  const hashType = hashLine.startsWith('WPA*01*') ? 'PMKID' : 'EAPOL';

  return {
    ...entry,
    id: entry.id || `real_${Date.now()}_${index}`,
    type: hashType,
    hash: hashLine,
    category: isRealCategory(entry.category) ? entry.category : 'real_capture',
    password: null,
    complexity: 'unknown',
    status: ['pending', 'cracking', 'cracked', 'failed'].includes(entry.status) ? entry.status : 'pending',
    addedAt: entry.addedAt || new Date().toISOString(),
    crackedAt: entry.crackedAt || null,
    attackMode: entry.attackMode || null,
    timeToCrack: entry.timeToCrack || null
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
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse stored database:', e);
    }
  }

  const emptyDatabase = createEmptyDatabase();
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
export function addHash(database) {
  // Intentionally disabled: database now stores real hashes only.
  return null;
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
  const lines = content.trim().split('\n');
  const imported = [];
  const knownHashes = new Set(
    (database.hashes || []).map((entry) => String(entry.hash || '').trim().toUpperCase())
  );

  lines.forEach((line, idx) => {
    const normalizedLine = line.trim();
    const dedupeKey = normalizedLine.toUpperCase();

    if (isValidHc22000Hash(normalizedLine) && !knownHashes.has(dedupeKey)) {
      const parts = normalizedLine.split('*');
      if (parts.length >= 5) {
        const type = parts[1] === '01' ? 'PMKID' : 'EAPOL';
        const essidHex = parts[5];

        // Convert hex ESSID to string
        let ssid = '';
        try {
          for (let i = 0; i < essidHex.length; i += 2) {
            ssid += String.fromCharCode(parseInt(essidHex.substr(i, 2), 16));
          }
        } catch (e) {
          ssid = `Network_${idx + 1}`;
        }

        const newHash = {
          id: `hash_imp_${Date.now()}_${idx}`,
          type,
          hash: normalizedLine,
          ssid,
          bssid: parts[3].match(/.{2}/g)?.join(':').toUpperCase() || 'Unknown',
          client: parts[4].match(/.{2}/g)?.join(':').toUpperCase() || 'Unknown',
          password: null, // Unknown until cracked
          complexity: 'unknown',
          category: 'real_capture',
          addedAt: new Date().toISOString(),
          status: 'pending',
          crackedAt: null,
          attackMode: null,
          timeToCrack: null
        };

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

  networks.forEach((net, idx) => {
    const capturedHash = (net.hash || net.captureHash || '').trim();

    if (!isValidHc22000Hash(capturedHash)) {
      return;
    }

    const hashType = capturedHash.startsWith('WPA*01*') ? 'PMKID' : 'EAPOL';

    // Check if SSID already exists to avoid duplicates
    const exists = database.hashes.some(h => h.ssid === net.ssid && h.bssid === net.bssid);

    if (!exists && net.ssid && net.ssid !== 'Hidden') {
      const newHash = {
        id: `real_${Date.now()}_${idx}`,
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
        addedAt: new Date().toISOString(),
        status: 'pending',
        crackedAt: null,
        attackMode: null,
        timeToCrack: null
      };

      newHashes.push(newHash);
      database.hashes.unshift(newHash); // Add to top
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
