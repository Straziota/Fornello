'use client';
import { useState, useEffect, useRef } from 'react';
import { Settings, WeekSchedule, PrepScheduleType } from '@/lib/types';
import Toast from '@/components/Toast';
import { useTour } from '@/components/TourWrapper';
import PageBackground from '@/components/PageBackground';
import { useLanguage } from '@/components/LanguageProvider';
import { SITE_URL } from '@/lib/site';
import { BUILTIN_CATEGORIES, categorizeStaple, stapleCategory } from '@/lib/categories';
import { normalizeLanguage } from '@/lib/translations';
import { T } from '@/components/T';
import { createBrowser } from '@/lib/supabase';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TIME_OPTIONS = [
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '3 hours', value: 180 },
];
const MEAL_TYPES = [
  { label: 'Any',        value: 'any' },
  { label: '🥩 Meat',    value: 'meat' },
  { label: '🍗 Chicken', value: 'chicken' },
  { label: '🦞 Seafood', value: 'seafood' },
  { label: '🍝 Pasta',   value: 'pasta' },
  { label: '🥗 Vegetarian', value: 'vegetarian' },
  { label: '🍜 Soup / Stew', value: 'soup or stew' },
  { label: '🌮 Mexican', value: 'Mexican' },
  { label: '🍣 Asian',   value: 'Asian' },
  { label: '🫘 Legumes', value: 'legumes or beans' },
];

const DEFAULT_SCHEDULE: WeekSchedule = {
  Monday:    { enabled: true,  minutes: 45 },
  Tuesday:   { enabled: true,  minutes: 45 },
  Wednesday: { enabled: true,  minutes: 45 },
  Thursday:  { enabled: true,  minutes: 45 },
  Friday:    { enabled: true,  minutes: 60 },
  Saturday:  { enabled: true,  minutes: 120 },
  Sunday:    { enabled: true,  minutes: 120 },
};

export default function SettingsPage() {
  const { startTour } = useTour();
  const { setLanguage: setContextLanguage } = useLanguage();
  const [settings, setSettings] = useState<Settings>({
    familySize: 4, websites: [], preferences: [], restrictions: [],
    schedule: DEFAULT_SCHEDULE, randomizeMealTypes: false, randomizePool: [],
    prepSchedule: { type: 'daily' }, prioritizeMyRecipes: false, cookingTechniques: [],
    preferredSides: [], avoidedSides: [], skipIngredients: [],
  } as any);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [newWebsite, setNewWebsite] = useState('');
  const [newTechnique, setNewTechnique] = useState('');
  const [newPreferredSide, setNewPreferredSide] = useState('');
  const [newAvoidedSide, setNewAvoidedSide] = useState('');
  const [newSkipIngredient, setNewSkipIngredient] = useState('');
  const [newPref, setNewPref] = useState('');
  const [newRestrict, setNewRestrict] = useState('');
  const [newVacStart, setNewVacStart] = useState('');
  const [newVacEnd, setNewVacEnd] = useState('');
  const [newVacNote, setNewVacNote] = useState('');
  const [newStaple, setNewStaple] = useState('');

  // Account section state
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  // Change password: this project enforces a current-password rule that the
  // in-app updateUser can't satisfy (the SDK has no current-password param), so
  // we email a secure password-reset link — the recovery flow, which is exempt —
  // and the user sets their new password on the reset page.
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull the signed-in user's email so we can display it and pre-populate the input.
  useEffect(() => {
    const supabase = createBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setCurrentEmail(data.user.email);
    });
  }, []);

  const changeEmail = async () => {
    const target = newEmail.trim().toLowerCase();
    if (!target || !target.includes('@')) {
      setToast({ msg: 'Please enter a valid email address.', type: 'error' });
      return;
    }
    if (target === currentEmail.toLowerCase()) {
      setToast({ msg: 'That is already your current email.', type: 'error' });
      return;
    }
    setUpdatingEmail(true);
    const supabase = createBrowser();
    const { error } = await supabase.auth.updateUser(
      { email: target },
      { emailRedirectTo: `${SITE_URL}/login` },
    );
    setUpdatingEmail(false);
    if (error) {
      setToast({ msg: `Could not update email: ${error.message}`, type: 'error' });
      return;
    }
    setToast({
      msg: `Confirmation sent to ${target}. Click the link in that email to complete the change. Until then, keep signing in with ${currentEmail}.`,
      type: 'success',
    });
    setNewEmail('');
  };

  // Email a secure password-reset link. The user clicks it and sets a new
  // password on the /reset-password page (recovery flow), which is the path this
  // project actually allows.
  const sendPasswordResetLink = async () => {
    setSendingReset(true);
    const supabase = createBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(currentEmail, {
      redirectTo: `${SITE_URL}/reset-password`,
    });
    setSendingReset(false);
    if (error) {
      setToast({ msg: `Could not send reset link: ${error.message}`, type: 'error' });
      return;
    }
    setResetSent(true);
    setToast({ msg: `We emailed a password-reset link to ${currentEmail}.`, type: 'success' });
  };

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setSettings(prev => ({
        ...prev, ...d,
        schedule: Object.keys(d.schedule || {}).length ? d.schedule : DEFAULT_SCHEDULE,
      }));
      // Mark loaded *after* the state-update commit so the auto-save effect doesn't
      // fire on the initial population from the server.
      setTimeout(() => { loadedRef.current = true; }, 0);
    });
  }, []);

  // Debounced auto-save: anything the user changes (family size, week start, schedule
  // grid, vacations, prioritize toggle, email sharing, etc.) persists 800ms after the
  // last edit. The /api/settings POST endpoint merges, so this composes cleanly with
  // the per-chip auto-saves already wired up below.
  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }).catch(() => { /* silent — the explicit Save button still surfaces errors */ });
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [settings]);

  const save = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.error || `HTTP ${res.status}`;
        console.error('save settings failed:', detail, settings);
        setToast({ msg: `Save failed: ${detail}`, type: 'error' });
        return;
      }
      setToast({ msg: 'Settings saved ✓', type: 'success' });
      if ((settings as any).language) setContextLanguage((settings as any).language);
    } catch (e: any) {
      console.error('save settings network error:', e);
      setToast({ msg: `Save failed: ${e.message || 'network error'}`, type: 'error' });
    }
  };

  // Push a partial settings update to the server immediately. Backend merges, so other
  // fields are preserved. Used by every chip-style add/remove so users never have to
  // remember to click "Save Settings" for those sections.
  const persist = async (partial: Record<string, any>, toastMsg?: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.error || `HTTP ${res.status}`;
        console.error('settings save failed:', detail, partial);
        setToast({ msg: `Save failed: ${detail}`, type: 'error' });
        return;
      }
      if (toastMsg) setToast({ msg: toastMsg, type: 'success' });
    } catch (e: any) {
      console.error('settings save network error:', e);
      setToast({ msg: `Save failed: ${e.message || 'network error'}`, type: 'error' });
    }
  };

  const addItem = (field: string, val: string, clear: () => void, label?: string) => {
    if (!val.trim()) return;
    setSettings((s: any) => {
      const next = [...(s[field] || []), val.trim()];
      persist({ [field]: next }, `${label || 'Item'} added — saved ✓`);
      return { ...s, [field]: next };
    });
    clear();
  };

  const removeItem = (field: string, i: number) => {
    setSettings((s: any) => {
      const next = (s[field] as string[]).filter((_: any, idx: number) => idx !== i);
      persist({ [field]: next });
      return { ...s, [field]: next };
    });
  };

  // Legacy aliases so existing call sites keep working
  const add = (field: 'websites' | 'preferences' | 'restrictions', val: string, clear: () => void) =>
    addItem(field, val, clear, field === 'websites' ? 'Site' : field === 'preferences' ? 'Preference' : 'Restriction');
  const remove = (field: 'websites' | 'preferences' | 'restrictions', i: number) => removeItem(field, i);

  const persistStaples = (staples: string[]) => persist({ staples });

  // Captures a staple's name on focus so we can migrate its category override if it's renamed.
  const stapleRenameRef = useRef<string>('');

  // Built-in categories + any user-created ones currently in use.
  const customCategories = [...new Set(Object.values(((settings as any).stapleCategories || {}) as Record<string, string>))]
    .filter(c => c && !(BUILTIN_CATEGORIES as readonly string[]).includes(c));
  const availableCategories = [...BUILTIN_CATEGORIES, ...customCategories];

  const setStapleCategory = (name: string, category: string) => {
    setSettings((s: any) => {
      const next = { ...(s.stapleCategories || {}) };
      next[name] = category;
      persist({ staples: s.staples, stapleCategories: next });
      return { ...s, stapleCategories: next };
    });
  };

  const handleStapleCategoryChange = (name: string, value: string) => {
    if (value === '__new__') {
      const created = window.prompt('Name your new category (e.g. Baby, Pet, Household):')?.trim();
      if (!created) return;
      setStapleCategory(name, created);
    } else {
      setStapleCategory(name, value);
    }
  };

  const commitStapleRename = (i: number, oldName: string) => {
    setSettings((s: any) => {
      const newName = (s.staples || [])[i];
      let cats = s.stapleCategories || {};
      if (oldName && newName && oldName !== newName && cats[oldName]) {
        cats = { ...cats, [newName]: cats[oldName] };
        delete cats[oldName];
      }
      persist({ staples: s.staples, stapleCategories: cats });
      return { ...s, stapleCategories: cats };
    });
  };

  const addStaples = () => {
    // Accept one item or many — split on commas or newlines, dedupe against existing.
    const items = newStaple.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
    if (items.length === 0) return;
    setSettings((s: any) => {
      const existing = new Set((s.staples || []).map((x: string) => x.toLowerCase()));
      const fresh = items.filter(i => !existing.has(i.toLowerCase()));
      const next = [...(s.staples || []), ...fresh];
      persist({ staples: next }, `${fresh.length} staple${fresh.length === 1 ? '' : 's'} added — saved ✓`);
      return { ...s, staples: next };
    });
    setNewStaple('');
  };

  const tagStyle = (variant: string): React.CSSProperties => {
    if (variant === 'pref') return { background: '#FEF6E4', color: '#7A5B10' };
    if (variant === 'restrict') return { background: '#FDEDEB', color: '#C0392B' };
    return { background: 'var(--green-lt)', color: 'var(--green)' };
  };

  return (
    <>
      <PageBackground src="/backgrounds/Settings-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em] mb-8" style={{ fontFamily: 'AbramoSerif, serif' }}><T>Settings</T></h1>

      <div className="max-w-2xl space-y-5">

        {/* Language */}
        <Section tour="set-language" icon="/icons/Language.png" title="Language">
          <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>
            All generated content — recipes, menus, timelines — will be written in this language.
          </p>
          <select
            value={normalizeLanguage((settings as any).language)}
            onChange={e => setSettings(s => ({ ...s, language: e.target.value } as any))}
            style={{
              width: '100%', maxWidth: '340px', padding: '10px 14px',
              borderRadius: '10px', border: '1px solid var(--border)',
              background: 'var(--cream)', color: 'var(--text)',
              fontSize: '14px', fontFamily: 'Georgia, serif', outline: 'none',
            }}>
            {([
              ['Afrikaans','Afrikaans'],['Amharic','አማርኛ — Amharic'],['Arabic','العربية — Arabic'],
              ['Armenian','Հայերեն — Armenian'],['Azerbaijani','Azərbaycan — Azerbaijani'],
              ['Basque','Euskara — Basque'],['Belarusian','Беларуская — Belarusian'],
              ['Bengali','বাংলা — Bengali'],['Bosnian','Bosanski — Bosnian'],
              ['Bulgarian','Български — Bulgarian'],['Burmese','မြန်မာဘာသာ — Burmese'],
              ['Catalan','Català — Catalan'],['Cebuano','Cebuano'],
              ['Chinese (Simplified)','中文（简体）— Chinese Simplified'],
              ['Chinese (Traditional)','中文（繁體）— Chinese Traditional'],
              ['Croatian','Hrvatski — Croatian'],['Czech','Čeština — Czech'],
              ['Danish','Dansk — Danish'],['Dutch','Nederlands — Dutch'],
              ['English','English'],['Estonian','Eesti — Estonian'],
              ['Filipino','Filipino — Tagalog'],['Finnish','Suomi — Finnish'],
              ['French','Français — French'],['Galician','Galego — Galician'],
              ['Georgian','ქართული — Georgian'],['German','Deutsch — German'],
              ['Greek','Ελληνικά — Greek'],['Gujarati','ગુજરાતી — Gujarati'],
              ['Haitian Creole','Kreyòl ayisyen'],['Hausa','Hausa'],
              ['Hebrew','עברית — Hebrew'],['Hindi','हिन्दी — Hindi'],
              ['Hungarian','Magyar — Hungarian'],['Icelandic','Íslenska — Icelandic'],
              ['Igbo','Igbo'],['Indonesian','Bahasa Indonesia'],
              ['Irish','Gaeilge — Irish'],['Italian','Italiano — Italian'],
              ['Japanese','日本語 — Japanese'],['Javanese','Basa Jawa — Javanese'],
              ['Kannada','ಕನ್ನಡ — Kannada'],['Kazakh','Қазақша — Kazakh'],
              ['Khmer','ខ្មែរ — Khmer'],['Korean','한국어 — Korean'],
              ['Kurdish','Kurdî — Kurdish'],['Kyrgyz','Кыргызча — Kyrgyz'],
              ['Lao','ລາວ — Lao'],['Latvian','Latviešu — Latvian'],
              ['Lithuanian','Lietuvių — Lithuanian'],['Luxembourgish','Lëtzebuergesch'],
              ['Macedonian','Македонски — Macedonian'],['Malagasy','Malagasy'],
              ['Malay','Bahasa Melayu — Malay'],['Malayalam','മലയാളം — Malayalam'],
              ['Maltese','Malti — Maltese'],['Maori','Te Reo Māori'],
              ['Marathi','मराठी — Marathi'],['Mongolian','Монгол — Mongolian'],
              ['Nepali','नेपाली — Nepali'],['Norwegian','Norsk — Norwegian'],
              ['Pashto','پښتو — Pashto'],['Persian','فارسی — Persian'],
              ['Polish','Polski — Polish'],['Portuguese','Português — Portuguese'],
              ['Punjabi','ਪੰਜਾਬੀ — Punjabi'],['Romanian','Română — Romanian'],
              ['Russian','Русский — Russian'],['Samoan','Gagana Samoa'],
              ['Serbian','Српски — Serbian'],['Sesotho','Sesotho'],['Shona','Shona'],
              ['Sindhi','سنڌي — Sindhi'],['Sinhala','සිංහල — Sinhala'],
              ['Slovak','Slovenčina — Slovak'],['Slovenian','Slovenščina — Slovenian'],
              ['Somali','Afsoomaali — Somali'],['Spanish','Español — Spanish'],
              ['Sundanese','Basa Sunda — Sundanese'],['Swahili','Kiswahili — Swahili'],
              ['Swedish','Svenska — Swedish'],['Tajik','Тоҷикӣ — Tajik'],
              ['Tamil','தமிழ் — Tamil'],['Tatar','Татар — Tatar'],
              ['Telugu','తెలుగు — Telugu'],['Thai','ภาษาไทย — Thai'],
              ['Turkish','Türkçe — Turkish'],['Turkmen','Türkmen — Turkmen'],
              ['Ukrainian','Українська — Ukrainian'],['Urdu','اردو — Urdu'],
              ['Uzbek',"Oʻzbekcha — Uzbek"],['Vietnamese','Tiếng Việt — Vietnamese'],
              ['Welsh','Cymraeg — Welsh'],['Xhosa','Xhosa'],
              ['Yiddish','יידיש — Yiddish'],['Yoruba','Yorùbá — Yoruba'],
              ['Zulu','isiZulu — Zulu'],
            ] as [string,string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Section>

        {/* Family size */}
        <Section tour="set-family" icon="/icons/Family size.png" title="Family Size">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSettings(s => ({ ...s, familySize: Math.max(1, s.familySize - 1) }))}
              className="w-10 h-10 rounded-full text-xl font-bold flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--green)' }}>
              −
            </button>
            <span className="w-12 text-center text-2xl font-semibold" style={{ color: 'var(--text)' }}>
              {settings.familySize}
            </span>
            <button
              onClick={() => setSettings(s => ({ ...s, familySize: Math.min(20, s.familySize + 1) }))}
              className="w-10 h-10 rounded-full text-xl font-bold flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--green)' }}>
              +
            </button>
            <span className="text-sm" style={{ color: '#888' }}>people</span>
          </div>
        </Section>

        {/* Websites */}
        <Section tour="set-sites" icon="/icons/Recipe sources.png" title="Favourite Recipe Sites"
          desc="Recipes will be inspired by these sites (e.g. seriouseats.com, smittenkitchen.com)">
          <TagList items={settings.websites} onRemove={i => remove('websites', i)} tagStyle={tagStyle('site')} />
          <AddRow value={newWebsite} onChange={setNewWebsite} placeholder="e.g. seriouseats.com"
            onAdd={() => { add('websites', newWebsite, () => setNewWebsite('')); }} />
        </Section>

        {/* Preferences */}
        <Section tour="set-preferences" icon="/icons/Food preferences.png" title="Preferred Types of Food"
          desc="Cuisines or styles you love (e.g. Italian, Asian, vegetarian, comfort food, quick meals)">
          <TagList items={settings.preferences} onRemove={i => remove('preferences', i)} tagStyle={tagStyle('pref')} />
          <AddRow value={newPref} onChange={setNewPref} placeholder="e.g. Italian"
            onAdd={() => { add('preferences', newPref, () => setNewPref('')); }} />
        </Section>

        {/* Restrictions */}
        <Section tour="set-restrictions" icon="/icons/Dietary restrictions.png" title="Dietary Restrictions & Allergies"
          desc="Strictly avoided in every meal (e.g. gluten-free, nut allergy, no pork, dairy-free)">
          <TagList items={settings.restrictions} onRemove={i => remove('restrictions', i)} tagStyle={tagStyle('restrict')} />
          <AddRow value={newRestrict} onChange={setNewRestrict} placeholder="e.g. nut allergy"
            onAdd={() => { add('restrictions', newRestrict, () => setNewRestrict('')); }} />
        </Section>

        {/* Skip Ingredients */}
        <Section tour="set-skip" icon="/icons/Skip Ingredients.png" title="Ingredients to Replace or Avoid"
          desc="Ingredients you can do without — like thyme, red pepper flakes, or chili. Fornello will avoid recipes where these are essential, and offer a simplified version when they're just optional seasoning.">
          <TagList items={(settings as any).skipIngredients || []} onRemove={i => removeItem('skipIngredients', i)}
            tagStyle={{ background: '#FEF6E4', color: '#7A5B10' }} />
          <AddRow value={newSkipIngredient} onChange={setNewSkipIngredient} placeholder="e.g. thyme, red pepper flakes, chili…"
            onAdd={() => addItem('skipIngredients', newSkipIngredient, () => setNewSkipIngredient(''), 'Ingredient')} />
        </Section>

        {/* Pantry Staples */}
        <Section tour="set-staples" icon="/icons/Pantry Staples.png" title="Pantry Staples"
          desc="Items you always need on hand — olive oil, salt, eggs, butter, etc. These will appear on every grocery list so you can check if you're running low. Click any item to rename it. Paste a whole list at once below.">
          {((settings as any).staples || []).length > 0 && (
            <div className="space-y-2 mb-3">
              {((settings as any).staples as string[]).map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="text" value={s}
                    onChange={e => setSettings((st: any) => ({ ...st, staples: (st.staples as string[]).map((x: string, j: number) => j === i ? e.target.value : x) }))}
                    onFocus={e => { stapleRenameRef.current = e.target.value; }}
                    onBlur={() => commitStapleRename(i, stapleRenameRef.current)}
                    className="flex-1 min-w-0 px-4 py-2 rounded-lg border text-sm outline-none"
                    style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
                  <select
                    value={stapleCategory(s, (settings as any).stapleCategories)}
                    onChange={e => handleStapleCategoryChange(s, e.target.value)}
                    title="Grocery aisle for this staple"
                    className="shrink-0 px-2 py-2 rounded-lg border text-xs outline-none cursor-pointer"
                    style={{ background: 'var(--white)', borderColor: 'var(--border)', color: 'var(--text-2)', maxWidth: '150px' }}>
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__new__">＋ New category…</option>
                  </select>
                  <button onClick={() => setSettings((st: any) => {
                      const removed = (st.staples as string[])[i];
                      const next = (st.staples as string[]).filter((_: string, j: number) => j !== i);
                      const cats = { ...(st.stapleCategories || {}) };
                      delete cats[removed];
                      persist({ staples: next, stapleCategories: cats });
                      return { ...st, staples: next, stapleCategories: cats };
                    })}
                    className="shrink-0 px-2 text-lg transition-opacity hover:opacity-60"
                    style={{ color: 'var(--text-3)' }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-start">
            <textarea value={newStaple} onChange={e => setNewStaple(e.target.value)}
              placeholder={"Add one or paste many — separate by comma or new line\ne.g. Olive oil, Sea salt, Eggs, Butter, Flour, Sugar"}
              rows={2}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addStaples();
                }
              }}
              className="flex-1 px-4 py-2 rounded-lg border text-sm outline-none resize-y"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)', minHeight: '44px' }} />
            <button onClick={addStaples}
              className="shrink-0 px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)' }}>
              Add
            </button>
          </div>
        </Section>

        {/* Cooking Techniques */}
        <Section tour="set-techniques" icon="/icons/Techniques.png" title="Cooking Techniques"
          desc="Add techniques you like to use (e.g. Slow Cooker, Air Fryer, Grill, Instant Pot). You can then assign them to specific days below.">
          <TagList items={settings.cookingTechniques || []} onRemove={i => removeItem('cookingTechniques', i)}
            tagStyle={{ background: 'var(--green-lt)', color: 'var(--green)' }} />
          <AddRow value={newTechnique} onChange={setNewTechnique} placeholder="e.g. Slow Cooker, Air Fryer, Grill…"
            onAdd={() => addItem('cookingTechniques', newTechnique, () => setNewTechnique(''), 'Technique')} />
        </Section>

        {/* Preferred Sides */}
        <Section tour="set-preferred-sides" icon="/icons/Preferred Sides.png" title="Preferred Sides"
          desc="Sides you love — Chef Claude will lean toward these when suggesting dinner accompaniments.">
          <TagList items={(settings as any).preferredSides || []} onRemove={i => removeItem('preferredSides', i)}
            tagStyle={{ background: 'var(--green-lt)', color: 'var(--green)' }} />
          <AddRow value={newPreferredSide} onChange={setNewPreferredSide} placeholder="e.g. green salad, roasted vegetables, crusty bread…"
            onAdd={() => addItem('preferredSides', newPreferredSide, () => setNewPreferredSide(''), 'Side')} />
        </Section>

        {/* Avoided Sides */}
        <Section tour="set-avoided-sides" icon="/icons/Avoid sides.png" title="Sides to Avoid"
          desc="Sides your family doesn't enjoy — Chef Claude will never suggest these.">
          <TagList items={(settings as any).avoidedSides || []} onRemove={i => removeItem('avoidedSides', i)}
            tagStyle={{ background: '#FDEDEB', color: '#C0392B' }} />
          <AddRow value={newAvoidedSide} onChange={setNewAvoidedSide} placeholder="e.g. rice, couscous, pasta sides…"
            onAdd={() => addItem('avoidedSides', newAvoidedSide, () => setNewAvoidedSide(''), 'Side')} />
        </Section>

        {/* Week Start Day */}
        <Section tour="set-weekstart" icon="/icons/First day of week.png" title="First Day of the Week"
          desc="The weekly menu resets on this day. Choose whichever day your week begins.">
          <div className="flex flex-wrap gap-2">
            {(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const).map((day, i) => {
              const val = [1,2,3,4,5,6,0][i];
              const active = ((settings as any).weekStartDay ?? 1) === val;
              return (
                <button key={day} type="button"
                  onClick={() => setSettings((s: any) => ({ ...s, weekStartDay: val }))}
                  className="px-4 py-1.5 rounded-full text-sm transition-all"
                  style={{
                    background: active ? 'var(--green)' : 'var(--cream)',
                    color: active ? '#fff' : 'var(--text-2)',
                    border: `1px solid ${active ? 'var(--green)' : 'var(--border)'}`,
                  }}>
                  {day}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Vacations */}
        <Section tour="set-vacations" icon="/icons/Vacations.png" title="Vacations & Time Away"
          desc="Add date ranges when the family will be away. Menus generated during these dates will automatically skip cooking days.">
          {((settings as any).vacations || []).length > 0 && (
            <div className="space-y-2 mb-4">
              {((settings as any).vacations as { start: string; end: string; note?: string }[]).map((v, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl"
                     style={{ background: 'var(--cream)', border: '1px solid var(--border)' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {v.start} → {v.end}
                    </p>
                    {v.note && <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>{v.note}</p>}
                  </div>
                  <button
                    onClick={() => setSettings((s: any) => ({ ...s, vacations: (s.vacations || []).filter((_: any, j: number) => j !== i) }))}
                    className="text-xs text-red-600 transition-opacity hover:opacity-70">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-2">
            <input type="date" value={newVacStart} onChange={e => setNewVacStart(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
            <span className="self-center text-sm" style={{ color: 'var(--text-3)' }}>→</span>
            <input type="date" value={newVacEnd} onChange={e => setNewVacEnd(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
            <input type="text" value={newVacNote} onChange={e => setNewVacNote(e.target.value)}
              placeholder="Optional note (e.g. 'Italy trip')"
              className="flex-1 px-4 py-2 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
            <button
              onClick={() => {
                if (!newVacStart || !newVacEnd) return;
                if (newVacEnd < newVacStart) return;
                setSettings((s: any) => ({
                  ...s,
                  vacations: [...((s.vacations) || []), { start: newVacStart, end: newVacEnd, note: newVacNote.trim() || undefined }]
                    .sort((a, b) => a.start.localeCompare(b.start)),
                }));
                setNewVacStart(''); setNewVacEnd(''); setNewVacNote('');
              }}
              className="px-4 py-2 rounded-lg border text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }}>
              Add
            </button>
          </div>
        </Section>

        {/* Cooking Schedule */}
        <Section tour="set-schedule" icon="/icons/Cooking schedule.png" title="Cooking Schedule"
          desc="Set your weekly cooking rhythm AND when you prep ingredients ahead. Toggle each day on or off, set available time and meal type, then choose your prep style below."
          action={
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button onClick={() => setSettings(s => ({ ...s, randomizeMealTypes: !s.randomizeMealTypes }))}
                className="w-10 h-6 rounded-full relative transition-colors shrink-0"
                style={{ background: settings.randomizeMealTypes ? 'var(--green)' : '#ccc' }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: settings.randomizeMealTypes ? '18px' : '2px' }} />
              </button>
              <span className="text-sm font-medium" style={{ color: settings.randomizeMealTypes ? 'var(--green)' : '#888' }}>
                <T>Randomize every week</T>
              </span>
            </label>
          }>
          {/* Pool selector — only visible when randomize is on */}
          {settings.randomizeMealTypes && (
            <div className="mb-4 p-4 rounded-xl" style={{ background: 'var(--green-lt)' }}>
              <p className="text-sm mb-3" style={{ color: 'var(--green-dk)' }}>
                <strong>Randomize from these types only</strong> — uncheck any you never want:
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {MEAL_TYPES.filter(t => t.value !== 'any').map(t => {
                  const pool = settings.randomizePool || [];
                  const allSelected = pool.length === 0;
                  const checked = allSelected || pool.includes(t.value);
                  return (
                    <label key={t.value} className="flex items-center gap-2 cursor-pointer select-none text-sm">
                      <input type="checkbox" checked={checked}
                        onChange={() => {
                          const current = allSelected
                            ? MEAL_TYPES.filter(x => x.value !== 'any').map(x => x.value)
                            : [...pool];
                          const next = current.includes(t.value)
                            ? current.filter(v => v !== t.value)
                            : [...current, t.value];
                          // If all are selected again, store as empty (= all)
                          const allTypes = MEAL_TYPES.filter(x => x.value !== 'any').map(x => x.value);
                          setSettings(s => ({ ...s, randomizePool: next.length === allTypes.length ? [] : next }));
                        }}
                        style={{ accentColor: 'var(--green)' }} />
                      {t.label}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="space-y-1">
            {DAYS.map(day => {
              const s = settings.schedule?.[day] ?? { enabled: true, minutes: 60 };
              const updateDay = (patch: object) =>
                setSettings(prev => ({ ...prev, schedule: { ...prev.schedule, [day]: { ...s, ...patch } } }));

              return (
                <div key={day} className="rounded-xl px-3 py-3"
                     style={{ background: s.enabled ? 'var(--green-lt)' : 'var(--cream)', marginBottom: '4px' }}>
                  <div className="flex items-center gap-3 flex-wrap">

                    {/* Cook toggle */}
                    <button onClick={() => updateDay({ enabled: !s.enabled })}
                      className="w-10 h-6 rounded-full relative transition-colors shrink-0"
                      style={{ background: s.enabled ? 'var(--green)' : '#ccc' }}>
                      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                            style={{ left: s.enabled ? '18px' : '2px' }} />
                    </button>

                    {/* Day name */}
                    <span className="w-24 text-sm font-bold shrink-0"
                          style={{ color: s.enabled ? 'var(--green-dk)' : '#aaa' }}>
                      {day}
                    </span>

                    {s.enabled ? (
                      <>
                        {/* Time */}
                        <select value={s.minutes} onChange={e => updateDay({ minutes: parseInt(e.target.value) })}
                          className="px-3 py-1.5 rounded-lg border text-sm outline-none"
                          style={{ background: 'var(--white)', borderColor: 'var(--border)' }}>
                          {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>

                        {/* Meal type */}
                        <select value={s.mealType || 'any'} onChange={e => updateDay({ mealType: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border text-sm outline-none"
                          style={{ background: 'var(--white)', borderColor: 'var(--border)' }}>
                          {MEAL_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>

                        {/* Technique */}
                        {(settings.cookingTechniques || []).length > 0 && (
                          <select value={s.technique || ''} onChange={e => updateDay({ technique: e.target.value || undefined })}
                            className="px-3 py-1.5 rounded-lg border text-sm outline-none"
                            style={{ background: 'var(--white)', borderColor: 'var(--border)' }}>
                            <option value="">Any technique</option>
                            {(settings.cookingTechniques || []).map((t: string) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        )}
                      </>
                    ) : (
                      /* Leftover ideas toggle */
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={!!s.leftoverIdeas}
                          onChange={e => updateDay({ leftoverIdeas: e.target.checked })}
                          className="w-4 h-4 rounded" />
                        <span className="text-sm" style={{ color: '#888' }}>
                          ♻️ Suggest leftover recipe for this day
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Ingredient Prep Schedule (merged) ── */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-2)' }}>
              <T>Ingredient prep schedule</T>
            </h3>
            <p className="text-sm mb-4" style={{ color: '#888' }}>
              <T>When do you prep ingredients? Fornello will write prep instructions that match your schedule.</T>
            </p>

            {/* Mode selector */}
            <div className="space-y-3 mb-4">
              {([
                { value: 'daily',  label: 'Day-of prep',   desc: 'Prep ingredients 30–60 min before cooking each evening' },
                { value: 'batch',  label: 'Weekly batch',  desc: 'Prep everything on one day for the whole week' },
                { value: 'custom', label: 'Custom days',   desc: 'Specific days of the week for ingredient prep' },
              ] as { value: PrepScheduleType; label: string; desc: string }[]).map(opt => {
                const active = (settings.prepSchedule?.type || 'daily') === opt.value;
                return (
                  <label key={opt.value} className="flex items-start gap-3 cursor-pointer rounded-xl px-4 py-3"
                         style={{ background: active ? 'var(--green-lt)' : 'var(--cream)', border: `1px solid ${active ? 'var(--green)' : 'var(--border)'}` }}>
                    <input type="radio" name="prepType" value={opt.value} checked={active}
                      onChange={() => setSettings(s => ({ ...s, prepSchedule: { ...s.prepSchedule, type: opt.value } }))}
                      style={{ accentColor: 'var(--green)', marginTop: '3px' }} />
                    <div>
                      <div className="text-sm font-semibold" style={{ color: active ? 'var(--green-dk)' : 'var(--text)' }}><T>{opt.label}</T></div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}><T>{opt.desc}</T></div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Batch day picker */}
            {settings.prepSchedule?.type === 'batch' && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm" style={{ color: 'var(--text-2)' }}><T>Prep day:</T></span>
                <select value={settings.prepSchedule.batchDay || 'Sunday'}
                  onChange={e => setSettings(s => ({ ...s, prepSchedule: { ...s.prepSchedule, batchDay: e.target.value } }))}
                  className="px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ background: 'var(--cream)', borderColor: 'var(--border)' }}>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}

            {/* Custom days picker */}
            {settings.prepSchedule?.type === 'custom' && (
              <div className="mt-2">
                <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}><T>Select which days you prep ingredients:</T></p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => {
                    const selected = (settings.prepSchedule.customDays || []).includes(day);
                    return (
                      <button key={day} type="button"
                        onClick={() => {
                          const curr = settings.prepSchedule.customDays || [];
                          const next = selected ? curr.filter(d => d !== day) : [...curr, day];
                          setSettings(s => ({ ...s, prepSchedule: { ...s.prepSchedule, customDays: next } }));
                        }}
                        className="px-3 py-1.5 rounded-full text-sm transition-all"
                        style={{
                          background: selected ? 'var(--green)' : 'var(--cream)',
                          color: selected ? '#fff' : 'var(--text-2)',
                          border: `1px solid ${selected ? 'var(--green)' : 'var(--border)'}`,
                        }}>
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Recipes priority */}
        <Section tour="set-prioritize" icon="/icons/my-recipes.png" title="Recipes">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-semibold">Prioritize my saved recipes</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                When on, Fornello will prefer your saved recipes over generating new ones. When off, they are included occasionally as a natural option.
              </p>
            </div>
            <button onClick={() => setSettings(s => ({ ...s, prioritizeMyRecipes: !s.prioritizeMyRecipes }))}
              className="w-12 h-7 rounded-full relative transition-colors shrink-0"
              style={{ background: settings.prioritizeMyRecipes ? 'var(--green)' : '#ccc' }}>
              <span className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                    style={{ left: settings.prioritizeMyRecipes ? '22px' : '2px' }} />
            </button>
          </label>
        </Section>

        {/* Account — change email / change password */}
        <Section tour="set-account" title="Account">
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Current email</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {currentEmail || <span className="italic" style={{ color: 'var(--text-3)' }}>Loading…</span>}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Change email</p>
              <p className="text-xs italic mb-2" style={{ color: 'var(--text-3)' }}>
                We'll send a confirmation link to the new address. Keep signing in with the current email until you click that link.
              </p>
              <div className="flex flex-col md:flex-row gap-2">
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  className="flex-1 px-4 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
                <button onClick={changeEmail} disabled={updatingEmail || !newEmail.trim()}
                  className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-80"
                  style={{ background: 'var(--green)' }}>
                  {updatingEmail ? 'Sending…' : 'Send confirmation'}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Change password</p>
              <p className="text-xs italic mb-2" style={{ color: 'var(--text-3)' }}>
                For your security, we&apos;ll email a link to {currentEmail || 'your address'} to set a new password.
              </p>
              {resetSent ? (
                <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--green-lt)', border: '1px solid var(--green)', color: 'var(--text)' }}>
                  ✉️ Check your inbox — we sent a link to set a new password. It expires in about an hour.
                  <button onClick={sendPasswordResetLink} disabled={sendingReset}
                    className="ml-2 underline transition-opacity hover:opacity-70 disabled:opacity-40" style={{ color: 'var(--green)' }}>
                    {sendingReset ? 'Sending…' : 'Resend'}
                  </button>
                </div>
              ) : (
                <button onClick={sendPasswordResetLink} disabled={sendingReset || !currentEmail}
                  className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-80"
                  style={{ background: 'var(--green)' }}>
                  {sendingReset ? 'Sending…' : 'Email me a reset link'}
                </button>
              )}
            </div>
          </div>
        </Section>

        {/* Email / Sharing */}
        <Section tour="set-email" icon="/icons/Email and Share.png" title="Email Sharing">
          <div className="space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Your Name</label>
              <input type="text" value={(settings as any).emailFromName || ''}
                onChange={e => setSettings((s: any) => ({ ...s, emailFromName: e.target.value }))}
                placeholder="e.g. Claudia"
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Your Email</label>
              <input type="email" value={(settings as any).fromEmail || ''}
                onChange={e => setSettings((s: any) => ({ ...s, fromEmail: e.target.value }))}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
            </div>
          </div>
        </Section>

        <button onClick={save}
          className="w-full py-3.5 rounded-xl font-semibold text-white text-base transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)' }}>
          <T>Save Settings</T>
        </button>

        <button onClick={startTour}
          className="w-full py-3 rounded-xl text-sm transition-opacity hover:opacity-70"
          style={{ border: '1px solid var(--border)', color: 'var(--text-3)', background: 'transparent' }}>
          🗺 <T>Take the app tour again</T>
        </button>
      </div>
    </>
  );
}

function Section({ title, desc, action, children, tour, icon }: {
  title: string; desc?: string; action?: React.ReactNode; children: React.ReactNode; tour?: string; icon?: string;
}) {
  return (
    <div data-tour={tour} className="rounded-2xl p-6 border" style={{ background: 'var(--white)', borderColor: 'var(--border)' }}>
      <div className="flex items-start gap-5 mb-5">
        {icon && (() => {
          // Source images that came in darker/warmer than the rest — pull them toward the
          // softer sage tone of icons like Dietary Restrictions.
          const DARK_ICONS = ['/icons/Pantry Staples.png', '/icons/Techniques.png'];
          const isDark = DARK_ICONS.includes(icon);
          const filter = isDark
            ? 'saturate(0.6) brightness(1.2)'
            : 'saturate(0.65) brightness(0.97)';
          return (
            <img src={icon} alt=""
                 style={{
                   width: '110px', height: '110px', objectFit: 'cover',
                   borderRadius: '14px', flexShrink: 0,
                   filter,
                 }} />
          );
        })()}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="font-bold text-base"><T>{title}</T></h2>
            {action}
          </div>
          {desc && <p className="text-sm" style={{ color: '#888' }}><T>{desc}</T></p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function TagList({ items, onRemove, tagStyle }: {
  items: string[]; onRemove: (i: number) => void; tagStyle: React.CSSProperties;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium" style={tagStyle}>
          {item}
          <button onClick={() => onRemove(i)} className="text-base leading-none opacity-60 hover:opacity-100">×</button>
        </span>
      ))}
    </div>
  );
}

function AddRow({ value, onChange, placeholder, onAdd }: {
  value: string; onChange: (v: string) => void; placeholder: string; onAdd: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={e => e.key === 'Enter' && onAdd()}
        className="flex-1 px-4 py-2 rounded-lg border text-sm outline-none"
        style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
      <button onClick={onAdd}
        className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
        style={{ background: 'var(--cream)', borderColor: 'var(--border)' }}>
        Add
      </button>
    </div>
  );
}
