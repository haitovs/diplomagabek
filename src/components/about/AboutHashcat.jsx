import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Book,
  Combine,
  ExternalLink,
  Github,
  Hash,
  Shield,
  Wifi,
  Zap
} from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import './AboutHashcat.css';

function AboutHashcat() {
  const { t } = useI18n();

  const hashModes = [
    { mode: '22000', name: 'WPA-PBKDF2-PMKID+EAPOL', descKey: 'about.hashModes.mode22000' },
    { mode: '2500', name: 'WPA-EAPOL-PBKDF2', descKey: 'about.hashModes.mode2500' },
    { mode: '16800', name: 'WPA-PMKID-PBKDF2', descKey: 'about.hashModes.mode16800' }
  ];

  const attackModes = [
    {
      mode: '-a 0',
      name: t('attack.modes.dictionary.name'),
      icon: Book,
      descKey: 'about.attackModes.dictionary'
    },
    {
      mode: '-a 3',
      name: t('attack.modes.bruteforce.name'),
      icon: Hash,
      descKey: 'about.attackModes.bruteforce'
    },
    {
      mode: '-a 6',
      name: t('attack.modes.hybrid.name'),
      icon: Combine,
      descKey: 'about.attackModes.hybrid'
    }
  ];

  const maskChars = [
    { char: '?l', descKey: 'about.maskChars.lowercase', count: 26 },
    { char: '?u', descKey: 'about.maskChars.uppercase', count: 26 },
    { char: '?d', descKey: 'about.maskChars.digits', count: 10 },
    { char: '?s', descKey: 'about.maskChars.special', count: 32 },
    { char: '?a', descKey: 'about.maskChars.all', count: 95 }
  ];

  return (
    <div className="about-hashcat">
      <motion.div
        className="about-header glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="about-logo">
          <Wifi size={40} />
          <Shield size={28} className="shield-icon" />
        </div>
        <div className="about-title">
          <h1>{t('about.headerTitle')}</h1>
          <p>{t('about.headerSubtitle')}</p>
        </div>
      </motion.div>

      <motion.div
        className="disclaimer glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <AlertTriangle size={24} />
        <div>
          <h3>{t('about.educationalOnlyTitle')}</h3>
          <p>{t('about.educationalOnlyBody')}</p>
        </div>
      </motion.div>

      <motion.div
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2>{t('about.whatIsHashcatTitle')}</h2>
        <p>{t('about.whatIsHashcatBody')}</p>
        <div className="features-grid">
          <div className="feature">
            <Zap size={20} />
            <span>{t('about.features.gpu')}</span>
          </div>
          <div className="feature">
            <Shield size={20} />
            <span>{t('about.features.hashTypes')}</span>
          </div>
          <div className="feature">
            <Hash size={20} />
            <span>{t('about.features.attackModes')}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2>{t('about.wifiHashModesTitle')}</h2>
        <p>{t('about.wifiHashModesBody')}</p>
        <div className="hash-modes">
          {hashModes.map((mode) => (
            <div key={mode.mode} className="hash-mode-item">
              <span className="mode-number font-mono">-m {mode.mode}</span>
              <div className="mode-details">
                <strong>{mode.name}</strong>
                <p>{t(mode.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2>{t('about.attackModesTitle')}</h2>
        <div className="attack-modes">
          {attackModes.map((attack) => {
            const Icon = attack.icon;
            return (
              <div key={attack.mode} className="attack-mode-item">
                <div className="attack-icon">
                  <Icon size={24} />
                </div>
                <div className="attack-info">
                  <div className="attack-header">
                    <strong>{attack.name}</strong>
                    <span className="attack-flag font-mono">{attack.mode}</span>
                  </div>
                  <p>{t(attack.descKey)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2>{t('about.maskCharactersTitle')}</h2>
        <p>{t('about.maskCharactersBody')}</p>
        <div className="mask-table">
          <table>
            <thead>
              <tr>
                <th>{t('about.maskColumn')}</th>
                <th>{t('about.characterSetColumn')}</th>
                <th>{t('about.countColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {maskChars.map((mask) => (
                <tr key={mask.char}>
                  <td className="font-mono mask-char">{mask.char}</td>
                  <td>{t(mask.descKey)}</td>
                  <td className="font-mono">{mask.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mask-example">
          <h4>{t('about.exampleMasksTitle')}</h4>
          <ul>
            <li>{t('about.exampleMasks.one')}</li>
            <li>{t('about.exampleMasks.two')}</li>
            <li>{t('about.exampleMasks.three')}</li>
          </ul>
        </div>
      </motion.div>

      <motion.div
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2>{t('about.hc22000Title')}</h2>
        <p>{t('about.hc22000Body')}</p>
        <div className="code-block">
          <code>WPA*TYPE*PMKID_OR_MIC*MAC_AP*MAC_CLIENT*ESSID_HEX*NONCE*EAPOL*MESSAGEPAIR</code>
        </div>
        <div className="format-examples">
          <div className="format-example">
            <h4>{t('about.hc22000Pmkid')}</h4>
            <code className="hash-example">WPA*01*4d4fe7aac3a2cecab195321ceb99a7d0*fc690c158264*f4747f87f9f4*486f6d655f4e6574***</code>
          </div>
          <div className="format-example">
            <h4>{t('about.hc22000Eapol')}</h4>
            <code className="hash-example">WPA*02*[MIC]*[MAC_AP]*[MAC_CLIENT]*[ESSID_HEX]*[NONCE_AP]*[EAPOL]*[MSGPAIR]</code>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h2>{t('about.resourcesTitle')}</h2>
        <div className="resources">
          <a href="https://hashcat.net" target="_blank" rel="noopener noreferrer" className="resource-link">
            <ExternalLink size={16} />
            {t('about.resources.website')}
          </a>
          <a href="https://github.com/hashcat/hashcat" target="_blank" rel="noopener noreferrer" className="resource-link">
            <Github size={16} />
            {t('about.resources.github')}
          </a>
          <a href="https://hashcat.net/wiki/" target="_blank" rel="noopener noreferrer" className="resource-link">
            <Book size={16} />
            {t('about.resources.wiki')}
          </a>
        </div>
      </motion.div>
    </div>
  );
}

export default AboutHashcat;
