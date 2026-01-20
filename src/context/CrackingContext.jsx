import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getStatistics, initializeDatabase, saveDatabase } from '../services/database/hashDB';
import {
    getSession,
    isSessionActive,
    pauseAttack,
    resumeAttack,
    startBruteforceAttack,
    startDictionaryAttack,
    startHybridAttack,
    stopAttack
} from '../services/hashcat/simulator';

const CrackingContext = createContext(null);

export function CrackingProvider({ children }) {
  const [database, setDatabase] = useState(null);
  const [stats, setStats] = useState(null);
  const [session, setSession] = useState(getSession());
  const [selectedHashes, setSelectedHashes] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Initialize database on mount
  useEffect(() => {
    const db = initializeDatabase();
    setDatabase(db);
    setStats(getStatistics(db));
  }, []);
  
  // Update database and stats
  const refreshDatabase = useCallback(() => {
    if (database) {
      saveDatabase(database);
      setStats(getStatistics(database));
    }
  }, [database]);
  
  // Update session callback
  const handleSessionUpdate = useCallback((newSession) => {
    setSession({ ...newSession });
    
    // If password found, update hash status
    if (newSession.found && database) {
      const hashIndex = database.hashes.findIndex(h => h.id === newSession.hashId);
      if (hashIndex !== -1) {
        database.hashes[hashIndex].status = 'cracked';
        database.hashes[hashIndex].crackedAt = new Date().toISOString();
        database.hashes[hashIndex].attackMode = newSession.attackMode;
        database.hashes[hashIndex].timeToCrack = Math.floor(newSession.getElapsedTime?.() || 0);
        refreshDatabase();
      }
    }
  }, [database, refreshDatabase]);
  
  // Attack controls
  const startAttack = useCallback((hash, mode, options) => {
    if (!hash) return;
    
    // Update hash status to cracking
    if (database) {
      const hashIndex = database.hashes.findIndex(h => h.id === hash.id);
      if (hashIndex !== -1) {
        database.hashes[hashIndex].status = 'cracking';
        refreshDatabase();
      }
    }
    
    let newSession;
    switch (mode) {
      case 'dictionary':
        newSession = startDictionaryAttack(hash, options.wordlist, handleSessionUpdate);
        break;
      case 'bruteforce':
        newSession = startBruteforceAttack(hash, options.mask, handleSessionUpdate);
        break;
      case 'hybrid':
        newSession = startHybridAttack(hash, options.wordlist, options.mask, handleSessionUpdate);
        break;
      default:
        return;
    }
    
    setSession({ ...newSession });
  }, [database, refreshDatabase, handleSessionUpdate]);
  
  const pause = useCallback(() => {
    const newSession = pauseAttack();
    setSession({ ...newSession });
  }, []);
  
  const resume = useCallback(() => {
    const newSession = resumeAttack();
    setSession({ ...newSession });
  }, []);
  
  const stop = useCallback(() => {
    const newSession = stopAttack();
    setSession({ ...newSession });
    
    // Reset hash status if not cracked
    if (database && newSession.hashId) {
      const hashIndex = database.hashes.findIndex(h => h.id === newSession.hashId);
      if (hashIndex !== -1 && database.hashes[hashIndex].status === 'cracking') {
        database.hashes[hashIndex].status = 'pending';
        refreshDatabase();
      }
    }
  }, [database, refreshDatabase]);
  
  // Reset database
  const resetDatabase = useCallback(() => {
    const db = initializeDatabase(true);
    setDatabase(db);
    setStats(getStatistics(db));
    setSelectedHashes([]);
  }, []);
  
  const value = {
    database,
    setDatabase,
    stats,
    refreshDatabase,
    session,
    isActive: isSessionActive(),
    startAttack,
    pause,
    resume,
    stop,
    selectedHashes,
    setSelectedHashes,
    activeTab,
    setActiveTab,
    resetDatabase
  };
  
  return (
    <CrackingContext.Provider value={value}>
      {children}
    </CrackingContext.Provider>
  );
}

export function useCracking() {
  const context = useContext(CrackingContext);
  if (!context) {
    throw new Error('useCracking must be used within a CrackingProvider');
  }
  return context;
}

export default CrackingContext;
