import { Menu, Shield, Wifi, X } from 'lucide-react';
import './Header.css';

function Header({ onMenuToggle, menuOpen }) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle btn-ghost" onClick={onMenuToggle}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        <div className="logo">
          <div className="logo-icon">
            <Wifi className="logo-wifi" />
            <Shield className="logo-shield" />
          </div>
          <div className="logo-text">
            <h1>HashCracker</h1>
            <span>WiFi Security Analysis Tool</span>
          </div>
        </div>
      </div>
      
      <div className="header-right">
        <div className="header-badge">
          <span className="badge badge-info">Educational</span>
        </div>
        <div className="header-version">
          v1.0.0
        </div>
      </div>
    </header>
  );
}

export default Header;
