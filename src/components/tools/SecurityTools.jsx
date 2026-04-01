import { motion } from 'framer-motion';
import { HelpCircle, KeyRound, Layers, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import {
  analyzePasswordStrength,
  buildCustomMask,
  detectHashType
} from '../../services/hashcat/apiClient';
import {
  analyzePasswordStrengthLocal,
  buildMaskLocal,
  identifyHashTypeLocal
} from '../../services/security/instruments';
import './SecurityTools.css';

const HASH_EXAMPLES = [
  { label: 'WPA/WPA2 (hc22000)', value: 'WPA*01*c6d5c97b65e4a050962517ddc35de35b*28c236187c22*0cf3ee000542*4f70656e576c616e***' },
  { label: 'MD5', value: '5d41402abc4b2a76b9719d911017c592' },
  { label: 'SHA1', value: 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d' }
];

const PASSWORD_EXAMPLES = [
  { label: 'Weak', value: '123456' },
  { label: 'Medium', value: 'Summer2024' },
  { label: 'Strong', value: 'K9$mP!x2vR@7nQ' }
];

function SecurityTools() {
  const { t } = useI18n();

  const [hashInput, setHashInput] = useState('');
  const [hashResult, setHashResult] = useState(null);

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordResult, setPasswordResult] = useState(null);

  const [maskParams, setMaskParams] = useState({ lowercase: 4, uppercase: 1, digits: 2, symbols: 1 });
  const [maskResult, setMaskResult] = useState(buildMaskLocal(maskParams));

  const resolveLevelLabel = (level) => {
    const levelKey = `tools.levelValues.${level}`;
    const translated = t(levelKey);
    return translated === levelKey ? level : translated;
  };

  const resolveFeedbackLine = (line) => {
    if (!line) return '';
    const translated = t(line);
    return translated === line ? line : translated;
  };

  const handleHashDetect = async () => {
    if (!hashInput.trim()) return;

    try {
      const result = await detectHashType(hashInput.trim());
      setHashResult(result);
      return;
    } catch {
      // Fallback to local detector when backend is unreachable.
    }

    setHashResult(identifyHashTypeLocal(hashInput));
  };

  const handlePasswordAnalyze = async () => {
    try {
      const result = await analyzePasswordStrength(passwordInput);
      setPasswordResult(result);
      return;
    } catch {
      // Fallback to local analyzer.
    }

    setPasswordResult(analyzePasswordStrengthLocal(passwordInput));
  };

  const handleBuildMask = async () => {
    try {
      const result = await buildCustomMask(maskParams);
      setMaskResult(result);
      return;
    } catch {
      // Fallback to local mask builder.
    }

    setMaskResult(buildMaskLocal(maskParams));
  };

  const tryHashExample = (value) => {
    setHashInput(value);
    setHashResult(identifyHashTypeLocal(value));
  };

  const tryPasswordExample = (value) => {
    setPasswordInput(value);
    setPasswordResult(analyzePasswordStrengthLocal(value));
  };

  const tryMaskPreset = (params) => {
    setMaskParams(params);
    setMaskResult(buildMaskLocal(params));
  };

  const guideBoxStyle = {
    marginTop: '12px',
    padding: '10px 12px',
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '8px',
    fontSize: '12px'
  };

  const guideHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    fontWeight: 600,
    color: '#a5b4fc',
    fontSize: '12px'
  };

  const tryBtnStyle = {
    padding: '3px 10px',
    fontSize: '11px',
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '4px',
    color: '#c7d2fe',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  };

  return (
    <div className="security-tools-page">
      <div className="security-tools-grid">
        <motion.section
          className="glass-card security-tool-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="tool-card-header">
            <ShieldCheck size={18} />
            <h3>{t('tools.hashIdentifier')}</h3>
          </div>

          <textarea
            className="input tool-textarea"
            rows={4}
            value={hashInput}
            onChange={(event) => setHashInput(event.target.value)}
            placeholder={t('tools.hashInput')}
          />

          <button type="button" className="btn btn-primary" onClick={handleHashDetect}>
            {t('tools.detect')}
          </button>

          {hashResult && (
            <div className="tool-result">
              <div><strong>{t('tools.resultName')}:</strong> {(hashResult.name === 'Unknown' ? t('tools.unknown') : hashResult.name) || t('tools.unknown')}</div>
              <div><strong>{t('tools.resultMode')}:</strong> {hashResult.mode ?? t('tools.notAvailable')}</div>
              <div><strong>{t('tools.resultConfidence')}:</strong> {(Number(hashResult.confidence || 0) * 100).toFixed(0)}%</div>
            </div>
          )}

          <div style={guideBoxStyle}>
            <div style={guideHeaderStyle}>
              <HelpCircle size={13} />
              {t('tools.guide.tryExamples')}
            </div>
            <p style={{ margin: '0 0 8px', color: '#94a3b8', lineHeight: 1.5 }}>
              {t('tools.guide.hashDescription')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {HASH_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  style={tryBtnStyle}
                  onClick={() => tryHashExample(ex.value)}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="glass-card security-tool-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="tool-card-header">
            <KeyRound size={18} />
            <h3>{t('tools.passwordAnalyzer')}</h3>
          </div>

          <input
            className="input"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            placeholder={t('tools.passwordInput')}
          />

          <button type="button" className="btn btn-primary" onClick={handlePasswordAnalyze}>
            {t('tools.analyze')}
          </button>

          {passwordResult && (
            <div className="tool-result">
              <div><strong>{t('tools.score')}:</strong> {passwordResult.score} / 5</div>
              <div><strong>{t('tools.level')}:</strong> {resolveLevelLabel(passwordResult.level)}</div>
              {(passwordResult.feedback || []).length > 0 && (
                <div className="tool-feedback">
                  {(passwordResult.feedback || []).map((line) => (
                    <p key={line}>{resolveFeedbackLine(line)}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={guideBoxStyle}>
            <div style={guideHeaderStyle}>
              <HelpCircle size={13} />
              {t('tools.guide.tryExamples')}
            </div>
            <p style={{ margin: '0 0 8px', color: '#94a3b8', lineHeight: 1.5 }}>
              {t('tools.guide.passwordDescription')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PASSWORD_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  style={tryBtnStyle}
                  onClick={() => tryPasswordExample(ex.value)}
                >
                  {ex.label}: {ex.value}
                </button>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="glass-card security-tool-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <div className="tool-card-header">
            <Layers size={18} />
            <h3>{t('tools.maskBuilder')}</h3>
          </div>

          <div className="mask-input-grid">
            <label>
              <span>{t('tools.uppercase')}</span>
              <input
                className="input"
                type="number"
                min="0"
                max="8"
                value={maskParams.uppercase}
                onChange={(event) => setMaskParams((prev) => ({ ...prev, uppercase: Number(event.target.value) || 0 }))}
              />
            </label>

            <label>
              <span>{t('tools.lowercase')}</span>
              <input
                className="input"
                type="number"
                min="0"
                max="8"
                value={maskParams.lowercase}
                onChange={(event) => setMaskParams((prev) => ({ ...prev, lowercase: Number(event.target.value) || 0 }))}
              />
            </label>

            <label>
              <span>{t('tools.digits')}</span>
              <input
                className="input"
                type="number"
                min="0"
                max="8"
                value={maskParams.digits}
                onChange={(event) => setMaskParams((prev) => ({ ...prev, digits: Number(event.target.value) || 0 }))}
              />
            </label>

            <label>
              <span>{t('tools.symbols')}</span>
              <input
                className="input"
                type="number"
                min="0"
                max="8"
                value={maskParams.symbols}
                onChange={(event) => setMaskParams((prev) => ({ ...prev, symbols: Number(event.target.value) || 0 }))}
              />
            </label>
          </div>

          <button type="button" className="btn btn-primary" onClick={handleBuildMask}>
            {t('tools.buildMask')}
          </button>

          <div className="tool-result">
            <div><strong>{t('tools.generatedMask')}:</strong> <code>{maskResult?.mask || t('tools.emptyMask')}</code></div>
            <div><strong>{t('tools.length')}:</strong> {maskResult?.length || 0}</div>
          </div>

          <div style={guideBoxStyle}>
            <div style={guideHeaderStyle}>
              <HelpCircle size={13} />
              {t('tools.guide.tryExamples')}
            </div>
            <p style={{ margin: '0 0 8px', color: '#94a3b8', lineHeight: 1.5 }}>
              {t('tools.guide.maskDescription')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button type="button" style={tryBtnStyle} onClick={() => tryMaskPreset({ lowercase: 8, uppercase: 0, digits: 0, symbols: 0 })}>
                {t('tools.guide.maskAllLower')}
              </button>
              <button type="button" style={tryBtnStyle} onClick={() => tryMaskPreset({ lowercase: 0, uppercase: 0, digits: 8, symbols: 0 })}>
                {t('tools.guide.maskAllDigits')}
              </button>
              <button type="button" style={tryBtnStyle} onClick={() => tryMaskPreset({ lowercase: 3, uppercase: 2, digits: 2, symbols: 1 })}>
                {t('tools.guide.maskMixed')}
              </button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

export default SecurityTools;
