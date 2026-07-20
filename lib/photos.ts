const FOOD_WORDS = [
  'dish', 'recipe', 'cuisine', 'pasta', 'stew', 'salad', 'soup', 'sauce',
  'meal', 'food', 'baked', 'roasted', 'grilled', 'fried', 'curry', 'bread',
  'cake', 'dessert', 'sandwich', 'casserole', 'braise', 'braised', 'sautéed',
];

async function wikiPhoto(term: string): Promise<string | null> {
  const searchRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(term)}&limit=1&format=json`,
    { signal: AbortSignal.timeout(4000) }
  );
  if (!searchRes.ok) return null;
  const [, titles] = await searchRes.json() as [string, string[]];
  if (!titles?.[0]) return null;

  const summaryRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titles[0])}`,
    { signal: AbortSignal.timeout(4000) }
  );
  if (!summaryRes.ok) return null;
  const data = await summaryRes.json();
  if (!data?.thumbnail?.source) return null;

  const desc = (data.description || '').toLowerCase();
  const isFoodDish = FOOD_WORDS.some(w => desc.includes(w));
  if (!isFoodDish) return null;

  return data.thumbnail.source.replace(/\/\d+px-/, '/640px-');
}

export async function fetchMealPhoto(mealName: string, imageKeyword?: string): Promise<string | null> {
  const searchTerms = [
    imageKeyword?.split(/\s+/).slice(0, 3).join(' '),
    mealName.split(/\s+/).slice(0, 3).join(' '),
    mealName.split(/\s+/).slice(0, 2).join(' '),
  ].filter((t): t is string => Boolean(t?.trim()));

  for (const term of searchTerms) {
    try {
      const photo = await wikiPhoto(term);
      if (photo) return photo;
    } catch {}
  }
  return null;
}
