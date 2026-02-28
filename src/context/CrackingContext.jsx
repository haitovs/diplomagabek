import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getStatistics, initializeDatabase, saveDatabase } from '../services/database/hashDB';
import {
  getSession,
  pauseAttack,
  resumeAttack,
  startBruteforceAttack,
  startDictionaryAttack,
  startHybridAttack,
  stopAttack
} from '../services/hashcat/simulator';
import {
  createDictionaryJob,
  getJobStatus,
  isRealHashcatEnabled,
  stopJob
} from '../services/hashcat/apiClient';

const CrackingContext = createContext(null);
const REAL_POLL_INTERVAL_MS = 2000;

function buildRealtimeSession(hash, options = {}) {
  return {
    status: 'running',
    hashId: hash.id,
    targetHash: hash,
    attackMode: 'dictionary',
    wordlist: options.wordlist || 'server_default',
    mask: null,
    startTime: Date.now(),
    pauseTime: null,
    totalPauseTime: 0,
    speed: 0,
    progress: 0,
    candidatesTested: 0,
    candidatesTotal: 0,
    currentCandidate: '',
    foundPassword: null,
    eta: null,
    intervalId: null,
    logs: []
  };
}

export function CrackingProvider({ children }) {
  const [database, setDatabase] = useState(null);
  const [stats, setStats] = useState(null);
  const [session, setSession] = useState(getSession());
  const [selectedHashes, setSelectedHashes] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  const realJobRef = useRef({
    jobId: null,
    pollId: null,
    startTime: null,
    hashId: null
  });

  // Initialize database on mount
  useEffect(() => {
    const db = initializeDatabase();
    setDatabase(db);
    setStats(getStatistics(db));
  }, []);

  const clearRealPolling = useCallback(() => {
    if (realJobRef.current.pollId) {
      clearInterval(realJobRef.current.pollId);
    }

    realJobRef.current.pollId = null;
    realJobRef.current.jobId = null;
    realJobRef.current.startTime = null;
    realJobRef.current.hashId = null;
  }, []);

  useEffect(() => {
    return () => {
      clearRealPolling();
    };
  }, [clearRealPolling]);

  // Update database and stats
  const refreshDatabase = useCallback(() => {
    if (database) {
      saveDatabase(database);
      setStats(getStatistics(database));
    }
  }, [database]);

  const updateHashData = useCallback((hashId, updates) => {
    if (!database || !hashId) {
      return;
    }

    const hashIndex = database.hashes.findIndex((hash) => hash.id === hashId);
    if (hashIndex === -1) {
      return;
    }

    database.hashes[hashIndex] = {
      ...database.hashes[hashIndex],
      ...updates
    };

    refreshDatabase();
  }, [database, refreshDatabase]);

  // Update session callback
  const handleSessionUpdate = useCallback((newSession) => {
    setSession({ ...newSession });

    if (newSession.found) {
      updateHashData(newSession.hashId, {
        status: 'cracked',
        crackedAt: new Date().toISOString(),
        attackMode: newSession.attackMode,
        timeToCrack: Math.floor(newSession.getElapsedTime?.() || 0),
        failReason: null,
        password: newSession.foundPassword || newSession.targetHash?.password || null
      });
    }

    if (newSession.exhausted || newSession.status === 'exhausted' || newSession.status === 'failed') {
      updateHashData(newSession.hashId, {
        status: 'failed',
        attackMode: newSession.attackMode,
        timeToCrack: Math.floor(newSession.getElapsedTime?.() || 0),
        failReason: newSession.failReason || 'Keyspace/wordlist exhausted'
      });
    }
  }, [updateHashData]);

  const pollRealJob = useCallback((jobId, hash) => {
    const poll = async () => {
      try {
        const job = await getJobStatus(jobId);
        const elapsedSeconds = realJobRef.current.startTime
          ? (Date.now() - realJobRef.current.startTime) / 1000
          : 0;

        const mappedSession = {
          status: job.status === 'cracking' || job.status === 'pending'
            ? 'running'
            : job.status,
          hashId: hash.id,
          targetHash: hash,
          attackMode: 'dictionary',
          wordlist: job.wordlistPath,
          speed: job.speed || 0,
          progress: job.progress || 0,
          candidatesTested: job.candidatesTested || 0,
          candidatesTotal: job.candidatesTotal || 0,
          logs: job.logs || [],
          foundPassword: job.password || null,
          getElapsedTime: () => elapsedSeconds
        };

        setSession((previous) => ({
          ...previous,
          ...mappedSession
        }));

        if (job.status === 'cracked') {
          handleSessionUpdate({
            ...mappedSession,
            found: true,
            status: 'completed'
          });
          clearRealPolling();
          return;
        }

        if (job.status === 'failed') {
          handleSessionUpdate({
            ...mappedSession,
            exhausted: true,
            status: 'exhausted',
            failReason: job.failReason
          });
          clearRealPolling();
          return;
        }

        if (job.status === 'stopped') {
          setSession((previous) => ({
            ...previous,
            status: 'stopped'
          }));
          clearRealPolling();
        }
      } catch (error) {
        setSession((previous) => ({
          ...previous,
          status: 'failed',
          logs: [
            ...(previous.logs || []),
            {
              type: 'error',
              message: error.message,
              timestamp: new Date().toISOString()
            }
          ]
        }));

        updateHashData(hash.id, {
          status: 'failed',
          failReason: error.message
        });

        clearRealPolling();
      }
    };

    realJobRef.current.pollId = setInterval(poll, REAL_POLL_INTERVAL_MS);
    poll();
  }, [clearRealPolling, handleSessionUpdate, updateHashData]);

  // Attack controls
  const startAttack = useCallback(async (hash, mode, options = {}) => {
    if (!hash) return;

    updateHashData(hash.id, {
      status: 'cracking',
      failReason: null
    });

    if (mode === 'dictionary' && isRealHashcatEnabled()) {
      try {
        const baseSession = buildRealtimeSession(hash, options);
        setSession(baseSession);

        const job = await createDictionaryJob({
          hashId: hash.id,
          hash: hash.hash,
          hashMode: 22000,
          wordlistPath: options.wordlistPath
        });

        realJobRef.current.jobId = job.jobId;
        realJobRef.current.startTime = Date.now();
        realJobRef.current.hashId = hash.id;

        pollRealJob(job.jobId, hash);
      } catch (error) {
        setSession((previous) => ({
          ...previous,
          status: 'failed',
          logs: [
            ...(previous.logs || []),
            {
              type: 'error',
              message: error.message,
              timestamp: new Date().toISOString()
            }
          ]
        }));

        updateHashData(hash.id, {
          status: 'failed',
          failReason: error.message
        });
      }
      return;
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
  }, [handleSessionUpdate, pollRealJob, updateHashData]);

  const pause = useCallback(() => {
    if (realJobRef.current.jobId) {
      // Hashcat pause is intentionally unsupported via this API layer.
      return;
    }

    const newSession = pauseAttack();
    setSession({ ...newSession });
  }, []);

  const resume = useCallback(() => {
    if (realJobRef.current.jobId) {
      return;
    }

    const newSession = resumeAttack();
    setSession({ ...newSession });
  }, []);

  const stop = useCallback(async () => {
    if (realJobRef.current.jobId) {
      const jobId = realJobRef.current.jobId;
      const hashId = realJobRef.current.hashId;

      try {
        await stopJob(jobId);
      } catch {
        // No-op: local UI state still transitions and polling is cleared.
      }

      clearRealPolling();

      setSession((previous) => ({
        ...previous,
        status: 'stopped'
      }));

      updateHashData(hashId, { status: 'pending' });
      return;
    }

    const newSession = stopAttack();
    setSession({ ...newSession });

    if (database && newSession.hashId) {
      const hashIndex = database.hashes.findIndex((hash) => hash.id === newSession.hashId);
      if (hashIndex !== -1 && database.hashes[hashIndex].status === 'cracking') {
        database.hashes[hashIndex].status = 'pending';
        refreshDatabase();
      }
    }
  }, [clearRealPolling, database, refreshDatabase, updateHashData]);

  // Reset database
  const resetDatabase = useCallback(() => {
    const db = initializeDatabase(true);
    setDatabase(db);
    setStats(getStatistics(db));
    setSelectedHashes([]);
    clearRealPolling();
  }, [clearRealPolling]);

  const value = {
    database,
    setDatabase,
    stats,
    refreshDatabase,
    session,
    isActive: session?.status === 'running' || session?.status === 'paused',
    isRealBackendEnabled: isRealHashcatEnabled(),
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
