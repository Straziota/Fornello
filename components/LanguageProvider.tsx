'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { UIStrings, getTranslations, isRTL, normalizeLanguage } from '@/lib/translations';

interface LanguageContextValue {
  language: string;
  t: UIStrings;
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'English',
  t: getTranslations('English'),
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState('English');

  useEffect(() => {
    // Load from localStorage immediately (no flash)
    const stored = localStorage.getItem('fornello_language');
    if (stored) { setLanguageState(normalizeLanguage(stored)); return; }
    // Fall back to fetching from settings API
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.language) {
        const normalized = normalizeLanguage(d.language);
        setLanguageState(normalized);
        localStorage.setItem('fornello_language', normalized);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Keep <html lang> and dir in sync
    const langMap: Record<string, string> = {
      'English': 'en', 'Italian': 'it', 'Spanish': 'es', 'French': 'fr',
      'Portuguese': 'pt', 'German': 'de', 'Dutch': 'nl', 'Russian': 'ru',
      'Polish': 'pl', 'Japanese': 'ja', 'Chinese (Simplified)': 'zh-Hans',
      'Chinese (Traditional)': 'zh-Hant', 'Korean': 'ko', 'Arabic': 'ar',
      'Hebrew': 'he', 'Persian': 'fa', 'Urdu': 'ur',
    };
    document.documentElement.lang = langMap[language] ?? 'en';
    document.documentElement.dir = isRTL(language) ? 'rtl' : 'ltr';
  }, [language]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('fornello_language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, t: getTranslations(language), setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
