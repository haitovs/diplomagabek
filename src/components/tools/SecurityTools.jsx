import { motion } from 'framer-motion';
import { KeyRound, Layers, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useCracking } from '../../context/CrackingContext';
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

function SecurityTools() {
  const { isRealBackendEnabled } = useCracking();
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

    if (isRealBackendEnabled) {
      try {
        const result = await detectHashType(hashInput.trim());
        setHashResult(result);
        return;
      } catch {
        // Fallback to local detector when backend tool route is unreachable.
      }
    }

    setHashResult(identifyHashTypeLocal(hashInput));
  };

  const handlePasswordAnalyze = async () => {
    if (isRealBackendEnabled) {
      try {
        const result = await analyzePasswordStrength(passwordInput);
        setPasswordResult(result);
        return;
      } catch {
        // Fallback to local analyzer.
      }
    }

    setPasswordResult(analyzePasswordStrengthLocal(passwordInput));
  };

  const handleBuildMask = async () => {
    if (isRealBackendEnabled) {
      try {
        const result = await buildCustomMask(maskParams);
        setMaskResult(result);
        return;
      } catch {
        // Fallback to local mask builder.
      }
    }

    setMaskResult(buildMaskLocal(maskParams));
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
        </motion.section>
      </div>
    </div>
  );
}

export default SecurityTools;
