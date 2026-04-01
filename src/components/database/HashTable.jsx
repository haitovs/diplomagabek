import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Crosshair,
    Eye,
    Plus,
    Search,
    Trash2,
    X,
    Zap
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCracking } from '../../context/CrackingContext';
import { useI18n } from '../../context/I18nContext';
import { addHash, deleteHash, filterHashes, searchHashes, sortHashes } from '../../services/database/hashDB';
import { generateValidPmkidHash } from '../../services/hashcat/pmkid';
import './HashTable.css';

const STATUS_META = {
  pending: { labelKey: 'status.pending', badge: 'badge-warning' },
  cracking: { labelKey: 'status.cracking', badge: 'badge-info animate-pulse' },
  cracked: { labelKey: 'status.cracked', badge: 'badge-success' },
  failed: { labelKey: 'status.failed', badge: 'badge-danger' }
};
const ADD_HASH_INITIAL_STATE = {
  source: 'word',
  ssid: '',
  bssid: '',
  client: '',
  type: 'PMKID',
  word: '',
  hashLine: '',
  password: '',
  markAsCracked: false
};

function HashTable() {
  const {
    database,
    refreshDatabase,
    setActiveTab,
    setSelectedHashes
  } = useCracking();
  const { t } = useI18n();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: 'all', type: 'all', complexity: 'all' });
  const [sortConfig, setSortConfig] = useState({ key: 'id', ascending: true });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [viewHash, setViewHash] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(ADD_HASH_INITIAL_STATE);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
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
    setAddError('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddError('');
    setAddForm(ADD_HASH_INITIAL_STATE);
  };

  const handleAddFormChange = (field, value) => {
    setAddForm((previous) => ({
      ...previous,
      [field]: value
    }));
  };

  const resolveMessage = (value, fallbackKey) => {
    if (!value) {
      return t(fallbackKey);
    }
    const translated = t(value);
    return translated !== value ? translated : value;
  };

  const handleSubmitAddHash = async (event) => {
    event.preventDefault();
    if (!database || isAdding) {
      return;
    }

    setIsAdding(true);
    setAddError('');

    try {
      if (addForm.source === 'hash') {
        const created = addHash(database, {
          source: 'hash',
          hashLine: addForm.hashLine,
          ssid: addForm.ssid,
          bssid: addForm.bssid,
          client: addForm.client,
          password: addForm.password,
          markAsCracked: addForm.markAsCracked
        });
        if (!created) throw new Error('table.addHashValidation.generic');
      } else {
        // Generate a real crackable PMKID hash from the password
        const password = (addForm.word || '').trim();
        if (!password) throw new Error('table.addHashValidation.wordRequired');

        const ssid = (addForm.ssid || '').trim() || `WiFi_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const randomMac = () => Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
        const macAP = randomMac();
        const macSTA = randomMac();
        const hashLine = await generateValidPmkidHash(password, ssid, macAP, macSTA);

        const created = addHash(database, {
          source: 'hash',
          hashLine,
          ssid,
          password: addForm.markAsCracked ? password : '',
          markAsCracked: addForm.markAsCracked
        });
        if (!created) throw new Error('table.addHashValidation.generic');
      }

      refreshDatabase();
      setAddSuccess(t('table.addHashCreated'));
      closeAddModal();
    } catch (error) {
      setAddError(resolveMessage(error?.message, 'table.addHashValidation.generic'));
    } finally {
      setIsAdding(false);
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

  const handleGenerateTestHash = () => {
    if (!database) return;

    // Real, cryptographically valid hc22000 hashes with passwords found in rockyou.txt
    const testHashes = [
      {
        hash: 'WPA*02*59168bc19a6327436b6a7b2d2d6ad243*fc690c158264*accd10fb464e*686173686361742d6573736964*3d110a03731255fb22b8f41ea1632543e8a39e5e1d73e0d7e5b546acb3ed8308*0103007502010a0000000000000000000142f6f740e1e54213031c1e9032934ee4f25b64c0d4c12e3f587a48029170470000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000018dd160050f20101000050f20201000050f20201000050f2*02',
        ssid: 'hashcat-essid'
      },
      {
        hash: 'WPA*01*00b4b05af0743d47d22b53170873e097*aabbccddeeff*112233445566*546573744e6574776f726b***',
        ssid: 'TestNetwork'
      },
      {
        hash: 'WPA*01*a09e021a17b2954458119b72b2951d0e*deadbeef1234*cafe01020304*486f6d6557694669***',
        ssid: 'HomeWiFi'
      },
      {
        hash: 'WPA*01*4a8b46ef4f8436f75da9d1321fb5d9be*a1b2c3d4e5f6*f6e5d4c3b2a1*4f66666963654775657374***',
        ssid: 'OfficeGuest'
      },
      {
        hash: 'WPA*01*4dc5c88ef3bf57012fa5edd5458467ea*001122334455*556677889900*46616d696c794e6574***',
        ssid: 'FamilyNet'
      },
      {
        hash: 'WPA*01*9a5dc8aad7ecdb2ea8abb0d05866b2ff*abcdef012345*543210fedcba*4361666557694669***',
        ssid: 'CafeWiFi'
      }
    ];

    let added = 0;
    for (const entry of testHashes) {
      try {
        const created = addHash(database, {
          source: 'hash',
          hashLine: entry.hash,
          ssid: entry.ssid,
          password: '',
          markAsCracked: false
        });
        if (created) added += 1;
      } catch {
        // Skip duplicates silently
      }
    }

    if (added > 0) {
      refreshDatabase();
    }
    setAddSuccess(t('table.testHashGenerated', { count: added || testHashes.length }));
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
          <button
            className="btn btn-secondary"
            onClick={handleGenerateTestHash}
            title={t('table.testHashTooltip')}
          >
            <Zap size={18} /> {t('table.generateTestHash')}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleAddHash}
          >
            <Plus size={18} /> {t('table.addHash')}
          </button>
          {selectedIds.size > 0 && (
            <button className="btn btn-danger" onClick={handleDeleteSelected}>
              <Trash2 size={18} /> {t('table.delete')} ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {addSuccess && (
        <div className="table-notice success">
          <CheckCircle2 size={16} />
          <span>{addSuccess}</span>
          <button className="btn-icon" onClick={() => setAddSuccess('')} title={t('table.delete')}>
            <X size={14} />
          </button>
        </div>
      )}

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

      {/* Add Hash Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAddModal}
          >
            <motion.form
              className="modal glass-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              onSubmit={handleSubmitAddHash}
            >
              <div className="modal-header">
                <h3>{t('table.addHashModalTitle')}</h3>
                <button type="button" className="btn-ghost" onClick={closeAddModal}>×</button>
              </div>

              <div className="modal-content add-hash-content">
                <div className="form-field">
                  <label>{t('table.addHashMode')}</label>
                  <div className="mode-toggle">
                    <button
                      type="button"
                      className={`mode-option ${addForm.source === 'word' ? 'active' : ''}`}
                      onClick={() => handleAddFormChange('source', 'word')}
                    >
                      {t('table.addHashFromWord')}
                    </button>
                    <button
                      type="button"
                      className={`mode-option ${addForm.source === 'hash' ? 'active' : ''}`}
                      onClick={() => handleAddFormChange('source', 'hash')}
                    >
                      {t('table.addHashFromHash')}
                    </button>
                  </div>
                </div>

                {addForm.source === 'word' ? (
                  <>
                    <div className="form-field">
                      <label>{t('table.ssid')}</label>
                      <input
                        className="input"
                        value={addForm.ssid}
                        onChange={(event) => handleAddFormChange('ssid', event.target.value)}
                        placeholder={t('table.addHashSsidPlaceholder')}
                      />
                    </div>
                    <div className="form-field">
                      <label>{t('table.addHashWord')}</label>
                      <input
                        className="input"
                        value={addForm.word}
                        onChange={(event) => handleAddFormChange('word', event.target.value)}
                        placeholder={t('table.addHashWordPlaceholder')}
                      />
                    </div>
                    <p className="form-help">{t('table.addHashAutoGenHint')}</p>
                  </>
                ) : (
                  <>
                    <div className="form-grid">
                      <div className="form-field">
                        <label>{t('table.ssid')}</label>
                        <input
                          className="input"
                          value={addForm.ssid}
                          onChange={(event) => handleAddFormChange('ssid', event.target.value)}
                          placeholder={t('table.addHashSsidPlaceholder')}
                        />
                      </div>
                      <div className="form-field">
                        <label>{t('table.bssid')}</label>
                        <input
                          className="input input-mono"
                          value={addForm.bssid}
                          onChange={(event) => handleAddFormChange('bssid', event.target.value)}
                          placeholder={t('table.addHashBssidPlaceholder')}
                        />
                      </div>
                    </div>
                    <div className="form-field">
                      <label>{t('table.addHashRaw')}</label>
                      <textarea
                        className="input input-mono textarea-input"
                        value={addForm.hashLine}
                        onChange={(event) => handleAddFormChange('hashLine', event.target.value)}
                        placeholder={t('table.addHashRawPlaceholder')}
                        rows={5}
                      />
                    </div>
                    <div className="form-field">
                      <label>{t('table.addHashOptionalPassword')}</label>
                      <input
                        className="input"
                        value={addForm.password}
                        onChange={(event) => handleAddFormChange('password', event.target.value)}
                        placeholder={t('table.addHashWordPlaceholder')}
                      />
                    </div>
                    <div className="input-hints">
                      <p>{t('table.supportedFormatsTitle')}</p>
                      <ul className="hint-list">
                        <li>{t('table.supportedFormat1')}</li>
                        <li>{t('table.supportedFormat2')}</li>
                        <li>{t('table.supportedFormat3')}</li>
                        <li>{t('table.supportedFormat4')}</li>
                      </ul>
                    </div>
                  </>
                )}

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={addForm.markAsCracked}
                    onChange={(event) => handleAddFormChange('markAsCracked', event.target.checked)}
                  />
                  <span>{t('table.addHashMarkCracked')}</span>
                </label>
                <p className="form-help">{t('table.addHashMarkCrackedHint')}</p>

                {addError && <p className="form-error">{addError}</p>}

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeAddModal}>
                    {t('table.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isAdding}>
                    <Plus size={16} /> {t('table.addHashCreate')}
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

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
