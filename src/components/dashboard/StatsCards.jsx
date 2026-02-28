import { motion } from 'framer-motion';
import { Clock, Database, Key, Zap } from 'lucide-react';
import { useCracking } from '../../context/CrackingContext';
import { useI18n } from '../../context/I18nContext';
import { formatNumber, formatSpeed } from '../../services/hashcat/simulator';
import './StatsCards.css';

function StatsCards() {
  const { stats, session } = useCracking();
  const { t } = useI18n();
  
  if (!stats) return null;
  
  const cards = [
    {
      id: 'total',
      label: t('stats.totalHashes'),
      value: stats.total,
      icon: Database,
      color: 'cyan',
      subtext: `${stats.byType.PMKID} PMKID / ${stats.byType.EAPOL} EAPOL`
    },
    {
      id: 'cracked',
      label: t('stats.cracked'),
      value: stats.cracked,
      icon: Key,
      color: 'green',
      subtext: t('stats.successRate', { value: stats.successRate })
    },
    {
      id: 'pending',
      label: t('stats.pending'),
      value: stats.pending,
      icon: Clock,
      color: 'orange',
      subtext: t('stats.currentlyCracking', { value: stats.cracking })
    },
    {
      id: 'speed',
      label: t('stats.currentSpeed'),
      value: session?.status === 'running' ? formatSpeed(session.speed) : '0 H/s',
      icon: Zap,
      color: 'purple',
      subtext: session?.status === 'running' ? t('stats.attackInProgress') : t('stats.idle'),
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
