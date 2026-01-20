import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, Terminal, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useCracking } from '../../context/CrackingContext';
import './ActivityLog.css';

function ActivityLog() {
  const { session } = useCracking();
  const logsEndRef = useRef(null);
  
  const logs = session?.logs || [];
  
  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length]);
  
  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={14} className="log-icon success" />;
      case 'warning': return <AlertTriangle size={14} className="log-icon warning" />;
      case 'error': return <XCircle size={14} className="log-icon error" />;
      default: return <Info size={14} className="log-icon info" />;
    }
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };
  
  return (
    <motion.div 
      className="activity-log glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="log-header">
        <Terminal size={18} />
        <h3>Activity Log</h3>
        <span className="log-count">{logs.length} entries</span>
      </div>
      
      <div className="log-content">
        {logs.length === 0 ? (
          <div className="log-empty">
            <p>No activity yet. Start an attack to see logs.</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <motion.div
              key={index}
              className={`log-entry ${log.type}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              {getIcon(log.type)}
              <span className="log-time">{formatTimestamp(log.timestamp)}</span>
              <span className="log-message">{log.message}</span>
            </motion.div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </motion.div>
  );
}

export default ActivityLog;
