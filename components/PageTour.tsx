'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export interface PageTourStep {
  target?: string;
  title: string;
  body: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: string;     // optional image path shown next to the title (e.g. /icons/Vacations.png)
}

interface PageTourMeta {
  label: string;     // shown on the button — e.g. "This Week"
  steps: PageTourStep[];
}

// ── Central registry of per-page tutorials ──
// Add new pages here. The key is the pathname (exact match).
export const PAGE_TOURS: Record<string, PageTourMeta> = {
  '/this-week': {
    label: 'This Week',
    steps: [
      {
        title: "This Week's menu",
        body: "Your weekly dinner plan lives here. Each day has its own card with the meal, sides, photo, and quick info.",
        position: 'center',
      },
      {
        target: 'tour-generate',
        title: "Generate a new menu",
        body: "Tap this to have Chef Claude build a fresh weekly plan tailored to your preferences. Takes about 30 seconds.",
        position: 'bottom',
      },
      {
        title: "Going away this week?",
        body: "The Days off button right next to Generate lets you pick days you'll be away (a wedding, a quick trip…) before generating. Those days are skipped in the new menu. For full vacations, set them up once in Settings → Vacations and they auto-apply.",
        position: 'center',
        icon: '/icons/Vacations.png',
      },
      {
        target: 'tour-meal-card',
        title: "Tap any meal",
        body: "Opens the full recipe with ingredients, instructions, prep-ahead tips, and feedback options (Loved it / Adjusted / Never again).",
        position: 'bottom',
      },
      {
        title: "Ask Chef Claude",
        body: "Inside any meal, scroll to the bottom and tap 'Ask Chef Claude about this recipe'. He knows the full recipe and can answer anything specific to it — substitutions, technique, timing, wine pairings, how to scale up for guests…",
        position: 'center',
        icon: '/icons/this-week.png',
      },
      {
        title: "Drag to reorder days",
        body: "Grab the ⠿ handle at the bottom of a card and drop it onto another day — Fornello swaps them instantly.",
        position: 'center',
      },
      {
        title: "Replace just one meal",
        body: "Click '↺ Replace' on any card to swap that single dish — keep the rest of the week as-is.",
        position: 'center',
      },
      {
        title: "Taking a day off?",
        body: "Click 'Day off' on any card to remove that single day from the week — for last-minute plans, takeout nights, or a quick rest day. The card disappears from the menu and its ingredients are removed from groceries.",
        position: 'center',
        icon: '/icons/Vacations.png',
      },
    ],
  },
  '/groceries': {
    label: 'Groceries',
    steps: [
      {
        title: "Your shopping list",
        body: "Auto-generated from this week's recipes with exact quantities. Items are grouped by category and tagged with which meals they're for.",
        position: 'center',
      },
      {
        title: "Check things off",
        body: "Tap any item to mark it as bought. Tap an amount to edit it if you already have some at home.",
        position: 'center',
      },
      {
        title: "Print or filter",
        body: "The ⚙ Filter button lets you print groceries only for selected meals — handy if you're only cooking some days.",
        position: 'center',
      },
    ],
  },
  '/settings': {
    label: 'Settings',
    steps: [
      {
        title: "Your preferences live here",
        body: "Everything you set here teaches Fornello about your family. The more accurate, the better your menus. We'll walk through each section in the order it appears — feel free to fill things in as we go.",
        position: 'center',
      },
      {
        target: 'set-language',
        title: "Language",
        body: "All generated content — recipes, menus, prep — will be in this language.",
        position: 'bottom',
      },
      {
        target: 'set-family',
        title: "Family size",
        body: "How many people you typically cook for. Recipes are scaled to this number, and you can override per recipe when you have guests.",
        position: 'bottom',
      },
      {
        target: 'set-sites',
        title: "Favourite recipe sites",
        body: "Recipe websites your family trusts (e.g. seriouseats.com, smittenkitchen.com). Chef Claude draws inspiration from these when inventing new dishes.",
        position: 'bottom',
      },
      {
        target: 'set-preferences',
        title: "Preferred types of food",
        body: "Cuisines, styles, or dish types your family loves (e.g. 'Italian', 'comfort food', 'quick meals'). Claude leans toward these.",
        position: 'bottom',
      },
      {
        target: 'set-restrictions',
        title: "Dietary restrictions & allergies",
        body: "STRICTLY avoided in every meal (e.g. nut allergy, gluten-free, no pork). Never compromised on.",
        position: 'bottom',
      },
      {
        target: 'set-skip',
        title: "Ingredients to replace or avoid",
        body: "Things you'd rather skip when possible (e.g. cilantro, mushrooms). Claude avoids recipes where they're structural — they can still appear as optional garnishes.",
        position: 'bottom',
      },
      {
        target: 'set-staples',
        title: "Pantry staples",
        body: "Items you always need at home — olive oil, salt, eggs, butter, coffee. They appear on every grocery list so you can check what to reorder. Paste a whole list at once if you have one.",
        position: 'bottom',
        icon: '/icons/Pantry Staples.png',
      },
      {
        target: 'set-techniques',
        title: "Cooking techniques",
        body: "Techniques you use (Slow Cooker, Air Fryer, Grill, Instant Pot). You can then assign them to specific days in the schedule below.",
        position: 'bottom',
      },
      {
        target: 'set-preferred-sides',
        title: "Preferred sides",
        body: "Sides the family enjoys (green salad, roasted vegetables, crusty bread). Claude leans toward these when pairing dinners.",
        position: 'bottom',
      },
      {
        target: 'set-avoided-sides',
        title: "Sides to avoid",
        body: "Sides your family doesn't enjoy (rice, couscous, pasta sides). Claude will never suggest these.",
        position: 'bottom',
      },
      {
        target: 'set-weekstart',
        title: "First day of the week",
        body: "The day your weekly menu resets. If you plan on Sundays for a Monday-start week, leave it as Monday — Fornello handles the timing.",
        position: 'bottom',
      },
      {
        target: 'set-vacations',
        title: "Vacations & time away",
        body: "Date ranges when the family will be away. Menus generated during these dates automatically skip cooking. Set once and forget.",
        position: 'bottom',
        icon: '/icons/Vacations.png',
      },
      {
        target: 'set-schedule',
        title: "Cooking schedule",
        body: "For each day: cook or don't, available time, and optionally a meal type. Leftover days can suggest reuse ideas.",
        position: 'bottom',
      },
      {
        target: 'set-prioritize',
        title: "Prioritize my recipes",
        body: "When ON, Claude prefers your saved recipes over generating new ones. When OFF, they're included occasionally as a natural option.",
        position: 'bottom',
      },
      {
        target: 'set-email',
        title: "Email sharing",
        body: "Configure the From email/name used when you share recipes by email with friends and family.",
        position: 'bottom',
      },
    ],
  },
  '/heritage-kitchen': {
    label: 'Heritage Kitchen',
    steps: [
      {
        title: "Recipes from grandmothers around the world",
        body: "A growing library of traditional family recipes contributed by people from many cultures.",
        position: 'center',
      },
      {
        title: "The tribute to Nonna Ingrid",
        body: "Scroll down to read the story behind Fornello, and tap '✦ Visit Nonna's Kitchen ✦' to see her own dedicated recipe collection.",
        position: 'center',
      },
      {
        title: "Add to your rotation",
        body: "Hover any recipe card and tap '↻ Add to weekly menu rotation' to include it in future menus.",
        position: 'center',
      },
    ],
  },
  '/nonnas-kitchen': {
    label: "Nonna's Kitchen",
    steps: [
      {
        title: "Nonna Ingrid's recipes",
        body: "The dishes, traditions, and wisdom that inspired Fornello. Tap any card to read the full recipe with its background and Nonna's tips.",
        position: 'center',
      },
    ],
  },
  '/on-the-fly': {
    label: 'On the Fly',
    steps: [
      {
        title: "What's in your fridge?",
        body: "Type the ingredients you have — Fornello generates 6 different dinner ideas using them.",
        position: 'center',
      },
      {
        title: "Pick one to see the recipe",
        body: "Tap any of the idea cards to expand the full recipe with ingredients, instructions, and prep tips.",
        position: 'center',
      },
      {
        title: "Save or move on",
        body: "Save anything you like to My Recipes. Or tap 'Get new ideas' for a fresh set.",
        position: 'center',
      },
    ],
  },
  '/converter': {
    label: 'Converter',
    steps: [
      {
        title: "Kitchen unit converter",
        body: "Ask anything in natural language — weights, volumes, temperatures, or ingredient-specific conversions like 'how many cups is 200g of flour?'",
        position: 'center',
      },
      {
        title: "Quick examples",
        body: "Tap any of the example chips to see the answer instantly. Your recent questions are saved at the bottom of the page.",
        position: 'center',
      },
    ],
  },
};

export default function PageTourButton() {
  const pathname = usePathname();
  const meta = PAGE_TOURS[pathname || ''];
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Step-change positioning: scrolls + captures rect. Runs once per step.
  const findTarget = useCallback(() => {
    if (!meta || !running) return;
    const current = meta.steps[step];
    if (!current?.target) { setTargetRect(null); return; }
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setTargetRect(el.getBoundingClientRect()), 400);
    }
  }, [meta, step, running]);

  // Lightweight rect tracker for scroll/resize — keeps the spotlight aligned with
  // the target as the user scrolls, but does NOT re-scroll the page (so the user
  // can scroll within the section to reach fields below the fold).
  const refreshRect = useCallback(() => {
    if (!meta || !running) return;
    const current = meta.steps[step];
    if (!current?.target) { setTargetRect(null); return; }
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) setTargetRect(el.getBoundingClientRect());
  }, [meta, step, running]);

  useEffect(() => { if (running) findTarget(); }, [step, running, findTarget]);

  useEffect(() => {
    if (!running) return;
    const handler = () => refreshRect();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [refreshRect, running]);

  if (!meta) return null;

  const current = running ? meta.steps[step] : null;
  const isCenter = !current || current.position === 'center' || !targetRect;
  const tooltipStyle = (): React.CSSProperties => {
    if (isCenter) return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10001 };
    // Pick the first corner whose tooltip rect doesn't overlap the highlighted target.
    // Prevents the tooltip from blocking buttons inside the spotlight (e.g. "Add" on the vacations form).
    const rect = targetRect!;
    const m = 16;
    const tipW = 340;
    const tipH = Math.min(window.innerHeight * 0.5, 320);
    const vw = window.innerWidth, vh = window.innerHeight;
    const corners = [
      { style: { bottom: m, right: m }, box: { l: vw - tipW - m, t: vh - tipH - m, r: vw - m,   b: vh - m } },
      { style: { bottom: m, left: m  }, box: { l: m,             t: vh - tipH - m, r: m + tipW, b: vh - m } },
      { style: { top: m,    right: m }, box: { l: vw - tipW - m, t: m,             r: vw - m,   b: m + tipH } },
      { style: { top: m,    left: m  }, box: { l: m,             t: m,             r: m + tipW, b: m + tipH } },
    ];
    const overlaps = (b: { l: number; t: number; r: number; b: number }) =>
      !(b.r <= rect.left || b.l >= rect.right || b.b <= rect.top || b.t >= rect.bottom);
    const chosen = corners.find(c => !overlaps(c.box)) || corners[0];
    return { position: 'fixed', ...chosen.style, zIndex: 10001 };
  };

  const start = () => { setStep(0); setRunning(true); };
  const end = () => { setRunning(false); setTargetRect(null); };
  const next = () => { if (step < meta.steps.length - 1) setStep(s => s + 1); else end(); };
  const back = () => { if (step > 0) setStep(s => s - 1); };

  return (
    <>
      <button onClick={start}
        className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] backdrop-blur-sm transition-opacity hover:opacity-80"
        style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-2)', boxShadow: '0 2px 8px rgba(47,58,50,0.06)' }}>
        🗺 {meta.label} tutorial
      </button>

      {running && (
        <>
          <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.55)', zIndex: 10000 }} />

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
            }} />
          )}

          <div style={{ ...tooltipStyle(), width: '340px', maxWidth: 'calc(100vw - 32px)' }}>
            <div className="rounded-[20px] p-6"
                 style={{ background: 'var(--white)', boxShadow: '0 16px 48px rgba(0,0,0,0.25)', border: '1px solid var(--border)' }}>
              <div className="flex gap-1 mb-4">
                {meta.steps.map((_, i) => (
                  <div key={i} className="h-1 rounded-full transition-all"
                       style={{ flex: i === step ? 2 : 1, background: i <= step ? 'var(--green)' : 'var(--border)' }} />
                ))}
              </div>
              <h3 className="text-lg mb-2 flex items-center gap-2" style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
                {current!.icon && (
                  <img src={current!.icon} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0 }} />
                )}
                <span>{current!.title}</span>
              </h3>
              <p className="text-sm leading-relaxed mb-5 whitespace-pre-line" style={{ color: 'var(--text-2)' }}>
                {current!.body}
              </p>
              <div className="flex items-center justify-between gap-3">
                <button onClick={end}
                  className="text-xs transition-opacity hover:opacity-60"
                  style={{ color: 'var(--text-3)' }}>
                  Close
                </button>
                <div className="flex gap-2">
                  {step > 0 && (
                    <button onClick={back}
                      className="px-4 py-2 rounded-full text-xs transition-opacity hover:opacity-80"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                      Back
                    </button>
                  )}
                  <button onClick={next}
                    className="px-5 py-2 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'var(--green)', color: '#fff' }}>
                    {step === meta.steps.length - 1 ? 'Done' : 'Next →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
