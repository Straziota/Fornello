let FORNELLO_URL = 'https://www.fornello.app';

const FORNELLO_TARGETS = [
  'https://www.fornello.app',
  'https://fornello.app',
  'http://localhost:3001',
  'http://localhost:3000',
];

async function findFornelloPort() {
  for (const url of FORNELLO_TARGETS) {
    try {
      const res = await fetch(`${url}/api/settings`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(5000),
      });
      // 200 = logged in. 401 = reachable but not signed in.
      if (res.ok) { FORNELLO_URL = url; return { reachable: true, loggedIn: true }; }
      if (res.status === 401) { FORNELLO_URL = url; return { reachable: true, loggedIn: false }; }
    } catch (e) {}
  }
  return { reachable: false, loggedIn: false };
}

let extractedRecipe = null;
const $ = id => document.getElementById(id);

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const status = await findFornelloPort();
  if (!status.loggedIn) {
    // Auto-open Fornello so the user can sign in, then come back to the recipe page
    // and click the extension again. Don't auto-open if Fornello is already an open tab
    // somewhere (avoid spamming duplicate tabs).
    const existing = await chrome.tabs.query({ url: ['https://www.fornello.app/*', 'https://fornello.app/*'] });
    if (existing.length === 0) {
      chrome.tabs.create({ url: 'https://www.fornello.app/login', active: false });
    } else {
      // Focus the existing Fornello tab so they can sign in quickly
      chrome.tabs.update(existing[0].id, { active: true });
    }

    const msg = status.reachable
      ? `🔐 Please sign in to Fornello first.<br><br>
         I just opened it in a new tab — sign in there, then come back to this page and click the extension again.`
      : `☕ Fornello isn't open yet.<br><br>
         I just opened it in a new tab — sign in (if needed), then come back to this page and click the extension again.`;
    $('detecting').innerHTML = msg;
    $('detecting').style.fontStyle = 'normal';
    $('detecting').style.textAlign = 'left';
    return;
  }

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch {}

  const tryExtract = (attempt = 0) => {
    chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_RECIPE' }, recipe => {
      if (chrome.runtime.lastError || !recipe) {
        // Some sites inject JSON-LD after load — retry up to twice with a delay
        if (attempt < 2) { setTimeout(() => tryExtract(attempt + 1), 800); return; }
        trySocialFallback(tab.id);
        return;
      }
      extractedRecipe = recipe;
      populateForm(recipe);
      show('recipe-found');
    });
  };
  tryExtract();
}

// Called when Schema.org extraction failed. On Instagram/TikTok/YouTube/Pinterest,
// gather the page text and ask the server to parse it with Claude.
function trySocialFallback(tabId) {
  chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_SOCIAL_TEXT' }, async (social) => {
    if (chrome.runtime.lastError || !social || !social.platform) {
      show('no-recipe');
      return;
    }

    const labels = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', pinterest: 'Pinterest' };
    $('detecting').innerHTML = `🎥 Reading ${labels[social.platform] || social.platform} post…<br><span style="font-size:11px;color:#999">Claude is parsing the recipe — this can take 5-15 seconds.</span>`;
    show('detecting');

    try {
      const res = await fetch(`${FORNELLO_URL}/api/recipes/parse-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(social),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 422) {
          $('detecting').innerHTML = `🤷 No recipe found in this ${labels[social.platform] || 'post'}.<br><span style="font-size:11px;color:#999">${err.error || ''}</span>`;
          return;
        }
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const recipe = await res.json();
      extractedRecipe = recipe;
      populateForm(recipe);
      show('recipe-found');
    } catch (e) {
      $('detecting').innerHTML = `❌ Could not parse this post.<br><span style="font-size:11px;color:#999">${e.message}</span>`;
    }
  });
}

function populateForm(r) {
  $('recipe-name').textContent = r.name;
  $('recipe-meta').textContent = [r.cuisine, r.total_time, `serves ${r.serves}`].filter(Boolean).join(' · ');
  $('f-name').value = r.name;
  $('f-cuisine').value = r.cuisine || '';
  $('f-time').value = r.total_time || '';
  $('f-serves').value = r.serves || 4;

  const sel = $('f-mealtype');
  for (const opt of sel.options) {
    if (opt.value === r.mealType) { sel.value = opt.value; break; }
  }
}

async function translateRecipe() {
  const btn = $('btn-translate');
  btn.disabled = true;
  btn.textContent = '🌍 Translating…';
  $('error-msg').style.display = 'none';

  try {
    const res = await fetch(`${FORNELLO_URL}/api/translate-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name:         extractedRecipe.name,
        description:  extractedRecipe.description,
        ingredients:  extractedRecipe.ingredients,
        instructions: extractedRecipe.instructions,
      }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const translated = await res.json();
    if (translated.error) throw new Error(translated.error);

    if (translated.name)         extractedRecipe.name         = translated.name;
    if (translated.description)  extractedRecipe.description  = translated.description;
    if (translated.ingredients)  extractedRecipe.ingredients  = translated.ingredients;
    if (translated.instructions) extractedRecipe.instructions = translated.instructions;

    populateForm(extractedRecipe);
    btn.textContent = '✓ Translated';

  } catch (e) {
    $('error-msg').textContent = `Translation failed: ${e.message}`;
    $('error-msg').style.display = 'block';
    btn.disabled = false;
    btn.textContent = '🌍 Translate to English';
  }
}

async function importRecipe() {
  const btn = $('btn-import');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  $('error-msg').style.display = 'none';

  const recipe = {
    ...extractedRecipe,
    name:       $('f-name').value.trim(),
    cuisine:    $('f-cuisine').value.trim(),
    mealType:   $('f-mealtype').value,
    total_time: $('f-time').value.trim(),
    serves:     parseInt($('f-serves').value) || 4,
  };

  try {
    const res = await fetch(`${FORNELLO_URL}/api/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(recipe),
    });
    if (res.status === 401) {
      throw new Error('Please sign in to Fornello in your browser first, then try again.');
    }

    if (!res.ok) throw new Error('Could not save recipe.');
    $('success-name').textContent = recipe.name;
    show('success');
  } catch (e) {
    $('error-msg').textContent = 'Could not reach Fornello. Make sure the app is open and try again.';
    $('error-msg').style.display = 'block';
    btn.disabled = false;
    btn.textContent = '📥 Add to Recipes';
  }
}

function show(id) {
  ['detecting', 'no-recipe', 'recipe-found', 'success'].forEach(s => {
    $(s).style.display = s === id ? 'block' : 'none';
  });
}

$('btn-import').addEventListener('click', importRecipe);
$('btn-translate').addEventListener('click', translateRecipe);
$('btn-cancel').addEventListener('click', () => window.close());

init();
