import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCracking } from '../../context/CrackingContext';
import { formatNumber, formatSpeed, formatTime } from '../../services/hashcat/simulator';
import './ProgressChart.css';

function ProgressChart() {
  const { session } = useCracking();
  const [chartData, setChartData] = useState([]);
  
  // Update chart data when session updates
  useEffect(() => {
    if (session?.status === 'running') {
      setChartData(prev => {
        const newPoint = {
          time: prev.length,
          speed: session.speed || 0,
          progress: session.progress || 0,
          candidates: session.candidatesTested || 0
        };
        
        // Keep last 60 data points
        const updated = [...prev, newPoint];
        if (updated.length > 60) {
          updated.shift();
        }
        return updated;
      });
    }
  }, [session?.speed, session?.progress, session?.candidatesTested, session?.status]);
  
  // Reset chart when new attack starts
  useEffect(() => {
    if (session?.status === 'running' && session?.candidatesTested === 0) {
      setChartData([]);
    }
  }, [session?.hashId, session?.status]);
  
  const isActive = session?.status === 'running' || session?.status === 'paused';
  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p>Speed: {formatSpeed(payload[0].value)}</p>
          <p>Tested: {formatNumber(payload[0].payload.candidates)}</p>
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
          <h3>Cracking Progress</h3>
          {isActive && (
            <span className={`status-indicator ${session.status}`}>
              {session.status === 'running' ? 'Running' : 'Paused'}
            </span>
          )}
        </div>
        
        {isActive && (
          <div className="chart-stats">
            <div className="chart-stat">
              <span className="chart-stat-label">Progress</span>
              <span className="chart-stat-value">{(session?.progress || 0).toFixed(2)}%</span>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-label">Speed</span>
              <span className="chart-stat-value">{formatSpeed(session?.speed || 0)}</span>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-label">ETA</span>
              <span className="chart-stat-value">{formatTime(session?.eta || 0)}</span>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-label">Tested</span>
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
            <span className="candidate-label">Current:</span>
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
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                hide 
              />
              <YAxis 
                hide
                domain={['dataMin - 100', 'dataMax + 100']}
              />
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
            <p>{isActive ? 'Collecting data...' : 'Start an attack to see progress'}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ProgressChart;
