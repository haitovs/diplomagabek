import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCracking } from '../../context/CrackingContext';
import { useI18n } from '../../context/I18nContext';
import { formatNumber, formatSpeed, formatTime } from '../../services/hashcat/simulator';
import './ProgressChart.css';

const MIN_POINT_INTERVAL_MS = 250;

function ProgressChart() {
  const { session } = useCracking();
  const { t } = useI18n();
  const [chartData, setChartData] = useState([]);
  const lastChartUpdateRef = useRef(0);

  useEffect(() => {
    if (session?.status !== 'running') {
      return;
    }

    const now = Date.now();
    if (now - lastChartUpdateRef.current < MIN_POINT_INTERVAL_MS) {
      return;
    }

    lastChartUpdateRef.current = now;

    setChartData((previous) => {
      const nextPoint = {
        time: previous.length,
        speed: session.speed || 0,
        progress: session.progress || 0,
        candidates: session.candidatesTested || 0
      };

      const updated = [...previous, nextPoint];
      if (updated.length > 60) {
        updated.shift();
      }
      return updated;
    });
  }, [session?.speed, session?.progress, session?.candidatesTested, session?.status]);

  useEffect(() => {
    if (session?.status === 'running' && session?.candidatesTested === 0) {
      setChartData([]);
      lastChartUpdateRef.current = 0;
    }
  }, [session?.hashId, session?.status, session?.candidatesTested]);

  const isActive = session?.status === 'running' || session?.status === 'paused';

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p>{t('progress.tooltipSpeed')}: {formatSpeed(payload[0].value)}</p>
          <p>{t('progress.tooltipTested')}: {formatNumber(payload[0].payload.candidates)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="progress-chart glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="chart-header">
        <div className="chart-title">
          <h3>{t('progress.title')}</h3>
          {isActive && (
            <span className={`status-indicator ${session.status}`}>
              {session.status === 'running' ? t('progress.running') : t('progress.paused')}
            </span>
          )}
        </div>

        {isActive && (
          <div className="chart-stats">
            <div className="chart-stat">
              <span className="chart-stat-label">{t('progress.progress')}</span>
              <span className="chart-stat-value">{(session?.progress || 0).toFixed(2)}%</span>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-label">{t('progress.speed')}</span>
              <span className="chart-stat-value">{formatSpeed(session?.speed || 0)}</span>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-label">{t('progress.eta')}</span>
              <span className="chart-stat-value">{formatTime(session?.eta || 0)}</span>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-label">{t('progress.tested')}</span>
              <span className="chart-stat-value">{formatNumber(session?.candidatesTested || 0)}</span>
            </div>
          </div>
        )}
      </div>

      {isActive && (
        <>
          <div className="progress-bar-container">
            <div className="progress-bar">
              <motion.div
                className="progress-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${session?.progress || 0}%` }}
                transition={{ type: 'spring', damping: 20 }}
              />
            </div>
            <span className="progress-text">{(session?.progress || 0).toFixed(2)}%</span>
          </div>

          <div className="current-candidate">
            <span className="candidate-label">{t('progress.currentCandidate')}</span>
            <span className="candidate-value font-mono">{session?.currentCandidate || '...'}</span>
          </div>
        </>
      )}

      <div className="chart-container">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="speed"
                stroke="#00ff88"
                strokeWidth={2}
                fill="url(#speedGradient)"
                dot={false}
                animationDuration={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-placeholder">
            <p>{isActive ? t('progress.collectingData') : t('progress.startToSee')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ProgressChart;
