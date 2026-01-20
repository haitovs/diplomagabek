import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import './App.css';
import AboutHashcat from './components/about/AboutHashcat';
import AttackPanel from './components/attack/AttackPanel';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import ActivityLog from './components/dashboard/ActivityLog';
import ProgressChart from './components/dashboard/ProgressChart';
import StatsCards from './components/dashboard/StatsCards';
import HashTable from './components/database/HashTable';
import CrackedList from './components/results/CrackedList';
import { CrackingProvider, useCracking } from './context/CrackingContext';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { activeTab, session } = useCracking();
  
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-layout">
            <StatsCards />
            <div className="dashboard-grid">
              <ProgressChart />
              <ActivityLog />
            </div>
          </div>
        );
      case 'database':
        return <HashTable />;
      case 'attack':
        return <AttackPanel />;
      case 'results':
        return <CrackedList />;
      case 'logs':
        return (
          <div className="logs-page">
            <h2>Full Activity Log</h2>
            <div className="logs-container glass-card">
              <ActivityLog />
            </div>
          </div>
        );
      case 'about':
        return <AboutHashcat />;
      default:
        return <StatsCards />;
    }
  };
  
  const getPageTitle = () => {
    const titles = {
      dashboard: 'Dashboard',
      database: 'Hash Database',
      attack: 'Attack Panel',
      results: 'Cracked Passwords',
      logs: 'Activity Logs',
      about: 'About Hashcat'
    };
    return titles[activeTab] || 'Dashboard';
  };
  
  return (
    <div className="app">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} menuOpen={sidebarOpen} />
      <Sidebar isOpen={sidebarOpen} />
      
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="page-header">
          <h2 className="page-title">{getPageTitle()}</h2>
          {session?.status === 'running' && (
            <div className="active-attack-badge">
              <span className="pulse-dot"></span>
              Attack in Progress: {session.targetHash?.ssid}
            </div>
          )}
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="page-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  return (
    <CrackingProvider>
      <AppContent />
    </CrackingProvider>
  );
}

export default App;
