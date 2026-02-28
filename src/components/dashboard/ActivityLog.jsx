import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, Terminal, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useCracking } from '../../context/CrackingContext';
import { useI18n } from '../../context/I18nContext';
import { WORDLISTS } from '../../services/hashcat/simulator';
import './ActivityLog.css';

function ActivityLog() {
  const { session } = useCracking();
  const { language, t } = useI18n();
  const logsEndRef = useRef(null);

  const logs = session?.logs || [];
  const locale = language === 'tk' ? 'tk-TM' : 'en-US';
  const enableEntryAnimation = logs.length <= 25;

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: logs.length > 20 ? 'auto' : 'smooth' });
    }
  }, [logs.length]);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={14} className="log-icon success" />;
      case 'warning':
        return <AlertTriangle size={14} className="log-icon warning" />;
      case 'error':
        return <XCircle size={14} className="log-icon error" />;
      default:
        return <Info size={14} className="log-icon info" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(locale, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const resolvedLogs = useMemo(() => {
    return logs.map((log, index) => {
      const params = { ...(log.params || {}) };
      if (params.wordlistKey) {
        const wordlistMeta = WORDLISTS[params.wordlistKey];
        params.wordlist = wordlistMeta ? t(wordlistMeta.nameKey) : params.wordlistKey;
      }

      const message = log.key
        ? t(log.key, params)
        : (log.message || t('activity.unknownEntry'));

      return {
        ...log,
        message,
        rowKey: log.id || `${log.timestamp || 'na'}-${log.key || log.message || index}-${index}`
      };
    });
  }, [logs, t]);

  return (
    <motion.div
      className="activity-log glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="log-header">
        <Terminal size={18} />
        <h3>{t('activity.title')}</h3>
        <span className="log-count">{t('activity.entries', { count: logs.length })}</span>
      </div>

      <div className="log-content">
        {resolvedLogs.length === 0 ? (
          <div className="log-empty">
            <p>{t('activity.empty')}</p>
          </div>
        ) : (
          resolvedLogs.map((log, index) => (
            <motion.div
              key={log.rowKey}
              className={`log-entry ${log.type}`}
              initial={enableEntryAnimation ? { opacity: 0, x: -20 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={enableEntryAnimation ? { delay: index * 0.015 } : { duration: 0 }}
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
