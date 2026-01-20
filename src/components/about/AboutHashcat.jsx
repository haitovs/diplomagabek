import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Book,
    Combine,
    ExternalLink, Github,
    Hash,
    Shield,
    Wifi,
    Zap
} from 'lucide-react';
import './AboutHashcat.css';

function AboutHashcat() {
  const hashModes = [
    { mode: '22000', name: 'WPA-PBKDF2-PMKID+EAPOL', desc: 'Modern WPA/WPA2 format (recommended)' },
    { mode: '2500', name: 'WPA-EAPOL-PBKDF2', desc: 'Legacy WPA/WPA2 handshake' },
    { mode: '16800', name: 'WPA-PMKID-PBKDF2', desc: 'PMKID-only attack' }
  ];
  
  const attackModes = [
    { 
      mode: '-a 0', 
      name: 'Dictionary Attack', 
      icon: Book,
      desc: 'Tests passwords from a wordlist file. Most effective when using comprehensive wordlists like RockYou.'
    },
    { 
      mode: '-a 3', 
      name: 'Brute-force Attack', 
      icon: Hash,
      desc: 'Tries all possible character combinations based on a mask pattern. Effective for short or predictable passwords.'
    },
    { 
      mode: '-a 6', 
      name: 'Hybrid Attack', 
      icon: Combine,
      desc: 'Combines wordlist with mask. Example: word + ?d?d?d appends 3 digits to each dictionary word.'
    }
  ];
  
  const maskChars = [
    { char: '?l', desc: 'Lowercase letters (a-z)', count: 26 },
    { char: '?u', desc: 'Uppercase letters (A-Z)', count: 26 },
    { char: '?d', desc: 'Digits (0-9)', count: 10 },
    { char: '?s', desc: 'Special characters (!@#$...)', count: 32 },
    { char: '?a', desc: 'All printable ASCII', count: 95 }
  ];
  
  return (
    <div className="about-hashcat">
      {/* Header */}
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
          <h1>About Hashcat & WiFi Cracking</h1>
          <p>Understanding WPA/WPA2 password recovery techniques</p>
        </div>
      </motion.div>
      
      {/* Disclaimer */}
      <motion.div 
        className="disclaimer glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <AlertTriangle size={24} />
        <div>
          <h3>Educational Purpose Only</h3>
          <p>
            This application is a <strong>simulation</strong> for educational purposes. 
            It does not interact with real WiFi networks or the actual hashcat tool. 
            Always obtain proper authorization before testing security on any network.
          </p>
        </div>
      </motion.div>
      
      {/* What is Hashcat */}
      <motion.div 
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2>What is Hashcat?</h2>
        <p>
          Hashcat is the world's fastest and most advanced password recovery utility. 
          It supports five unique modes of attack for over 300 highly-optimized hashing algorithms. 
          Hashcat is particularly powerful for cracking WiFi WPA/WPA2 passwords when combined 
          with captured handshakes or PMKIDs.
        </p>
        <div className="features-grid">
          <div className="feature">
            <Zap size={20} />
            <span>GPU Accelerated</span>
          </div>
          <div className="feature">
            <Shield size={20} />
            <span>300+ Hash Types</span>
          </div>
          <div className="feature">
            <Hash size={20} />
            <span>Multiple Attack Modes</span>
          </div>
        </div>
      </motion.div>
      
      {/* Hash Modes */}
      <motion.div 
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2>WiFi Hash Modes</h2>
        <p>Hashcat uses specific mode numbers (-m flag) for different hash types:</p>
        <div className="hash-modes">
          {hashModes.map(mode => (
            <div key={mode.mode} className="hash-mode-item">
              <span className="mode-number font-mono">-m {mode.mode}</span>
              <div className="mode-details">
                <strong>{mode.name}</strong>
                <p>{mode.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      
      {/* Attack Modes */}
      <motion.div 
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2>Attack Modes</h2>
        <div className="attack-modes">
          {attackModes.map(attack => {
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
                  <p>{attack.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
      
      {/* Mask Characters */}
      <motion.div 
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2>Mask Characters</h2>
        <p>Masks define character sets for brute-force attacks:</p>
        <div className="mask-table">
          <table>
            <thead>
              <tr>
                <th>Mask</th>
                <th>Character Set</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {maskChars.map(m => (
                <tr key={m.char}>
                  <td className="font-mono mask-char">{m.char}</td>
                  <td>{m.desc}</td>
                  <td className="font-mono">{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mask-example">
          <h4>Example Masks</h4>
          <ul>
            <li><code>?d?d?d?d?d?d?d?d</code> - 8 digit PIN (100,000,000 combinations)</li>
            <li><code>?u?l?l?l?l?l?d?d</code> - Common pattern like "Welcome23"</li>
            <li><code>?a?a?a?a?a?a?a?a</code> - 8 character all ASCII (6.6 quadrillion)</li>
          </ul>
        </div>
      </motion.div>
      
      {/* hc22000 Format */}
      <motion.div 
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2>hc22000 Hash Format</h2>
        <p>Modern hashcat uses the hc22000 format for WPA/WPA2 hashes:</p>
        <div className="code-block">
          <code>WPA*TYPE*PMKID_OR_MIC*MAC_AP*MAC_CLIENT*ESSID_HEX*NONCE*EAPOL*MESSAGEPAIR</code>
        </div>
        <div className="format-examples">
          <div className="format-example">
            <h4>PMKID Hash (WPA*01)</h4>
            <code className="hash-example">WPA*01*4d4fe7aac3a2cecab195321ceb99a7d0*fc690c158264*f4747f87f9f4*486f6d655f4e6574***</code>
          </div>
          <div className="format-example">
            <h4>EAPOL Hash (WPA*02)</h4>
            <code className="hash-example">WPA*02*[MIC]*[MAC_AP]*[MAC_CLIENT]*[ESSID_HEX]*[NONCE_AP]*[EAPOL]*[MSGPAIR]</code>
          </div>
        </div>
      </motion.div>
      
      {/* Resources */}
      <motion.div 
        className="section glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h2>External Resources</h2>
        <div className="resources">
          <a href="https://hashcat.net" target="_blank" rel="noopener noreferrer" className="resource-link">
            <ExternalLink size={16} />
            hashcat.net - Official Website
          </a>
          <a href="https://github.com/hashcat/hashcat" target="_blank" rel="noopener noreferrer" className="resource-link">
            <Github size={16} />
            Hashcat on GitHub
          </a>
          <a href="https://hashcat.net/wiki/" target="_blank" rel="noopener noreferrer" className="resource-link">
            <Book size={16} />
            Hashcat Wiki & Documentation
          </a>
        </div>
      </motion.div>
    </div>
  );
}

export default AboutHashcat;
