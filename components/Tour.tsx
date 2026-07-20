'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from './LanguageProvider';

interface Step {
  kind?: 'standard' | 'language' | 'navbar';
  target?: string;       // data-tour attribute value
  title: string;
  body: string;
  path?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: string;         // optional image path (e.g. /icons/Vacations.png) shown next to the title
}

const NAV_ICONS: { icon: string; label: string; desc: string }[] = [
  { icon: '/icons/this-week.png',         label: 'This Week',        desc: 'Your weekly dinner plan' },
  { icon: '/icons/groceries.png',         label: 'Groceries',        desc: 'Auto-built shopping list' },
  { icon: '/icons/pantry-v2.png',         label: 'Pantry',           desc: 'What you already have at home' },
  { icon: '/icons/my-recipes.png',        label: 'Recipes',          desc: 'Your saved family recipes' },
  { icon: '/icons/nonnas-kitchen.png',    label: 'Heritage Kitchen', desc: 'Grandmother recipes from around the world' },
  { icon: '/icons/special-occasion.png',  label: 'Special Occasion', desc: 'Entertaining & dinner-party planner' },
  { icon: '/icons/On the fly.png',        label: 'On the Fly',       desc: 'Improvise a recipe from your fridge' },
  { icon: '/icons/something-sweet.png',   label: 'Something Sweet',  desc: 'Desserts & bakes' },
  { icon: '/icons/traditions.png',        label: 'Traditions',       desc: 'Cultural & traditional recipes' },
  { icon: '/icons/find-a-recipe.png',     label: 'Find a Recipe',    desc: 'Look up any dish' },
  { icon: '/icons/Archive.png',           label: 'Archive',          desc: 'Past weekly menus' },
  { icon: '/icons/Conversions.png',       label: 'Converter',        desc: 'Kitchen unit converter' },
];

const STEPS: Step[] = [
  {
    kind: 'language',
    title: "Language",
    body: "",
    position: 'center',
    path: '/',
  },
  {
    title: "Welcome to Fornello! 🍽",
    body: "Let's get you set up in just a few quick steps.",
    position: 'center',
  },
  {
    kind: 'navbar',
    title: "Your navigation bar 🧭",
    body: "Here's a quick tour of every icon up top — what each one's for:",
    position: 'center',
  },
  {
    title: "Now let's set up your preferences ✨",
    body: "Fornello gets smarter the more it knows about your family. We'll walk through the main settings together — fill them in as we go, and your menus will be tailored from day one.",
    position: 'center',
    path: '/settings',
  },
  {
    target: 'set-family',
    title: "How many at your table?",
    body: "Set your family size. Recipes will be scaled for this number of people. You can override per-recipe later when scaling up for guests.",
    path: '/settings',
    position: 'bottom',
  },
  {
    target: 'set-sites',
    title: "Favourite recipe sites",
    body: "Recipe websites your family trusts (e.g. seriouseats.com, smittenkitchen.com). Chef Claude draws inspiration from these when inventing new dishes.",
    path: '/settings',
    position: 'bottom',
  },
  {
    target: 'set-preferences',
    title: "What does your family love?",
    body: "Add cuisines, styles, or dish types your family enjoys (e.g. 'Italian', 'comfort food', 'quick meals'). Chef Claude will lean toward these.",
    path: '/settings',
    position: 'bottom',
  },
  {
    target: 'set-restrictions',
    title: "Anything to avoid for health reasons?",
    body: "Dietary restrictions and allergies — these are STRICTLY avoided in every meal (e.g. nut allergy, gluten-free, no pork).",
    path: '/settings',
    position: 'bottom',
  },
  {
    target: 'set-skip',
    title: "Ingredients you'd rather skip",
    body: "Add ingredients you simply don't enjoy or want to avoid where possible (e.g. cilantro, mushrooms). Chef Claude will avoid recipes where they're essential.",
    path: '/settings',
    position: 'bottom',
  },
  {
    target: 'set-staples',
    title: "Your pantry staples",
    body: "Items you always need on hand — olive oil, salt, eggs, butter, etc. These appear on every grocery list so you can quickly check what's running low. Paste a whole list at once if you have one.",
    path: '/settings',
    position: 'bottom',
  },
  {
    target: 'set-techniques',
    title: "How do you like to cook?",
    body: "Add cooking techniques you use (e.g. Slow Cooker, Air Fryer, Grill). You can then assign them to specific days.",
    path: '/settings',
    position: 'bottom',
  },
  {
    target: 'set-preferred-sides',
    title: "Sides you love",
    body: "Sides the family enjoys (e.g. green salad, roasted vegetables, crusty bread). Chef Claude will lean toward these when pairing dinner accompaniments.",
    path: '/settings',
    position: 'bottom',
  },
  {
    target: 'set-avoided-sides',
    title: "Sides to avoid",
    body: "Sides your family doesn't enjoy (e.g. rice, couscous, pasta sides). Chef Claude will never suggest these.",
    path: '/settings',
    position: 'bottom',
  },
  {
    target: 'set-weekstart',
    title: "When does your week begin?",
    body: "Pick the day your menu resets. If you plan on Sundays for the Monday-start week, leave it as Monday — Fornello handles the timing.",
    path: '/settings',
    position: 'bottom',
  },
  {
    target: 'set-vacations',
    title: "Vacations & time away",
    body: "Planning a trip? Add date ranges here and Fornello will automatically skip cooking on those days when you generate a menu. For one-off days off, there's also a quick Days off button right next to Generate on the This Week page.",
    path: '/settings',
    position: 'bottom',
    icon: '/icons/Vacations.png',
  },
  {
    target: 'set-schedule',
    title: "Your cooking schedule",
    body: "For each day, decide if you cook (and for how long), or take a night off. Optionally pick a meal type per day. Leftover days can suggest reuse ideas.",
    path: '/settings',
    position: 'bottom',
  },
  {
    title: "Ask Chef Claude",
    body: "Inside any recipe, scroll to the bottom and tap 'Ask Chef Claude about this recipe'. He knows your full recipe and can answer anything specific to it — substitutions, technique, timing, what to drink with it, how to scale up for guests, make-ahead tips. Think of him as the friend you call before hosting dinner.",
    position: 'center',
    icon: '/icons/this-week.png',
  },
  {
    title: "You're all set! 🎉",
    body:
      "That's the essentials. From here, explore at your own pace.\n\n" +
      "Each page has its own little tutorial button — look for **🗺 [Page name] tutorial** at the top of any page if you want a walkthrough of that page's features.\n\n" +
      "You can also retake this main tour anytime from Settings.",
    position: 'center',
  },
];

interface Props {
  onDone: () => void;
}

export default function Tour({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const [savingLang, setSavingLang] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const tr = (key: string, fallback: string) => translations[key] ?? fallback;
  const current = STEPS[step];

  // Translate all tour content into the chosen language (cached in localStorage)
  const loadTranslations = async (lang: string) => {
    if (!lang || lang === 'English') { setTranslations({}); return; }
    const cacheKey = `fornello-tour-tr-${lang}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setTranslations(JSON.parse(cached)); return; }
    } catch {}
    // Build flat key→string payload from steps + nav icons
    const payload: Record<string, string> = {};
    STEPS.forEach((s, i) => {
      if (s.kind === 'language') return; // language step stays in English
      payload[`s${i}_title`] = s.title;
      if (s.body) payload[`s${i}_body`] = s.body;
    });
    NAV_ICONS.forEach((n, i) => {
      payload[`nav${i}_label`] = n.label;
      payload[`nav${i}_desc`] = n.desc;
    });
    payload['btn_next'] = 'Next →';
    payload['btn_back'] = 'Back';
    payload['btn_skip'] = 'Skip tour';
    payload['btn_done'] = 'Done!';
    payload['nav_settings_label'] = 'Settings';
    payload['nav_settings_desc'] = 'Your family preferences and account';
    try {
      const res = await fetch('/api/translate-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strings: payload, targetLanguage: lang }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setTranslations(data.strings || {});
      try { localStorage.setItem(cacheKey, JSON.stringify(data.strings || {})); } catch {}
    } catch {}
  };

  // Translate on initial mount if user already has a non-English language saved
  useEffect(() => {
    if (language && language !== 'English') loadTranslations(language);
  }, []);

  // Step-change positioning: scrolls the target into view and captures its rect.
  // This runs once per step, NOT on every scroll/resize.
  const findTarget = useCallback(() => {
    if (!current.target) { setTargetRect(null); return; }
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setTargetRect(el.getBoundingClientRect()), 400);
    }
  }, [current.target]);

  // Lightweight rect tracker for scroll/resize — does NOT re-scroll the page,
  // so the user can scroll within the spotlight to reach fields below the fold.
  const refreshRect = useCallback(() => {
    if (!current.target) { setTargetRect(null); return; }
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) setTargetRect(el.getBoundingClientRect());
  }, [current.target]);

  useEffect(() => {
    if (current.path && pathname !== current.path) {
      router.push(current.path);
      setTimeout(findTarget, 900);
    } else {
      findTarget();
    }
  }, [step]);

  useEffect(() => {
    const handler = () => refreshRect();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [refreshRect]);

  const handleLanguageChange = async (lang: string) => {
    setSavingLang(true);
    setLanguage(lang);
    try {
      // Fetch current settings then save with new language so we don't blow away other fields
      const res = await fetch('/api/settings');
      const settings = res.ok ? await res.json() : {};
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, language: lang }),
      });
    } catch {}
    // Block until translation is ready so the user sees the tour in their language from step 2 onwards
    await loadTranslations(lang);
    setSavingLang(false);
  };

  const next = () => { if (step < STEPS.length - 1) setStep(s => s + 1); else onDone(); };
  const back = () => { if (step > 0) setStep(s => s - 1); };
  const isCenter = current.position === 'center' || !targetRect;

  const tooltipStyle = (): React.CSSProperties => {
    if (isCenter) return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10001 };
    // Try each corner in priority order; pick the first one whose tooltip rect
    // wouldn't overlap the highlighted target. Avoids covering buttons (e.g.
    // the Add button on the vacations form) inside the spotlight area.
    const rect = targetRect!;
    const m = 16;
    const tipW = 340;
    const tipH = Math.min(window.innerHeight * 0.5, 360);
    const vw = window.innerWidth, vh = window.innerHeight;
    const corners = [
      { name: 'br', style: { bottom: m, right: m },                                box: { l: vw - tipW - m, t: vh - tipH - m, r: vw - m, b: vh - m } },
      { name: 'bl', style: { bottom: m, left: m },                                 box: { l: m,             t: vh - tipH - m, r: m + tipW, b: vh - m } },
      { name: 'tr', style: { top: m, right: m },                                   box: { l: vw - tipW - m, t: m,             r: vw - m,   b: m + tipH } },
      { name: 'tl', style: { top: m, left: m },                                    box: { l: m,             t: m,             r: m + tipW, b: m + tipH } },
    ];
    const overlaps = (b: { l: number; t: number; r: number; b: number }) =>
      !(b.r <= rect.left || b.l >= rect.right || b.b <= rect.top || b.t >= rect.bottom);
    const chosen = corners.find(c => !overlaps(c.box)) || corners[0];
    return { position: 'fixed', ...chosen.style, zIndex: 10001 };
  };

  return (
    <>
      {/* Overlay — solid for center steps, four strips framing the target for spotlight steps
          so users can interact with the highlighted settings field directly. */}
      {!targetRect ? (
        <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.55)', zIndex: 10000 }} />
      ) : (
        <>
          {(() => {
            const pad = 6;
            const t = Math.max(0, targetRect.top - pad);
            const b = Math.min(window.innerHeight, targetRect.bottom + pad);
            const l = Math.max(0, targetRect.left - pad);
            const r = Math.min(window.innerWidth, targetRect.right + pad);
            const bg = 'rgba(0,0,0,0.55)';
            const z = 10000;
            return (
              <>
                <div style={{ position: 'fixed', left: 0, top: 0, right: 0, height: t, background: bg, zIndex: z }} />
                <div style={{ position: 'fixed', left: 0, top: b, right: 0, bottom: 0, background: bg, zIndex: z }} />
                <div style={{ position: 'fixed', left: 0, top: t, width: l, height: b - t, background: bg, zIndex: z }} />
                <div style={{ position: 'fixed', left: r, top: t, right: 0, height: b - t, background: bg, zIndex: z }} />
              </>
            );
          })()}
        </>
      )}

      {/* Highlight ring around target */}
      {targetRect && (
        <div style={{
          position: 'fixed',
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          borderRadius: '14px',
          border: '2px solid var(--green)',
          boxShadow: '0 0 0 4px rgba(85,98,87,0.25)',
          zIndex: 10001,
          pointerEvents: 'none',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      )}

      {/* Tooltip card — pinned bottom-right for spotlight steps, max-height capped so it never
          eats more than half the viewport (long sections like the schedule still scrollable). */}
      <div style={{ ...tooltipStyle(), width: isCenter ? '420px' : '340px', maxWidth: 'calc(100vw - 32px)',
                    maxHeight: isCenter ? undefined : 'calc(50vh)' }}>
        <div className="rounded-[20px] p-6 animate-slide-up"
             style={{ background: 'var(--white)', boxShadow: '0 16px 48px rgba(0,0,0,0.25)', border: '1px solid var(--border)',
                      maxHeight: isCenter ? undefined : 'calc(50vh)', overflowY: isCenter ? undefined : 'auto' }}>

          {/* Step indicator */}
          <div className="flex gap-1 mb-4">
            {STEPS.map((_, i) => (
              <div key={i} className="h-1 rounded-full transition-all"
                   style={{ flex: i === step ? 2 : 1, background: i <= step ? 'var(--green)' : 'var(--border)' }} />
            ))}
          </div>

          <h3 className="text-lg mb-2 flex items-center gap-2" style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
            {current.icon && (
              <img src={current.icon} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0 }} />
            )}
            <span>{current.kind === 'language' ? current.title : tr(`s${step}_title`, current.title)}</span>
          </h3>
          {current.body && (
            <p className="text-sm leading-relaxed mb-5 whitespace-pre-line" style={{ color: 'var(--text-2)' }}>
              {tr(`s${step}_body`, current.body)}
            </p>
          )}

          {/* Custom render: navbar overview with icons */}
          {current.kind === 'navbar' && (
            <ul className="mb-5 space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {NAV_ICONS.map((n, i) => (
                <li key={n.label} className="flex items-center gap-3">
                  <img src={n.icon} alt="" style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0 }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{tr(`nav${i}_label`, n.label)}</p>
                    <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>{tr(`nav${i}_desc`, n.desc)}</p>
                  </div>
                </li>
              ))}
              <li className="flex items-center gap-3 pt-1">
                <span style={{ width: '36px', textAlign: 'center', fontSize: '24px', flexShrink: 0 }}>⚙️</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{tr('nav_settings_label', 'Settings')}</p>
                  <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>{tr('nav_settings_desc', 'Your family preferences and account')}</p>
                </div>
              </li>
            </ul>
          )}

          {/* Custom render: language picker step */}
          {current.kind === 'language' && (
            <div className="mb-5">
              <select
                value={language}
                onChange={e => handleLanguageChange(e.target.value)}
                disabled={savingLang}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid var(--border)', background: 'var(--cream)',
                  color: 'var(--text)', fontSize: '14px', fontFamily: 'Georgia, serif',
                  outline: 'none',
                }}>
                {[
                  'English','Spanish','French','Italian','Portuguese','German',
                  'Dutch','Polish','Romanian','Russian','Ukrainian','Arabic',
                  'Hindi','Tagalog','Vietnamese','Chinese (Simplified)','Korean','Japanese',
                ].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {savingLang && (
                <div className="flex items-center gap-2 mt-3" style={{ color: 'var(--text-3)' }}>
                  <div className="spinner w-4 h-4 shrink-0" />
                  <span className="text-xs italic">Preparing the tour in {language}…</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button onClick={onDone}
              className="text-xs transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-3)' }}>
              {tr('btn_skip', 'Skip tour')}
            </button>
            <div className="flex gap-2">
              {step > 0 && (
                <button onClick={back}
                  className="px-4 py-2 rounded-full text-xs transition-opacity hover:opacity-80"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  {tr('btn_back', 'Back')}
                </button>
              )}
              <button onClick={next}
                disabled={savingLang}
                className="px-5 py-2 rounded-full text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--green)', color: '#fff' }}>
                {step === STEPS.length - 1 ? tr('btn_done', 'Done!') : tr('btn_next', 'Next →')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(85,98,87,0.25); }
          50% { box-shadow: 0 0 0 8px rgba(85,98,87,0.1); }
        }
      `}</style>
    </>
  );
}
