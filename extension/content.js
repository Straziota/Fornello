// Listens for a message from the popup asking to extract the recipe
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'EXTRACT_RECIPE') {
    sendResponse(extractRecipe());
  }
  if (msg.type === 'EXTRACT_SOCIAL_TEXT') {
    sendResponse(extractSocialText());
  }
  if (msg.type === 'GET_LANG') {
    sendResponse(document.documentElement.lang || navigator.language || '');
  }
});

// ── Social media fallback ────────────────────────────────────────────────
// When Schema.org extraction fails and we're on Instagram / TikTok / YouTube /
// Pinterest, bundle up everything Claude could need to parse a recipe from text.
function detectSocialPlatform() {
  const host = window.location.hostname.replace(/^www\./, '');
  if (host.includes('instagram.com')) return 'instagram';
  if (host.includes('tiktok.com')) return 'tiktok';
  if (host.includes('youtube.com') || host === 'youtu.be') return 'youtube';
  if (host.includes('pinterest.')) return 'pinterest';
  return null;
}

function extractSocialText() {
  const platform = detectSocialPlatform();
  if (!platform) return null;

  const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || '';
  const ogTitle = meta('meta[property="og:title"]') || document.title;
  const ogDescription = meta('meta[property="og:description"]') || meta('meta[name="description"]');

  // Platform-specific scoped text — fall back to body innerText
  let scoped = '';
  if (platform === 'youtube') {
    const desc = document.querySelector('#description-inline-expander, ytd-text-inline-expander, #description');
    const transcriptSegs = document.querySelectorAll('ytd-transcript-segment-renderer');
    const transcript = [...transcriptSegs].map(s => s.textContent.trim()).join(' ');
    scoped = [desc?.innerText || '', transcript].filter(Boolean).join('\n\n');
  } else if (platform === 'instagram') {
    const article = document.querySelector('article');
    scoped = article?.innerText || '';
  } else if (platform === 'tiktok') {
    const desc = document.querySelector('[data-e2e="browse-video-desc"], [data-e2e="video-desc"]');
    scoped = desc?.innerText || '';
  } else if (platform === 'pinterest') {
    const pin = document.querySelector('[data-test-id="pin-description"], [data-test-id="pin"]');
    scoped = pin?.innerText || '';
  }

  // Always include body text as backstop, truncated. Claude can pick the recipe out.
  const body = (document.body?.innerText || '').slice(0, 15000);
  const pageText = (scoped + '\n\n' + body).slice(0, 18000);

  return { platform, url: window.location.href, ogTitle, ogDescription, pageText };
}

function extractRecipe() {
  // 1. Try Schema.org JSON-LD (most reliable — used by NYT Cooking, AllRecipes, Smitten Kitchen, etc.)
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      // Some sites have malformed JSON-LD with trailing newlines / HTML comments — strip them
      const raw = (script.textContent || '').trim().replace(/^<!--/, '').replace(/-->$/, '').trim();
      const data = JSON.parse(raw);
      const recipe = findRecipeSchema(data);
      if (recipe) return normalizeSchema(recipe);
    } catch {}
  }

  // 2. Try microdata / itemtype Recipe
  const itemEl = document.querySelector('[itemtype*="Recipe"]') ||
                 document.querySelector('[itemtype*="recipe"]');
  if (itemEl) return extractMicrodata(itemEl);

  return null;
}

function findRecipeSchema(data, depth = 0) {
  if (!data || depth > 6) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeSchema(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof data !== 'object') return null;

  // Handle @type as a string OR an array (e.g. ["Recipe", "NewsArticle"])
  const t = data['@type'];
  if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) return data;

  // Common wrappers
  if (data['@graph']) {
    const found = findRecipeSchema(data['@graph'], depth + 1);
    if (found) return found;
  }
  for (const key of ['mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
    if (data[key]) {
      const found = findRecipeSchema(data[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function normalizeSchema(r) {
  const text = v => typeof v === 'string' ? v : (v?.text || v?.['@value'] || '');
  const list = v => {
    if (!v) return [];
    if (typeof v === 'string') return [v];
    if (Array.isArray(v)) return v.map(item =>
      typeof item === 'string' ? item : (item.text || item.name || item['@value'] || JSON.stringify(item))
    );
    return [];
  };

  const ingredients = list(r.recipeIngredient).map(raw => {
    // Try to split "2 cups flour" into amount + item
    const match = raw.match(/^([\d½¼¾⅓⅔\s\/\-\.]+(?:cups?|tbsp?|tsp?|oz|lbs?|g|kg|ml|l|cloves?|pieces?|slices?|cans?|packages?|bunches?)?)\s+(.+)/i);
    return match ? { amount: match[1].trim(), item: match[2].trim() } : { amount: '', item: raw };
  });

  const instructions = list(r.recipeInstructions).map((step, i) => {
    const s = typeof step === 'string' ? step : (step.text || '');
    return s.startsWith('Step') ? s : `Step ${i + 1}: ${s}`;
  });

  const totalTime = parseDuration(r.totalTime) || parseDuration(r.cookTime) || '';
  const prepTime  = parseDuration(r.prepTime) || '';
  const cookTime  = parseDuration(r.cookTime) || '';

  return {
    name:         text(r.name) || document.title,
    description:  text(r.description) || '',
    cuisine:      list(r.recipeCuisine).join(', ') || '',
    mealType:     guessMealType(text(r.name), list(r.recipeCategory)),
    serves:       parseInt(r.recipeYield?.[0] || r.recipeYield || '4') || 4,
    total_time:   totalTime,
    prep_time:    prepTime,
    cook_time:    cookTime,
    difficulty:   'Medium',
    tags:         list(r.keywords).flatMap(k => k.split(',')).map(k => k.trim()).filter(Boolean).slice(0, 6),
    ingredients,
    instructions,
    prep_ahead:   [],
    source:       window.location.href,
  };
}

function extractMicrodata(el) {
  const get = (prop) => el.querySelector(`[itemprop="${prop}"]`)?.textContent?.trim() || '';
  const getAll = (prop) => [...el.querySelectorAll(`[itemprop="${prop}"]`)].map(e => e.textContent?.trim() || '');

  return {
    name:        get('name') || document.title,
    description: get('description') || '',
    cuisine:     get('recipeCuisine') || '',
    mealType:    guessMealType(get('name'), getAll('recipeCategory')),
    serves:      parseInt(get('recipeYield')) || 4,
    total_time:  get('totalTime') || '',
    prep_time:   get('prepTime') || '',
    cook_time:   get('cookTime') || '',
    difficulty:  'Medium',
    tags:        [],
    ingredients: getAll('recipeIngredient').map(i => ({ amount: '', item: i })),
    instructions: getAll('recipeInstructions').map((s, i) => `Step ${i+1}: ${s}`),
    prep_ahead:  [],
    source:      window.location.href,
  };
}

function parseDuration(iso) {
  if (!iso) return '';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return iso;
  const h = parseInt(m[1] || '0');
  const min = parseInt(m[2] || '0');
  if (h && min) return `${h}h ${min} min`;
  if (h) return `${h} hour${h > 1 ? 's' : ''}`;
  if (min) return `${min} min`;
  return '';
}

function guessMealType(name, categories) {
  const text = (name + ' ' + categories.join(' ')).toLowerCase();
  if (/pasta|lasagna|spaghetti|penne|fettuccine|rigatoni|gnocchi/.test(text)) return 'pasta';
  if (/chicken|pollo/.test(text)) return 'chicken';
  if (/beef|pork|lamb|steak|meat|veal/.test(text)) return 'meat';
  if (/fish|salmon|shrimp|seafood|tuna|cod|halibut|scallop|lobster|crab/.test(text)) return 'seafood';
  if (/vegetarian|vegan|veggie|tofu/.test(text)) return 'vegetarian';
  if (/soup|stew|chili|chowder|bisque/.test(text)) return 'soup or stew';
  if (/taco|burrito|enchilada|mexican|salsa/.test(text)) return 'Mexican';
  if (/asian|chinese|japanese|thai|korean|sushi|ramen|stir.?fry/.test(text)) return 'Asian';
  return 'Any';
}
