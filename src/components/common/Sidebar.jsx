import { AnimatePresence, motion } from 'framer-motion';
import {
    Crosshair,
    Database,
    FileText,
    Info,
    Key,
    LayoutDashboard
} from 'lucide-react';
import { useCracking } from '../../context/CrackingContext';
import './Sidebar.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'database', label: 'Hash Database', icon: Database },
  { id: 'attack', label: 'Attack Panel', icon: Crosshair },
  { id: 'results', label: 'Cracked Passwords', icon: Key },
  { id: 'logs', label: 'Activity Logs', icon: FileText },
  { id: 'about', label: 'About Hashcat', icon: Info },
];

function Sidebar({ isOpen }) {
  const { activeTab, setActiveTab, stats, session } = useCracking();
  
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
                  <span>{item.label}</span>
                  
                  {item.id === 'database' && stats && (
                    <span className="nav-badge">{stats.total}</span>
                  )}
                  {item.id === 'results' && stats && (
                    <span className="nav-badge success">{stats.cracked}</span>
                  )}
                  {item.id === 'attack' && session?.status === 'running' && (
                    <span className="nav-badge warning animate-pulse">LIVE</span>
                  )}
                </button>
              );
            })}
          </nav>
          
          <div className="sidebar-footer">
            <div className="sidebar-stats">
              <div className="stat-row">
                <span className="stat-label">Total Hashes</span>
                <span className="stat-value">{stats?.total || 0}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Cracked</span>
                <span className="stat-value success">{stats?.cracked || 0}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Success Rate</span>
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
