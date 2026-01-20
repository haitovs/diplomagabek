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
    Key, Wifi
} from 'lucide-react';
import { useState } from 'react';
import { useCracking } from '../../context/CrackingContext';
import { exportCrackedHashes, getHashesByStatus } from '../../services/database/hashDB';
import { formatTime } from '../../services/hashcat/simulator';
import './CrackedList.css';

function CrackedList() {
  const { database } = useCracking();
  const [copiedId, setCopiedId] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  
  const crackedHashes = database ? getHashesByStatus(database, 'cracked') : [];
  
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
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cracked_passwords.${exportFormat === 'potfile' ? 'pot' : exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const getAttackIcon = (mode) => {
    switch (mode) {
      case 'dictionary': return '📖';
      case 'bruteforce': return '🔨';
      case 'hybrid': return '🔀';
      default: return '❓';
    }
  };
  
  return (
    <div className="cracked-list">
      {/* Header */}
      <div className="cracked-header">
        <div className="header-info">
          <Key className="header-icon" size={24} />
          <div>
            <h2>Cracked Passwords</h2>
            <p>{crackedHashes.length} passwords recovered</p>
          </div>
        </div>
        
        <div className="export-controls">
          <select 
            className="select"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="potfile">Potfile</option>
          </select>
          <button 
            className="btn btn-primary"
            onClick={handleExport}
            disabled={crackedHashes.length === 0}
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>
      
      {/* Results Grid */}
      {crackedHashes.length === 0 ? (
        <div className="empty-state glass-card">
          <Key size={48} />
          <h3>No Cracked Passwords Yet</h3>
          <p>Start an attack on pending hashes to recover passwords.</p>
        </div>
      ) : (
        <div className="results-grid">
          {crackedHashes.map((hash, index) => (
            <motion.div
              key={hash.id}
              className="result-card glass-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
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
                  title="Copy password"
                >
                  {copiedId === hash.id ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              
              <div className="result-meta">
                <div className="meta-item">
                  <Crosshair size={14} />
                  <span>{getAttackIcon(hash.attackMode)} {hash.attackMode || 'Unknown'}</span>
                </div>
                <div className="meta-item">
                  <Clock size={14} />
                  <span>{hash.timeToCrack ? formatTime(hash.timeToCrack) : 'N/A'}</span>
                </div>
              </div>
              
              <div className="result-footer">
                <span className="bssid font-mono text-xs">{hash.bssid}</span>
                <span className="cracked-date text-xs text-muted">
                  {hash.crackedAt ? new Date(hash.crackedAt).toLocaleDateString() : ''}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Export Format Info */}
      <div className="format-info glass-card">
        <h4>Export Formats</h4>
        <div className="format-list">
          <div className="format-item">
            <FileText size={18} />
            <div>
              <strong>CSV</strong>
              <p>Comma-separated, compatible with Excel</p>
            </div>
          </div>
          <div className="format-item">
            <FileJson size={18} />
            <div>
              <strong>JSON</strong>
              <p>Structured data for programmatic use</p>
            </div>
          </div>
          <div className="format-item">
            <File size={18} />
            <div>
              <strong>Potfile</strong>
              <p>Hashcat-compatible hash:password format</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrackedList;
