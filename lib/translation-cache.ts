// localStorage-backed translation cache
// Translates recipe content to the user's language on demand, caches the result

interface TranslatableContent {
  name?: string;
  description?: string;
  ingredients?: { amount: string; item: string }[];
  instructions?: string[];
  prep_ahead?: string[];
  sides?: { name: string; ingredients?: { amount: string; item: string }[]; instructions?: string[] }[];
}

function cacheKey(name: string, language: string): string {
  return `fornello-tr-${language}-${name}`;
}

export function getCachedTranslation(name: string, language: string): TranslatableContent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(name, language));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setCachedTranslation(name: string, language: string, content: TranslatableContent) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(cacheKey(name, language), JSON.stringify(content));
  } catch { /* quota exceeded — ignore */ }
}

/**
 * Translate the recipe content to `language`, returning a partial object with the translated fields.
 * Uses localStorage cache keyed by recipe name + language.
 * Returns null and skips API call if language is 'English' (the assumed base).
 */
export async function translateRecipeContent(
  content: TranslatableContent & { name: string },
  language: string,
): Promise<TranslatableContent | null> {
  if (!language || language === 'English') return null;
  const cached = getCachedTranslation(content.name, language);
  if (cached) return cached;
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetLanguage: language,
        name: content.name,
        description: content.description,
        ingredients: content.ingredients,
        instructions: content.instructions,
        prep_ahead: content.prep_ahead,
        sides: content.sides,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setCachedTranslation(content.name, language, data);
    return data;
  } catch {
    return null;
  }
}
