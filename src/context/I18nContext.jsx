import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  getTranslation,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES
} from '../i18n';

const I18nContext = createContext(null);

function getInitialLanguage() {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored;
  }

  const browserLanguage = navigator.language?.split('-')?.[0] || DEFAULT_LANGUAGE;
  return SUPPORTED_LANGUAGES.includes(browserLanguage)
    ? browserLanguage
    : DEFAULT_LANGUAGE;
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  const changeLanguage = useCallback((nextLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(nextLanguage)) {
      return;
    }
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguage(nextLanguage);
  }, []);

  const t = useCallback((key, params) => getTranslation(language, key, params), [language]);

  const value = useMemo(() => ({
    language,
    changeLanguage,
    t,
    supportedLanguages: SUPPORTED_LANGUAGES
  }), [language, changeLanguage, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return context;
}

export default I18nContext;
