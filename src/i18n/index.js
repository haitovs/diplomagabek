import en from './locales/en.json';
import tk from './locales/tk.json';

export const SUPPORTED_LANGUAGES = ['en', 'tk'];
export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_STORAGE_KEY = 'hashcracker_language';

const translations = {
  en,
  tk
};

function resolvePath(obj, path) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function interpolate(template, params) {
  if (!params) return template;

  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replaceAll(`{{${key}}}`, String(value));
  }, template);
}

export function getTranslation(language, key, params) {
  const targetLang = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  const selectedPack = translations[targetLang];
  const fallbackPack = translations[DEFAULT_LANGUAGE];

  const selectedValue = resolvePath(selectedPack, key);
  const fallbackValue = resolvePath(fallbackPack, key);
  const value = selectedValue ?? fallbackValue ?? key;

  return typeof value === 'string' ? interpolate(value, params) : key;
}

export default translations;
