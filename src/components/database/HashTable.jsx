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
import { addHash, deleteHash, filterHashes, searchHashes, sortHashes } from '../../services/database/hashDB';
import './HashTable.css';

function HashTable() {
  const { database, setDatabase, refreshDatabase, setActiveTab, setSelectedHashes } = useCracking();
  
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
    const badges = {
      pending: 'badge-warning',
      cracking: 'badge-info animate-pulse',
      cracked: 'badge-success',
      failed: 'badge-danger'
    };
    return badges[status] || 'badge-info';
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
              placeholder="Search SSID, BSSID, ID..."
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
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="cracking">Cracking</option>
              <option value="cracked">Cracked</option>
              <option value="failed">Failed</option>
            </select>
            
            <select 
              className="select"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="all">All Types</option>
              <option value="PMKID">PMKID</option>
              <option value="EAPOL">EAPOL</option>
            </select>
            
            <select 
              className="select"
              value={filters.complexity}
              onChange={(e) => setFilters(prev => ({ ...prev, complexity: e.target.value }))}
            >
              <option value="all">All Complexity</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
        
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={handleAddHash}>
            <Plus size={18} /> Add Hash
          </button>
          {selectedIds.size > 0 && (
            <button className="btn btn-danger" onClick={handleDeleteSelected}>
              <Trash2 size={18} /> Delete ({selectedIds.size})
            </button>
          )}
        </div>
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
                ID <SortIcon column="id" />
              </th>
              <th className="sortable" onClick={() => handleSort('ssid')}>
                SSID <SortIcon column="ssid" />
              </th>
              <th className="sortable" onClick={() => handleSort('type')}>
                Type <SortIcon column="type" />
              </th>
              <th className="sortable" onClick={() => handleSort('complexity')}>
                Complexity <SortIcon column="complexity" />
              </th>
              <th className="sortable" onClick={() => handleSort('status')}>
                Status <SortIcon column="status" />
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {displayedHashes.slice(0, 50).map((hash, index) => (
                <motion.tr
                  key={hash.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.02 }}
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
                      {hash.complexity}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(hash.status)}`}>
                      {hash.status}
                    </span>
                  </td>
                  <td className="col-actions">
                    <button 
                      className="btn-icon" 
                      title="View Details"
                      onClick={() => setViewHash(hash)}
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn-icon" 
                      title="Attack"
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
        <span>Showing {Math.min(50, displayedHashes.length)} of {displayedHashes.length} hashes</span>
        {displayedHashes.length > 50 && (
          <span className="text-muted text-sm">(Displaying first 50 for performance)</span>
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
                <h3>Hash Details</h3>
                <button className="btn-ghost" onClick={() => setViewHash(null)}>×</button>
              </div>
              
              <div className="modal-content">
                <div className="detail-row">
                  <span className="detail-label">ID</span>
                  <span className="detail-value font-mono">{viewHash.id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">SSID</span>
                  <span className="detail-value">{viewHash.ssid}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">BSSID</span>
                  <span className="detail-value font-mono">{viewHash.bssid}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Client MAC</span>
                  <span className="detail-value font-mono">{viewHash.client}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type</span>
                  <span className={`badge ${viewHash.type === 'PMKID' ? 'badge-info' : 'badge-purple'}`}>
                    {viewHash.type}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className={`badge ${getStatusBadge(viewHash.status)}`}>
                    {viewHash.status}
                  </span>
                </div>
                {viewHash.status === 'cracked' && (
                  <div className="detail-row highlight">
                    <span className="detail-label">Password</span>
                    <span className="detail-value font-mono password">{viewHash.password}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Hash</span>
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
