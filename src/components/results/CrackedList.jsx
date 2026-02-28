import { motion } from 'framer-motion';
import {
  Check,
  Clock,
  Copy,
  Crosshair,
  Download,
  File,
  FileJson,
  FileText,
  Key,
  Wifi
} from 'lucide-react';
import { useState } from 'react';
import { useCracking } from '../../context/CrackingContext';
import { useI18n } from '../../context/I18nContext';
import { exportCrackedHashes, getHashesByStatus } from '../../services/database/hashDB';
import { formatTime } from '../../services/hashcat/simulator';
import './CrackedList.css';

function CrackedList() {
  const { database } = useCracking();
  const { language, t } = useI18n();
  const [copiedId, setCopiedId] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');

  const crackedHashes = database ? getHashesByStatus(database, 'cracked') : [];
  const locale = language === 'tk' ? 'tk-TM' : 'en-US';
  const enableCardAnimations = crackedHashes.length <= 24;

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    if (!database) return;

    const content = exportCrackedHashes(database, exportFormat);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cracked_passwords.${exportFormat === 'potfile' ? 'pot' : exportFormat}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const getAttackIcon = (mode) => {
    switch (mode) {
      case 'dictionary':
        return '📖';
      case 'bruteforce':
        return '🔨';
      case 'hybrid':
        return '🔀';
      default:
        return '❓';
    }
  };

  const getAttackLabel = (mode) => {
    if (!mode) return t('results.unknown');
    const key = `attack.modes.${mode}.name`;
    const translated = t(key);
    return translated === key ? mode : translated;
  };

  return (
    <div className="cracked-list">
      <div className="cracked-header">
        <div className="header-info">
          <Key className="header-icon" size={24} />
          <div>
            <h2>{t('results.title')}</h2>
            <p>{t('results.passwordsRecovered', { count: crackedHashes.length })}</p>
          </div>
        </div>

        <div className="export-controls">
          <select
            className="select"
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value)}
          >
            <option value="csv">{t('results.formats.csv')}</option>
            <option value="json">{t('results.formats.json')}</option>
            <option value="potfile">{t('results.formats.potfile')}</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={crackedHashes.length === 0}
          >
            <Download size={18} />
            {t('results.export')}
          </button>
        </div>
      </div>

      {crackedHashes.length === 0 ? (
        <div className="empty-state glass-card">
          <Key size={48} />
          <h3>{t('results.emptyTitle')}</h3>
          <p>{t('results.emptyDescription')}</p>
        </div>
      ) : (
        <div className="results-grid">
          {crackedHashes.map((hash, index) => (
            <motion.div
              key={hash.id}
              className="result-card glass-card"
              initial={enableCardAnimations ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={enableCardAnimations ? { delay: index * 0.04 } : { duration: 0 }}
            >
              <div className="result-header">
                <div className="result-ssid">
                  <Wifi size={16} />
                  <span>{hash.ssid}</span>
                </div>
                <span className={`badge ${hash.type === 'PMKID' ? 'badge-info' : 'badge-purple'}`}>
                  {hash.type}
                </span>
              </div>

              <div className="result-password">
                <span className="password-text">{hash.password}</span>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(hash.password, hash.id)}
                  title={t('results.copyPassword')}
                >
                  {copiedId === hash.id ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <div className="result-meta">
                <div className="meta-item">
                  <Crosshair size={14} />
                  <span>{getAttackIcon(hash.attackMode)} {getAttackLabel(hash.attackMode)}</span>
                </div>
                <div className="meta-item">
                  <Clock size={14} />
                  <span>{hash.timeToCrack ? formatTime(hash.timeToCrack) : t('results.notAvailable')}</span>
                </div>
              </div>

              <div className="result-footer">
                <span className="bssid font-mono text-xs">{hash.bssid}</span>
                <span className="cracked-date text-xs text-muted">
                  {hash.crackedAt ? new Date(hash.crackedAt).toLocaleDateString(locale) : ''}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="format-info glass-card">
        <h4>{t('results.exportFormatsTitle')}</h4>
        <div className="format-list">
          <div className="format-item">
            <FileText size={18} />
            <div>
              <strong>{t('results.formats.csv')}</strong>
              <p>{t('results.formatDescriptions.csv')}</p>
            </div>
          </div>
          <div className="format-item">
            <FileJson size={18} />
            <div>
              <strong>{t('results.formats.json')}</strong>
              <p>{t('results.formatDescriptions.json')}</p>
            </div>
          </div>
          <div className="format-item">
            <File size={18} />
            <div>
              <strong>{t('results.formats.potfile')}</strong>
              <p>{t('results.formatDescriptions.potfile')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrackedList;
