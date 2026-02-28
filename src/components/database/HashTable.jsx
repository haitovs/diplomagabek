import { AnimatePresence, motion } from 'framer-motion';
import {
    ChevronDown,
    ChevronUp,
    Crosshair,
    Eye,
    Plus,
    Search,
    Trash2
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCracking } from '../../context/CrackingContext';
import { useI18n } from '../../context/I18nContext';
import { addHash, deleteHash, filterHashes, searchHashes, sortHashes } from '../../services/database/hashDB';
import './HashTable.css';

const STATUS_META = {
  pending: { labelKey: 'status.pending', badge: 'badge-warning' },
  cracking: { labelKey: 'status.cracking', badge: 'badge-info animate-pulse' },
  cracked: { labelKey: 'status.cracked', badge: 'badge-success' },
  failed: { labelKey: 'status.failed', badge: 'badge-danger' }
};

function HashTable() {
  const { database, refreshDatabase, setActiveTab, setSelectedHashes } = useCracking();
  const { t } = useI18n();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: 'all', type: 'all', complexity: 'all' });
  const [sortConfig, setSortConfig] = useState({ key: 'id', ascending: true });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [viewHash, setViewHash] = useState(null);
  
  // Filter and sort hashes
  const displayedHashes = useMemo(() => {
    if (!database) return [];
    
    let result = database.hashes;
    
    // Search
    if (searchQuery) {
      result = searchHashes(database, searchQuery);
    }
    
    // Filter
    result = filterHashes({ hashes: result }, filters);
    
    // Sort
    result = sortHashes(result, sortConfig.key, sortConfig.ascending);
    
    return result;
  }, [database, searchQuery, filters, sortConfig]);

  const statusCounters = useMemo(() => {
    const counters = { pending: 0, cracking: 0, cracked: 0, failed: 0 };
    displayedHashes.forEach((hash) => {
      if (counters[hash.status] !== undefined) {
        counters[hash.status] += 1;
      }
    });
    return counters;
  }, [displayedHashes]);

  const enableRowAnimations = displayedHashes.length <= 20;
  
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      ascending: prev.key === key ? !prev.ascending : true
    }));
  };
  
  const handleSelectAll = () => {
    if (selectedIds.size === displayedHashes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedHashes.map(h => h.id)));
    }
  };
  
  const handleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  const handleAddHash = () => {
    if (database) {
      addHash(database);
      refreshDatabase();
    }
  };
  
  const handleDeleteSelected = () => {
    if (database && selectedIds.size > 0) {
      selectedIds.forEach(id => {
        deleteHash(database, id);
      });
      setSelectedIds(new Set());
      refreshDatabase();
    }
  };
  
  const handleAttackHash = (hash) => {
    setSelectedHashes([hash]);
    setActiveTab('attack');
  };
  
  const getStatusBadge = (status) => {
    return STATUS_META[status]?.badge || 'badge-info';
  };

  const getStatusLabel = (status) => {
    const key = STATUS_META[status]?.labelKey;
    return key ? t(key) : status;
  };
  
  const getComplexityBadge = (complexity) => {
    const badges = {
      easy: 'badge-success',
      medium: 'badge-warning',
      hard: 'badge-danger',
      unknown: 'badge-purple'
    };
    return badges[complexity] || 'badge-info';
  };

  const getComplexityLabel = (complexity) => {
    if (!complexity || !['easy', 'medium', 'hard', 'unknown'].includes(complexity)) {
      return t('complexity.unknown');
    }
    return t(`complexity.${complexity}`);
  };

  const resolveFailureReason = (reason) => {
    if (!reason) return t('table.noDetails');
    if (reason.startsWith('errors.')) return t(reason);

    const rawMappings = {
      'Stopped by user': 'errors.stoppedByUser',
      'Wordlist exhausted with no result': 'errors.wordlistExhausted'
    };

    const mappedKey = rawMappings[reason];
    return mappedKey ? t(mappedKey) : reason;
  };
  
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.ascending ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };
  
  return (
    <div className="hash-table-container">
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              className="input"
              placeholder={t('table.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <select 
              className="select"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="all">{t('table.allStatus')}</option>
              <option value="pending">{t('status.pending')}</option>
              <option value="cracking">{t('status.cracking')}</option>
              <option value="cracked">{t('status.cracked')}</option>
              <option value="failed">{t('status.failed')}</option>
            </select>
            
            <select 
              className="select"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="all">{t('table.allTypes')}</option>
              <option value="PMKID">PMKID</option>
              <option value="EAPOL">EAPOL</option>
            </select>
            
            <select 
              className="select"
              value={filters.complexity}
              onChange={(e) => setFilters(prev => ({ ...prev, complexity: e.target.value }))}
            >
              <option value="all">{t('table.allComplexity')}</option>
              <option value="easy">{t('complexity.easy')}</option>
              <option value="medium">{t('complexity.medium')}</option>
              <option value="hard">{t('complexity.hard')}</option>
            </select>
          </div>
        </div>
        
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={handleAddHash}>
            <Plus size={18} /> {t('table.addHash')}
          </button>
          {selectedIds.size > 0 && (
            <button className="btn btn-danger" onClick={handleDeleteSelected}>
              <Trash2 size={18} /> {t('table.delete')} ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="status-strip">
        <button
          className={`status-chip ${filters.status === 'all' ? 'active' : ''}`}
          onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
          type="button"
        >
          <span className="status-chip-label">{t('table.all')}</span>
          <strong>{displayedHashes.length}</strong>
        </button>
        {Object.entries(STATUS_META).map(([status, meta]) => (
          <button
            key={status}
            className={`status-chip ${filters.status === status ? 'active' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, status }))}
            type="button"
          >
            <span className={`badge ${meta.badge}`}>{t(meta.labelKey)}</span>
            <strong>{statusCounters[status]}</strong>
          </button>
        ))}
      </div>
      
      {/* Table */}
      <div className="table-wrapper">
        <table className="hash-table">
          <thead>
            <tr>
              <th className="col-checkbox">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === displayedHashes.length && displayedHashes.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="sortable" onClick={() => handleSort('id')}>
                {t('table.id')} <SortIcon column="id" />
              </th>
              <th className="sortable" onClick={() => handleSort('ssid')}>
                {t('table.ssid')} <SortIcon column="ssid" />
              </th>
              <th className="sortable" onClick={() => handleSort('type')}>
                {t('table.type')} <SortIcon column="type" />
              </th>
              <th className="sortable" onClick={() => handleSort('complexity')}>
                {t('table.complexity')} <SortIcon column="complexity" />
              </th>
              <th className="sortable" onClick={() => handleSort('status')}>
                {t('table.status')} <SortIcon column="status" />
              </th>
              <th>{t('table.failureReason')}</th>
              <th>{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {displayedHashes.slice(0, 50).map((hash, index) => (
                <motion.tr
                  key={hash.id}
                  initial={enableRowAnimations ? { opacity: 0, y: 10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={enableRowAnimations ? { delay: index * 0.015 } : { duration: 0 }}
                  className={selectedIds.has(hash.id) ? 'selected' : ''}
                >
                  <td className="col-checkbox">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(hash.id)}
                      onChange={() => handleSelect(hash.id)}
                    />
                  </td>
                  <td className="col-id font-mono">{hash.id}</td>
                  <td className="col-ssid">
                    <div className="ssid-cell">
                      <span className="ssid-name">{hash.ssid}</span>
                      <span className="ssid-bssid text-sm text-muted">{hash.bssid}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${hash.type === 'PMKID' ? 'badge-info' : 'badge-purple'}`}>
                      {hash.type}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getComplexityBadge(hash.complexity)}`}>
                      {getComplexityLabel(hash.complexity)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(hash.status)}`}>
                      {getStatusLabel(hash.status)}
                    </span>
                  </td>
                  <td className="fail-reason-cell">
                    {hash.status === 'failed'
                      ? resolveFailureReason(hash.failReason)
                      : t('table.notApplicable')}
                  </td>
                  <td className="col-actions">
                    <button 
                      className="btn-icon" 
                      title={t('table.viewDetails')}
                      onClick={() => setViewHash(hash)}
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn-icon" 
                      title={t('table.attack')}
                      onClick={() => handleAttackHash(hash)}
                      disabled={hash.status === 'cracked' || hash.status === 'cracking'}
                    >
                      <Crosshair size={16} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      
      {/* Footer */}
      <div className="table-footer">
        <span>{t('table.showing', { shown: Math.min(50, displayedHashes.length), total: displayedHashes.length })}</span>
        {displayedHashes.length > 50 && (
          <span className="text-muted text-sm">{t('table.performanceNotice')}</span>
        )}
      </div>
      
      {/* Hash Details Modal */}
      <AnimatePresence>
        {viewHash && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewHash(null)}
          >
            <motion.div 
              className="modal glass-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{t('table.hashDetails')}</h3>
                <button className="btn-ghost" onClick={() => setViewHash(null)}>×</button>
              </div>
              
              <div className="modal-content">
                <div className="detail-row">
                  <span className="detail-label">{t('table.id')}</span>
                  <span className="detail-value font-mono">{viewHash.id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{t('table.ssid')}</span>
                  <span className="detail-value">{viewHash.ssid}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{t('table.bssid')}</span>
                  <span className="detail-value font-mono">{viewHash.bssid}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{t('table.clientMac')}</span>
                  <span className="detail-value font-mono">{viewHash.client}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{t('table.type')}</span>
                  <span className={`badge ${viewHash.type === 'PMKID' ? 'badge-info' : 'badge-purple'}`}>
                    {viewHash.type}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{t('table.status')}</span>
                  <span className={`badge ${getStatusBadge(viewHash.status)}`}>
                    {getStatusLabel(viewHash.status)}
                  </span>
                </div>
                {viewHash.status === 'failed' && (
                  <div className="detail-row">
                    <span className="detail-label">{t('table.failure')}</span>
                    <span className="detail-value">{resolveFailureReason(viewHash.failReason)}</span>
                  </div>
                )}
                {viewHash.status === 'cracked' && (
                  <div className="detail-row highlight">
                    <span className="detail-label">{t('table.password')}</span>
                    <span className="detail-value font-mono password">{viewHash.password}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">{t('table.hash')}</span>
                  <div className="hash-display font-mono">{viewHash.hash}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HashTable;
