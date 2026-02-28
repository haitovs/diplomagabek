import { Menu, Shield, Wifi, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import './Header.css';

function Header({ onMenuToggle, menuOpen }) {
  const { language, changeLanguage, t } = useI18n();

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
            <h1>{t('app.name')}</h1>
            <span>{t('app.subtitle')}</span>
          </div>
        </div>
      </div>
      
      <div className="header-right">
        <label className="language-picker">
          <span>{t('header.language')}:</span>
          <select
            className="select language-select"
            value={language}
            onChange={(event) => changeLanguage(event.target.value)}
          >
            <option value="en">{t('header.languages.en')}</option>
            <option value="tk">{t('header.languages.tk')}</option>
          </select>
        </label>
        <div className="header-badge">
          <span className="badge badge-info">{t('header.educational')}</span>
        </div>
        <div className="header-version">
          {t('app.version')}
        </div>
      </div>
    </header>
  );
}

export default Header;
