import { motion } from 'framer-motion';
import { Clock, Database, Key, Zap } from 'lucide-react';
import { useCracking } from '../../context/CrackingContext';
import { formatNumber, formatSpeed } from '../../services/hashcat/simulator';
import './StatsCards.css';

function StatsCards() {
  const { stats, session } = useCracking();
  
  if (!stats) return null;
  
  const cards = [
    {
      id: 'total',
      label: 'Total Hashes',
      value: stats.total,
      icon: Database,
      color: 'cyan',
      subtext: `${stats.byType.PMKID} PMKID / ${stats.byType.EAPOL} EAPOL`
    },
    {
      id: 'cracked',
      label: 'Cracked',
      value: stats.cracked,
      icon: Key,
      color: 'green',
      subtext: `${stats.successRate}% success rate`
    },
    {
      id: 'pending',
      label: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'orange',
      subtext: `${stats.cracking} currently cracking`
    },
    {
      id: 'speed',
      label: 'Current Speed',
      value: session?.status === 'running' ? formatSpeed(session.speed) : '0 H/s',
      icon: Zap,
      color: 'purple',
      subtext: session?.status === 'running' ? 'Attack in progress' : 'Idle',
      isText: true
    }
  ];
  
  return (
    <div className="stats-cards">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <motion.div
            key={card.id}
            className={`stat-card stat-card-${card.color}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="stat-card-header">
              <div className="stat-icon">
                <Icon size={24} />
              </div>
              <span className="stat-label">{card.label}</span>
            </div>
            
            <div className="stat-value">
              {card.isText ? card.value : formatNumber(card.value)}
            </div>
            
            <div className="stat-subtext">{card.subtext}</div>
            
            <div className="stat-glow" />
          </motion.div>
        );
      })}
    </div>
  );
}

export default StatsCards;
