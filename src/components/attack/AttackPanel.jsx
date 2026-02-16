import { motion } from 'framer-motion';
import {
  AlertCircle,
  Book,
  ChevronRight,
  Clock,
  Combine,
  Hash,
  Info,
  Pause,
  Play,
  RefreshCw,
  Square,
  Target,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCracking } from '../../context/CrackingContext';
import { importRealNetworks } from '../../services/database/hashDB';
import { generateMockHash } from '../../services/database/mockGenerator';
import {
  PRESET_MASKS,
  WORDLISTS,
  calculateKeyspace,
  estimateTime,
  formatNumber,
  formatSpeed,
  formatTime
} from '../../services/hashcat/simulator';
import './AttackPanel.css';

function AttackPanel() {
  const {
    database,
    setDatabase,
    refreshDatabase,
    selectedHashes,
    setSelectedHashes,
    session,
    isActive,
    startAttack,
    pause,
    resume,
    stop
  } = useCracking();

  const [attackMode, setAttackMode] = useState('dictionary');
  const [wordlist, setWordlist] = useState('rockyou_sample');
  const [mask, setMask] = useState('?d?d?d?d?d?d?d?d');
  const [hybridMask, setHybridMask] = useState('?d?d?d');
  const [targetHash, setTargetHash] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const isElectron = !!window.electronAPI;

  // Set target hash from selection
  useEffect(() => {
    if (selectedHashes.length > 0) {
      setTargetHash(selectedHashes[0]);
    }
  }, [selectedHashes]);

  // Available pending hashes
  const pendingHashes = database?.hashes?.filter(h => h.status === 'pending') || [];

  const handleSelectTarget = (hashId) => {
    const hash = database?.hashes?.find(h => h.id === hashId);
    if (hash) {
      setTargetHash(hash);
      setSelectedHashes([hash]);
    }
  };

  const handleStartAttack = () => {
    if (!targetHash) return;

    const options = {
      wordlist: wordlist,
      mask: attackMode === 'bruteforce' ? mask : hybridMask
    };

    startAttack(targetHash, attackMode, options);
  };

  const handleScanNetworks = async () => {
    if (isElectron) {
      setIsScanning(true);
      try {
        const result = await window.electronAPI.scanNetworks();
        if (result.success && result.networks.length > 0) {
          importRealNetworks(database, result.networks);
          refreshDatabase();
          if (!targetHash && result.networks.length > 0) {
            const firstReal = database.hashes.find(h => h.ssid === result.networks[0].ssid);
            if (firstReal) {
              setTargetHash(firstReal);
              setSelectedHashes([firstReal]);
            }
          }
        }
      } catch (error) {
        console.error("Scan failed:", error);
      } finally {
        setIsScanning(false);
      }
    } else {
      // Web / server mode — generate simulated networks
      setIsScanning(true);
      setTimeout(() => {
        const mockNets = [];
        for (let i = 0; i < 5; i++) {
          const m = generateMockHash(Date.now() + i);
          mockNets.push({
            ssid: m.ssid,
            bssid: m.bssid,
            rssi: String(-1 * (40 + Math.floor(Math.random() * 50))),
            channel: String(Math.floor(Math.random() * 11) + 1),
            security: m.type === 'PMKID' ? 'WPA2' : 'WPA',
            type: 'Simulated',
          });
        }
        importRealNetworks(database, mockNets);
        refreshDatabase();
        if (!targetHash && database.hashes.length > 0) {
          const newest = database.hashes[database.hashes.length - 1];
          setTargetHash(newest);
          setSelectedHashes([newest]);
        }
        setIsScanning(false);
      }, 1500);
    }
  };

  const currentKeyspace = calculateKeyspace(attackMode === 'bruteforce' ? mask : hybridMask);
  const estimatedSpeed = 2000; // Approximate H/s
  const estimatedTime = estimateTime(currentKeyspace, estimatedSpeed);

  const attackModes = [
    {
      id: 'dictionary',
      name: 'Dictionary Attack',
      icon: Book,
      flag: '-a 0',
      description: 'Try passwords from a wordlist'
    },
    {
      id: 'bruteforce',
      name: 'Brute-force Attack',
      icon: Hash,
      flag: '-a 3',
      description: 'Try all character combinations'
    },
    {
      id: 'hybrid',
      name: 'Hybrid Attack',
      icon: Combine,
      flag: '-a 6',
      description: 'Wordlist + character mask'
    }
  ];

  return (
    <div className="attack-panel">
      {/* Server / Web mode info banner */}
      {!isElectron && (
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', marginBottom: '16px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '10px', fontSize: '13px', color: '#93c5fd',
          }}
        >
          <Info size={18} style={{ flexShrink: 0, color: '#60a5fa' }} />
          <span>
            <strong>Simulation Mode</strong> — WiFi scanning is unavailable on the server.
            Use <em>"Generate"</em> to create simulated networks for educational demonstration.
          </span>
        </motion.div>
      )}

      <div className="attack-grid">
        {/* Target Selection */}
        <motion.div
          className="panel-card glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="card-header">
            <Target size={20} />
            <h3>Target Hash</h3>
            <div style={{ marginLeft: 'auto' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleScanNetworks}
                disabled={isScanning || isActive}
                title={isElectron ? 'Scan for real networks' : 'Generate simulated networks'}
              >
                <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
                {isScanning
                  ? (isElectron ? ' Scanning...' : ' Generating...')
                  : (isElectron ? ' Scan' : ' Generate')}
              </button>
            </div>
          </div>

          <div className="card-content">
            {targetHash ? (
              <div className="target-info">
                <div className="target-ssid">{targetHash.ssid}</div>
                <div className="target-meta">
                  <span className="badge badge-info">{targetHash.type}</span>
                  <span className="text-muted font-mono text-sm">{targetHash.bssid}</span>
                  {targetHash.category === 'real_scan' && <span className="badge badge-success">Real</span>}
                </div>
                <div className="target-hash font-mono text-xs">
                  {targetHash.hash.substring(0, 60)}...
                </div>
              </div>
            ) : (
              <div className="no-target">
                <AlertCircle size={24} />
                <p>No target selected</p>
              </div>
            )}

            <div className="target-selector">
              <label>Select Target:</label>
              <select
                className="select"
                value={targetHash?.id || ''}
                onChange={(e) => handleSelectTarget(e.target.value)}
                disabled={isActive}
              >
                <option value="">-- Select a hash --</option>
                {pendingHashes.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.category === 'real_scan' ? '📡 ' : ''}{h.ssid} ({h.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Attack Mode Selection */}
        <motion.div
          className="panel-card glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card-header">
            <Zap size={20} />
            <h3>Attack Mode</h3>
          </div>

          <div className="card-content">
            <div className="mode-buttons">
              {attackModes.map(mode => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    className={`mode-btn ${attackMode === mode.id ? 'active' : ''}`}
                    onClick={() => setAttackMode(mode.id)}
                    disabled={isActive}
                  >
                    <Icon size={20} />
                    <div className="mode-info">
                      <span className="mode-name">{mode.name}</span>
                      <span className="mode-flag font-mono">{mode.flag}</span>
                    </div>
                    {attackMode === mode.id && <ChevronRight size={16} className="mode-arrow" />}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Attack Configuration */}
        <motion.div
          className="panel-card glass-card config-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <Clock size={20} />
            <h3>Configuration</h3>
          </div>

          <div className="card-content">
            {attackMode === 'dictionary' && (
              <div className="config-section">
                <label>Wordlist</label>
                <select
                  className="select"
                  value={wordlist}
                  onChange={(e) => setWordlist(e.target.value)}
                  disabled={isActive}
                >
                  {Object.entries(WORDLISTS).map(([key, wl]) => (
                    <option key={key} value={key}>
                      {wl.name} ({formatNumber(wl.size)} words)
                    </option>
                  ))}
                </select>
                <p className="config-desc">{WORDLISTS[wordlist]?.description}</p>
              </div>
            )}

            {attackMode === 'bruteforce' && (
              <div className="config-section">
                <label>Mask</label>
                <div className="mask-presets">
                  {PRESET_MASKS.map((preset, idx) => (
                    <button
                      key={idx}
                      className={`preset-btn ${mask === preset.mask ? 'active' : ''}`}
                      onClick={() => setMask(preset.mask)}
                      disabled={isActive}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="input input-mono"
                  value={mask}
                  onChange={(e) => setMask(e.target.value)}
                  placeholder="?d?d?d?d?d?d?d?d"
                  disabled={isActive}
                />
                <div className="mask-legend">
                  <span>?l=a-z</span>
                  <span>?u=A-Z</span>
                  <span>?d=0-9</span>
                  <span>?s=special</span>
                  <span>?a=all</span>
                </div>
                <div className="keyspace-info">
                  <span>Keyspace: <strong>{formatNumber(currentKeyspace)}</strong></span>
                  <span>Est. Time: <strong>{formatTime(estimatedTime)}</strong></span>
                </div>
              </div>
            )}

            {attackMode === 'hybrid' && (
              <div className="config-section">
                <label>Wordlist</label>
                <select
                  className="select"
                  value={wordlist}
                  onChange={(e) => setWordlist(e.target.value)}
                  disabled={isActive}
                >
                  {Object.entries(WORDLISTS).map(([key, wl]) => (
                    <option key={key} value={key}>
                      {wl.name} ({formatNumber(wl.size)} words)
                    </option>
                  ))}
                </select>

                <label className="mt-4">Append Mask</label>
                <input
                  type="text"
                  className="input input-mono"
                  value={hybridMask}
                  onChange={(e) => setHybridMask(e.target.value)}
                  placeholder="?d?d?d"
                  disabled={isActive}
                />
                <p className="config-desc">
                  Appends mask to each word: word + {hybridMask}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Control Panel */}
        <motion.div
          className="panel-card glass-card control-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <Play size={20} />
            <h3>Controls</h3>
          </div>

          <div className="card-content">
            {!isActive ? (
              <button
                className="btn btn-primary btn-large"
                onClick={handleStartAttack}
                disabled={!targetHash}
              >
                <Play size={20} />
                Start Attack
              </button>
            ) : (
              <div className="control-buttons">
                {session?.status === 'running' ? (
                  <button className="btn btn-secondary" onClick={pause}>
                    <Pause size={18} /> Pause
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={resume}>
                    <Play size={18} /> Resume
                  </button>
                )}
                <button className="btn btn-danger" onClick={stop}>
                  <Square size={18} /> Stop
                </button>
              </div>
            )}

            {isActive && (
              <div className="attack-status">
                <div className="status-row">
                  <span>Status</span>
                  <span className={`status-value ${session?.status}`}>
                    {session?.status?.toUpperCase()}
                  </span>
                </div>
                <div className="status-row">
                  <span>Mode</span>
                  <span>{session?.attackMode}</span>
                </div>
                <div className="status-row">
                  <span>Speed</span>
                  <span>{formatSpeed(session?.speed || 0)}</span>
                </div>
                <div className="status-row">
                  <span>Progress</span>
                  <span>{(session?.progress || 0).toFixed(2)}%</span>
                </div>
              </div>
            )}

            {session?.status === 'completed' && (
              <div className="success-message">
                <span className="success-icon">🎉</span>
                <p>Password Found!</p>
                <p className="found-password font-mono">{session?.foundPassword}</p>
              </div>
            )}

            {session?.status === 'exhausted' && (
              <div className="exhausted-message">
                <AlertCircle size={24} />
                <p>Keyspace exhausted. Try a different attack.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default AttackPanel;
