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
import { useEffect, useMemo, useState } from 'react';
import { useCracking } from '../../context/CrackingContext';
import { useI18n } from '../../context/I18nContext';
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
    refreshDatabase,
    selectedHashes,
    setSelectedHashes,
    session,
    isActive,
    isRealBackendEnabled,
    startAttack,
    pause,
    resume,
    stop
  } = useCracking();
  const { t } = useI18n();

  const [attackMode, setAttackMode] = useState('dictionary');
  const [wordlist, setWordlist] = useState('rockyou_sample');
  const [mask, setMask] = useState('?d?d?d?d?d?d?d?d');
  const [hybridMask, setHybridMask] = useState('?d?d?d');
  const [targetHash, setTargetHash] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const isElectron = !!window.electronAPI;

  useEffect(() => {
    if (selectedHashes.length > 0) {
      setTargetHash(selectedHashes[0]);
    }
  }, [selectedHashes]);

  const pendingHashes = useMemo(
    () => database?.hashes?.filter((hash) => hash.status === 'pending') || [],
    [database]
  );

  const handleSelectTarget = (hashId) => {
    const hash = database?.hashes?.find((item) => item.id === hashId);
    if (hash) {
      setTargetHash(hash);
      setSelectedHashes([hash]);
    }
  };

  const handleStartAttack = () => {
    if (!targetHash) return;

    const options = {
      wordlist,
      wordlistKey: wordlist,
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
            const firstReal = database.hashes.find((hash) => hash.ssid === result.networks[0].ssid);
            if (firstReal) {
              setTargetHash(firstReal);
              setSelectedHashes([firstReal]);
            }
          }
        }
      } catch (error) {
        console.error('Scan failed:', error);
      } finally {
        setIsScanning(false);
      }
      return;
    }

    setIsScanning(true);
    setTimeout(() => {
      const mockNets = [];
      for (let i = 0; i < 5; i += 1) {
        const mock = generateMockHash(Date.now() + i);
        mockNets.push({
          ssid: mock.ssid,
          bssid: mock.bssid,
          rssi: String(-1 * (40 + Math.floor(Math.random() * 50))),
          channel: String(Math.floor(Math.random() * 11) + 1),
          security: mock.type === 'PMKID' ? 'WPA2' : 'WPA',
          type: 'Simulated'
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
  };

  const currentKeyspace = calculateKeyspace(attackMode === 'bruteforce' ? mask : hybridMask);
  const estimatedSpeed = 2000;
  const estimatedTime = estimateTime(currentKeyspace, estimatedSpeed);

  const attackModes = useMemo(() => ([
    {
      id: 'dictionary',
      name: t('attack.modes.dictionary.name'),
      icon: Book,
      flag: '-a 0'
    },
    {
      id: 'bruteforce',
      name: t('attack.modes.bruteforce.name'),
      icon: Hash,
      flag: '-a 3'
    },
    {
      id: 'hybrid',
      name: t('attack.modes.hybrid.name'),
      icon: Combine,
      flag: '-a 6'
    }
  ]), [t]);

  const selectedWordlist = WORDLISTS[wordlist] || WORDLISTS.rockyou_sample;
  const wordlistEntries = Object.entries(WORDLISTS);

  const renderWordlistSelect = () => (
    <>
      <label>{t('attack.selectWordlist')}</label>
      <select
        className="select"
        value={wordlist}
        onChange={(event) => setWordlist(event.target.value)}
        disabled={isActive}
      >
        {wordlistEntries.map(([key, wl]) => (
          <option key={key} value={key}>
            {t(wl.nameKey)} ({formatNumber(wl.size)} {t('attack.words')})
          </option>
        ))}
      </select>
      <p className="config-desc">{t(selectedWordlist.descriptionKey)}</p>
      {isRealBackendEnabled && selectedWordlist?.serverPath && (
        <p className="config-desc">
          {t('attack.serverWordlistPath', { path: selectedWordlist.serverPath })}
        </p>
      )}
    </>
  );

  return (
    <div className="attack-panel">
      {!isElectron && (
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#93c5fd'
          }}
        >
          <Info size={18} style={{ flexShrink: 0, color: '#60a5fa' }} />
          <span>
            <strong>{t('attack.simulationBanner.title')}</strong> {t('attack.simulationBanner.message')}
          </span>
        </motion.div>
      )}

      {isRealBackendEnabled && (
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#86efac'
          }}
        >
          <Info size={18} style={{ flexShrink: 0, color: '#4ade80' }} />
          <span>
            <strong>{t('attack.realBanner.title')}</strong> {t('attack.realBanner.message')}
          </span>
        </motion.div>
      )}

      <div className="attack-grid">
        <motion.div
          className="panel-card glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="card-header">
            <Target size={20} />
            <h3>{t('attack.targetHash')}</h3>
            <div style={{ marginLeft: 'auto' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleScanNetworks}
                disabled={isScanning || isActive}
                title={isElectron ? t('attack.scanRealNetworks') : t('attack.generateSimulatedNetworks')}
              >
                <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
                {isScanning
                  ? (isElectron ? ` ${t('attack.scanning')}` : ` ${t('attack.generating')}`)
                  : (isElectron ? ` ${t('attack.scan')}` : ` ${t('attack.generate')}`)}
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
                  {targetHash.category === 'real_scan' && (
                    <span className="badge badge-success">{t('attack.real')}</span>
                  )}
                </div>
                <div className="target-hash font-mono text-xs">
                  {targetHash.hash.substring(0, 60)}...
                </div>
              </div>
            ) : (
              <div className="no-target">
                <AlertCircle size={24} />
                <p>{t('attack.noTargetSelected')}</p>
              </div>
            )}

            <div className="target-selector">
              <label>{t('attack.selectTarget')}</label>
              <select
                className="select"
                value={targetHash?.id || ''}
                onChange={(event) => handleSelectTarget(event.target.value)}
                disabled={isActive}
              >
                <option value="">{t('attack.selectHashPlaceholder')}</option>
                {pendingHashes.map((hash) => (
                  <option key={hash.id} value={hash.id}>
                    {hash.category === 'real_scan' ? `📡 ${t('attack.realPrefix')} ` : ''}{hash.ssid} ({hash.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="panel-card glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card-header">
            <Zap size={20} />
            <h3>{t('attack.attackMode')}</h3>
          </div>

          <div className="card-content">
            <div className="mode-buttons">
              {attackModes.map((mode) => {
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

        <motion.div
          className="panel-card glass-card config-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <Clock size={20} />
            <h3>{t('attack.configuration')}</h3>
          </div>

          <div className="card-content">
            {attackMode === 'dictionary' && (
              <div className="config-section">
                {renderWordlistSelect()}
              </div>
            )}

            {attackMode === 'bruteforce' && (
              <div className="config-section">
                <label>{t('attack.mask')}</label>
                <div className="mask-presets">
                  {PRESET_MASKS.map((preset) => (
                    <button
                      key={preset.mask}
                      className={`preset-btn ${mask === preset.mask ? 'active' : ''}`}
                      onClick={() => setMask(preset.mask)}
                      disabled={isActive}
                    >
                      {t(preset.nameKey)}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="input input-mono"
                  value={mask}
                  onChange={(event) => setMask(event.target.value)}
                  placeholder="?d?d?d?d?d?d?d?d"
                  disabled={isActive}
                />
                <div className="mask-legend">
                  <span>{t('attack.maskLegend.lowercase')}</span>
                  <span>{t('attack.maskLegend.uppercase')}</span>
                  <span>{t('attack.maskLegend.digits')}</span>
                  <span>{t('attack.maskLegend.special')}</span>
                  <span>{t('attack.maskLegend.all')}</span>
                </div>
                <div className="keyspace-info">
                  <span>{t('attack.keyspace')}: <strong>{formatNumber(currentKeyspace)}</strong></span>
                  <span>{t('attack.estimatedTime')}: <strong>{formatTime(estimatedTime)}</strong></span>
                </div>
              </div>
            )}

            {attackMode === 'hybrid' && (
              <div className="config-section">
                {renderWordlistSelect()}

                <label className="mt-4">{t('attack.appendMask')}</label>
                <input
                  type="text"
                  className="input input-mono"
                  value={hybridMask}
                  onChange={(event) => setHybridMask(event.target.value)}
                  placeholder="?d?d?d"
                  disabled={isActive}
                />
                <p className="config-desc">
                  {t('attack.hybridMaskDescription', { mask: hybridMask })}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          className="panel-card glass-card control-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <Play size={20} />
            <h3>{t('attack.controls')}</h3>
          </div>

          <div className="card-content">
            {!isActive ? (
              <button
                className="btn btn-primary btn-large"
                onClick={handleStartAttack}
                disabled={!targetHash}
              >
                <Play size={20} />
                {t('attack.startAttack')}
              </button>
            ) : (
              <div className="control-buttons">
                {!isRealBackendEnabled && (
                  <>
                    {session?.status === 'running' ? (
                      <button className="btn btn-secondary" onClick={pause}>
                        <Pause size={18} /> {t('attack.pause')}
                      </button>
                    ) : (
                      <button className="btn btn-primary" onClick={resume}>
                        <Play size={18} /> {t('attack.resume')}
                      </button>
                    )}
                  </>
                )}
                <button className="btn btn-danger" onClick={stop}>
                  <Square size={18} /> {t('attack.stop')}
                </button>
              </div>
            )}

            {isActive && (
              <div className="attack-status">
                <div className="status-row">
                  <span>{t('attack.status')}</span>
                  <span className={`status-value ${session?.status}`}>
                    {t(`attack.statusValues.${session?.status || 'idle'}`)}
                  </span>
                </div>
                <div className="status-row">
                  <span>{t('attack.mode')}</span>
                  <span>{t(`attack.modes.${session?.attackMode || 'dictionary'}.name`)}</span>
                </div>
                <div className="status-row">
                  <span>{t('attack.speed')}</span>
                  <span>{formatSpeed(session?.speed || 0)}</span>
                </div>
                <div className="status-row">
                  <span>{t('attack.progress')}</span>
                  <span>{(session?.progress || 0).toFixed(2)}%</span>
                </div>
              </div>
            )}

            {session?.status === 'completed' && (
              <div className="success-message">
                <span className="success-icon">🎉</span>
                <p>{t('attack.passwordFound')}</p>
                <p className="found-password font-mono">{session?.foundPassword}</p>
              </div>
            )}

            {session?.status === 'exhausted' && (
              <div className="exhausted-message">
                <AlertCircle size={24} />
                <p>{t('attack.keyspaceExhausted')}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default AttackPanel;
