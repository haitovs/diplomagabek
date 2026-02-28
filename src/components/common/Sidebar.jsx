import { AnimatePresence, motion } from 'framer-motion';
import {
    Crosshair,
    Database,
    FileText,
    Info,
    Key,
    LayoutDashboard,
    Wrench
} from 'lucide-react';
import { useCracking } from '../../context/CrackingContext';
import { useI18n } from '../../context/I18nContext';
import './Sidebar.css';

const navItems = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'database', labelKey: 'nav.database', icon: Database },
  { id: 'attack', labelKey: 'nav.attack', icon: Crosshair },
  { id: 'results', labelKey: 'nav.results', icon: Key },
  { id: 'logs', labelKey: 'nav.logs', icon: FileText },
  { id: 'tools', labelKey: 'nav.tools', icon: Wrench },
  { id: 'about', labelKey: 'nav.about', icon: Info },
];

function Sidebar({ isOpen }) {
  const { activeTab, setActiveTab, stats, session } = useCracking();
  const { t } = useI18n();
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside 
          className="sidebar"
          initial={{ x: -260, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -260, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={20} />
                  <span>{t(item.labelKey)}</span>
                  
                  {item.id === 'database' && stats && (
                    <span className="nav-badge">{stats.total}</span>
                  )}
                  {item.id === 'results' && stats && (
                    <span className="nav-badge success">{stats.cracked}</span>
                  )}
                  {item.id === 'attack' && session?.status === 'running' && (
                    <span className="nav-badge warning animate-pulse">{t('sidebar.live')}</span>
                  )}
                </button>
              );
            })}
          </nav>
          
          <div className="sidebar-footer">
            <div className="sidebar-stats">
            <div className="stat-row">
                <span className="stat-label">{t('sidebar.totalHashes')}</span>
                <span className="stat-value">{stats?.total || 0}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">{t('sidebar.cracked')}</span>
                <span className="stat-value success">{stats?.cracked || 0}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">{t('sidebar.successRate')}</span>
                <span className="stat-value">{stats?.successRate || 0}%</span>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export default Sidebar;
