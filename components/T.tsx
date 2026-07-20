'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from './LanguageProvider';
import * as engine from '@/lib/t-engine';

/**
 * Auto-translate visible English text into the user's selected language.
 * Children MUST be a plain string. Use {variables} as text in template strings.
 *
 * Examples:
 *   <T>This week at home</T>
 *   <T>{`Welcome, ${name}!`}</T>  ← works but creates a new cache key per name
 *
 * Translations are cached in localStorage and shared across all <T> instances.
 */
export function T({ children }: { children: string }) {
  const { language } = useLanguage();
  // Tell the engine which language we're on (idempotent)
  useEffect(() => { engine.setLanguage(language); }, [language]);

  // Subscribe to engine updates — re-render when a new translation arrives
  const [, setTick] = useState(0);
  useEffect(() => {
    return engine.subscribe(() => setTick(n => n + 1));
  }, []);

  if (typeof children !== 'string') return <>{children}</>;
  if (language === 'English') return <>{children}</>;
  return <>{engine.getTranslation(children)}</>;
}

/** Hook variant — useful for placeholders, alt text, aria labels, etc. */
export function useT(text: string): string {
  const { language } = useLanguage();
  useEffect(() => { engine.setLanguage(language); }, [language]);
  const [, setTick] = useState(0);
  useEffect(() => {
    return engine.subscribe(() => setTick(n => n + 1));
  }, []);
  if (language === 'English' || !text) return text;
  return engine.getTranslation(text);
}
