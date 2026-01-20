/**
 * Mock Hash Generator for WiFi WPA/WPA2 Simulation
 * Generates realistic hc22000 format hashes for educational purposes
 */

// Common SSID patterns
const ssidPatterns = {
  home: [
    'Home_WiFi', 'MyNetwork', 'FamilyNet', 'HomeNetwork', 'OurWiFi',
    'House_WiFi', 'Apartment_5G', 'Living_Room', 'Basement_Net'
  ],
  router: [
    'NETGEAR', 'TP-Link', 'ASUS_RT', 'Linksys', 'D-Link', 'Belkin',
    'HUAWEI', 'ZyXEL', 'Cisco', 'Arris', 'Motorola', 'Ubiquiti'
  ],
  business: [
    'Office_Guest', 'Corporate_WiFi', 'Meeting_Room', 'Conference_5G',
    'Lobby_WiFi', 'Staff_Network', 'IT_Department', 'HR_Zone'
  ],
  public: [
    'CafeWiFi', 'Restaurant_Guest', 'Hotel_Lobby', 'Airport_Free',
    'Library_Public', 'Mall_WiFi', 'Gym_Members', 'Park_WiFi'
  ],
  mobile: [
    'AndroidAP', 'iPhone', 'Galaxy', 'Pixel_Hotspot', 'OnePlus',
    'Xiaomi_AP', 'Huawei_Mobile', 'Samsung_S'
  ]
};

// Password categories with examples
const passwordPatterns = {
  numeric: {
    examples: [
      '12345678', '87654321', '11111111', '00000000', '12341234',
      '11223344', '99999999', '88888888', '13579246', '24681357',
      '20232023', '20242024', '19901990', '12121212', '10101010'
    ],
    complexity: 'easy',
    weight: 15
  },
  common: {
    examples: [
      'password', 'password1', 'password123', 'qwerty123', 'letmein1',
      'welcome1', 'admin123', 'root1234', 'guest123', 'test1234',
      'changeme', 'temp1234', 'default1', 'master12', 'access12'
    ],
    complexity: 'easy',
    weight: 20
  },
  names: {
    examples: [
      'john2023', 'mike1990', 'sarah123', 'david456', 'emma2024',
      'alex1985', 'maria99', 'james007', 'anna2000', 'chris77',
      'peter123', 'lisa2023', 'mark1234', 'kate5678', 'tom09876'
    ],
    complexity: 'medium',
    weight: 20
  },
  patterns: {
    examples: [
      'abcd1234', 'qwer1234', 'asdf5678', 'zxcv9876', '1q2w3e4r',
      'pass1234', 'word5678', 'test9876', 'demo1234', 'user5678',
      'love2024', 'home1234', 'wifi5678', 'net12345', 'lan98765'
    ],
    complexity: 'medium',
    weight: 20
  },
  alphanumeric: {
    examples: [
      'AbCd1234', 'Pass99Wd', 'WiFi2024', 'SecuRe99', 'NetWork88',
      'Router55', 'Access77', 'MyPass33', 'TopSec22', 'HighNet11',
      'FastNet99', 'HotSpot88', 'Connect77', 'LinkUp66', 'WebPass55'
    ],
    complexity: 'medium',
    weight: 15
  },
  complex: {
    examples: [
      'P@ssw0rd!', 'Secur3#Me', 'WiFi$2024', 'N3tw0rk!', 'Acc3ss@99',
      'R00ter#1', 'H0tSp0t$', 'C0nn3ct!', 'S@fe&Net', 'Pr0t3ct#',
      'Str0ng!Pw', 'H@rd2Gu3ss', 'C0mpl3x!', 'MyP@ss99', 'T0p$3cr3t'
    ],
    complexity: 'hard',
    weight: 10
  }
};

// Generate random hex string
function randomHex(length) {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Generate random MAC address
function generateMAC() {
  const parts = [];
  for (let i = 0; i < 6; i++) {
    parts.push(randomHex(2));
  }
  return parts.join(':').toUpperCase();
}

// Convert string to hex
function stringToHex(str) {
  return str.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

// Generate SSID
function generateSSID() {
  const categories = Object.keys(ssidPatterns);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const patterns = ssidPatterns[category];
  let ssid = patterns[Math.floor(Math.random() * patterns.length)];
  
  // Add random suffix for uniqueness
  if (Math.random() > 0.3) {
    const suffixes = ['_5G', '_2.4G', '_Guest', '_Secure', ''];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    if (category === 'router') {
      ssid += '-' + randomHex(4).toUpperCase();
    } else if (category === 'mobile') {
      ssid += '_' + Math.floor(Math.random() * 9000 + 1000);
    } else if (suffix) {
      ssid += suffix;
    }
  }
  
  return ssid;
}

// Select password based on weighted categories
function selectPassword() {
  const totalWeight = Object.values(passwordPatterns).reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [category, data] of Object.entries(passwordPatterns)) {
    random -= data.weight;
    if (random <= 0) {
      return {
        password: data.examples[Math.floor(Math.random() * data.examples.length)],
        complexity: data.complexity,
        category
      };
    }
  }
  
  // Fallback
  return {
    password: 'password123',
    complexity: 'easy',
    category: 'common'
  };
}

// Generate hc22000 format hash (PMKID type)
function generatePMKIDHash(ssid, macAP, macClient) {
  const pmkid = randomHex(32);
  const macAPClean = macAP.replace(/:/g, '').toLowerCase();
  const macClientClean = macClient.replace(/:/g, '').toLowerCase();
  const essidHex = stringToHex(ssid);
  
  return `WPA*01*${pmkid}*${macAPClean}*${macClientClean}*${essidHex}***`;
}

// Generate hc22000 format hash (EAPOL type)
function generateEAPOLHash(ssid, macAP, macClient) {
  const mic = randomHex(32);
  const macAPClean = macAP.replace(/:/g, '').toLowerCase();
  const macClientClean = macClient.replace(/:/g, '').toLowerCase();
  const essidHex = stringToHex(ssid);
  const nonceAP = randomHex(64);
  const eapolClient = randomHex(256);
  const messagePair = Math.floor(Math.random() * 3); // 0, 1, or 2
  
  return `WPA*02*${mic}*${macAPClean}*${macClientClean}*${essidHex}*${nonceAP}*${eapolClient}*0${messagePair}`;
}

// Generate a single mock hash entry
export function generateMockHash(id) {
  const ssid = generateSSID();
  const bssid = generateMAC();
  const client = generateMAC();
  const { password, complexity, category } = selectPassword();
  
  // 40% PMKID, 60% EAPOL
  const isPMKID = Math.random() < 0.4;
  const hash = isPMKID 
    ? generatePMKIDHash(ssid, bssid, client)
    : generateEAPOLHash(ssid, bssid, client);
  
  return {
    id: `hash_${String(id).padStart(4, '0')}`,
    type: isPMKID ? 'PMKID' : 'EAPOL',
    hash,
    ssid,
    bssid,
    client,
    password, // Hidden in production, used for simulation
    complexity,
    category,
    addedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending', // pending, cracking, cracked, failed
    crackedAt: null,
    attackMode: null,
    timeTocrack: null
  };
}

// Generate full mock database
export function generateMockDatabase(count = 500) {
  const hashes = [];
  const usedSSIDs = new Set();
  
  for (let i = 1; i <= count; i++) {
    let hash = generateMockHash(i);
    
    // Ensure unique SSIDs
    while (usedSSIDs.has(hash.ssid)) {
      hash = generateMockHash(i);
    }
    usedSSIDs.add(hash.ssid);
    hashes.push(hash);
  }
  
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalCount: count,
    hashes
  };
}

// Pre-cracked hashes (for demo purposes)
export function generatePreCrackedHashes(database, percentage = 10) {
  const countToCrack = Math.floor(database.hashes.length * (percentage / 100));
  const indices = [];
  
  while (indices.length < countToCrack) {
    const idx = Math.floor(Math.random() * database.hashes.length);
    if (!indices.includes(idx)) {
      indices.push(idx);
    }
  }
  
  indices.forEach(idx => {
    database.hashes[idx].status = 'cracked';
    database.hashes[idx].crackedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    database.hashes[idx].attackMode = ['dictionary', 'bruteforce', 'hybrid'][Math.floor(Math.random() * 3)];
    database.hashes[idx].timeToCrack = Math.floor(Math.random() * 3600) + 10; // 10 seconds to 1 hour
  });
  
  return database;
}

export default { generateMockHash, generateMockDatabase, generatePreCrackedHashes };
