import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileUp,
  Loader,
  Radio,
  RefreshCw,
  Shield,
  Square,
  Upload,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCracking } from '../../context/CrackingContext';
import { useI18n } from '../../context/I18nContext';
import {
  checkWifiTools,
  convertPcapFile,
  getCaptureStatus,
  scanWifiNetworks,
  startWifiCapture,
  stopWifiCapture
} from '../../services/hashcat/apiClient';
import { addHash, saveDatabase } from '../../services/database/hashDB';
import './WifiScanner.css';

const CAPTURE_POLL_MS = 2000;

function SignalBars({ percent }) {
  const bars = 4;
  const active = Math.ceil((percent / 100) * bars);
  return (
    <div className="wifi-signal-indicator" title={`${percent}%`}>
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} className={`bar ${i < active ? 'active' : ''}`} />
      ))}
    </div>
  );
}

function WifiScanner() {
  const { t } = useI18n();
  const { database, refreshDatabase, setActiveTab } = useCracking();

  const [networks, setNetworks] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [toolsInfo, setToolsInfo] = useState(null);
  const [toolsLoading, setToolsLoading] = useState(true);

  // Capture state
  const [captureId, setCaptureId] = useState(null);
  const [captureStatus, setCaptureStatus] = useState(null);
  const [captureRunning, setCaptureRunning] = useState(false);
  const [captureDuration, setCaptureDuration] = useState(60);
  const pollRef = useRef(null);

  // Pcap upload state
  const [convertedHashes, setConvertedHashes] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState(null);
  const fileInputRef = useRef(null);

  // Check available tools on mount
  useEffect(() => {
    checkWifiTools()
      .then(setToolsInfo)
      .catch(() => setToolsInfo(null))
      .finally(() => setToolsLoading(false));
  }, []);

  // Poll capture status
  useEffect(() => {
    if (!captureId || !captureRunning) return;

    pollRef.current = setInterval(async () => {
      try {
        const status = await getCaptureStatus(captureId);
        setCaptureStatus(status);

        if (status.status !== 'capturing' && status.status !== 'starting') {
          setCaptureRunning(false);
          clearInterval(pollRef.current);
        }
      } catch {
        // Ignore poll errors
      }
    }, CAPTURE_POLL_MS);

    return () => clearInterval(pollRef.current);
  }, [captureId, captureRunning]);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    try {
      const result = await scanWifiNetworks();
      setNetworks(result.networks || []);
    } catch (err) {
      setScanError(err.message);
      setNetworks([]);
    } finally {
      setScanning(false);
    }
  }, []);

  const handleStartCapture = useCallback(async () => {
    if (!selectedNetwork) return;

    setCaptureStatus(null);
    setCaptureRunning(true);

    try {
      const result = await startWifiCapture({
        bssid: selectedNetwork.bssid,
        ssid: selectedNetwork.ssid,
        channel: selectedNetwork.channel,
        duration: captureDuration
      });
      setCaptureId(result.captureId);
    } catch (err) {
      setCaptureRunning(false);
      setCaptureStatus({ status: 'failed', failReason: err.message, logs: [] });
    }
  }, [selectedNetwork, captureDuration]);

  const handleStopCapture = useCallback(async () => {
    if (!captureId) return;
    try {
      await stopWifiCapture(captureId);
      setCaptureRunning(false);
    } catch {
      // Ignore
    }
  }, [captureId]);

  const handleImportHashes = useCallback((hashes, ssid) => {
    if (!database || !hashes?.length) return 0;

    let imported = 0;
    for (const hashLine of hashes) {
      try {
        addHash(database, {
          source: 'hash',
          hashLine,
          ssid: ssid || 'Captured'
        });
        imported++;
      } catch {
        // Duplicate or invalid — skip
      }
    }

    if (imported > 0) {
      saveDatabase(database);
      refreshDatabase();
    }

    return imported;
  }, [database, refreshDatabase]);

  // Handle pcapng file upload & conversion
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConverting(true);
    setConvertError(null);
    setConvertedHashes(null);

    try {
      const result = await convertPcapFile(file);
      if (result.hashes?.length > 0) {
        setConvertedHashes(result.hashes);
      } else {
        setConvertError(t('wifi.noHashesInFile'));
      }
    } catch (err) {
      setConvertError(err.message);
    } finally {
      setConverting(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [t]);

  const wpaNetworks = networks.filter((n) => n.isWPA);

  return (
    <div className="wifi-scanner-page">
      {/* Tools info banner */}
      {!toolsLoading && toolsInfo && (
        <div className="wifi-tools-banner glass-card">
          <Shield size={18} />
          <div>
            <strong>{t('wifi.toolsAvailable')}</strong>
            <div className="tools-list">
              {Object.entries(toolsInfo.tools).map(([name, available]) => (
                <span key={name} className={`tool-chip ${available ? 'available' : 'missing'}`}>
                  {available ? <CheckCircle size={10} /> : <WifiOff size={10} />}
                  {name}
                </span>
              ))}
            </div>
            {toolsInfo.recommended && (
              <p className="wifi-recommendation">{toolsInfo.recommended}</p>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="wifi-toolbar">
        <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
          {scanning ? <Loader size={16} className="spin" /> : <RefreshCw size={16} />}
          {scanning ? t('wifi.scanning') : t('wifi.scanNetworks')}
        </button>

        <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Upload size={16} />
          {converting ? t('wifi.converting') : t('wifi.uploadPcap')}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pcapng,.cap,.pcap,.hccapx"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            disabled={converting}
          />
        </label>

        {networks.length > 0 && (
          <span className="wifi-scan-count">
            {t('wifi.networksFound', { total: networks.length, wpa: wpaNetworks.length })}
          </span>
        )}
      </div>

      {/* Convert error */}
      {convertError && (
        <div className="wifi-tools-banner glass-card" style={{ borderColor: 'var(--accent-red, #ff5050)' }}>
          <AlertTriangle size={18} color="var(--accent-red, #ff5050)" />
          <div>
            <strong>{t('wifi.convertFailed')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{convertError}</p>
          </div>
        </div>
      )}

      {/* Converted hashes from file upload */}
      {convertedHashes && (
        <div className="captured-hashes-section glass-card">
          <h4>
            <FileUp size={16} />
            {t('wifi.hashesCaptured', { count: convertedHashes.length })}
          </h4>
          {convertedHashes.slice(0, 5).map((hash, i) => (
            <div key={i} className="captured-hash-line">{hash}</div>
          ))}
          {convertedHashes.length > 5 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '6px 0 0' }}>
              ...and {convertedHashes.length - 5} more
            </p>
          )}
          <button
            className="btn btn-primary import-hashes-btn"
            onClick={() => {
              const count = handleImportHashes(convertedHashes, 'Captured');
              if (count > 0) {
                setConvertedHashes(null);
                setActiveTab('database');
              }
            }}
          >
            <Download size={16} />
            {t('wifi.importToDatabase')} ({convertedHashes.length})
          </button>
        </div>
      )}

      {/* Scan error */}
      {scanError && (
        <div className="wifi-tools-banner glass-card" style={{ borderColor: 'var(--accent-red, #ff5050)' }}>
          <AlertTriangle size={18} color="var(--accent-red, #ff5050)" />
          <div>
            <strong>{t('wifi.scanFailed')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{scanError}</p>
          </div>
        </div>
      )}

      {/* Scanning animation */}
      {scanning && (
        <div className="wifi-scanning-overlay glass-card">
          <Wifi size={48} />
          <p>{t('wifi.scanningDescription')}</p>
        </div>
      )}

      {/* Network list */}
      {!scanning && networks.length > 0 && (
        <div className="wifi-network-list">
          {networks.map((network, idx) => (
            <motion.div
              key={network.bssid || `net-${idx}`}
              className={`wifi-network-card glass-card ${selectedNetwork?.bssid === network.bssid ? 'selected' : ''} ${network.isOpen ? 'open-network' : ''}`}
              onClick={() => network.isWPA && setSelectedNetwork(network)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.005 }}
            >
              <SignalBars percent={network.signalPercent} />

              <div className="wifi-network-info">
                <div className="wifi-network-ssid">{network.ssid}</div>
                <div className="wifi-network-meta">
                  <span>{network.bssid}</span>
                  <span>{network.signal} dBm</span>
                </div>
              </div>

              <div className="wifi-network-badges">
                <span className="wifi-badge channel">CH {network.channel}</span>
                {network.isWPA && <span className="wifi-badge wpa">{network.security}</span>}
                {network.isOpen && <span className="wifi-badge open">{t('wifi.open')}</span>}
              </div>

              {network.isWPA && (
                <div className="wifi-network-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNetwork(network);
                    }}
                  >
                    <Radio size={14} />
                    {t('wifi.select')}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!scanning && networks.length === 0 && !scanError && (
        <div className="wifi-empty-state glass-card">
          <Wifi size={48} />
          <h3>{t('wifi.emptyTitle')}</h3>
          <p>{t('wifi.emptyDescription')}</p>
        </div>
      )}

      {/* Capture Panel */}
      <AnimatePresence>
        {selectedNetwork && (
          <motion.div
            className="wifi-capture-panel glass-card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="capture-panel-header">
              <Radio size={20} />
              <h3>{t('wifi.captureHandshake')}</h3>
            </div>

            <div className="capture-target-info">
              <div className="capture-target-field">
                <span className="label">SSID</span>
                <span className="value">{selectedNetwork.ssid}</span>
              </div>
              <div className="capture-target-field">
                <span className="label">BSSID</span>
                <span className="value">{selectedNetwork.bssid}</span>
              </div>
              <div className="capture-target-field">
                <span className="label">{t('wifi.channel')}</span>
                <span className="value">{selectedNetwork.channel}</span>
              </div>
              <div className="capture-target-field">
                <span className="label">{t('wifi.security')}</span>
                <span className="value">{selectedNetwork.security}</span>
              </div>
            </div>

            <div className="capture-config">
              <label>
                {t('wifi.duration')}:
                <input
                  type="number"
                  className="input"
                  value={captureDuration}
                  onChange={(e) => setCaptureDuration(Math.max(10, Math.min(300, Number(e.target.value))))}
                  min={10}
                  max={300}
                  disabled={captureRunning}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('wifi.seconds')}</span>
              </label>
            </div>

            <div className="capture-controls">
              {!captureRunning ? (
                <button className="btn btn-primary" onClick={handleStartCapture}>
                  <Radio size={16} />
                  {t('wifi.startCapture')}
                </button>
              ) : (
                <button className="btn btn-danger" onClick={handleStopCapture}>
                  <Square size={16} />
                  {t('wifi.stopCapture')}
                </button>
              )}
            </div>

            {/* Capture status */}
            {captureStatus && (
              <div className="capture-status">
                <div className="capture-status-header">
                  <span className={`capture-status-badge ${captureStatus.status}`}>
                    {captureStatus.status === 'capturing' && <Loader size={12} className="spin" />}
                    {t(`wifi.captureStatus.${captureStatus.status}`)}
                  </span>
                </div>

                {captureStatus.logs?.length > 0 && (
                  <div className="capture-log">
                    {captureStatus.logs.map((log, i) => (
                      <div key={i} className="capture-log-entry">
                        <span className="capture-log-time">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {captureStatus.hashes?.length > 0 && (
                  <div className="captured-hashes-section">
                    <h4>
                      <CheckCircle size={16} />
                      {t('wifi.hashesCaptured', { count: captureStatus.hashes.length })}
                    </h4>
                    {captureStatus.hashes.map((hash, i) => (
                      <div key={i} className="captured-hash-line">{hash}</div>
                    ))}
                    <button
                      className="btn btn-primary import-hashes-btn"
                      onClick={() => {
                        const count = handleImportHashes(captureStatus.hashes, selectedNetwork.ssid);
                        if (count > 0) setActiveTab('database');
                      }}
                    >
                      <Download size={16} />
                      {t('wifi.importToDatabase')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WifiScanner;
