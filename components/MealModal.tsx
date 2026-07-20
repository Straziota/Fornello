'use client';
import { useState, useEffect } from 'react';
import { Meal, FeedbackRating, SubstituteResult, Ingredient, Side } from '@/lib/types';
import { scaleIngredients } from '@/lib/scaling';
import { useLanguage } from './LanguageProvider';
import { translateRecipeContent, getCachedTranslation } from '@/lib/translation-cache';
import { convertText, convertIngredient } from '@/lib/unit-convert';
import ShareButton from './ShareButton';
import LoadingMessage from './LoadingMessage';

interface Props {
  meal: Meal;
  menuId?: number;
  dislikedIngredients: string[];
  onClose: () => void;
  onRecipeLoaded?: (day: string, recipe: { ingredients: Ingredient[]; instructions: string[]; prep_ahead: string[]; sides?: Side[] }) => void;
  isAdmin?: boolean;
}

const DIFF_STYLE: Record<string, React.CSSProperties> = {
  Easy:   { background: 'var(--green-lt)', color: 'var(--green)' },
  Medium: { background: '#FEF6E4',         color: '#7A5B10' },
  Hard:   { background: '#FDEDEB',         color: '#C0392B' },
};

function findConflicts(meal: Meal, disliked: string[]): string[] {
  if (!disliked.length) return [];
  return disliked.filter(d =>
    (meal.ingredients || []).some(ing =>
      ing.item?.toLowerCase().includes(d.toLowerCase())
    )
  );
}

export default function MealModal({ meal: initialMeal, menuId, dislikedIngredients, onClose, onRecipeLoaded, isAdmin }: Props) {
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [tab, setTab] = useState<'recipe' | 'prep'>('recipe');
  const [feedback, setFeedback] = useState<FeedbackRating | null>(null);
  const [adjustments, setAdjustments] = useState('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [showLikedFollowUp, setShowLikedFollowUp] = useState(false);
  const [showPhotoStep, setShowPhotoStep] = useState(false);
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState<string | null>(null);
  const [savingToRecipes, setSavingToRecipes] = useState(false);
  const [savedToRecipes, setSavedToRecipes] = useState(false);
  const [addedToGlobal, setAddedToGlobal] = useState(false);
  const [addingToGlobal, setAddingToGlobal] = useState(false);
  const [isOverride, setIsOverride] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editIngredients, setEditIngredients] = useState<{ amount: string; item: string }[]>([]);
  const [editInstructions, setEditInstructions] = useState<string[]>([]);
  const [editPrepAhead, setEditPrepAhead] = useState<string[]>([]);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [savingMine, setSavingMine] = useState(false);
  const [savedMine, setSavedMine] = useState(false);
  const [showSaveChoice, setShowSaveChoice] = useState(false);
  const { language: userLanguage } = useLanguage();
  const [recipeLang, setRecipeLang] = useState<'src' | 'tr'>(userLanguage !== 'English' ? 'tr' : 'src');
  const [prepLang, setPrepLang] = useState<'src' | 'tr'>(userLanguage !== 'English' ? 'tr' : 'src');
  const [translatingRecipe, setTranslatingRecipe] = useState(false);
  const [translatingPrep, setTranslatingPrep] = useState(false);
  const [trIngredients, setTrIngredients] = useState<{ amount: string; item: string }[] | null>(null);
  const [trInstructions, setTrInstructions] = useState<string[] | null>(null);
  const [trPrepAhead, setTrPrepAhead] = useState<string[] | null>(null);
  const [trSides, setTrSides] = useState<Side[] | null>(null);
  const [activeIngredient, setActiveIngredient] = useState<string | null>(null);
  const [subResult, setSubResult] = useState<SubstituteResult | null>(null);
  const [simplified, setSimplified] = useState(false);
  const [simplifying, setSimplifying] = useState(false);
  const [simplifyResult, setSimplifyResult] = useState<{
    canSimplify: boolean; essentialSkipped: string[];
    simplifiedIngredients: { amount: string; item: string }[];
    simplifiedInstructions: string[]; note: string;
  } | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [applyingSub, setApplyingSub] = useState<string | null>(null); // which substitute is being applied
  const [appliedSub, setAppliedSub] = useState<{ original: string; substitute: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQ, setChatQ] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(new Set());
  const [scaledServes, setScaledServes] = useState(initialMeal.serves || 4);
  const [unitMode, setUnitMode] = useState<'original' | 'metric'>('original');
  const [feedbackPendingRating, setFeedbackPendingRating] = useState<FeedbackRating | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<'whole' | 'main' | string>('whole');
  const [showFeedbackTarget, setShowFeedbackTarget] = useState(false);
  const [showKeepChoice, setShowKeepChoice] = useState(false);

  const hasSides = (meal.sides?.length ?? 0) > 0;

  const conflicts = findConflicts(meal, dislikedIngredients).filter(c => !dismissedConflicts.has(c));

  // Load recipe on open if not yet fetched
  useEffect(() => {
    if (!meal.recipeLoaded && !meal.isLeftover && menuId) {
      setRecipeLoading(true);
      fetch('/api/menu/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId, meal }),
      })
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            const updated = { ...meal, ...data };
            setMeal(updated);
            if (data.isOverride) setIsOverride(true);
            onRecipeLoaded?.(meal.day, data);
            fetch('/api/menu/simplify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ meal: updated }),
            }).then(r => r.json()).then(r => { if (r.canSimplify) setSimplifyResult(r); }).catch(() => {});
          }
        })
        .finally(() => setRecipeLoading(false));
    }
  }, []);

  // Check for existing override when recipe is already loaded
  useEffect(() => {
    if (!meal.isLeftover) {
      fetch(`/api/menu/override?name=${encodeURIComponent(meal.name)}`)
        .then(r => r.json())
        .then(d => { if (d.exists) setIsOverride(true); })
        .catch(() => {});
    }
  }, []);

  // If recipe already loaded, check if it can be simplified
  useEffect(() => {
    if (meal.recipeLoaded && meal.ingredients?.length && !simplifyResult) {
      fetch('/api/menu/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal }),
      }).then(r => r.json()).then(r => { if (r.canSimplify) setSimplifyResult(r); }).catch(() => {});
    }
  }, [meal.recipeLoaded]);

  // Auto-translate recipe + prep to the user's language when content is loaded
  useEffect(() => {
    if (userLanguage === 'English') return;
    if (!meal.ingredients?.length && !meal.prep_ahead?.length) return;
    if (trIngredients && trInstructions && trPrepAhead) return;
    // Prefer cache; only call API if not cached
    const cached = getCachedTranslation(meal.name, userLanguage);
    if (cached) {
      if (cached.ingredients) setTrIngredients(cached.ingredients);
      if (cached.instructions) setTrInstructions(cached.instructions);
      if (cached.prep_ahead) setTrPrepAhead(cached.prep_ahead);
      if (cached.sides) setTrSides(cached.sides as Side[]);
      return;
    }
    (async () => {
      setTranslatingRecipe(true);
      setTranslatingPrep(true);
      try {
        const data = await translateRecipeContent({
          name: meal.name,
          description: meal.description,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
          prep_ahead: meal.prep_ahead,
          sides: meal.sides,
        }, userLanguage);
        if (data?.ingredients) setTrIngredients(data.ingredients);
        if (data?.instructions) setTrInstructions(data.instructions);
        if (data?.prep_ahead) setTrPrepAhead(data.prep_ahead);
        if (data?.sides) setTrSides(data.sides as Side[]);
      } finally {
        setTranslatingRecipe(false);
        setTranslatingPrep(false);
      }
    })();
  }, [meal.recipeLoaded, meal.name, userLanguage]);

  // Load existing feedback
  useEffect(() => {
    fetch(`/api/feedback?meal=${encodeURIComponent(meal.name)}`)
      .then(r => r.json())
      .then(d => {
        if (d) {
          setFeedback(d.rating);
          setAdjustments(d.adjustments || '');
          setFeedbackSaved(true);
        }
      });
  }, [meal.name]);

  const saveFeedback = async (rating: FeedbackRating, adj: string) => {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealName: meal.name, rating, adjustments: adj }),
    });
    setFeedback(rating);
    setFeedbackSaved(true);
  };

  const proceedWithFeedback = (rating: FeedbackRating, target: string) => {
    setFeedbackTarget(target);
    setShowFeedbackTarget(false);
    setFeedbackPendingRating(null);
    setShowKeepChoice(false);
    if (rating === 'liked') {
      saveFeedback('liked', '');
      setShowPhotoStep(false);
      setShowLikedFollowUp(true);
    } else if (rating !== 'liked_adjusted') {
      saveFeedback(rating, '');
      setShowLikedFollowUp(false);
    }
  };

  const lookUpSubstitute = async (ingredient: string) => {
    setActiveIngredient(ingredient);
    setSubResult(null);
    setSubLoading(true);
    try {
      const res = await fetch('/api/menu/substitute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal, ingredient }),
      });
      const data = await res.json();
      setSubResult(data);
    } catch {
      setSubResult({ isEssential: false, substitutes: [], adjustedInstructions: 'Could not fetch suggestions.' });
    } finally {
      setSubLoading(false);
    }
  };

  const dismiss = (ingredient: string) => {
    setDismissedConflicts(prev => new Set([...prev, ingredient]));
    if (activeIngredient === ingredient) { setActiveIngredient(null); setSubResult(null); }
  };

  const askChefClaude = async () => {
    const q = chatQ.trim();
    if (!q) return;
    setChatLoading(true);
    try {
      const res = await fetch('/api/menu/ask-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal, question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to answer');
      setChatHistory(prev => [{ q, a: data.answer }, ...prev]);
      setChatQ('');
    } catch (e: any) {
      setChatHistory(prev => [{ q, a: `❌ ${e.message}` }, ...prev]);
    } finally {
      setChatLoading(false);
    }
  };

  const applySubstituteChoice = async (originalIngredient: string, substitute: string) => {
    setApplyingSub(substitute);
    try {
      const res = await fetch('/api/menu/substitute/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal, originalIngredient, substitute }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply substitute');
      // Update meal state with rewritten ingredients + instructions
      const updated = { ...meal, ingredients: data.ingredients, instructions: data.instructions, recipeLoaded: true };
      setMeal(updated);
      setIsOverride(true);
      setAppliedSub({ original: originalIngredient, substitute });
      // Notify the menu page so the cached version is updated too
      onRecipeLoaded?.(meal.day, { ingredients: data.ingredients, instructions: data.instructions, prep_ahead: meal.prep_ahead || [], sides: meal.sides });
      // Dismiss this conflict and close substitute panel
      setDismissedConflicts(prev => new Set([...prev, originalIngredient]));
      setActiveIngredient(null);
      setSubResult(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setApplyingSub(null);
    }
  };

  const startEdit = () => {
    setEditIngredients((meal.ingredients || []).map(i => ({ ...i })));
    setEditInstructions([...(meal.instructions || [])]);
    setEditPrepAhead([...(meal.prep_ahead || [])]);
    setOverrideNotes('');
    setSavedMine(false);
    setEditMode(true);
  };

  const saveMine = async (saveToRecipes: boolean) => {
    setSavingMine(true);
    try {
      await fetch('/api/menu/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeName: meal.name, ingredients: editIngredients, instructions: editInstructions, prep_ahead: editPrepAhead, notes: overrideNotes }),
      });
      if (saveToRecipes) {
        await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: meal.name, cuisine: meal.cuisine || '', mealType: meal.tags?.[0] || 'Any',
            serves: meal.serves || 4, total_time: meal.total_time || '',
            prep_time: meal.prep_time || '', cook_time: meal.cook_time || '',
            difficulty: meal.difficulty || 'Easy', description: meal.description || '',
            tags: meal.tags || [], ingredients: editIngredients,
            instructions: editInstructions, prep_ahead: editPrepAhead,
            source: meal.source_site || '', photo_url: meal.photo_url || '',
          }),
        });
      }
      setMeal(prev => ({ ...prev, ingredients: editIngredients, instructions: editInstructions, prep_ahead: editPrepAhead }));
      setIsOverride(true);
      setSavedMine(true);
      setShowSaveChoice(false);
      setEditMode(false);
    } finally {
      setSavingMine(false);
    }
  };

  const restoreOriginal = async () => {
    if (!confirm('Remove your customization and restore the original recipe?')) return;
    await fetch('/api/menu/override', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipeName: meal.name }) });
    setIsOverride(false);
  };

  const printWindow = (title: string, html: string) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      body{font-family:Georgia,serif;max-width:680px;margin:48px auto;color:#2F3A32;line-height:1.6}
      h1{font-size:26px;margin-bottom:6px}
      .meta{font-size:13px;color:#7A847B;margin-bottom:28px}
      h2{font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:#556257;margin:28px 0 12px;border-bottom:1px solid #E7E0D6;padding-bottom:6px}
      .ing{display:flex;gap:14px;padding:5px 0;border-bottom:1px dotted #D4B896;font-size:14px}
      .amt{color:#556257;font-weight:700;min-width:80px;flex-shrink:0}
      .step{display:flex;gap:12px;margin-bottom:10px;font-size:14px}
      .num{color:#556257;font-weight:700;min-width:22px;flex-shrink:0}
      .tip{display:flex;gap:10px;padding:10px 14px;background:#EEF2EE;border-radius:8px;margin-bottom:8px;font-size:14px}
      .check{color:#556257;font-weight:700;flex-shrink:0}
      @media print{@page{margin:2cm}}
    </style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  const printRecipe = () => {
    const ings = (recipeLang === 'tr' && trIngredients) ? trIngredients : (meal.ingredients || []);
    const steps = (recipeLang === 'tr' && trInstructions) ? trInstructions : (meal.instructions || []);
    const meta = [meal.total_time, `Serves ${meal.serves}`, meal.cuisine, meal.difficulty].filter(Boolean).join(' · ');
    const sidesHtml = meal.sides?.filter(s => s.instructions?.length).map(side => `
      <h2>${side.name}</h2>
      <h3>Ingredients</h3>
      ${(side.ingredients || []).map(i => `<div class="ing"><span class="amt">${i.amount}</span><span>${i.item}</span></div>`).join('')}
      <h3>Steps</h3>
      ${(side.instructions || []).map((s, i) => `<div class="step"><span class="num">${i + 1}.</span><span>${s}</span></div>`).join('')}
    `).join('') || '';
    printWindow(meal.name, `
      <h1>${meal.name}</h1>
      <p class="meta">${meta}</p>
      <h2>Ingredients</h2>
      ${ings.map(i => `<div class="ing"><span class="amt">${i.amount}</span><span>${i.item}</span></div>`).join('')}
      <h2>Instructions</h2>
      ${steps.map((s, i) => `<div class="step"><span class="num">${i + 1}.</span><span>${s.replace(/^Step \d+:\s*/i, '')}</span></div>`).join('')}
      ${sidesHtml}
    `);
  };

  const printPrep = () => {
    const tips = (prepLang === 'tr' && trPrepAhead) ? trPrepAhead : (meal.prep_ahead || []);
    printWindow(`${meal.name} — Prep`, `
      <h1>${meal.name}</h1>
      <p class="meta">Prep Instructions</p>
      <h2>Prepare Ahead</h2>
      ${tips.map(t => `<div class="tip"><span class="check">✓</span><span>${t}</span></div>`).join('')}
    `);
  };

  const translateRecipe = async () => {
    if (userLanguage === 'English') return;
    if (recipeLang === 'tr') { setRecipeLang('src'); return; }
    if (trIngredients && trInstructions) { setRecipeLang('tr'); return; }
    setTranslatingRecipe(true);
    try {
      const data = await translateRecipeContent({
        name: meal.name,
        ingredients: meal.ingredients,
        instructions: meal.instructions,
        sides: meal.sides,
      }, userLanguage);
      if (data?.ingredients) setTrIngredients(data.ingredients);
      if (data?.instructions) setTrInstructions(data.instructions);
      if (data?.sides) setTrSides(data.sides as Side[]);
      setRecipeLang('tr');
    } finally {
      setTranslatingRecipe(false);
    }
  };

  const translatePrep = async () => {
    if (userLanguage === 'English') return;
    if (prepLang === 'tr') { setPrepLang('src'); return; }
    if (trPrepAhead) { setPrepLang('tr'); return; }
    setTranslatingPrep(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLanguage: userLanguage, prep_ahead: meal.prep_ahead }),
      });
      const data = await res.json();
      if (data.prep_ahead) setTrPrepAhead(data.prep_ahead);
      setPrepLang('tr');
    } finally {
      setTranslatingPrep(false);
    }
  };

  const FOOD_PHOTOS: Record<string, string[]> = {
    Italian:    ['photo-1555396273-367ea4eb4db5','photo-1621996346565-e3dbc646d9a9','photo-1473093295043-cdd812d0e601'],
    Asian:      ['photo-1569050467447-ce54b3bbc37d','photo-1563245372-f21724e3856d'],
    Mexican:    ['photo-1565299585323-38d6b0865b47','photo-1551504734-5ee1c4a1479b'],
    Seafood:    ['photo-1519708227418-c8fd9a32b7a2','photo-1534482421-64566f976cfa'],
    meat:       ['photo-1544025162-d76694265947','photo-1558030006-450675393462'],
    chicken:    ['photo-1598103442097-8b74394b95c2','photo-1432139555190-58524dae6a55'],
    vegetarian: ['photo-1512621776951-a57141f2eefd','photo-1498837167922-ddd27525d352'],
    pasta:      ['photo-1540189549336-e6e99c3679fe','photo-1611270629569-8b357cb88da9'],
    soup:       ['photo-1547592166-23ac45744acd','photo-1448043552756-e747b7a2b2b8'],
    default:    ['photo-1504674900247-0877df9cc836','photo-1546069901-ba9599a7e63c','photo-1567620905732-2d1ec7ab7445'],
  };
  const photoKey = Object.keys(FOOD_PHOTOS).find(k =>
    meal.cuisine?.toLowerCase().includes(k.toLowerCase()) ||
    meal.tags?.some(t => t.toLowerCase().includes(k.toLowerCase()))
  ) || 'default';
  const photos = FOOD_PHOTOS[photoKey];
  const photoIdx = (meal.cuisine || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % photos.length;
  const fallbackSrc = `https://images.unsplash.com/${photos[photoIdx]}?auto=format&fit=crop&w=1200&h=600&q=80`;
  const imgSrc = meal.photo_url || fallbackSrc;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center md:p-4 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,0.55)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-3xl md:rounded-[22px] overflow-hidden relative md:mt-4 md:mb-8"
           style={{ background: 'var(--white)', boxShadow: '0 16px 48px rgba(0,0,0,0.22)', minHeight: '100dvh' }}>

        {/* Hero photo */}
        <div className="relative w-full h-64 overflow-hidden">
          <img src={imgSrc} alt={meal.name}
               className="w-full h-full object-cover"
               onError={e => {
                 const img = e.target as HTMLImageElement;
                 if (img.src !== fallbackSrc) { img.src = fallbackSrc; } else { img.style.display = 'none'; }
               }} />
          {/* gradient so text is readable over photo */}
          <div className="absolute inset-0"
               style={{ background: 'linear-gradient(to top, rgba(30,35,30,0.72) 0%, rgba(30,35,30,0.1) 55%, transparent 100%)' }} />
          {/* Day + title overlaid on photo */}
          <div className="absolute bottom-0 left-0 right-0 px-7 pb-5">
            <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {meal.day}
            </span>
            <h2 className="text-[28px] leading-tight text-white mt-1" style={{ fontFamily: 'var(--font-lora), serif' }}>
              {meal.name}
            </h2>
          </div>
          {/* Close button */}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-lg backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-7">
          <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>{meal.description}</p>

        {/* ── Sides ── */}
        {meal.sides?.length ? (
          <div className="mb-5 rounded-xl p-4" style={{ background: 'var(--green-lt)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--green)' }}>
              Tonight's Menu
            </p>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
              ✦ {meal.name}
            </p>
            {((recipeLang === 'tr' && trSides) ? trSides : meal.sides).map((side, i) => (
              <div key={i}>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                  + {side.name}
                </p>
                {side.ingredients?.length > 0 && (
                  <p className="text-xs italic ml-4" style={{ color: 'var(--text-3)' }}>
                    {side.ingredients.map(ing => `${ing.amount} ${ing.item}`).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* ── Ingredient conflict warnings ── */}
        {conflicts.length > 0 && (
          <div className="mb-5 rounded-xl border overflow-hidden" style={{ borderColor: '#E8C97A' }}>
            <div className="px-4 py-2.5 text-sm font-semibold flex items-center gap-2"
                 style={{ background: '#FEF6E4', color: '#7A5B10' }}>
              ⚠️ This recipe contains ingredients your family doesn't like
            </div>
            {conflicts.map(ing => (
              <div key={ing} className="px-4 py-3 border-t" style={{ borderColor: '#F0E4BB' }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium">
                    <span style={{ color: '#7A5B10' }}>•</span> <strong>{ing}</strong>
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => lookUpSubstitute(ing)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                      style={{ background: 'var(--green)', color: '#fff' }}>
                      🔄 Find substitute
                    </button>
                    <button onClick={() => dismiss(ing)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                      ✓ Use anyway
                    </button>
                  </div>
                </div>

                {/* Substitute result for this ingredient */}
                {activeIngredient === ing && (
                  <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: 'var(--cream)' }}>
                    {subLoading ? (
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                        <div className="spinner w-4 h-4 shrink-0" /> Checking with Chef Claude…
                      </div>
                    ) : subResult?.isEssential ? (
                      <div>
                        <p className="font-semibold mb-1" style={{ color: '#C0392B' }}>
                          ⚠️ Essential ingredient — not recommended to substitute
                        </p>
                        <p style={{ color: 'var(--text-2)' }}>{subResult.essentialReason}</p>
                        <p className="mt-2 text-xs" style={{ color: 'var(--text-2)' }}>
                          We suggest choosing a different recipe for this day instead.
                        </p>
                      </div>
                    ) : subResult ? (
                      <div>
                        <p className="font-semibold mb-2" style={{ color: 'var(--green)' }}>
                          You can substitute <strong>{ing}</strong> with — tap one to apply:
                        </p>
                        <div className="flex flex-col gap-1.5 mb-2">
                          {subResult.substitutes?.map(s => {
                            const isApplying = applyingSub === s;
                            const isDisabled = applyingSub !== null && applyingSub !== s;
                            return (
                              <button key={s}
                                onClick={() => applySubstituteChoice(ing, s)}
                                disabled={isDisabled || isApplying}
                                className="text-left px-3 py-2 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
                                style={{ background: 'var(--white)', border: '1px solid var(--green)', color: 'var(--text)' }}>
                                {isApplying
                                  ? <span style={{ color: 'var(--text-2)' }}><span className="spinner w-3 h-3 inline-block align-middle mr-2" />Rewriting recipe with {s}…</span>
                                  : <><span style={{ color: 'var(--green)' }}>→</span> {s}</>}
                              </button>
                            );
                          })}
                        </div>
                        {subResult.adjustedInstructions && (
                          <p className="text-xs pt-2 border-t italic" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                            {subResult.adjustedInstructions}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Meta strip */}
        <div className="flex flex-wrap gap-4 rounded-xl p-4 mb-5" style={{ background: 'var(--cream)' }}>
          {[
            ['⏱ Total', meal.total_time],
            ['🔪 Prep', meal.prep_time],
            ['🔥 Cook', meal.cook_time],
            ['🌍 Cuisine', meal.cuisine],
          ].map(([label, val]) => (
            <div key={label} className="flex flex-col">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</span>
              <strong className="text-sm">{val}</strong>
            </div>
          ))}
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>🍴 Serves</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <button onClick={() => setScaledServes(s => Math.max(1, s - 1))}
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                style={{ background: 'var(--border)', color: 'var(--text-2)' }}>−</button>
              <strong className="text-sm min-w-[20px] text-center">{scaledServes}</strong>
              <button onClick={() => setScaledServes(s => s + 1)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                style={{ background: 'var(--border)', color: 'var(--text-2)' }}>+</button>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>📊 Level</span>
            <span className="text-xs font-bold px-3 py-1 rounded-full mt-0.5"
                  style={DIFF_STYLE[meal.difficulty] || DIFF_STYLE.Easy}>
              {meal.difficulty}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
          {(['recipe', 'prep'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2.5 text-sm font-semibold -mb-px border-b-2 transition-colors"
              style={{
                borderColor: tab === t ? 'var(--green)' : 'transparent',
                color: tab === t ? 'var(--green)' : 'var(--text-2)',
              }}>
              {t === 'recipe' ? '📖 Recipe' : '⏰ Prep Ahead'}
            </button>
          ))}
          {simplifyResult?.canSimplify && !recipeLoading && (
            <button
              onClick={() => setSimplified(s => !s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ml-2 pb-1"
              style={{
                background: simplified ? 'var(--green)' : 'var(--green-lt)',
                color: simplified ? '#fff' : 'var(--green)',
                border: '1px solid var(--green)',
              }}>
              {simplified ? '✓ Simplified' : '✂ Simplify'}
            </button>
          )}
          {!recipeLoading && (
            <div className="flex gap-2 ml-auto pb-1">
              <button
                onClick={() => setUnitMode(m => m === 'original' ? 'metric' : 'original')}
                className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: unitMode === 'metric' ? 'var(--green)' : 'var(--text-3)', border: `1px solid ${unitMode === 'metric' ? 'var(--green)' : 'var(--border)'}`, background: unitMode === 'metric' ? 'var(--green-lt)' : 'transparent' }}>
                {unitMode === 'metric' ? '🔄 Metric' : '🔄 Imperial'}
              </button>
              <button
                onClick={() => tab === 'recipe' ? printRecipe() : printPrep()}
                className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                🖨 Print
              </button>
              {userLanguage !== 'English' && (
                <button
                  onClick={() => tab === 'recipe' ? translateRecipe() : translatePrep()}
                  disabled={translatingRecipe || translatingPrep}
                  className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  {(tab === 'recipe' ? translatingRecipe : translatingPrep)
                    ? '…'
                    : (tab === 'recipe' ? recipeLang : prepLang) === 'tr'
                    ? '🌐 Original'
                    : `🌐 ${userLanguage}`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recipe tab */}
        {tab === 'recipe' && (
          recipeLoading ? (
            <div className="flex items-center gap-3 py-10 justify-center" style={{ color: 'var(--text-2)' }}>
              <div className="spinner w-6 h-6 shrink-0" />
              <LoadingMessage size="sm" />
            </div>
          ) : editMode ? (
            /* ── Edit mode ── */
            <div>
              <div className="grid md:grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-lora), serif' }}>Ingredients</h3>
                  {editIngredients.map((ing, i) => (
                    <div key={i} className="flex gap-2 items-center mb-2">
                      <input value={ing.amount} onChange={e => setEditIngredients(prev => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                        className="w-20 px-2 py-1.5 rounded-lg border text-sm outline-none"
                        style={{ borderColor: 'var(--border)', background: 'var(--cream)' }} placeholder="Amount" />
                      <input value={ing.item} onChange={e => setEditIngredients(prev => prev.map((x, j) => j === i ? { ...x, item: e.target.value } : x))}
                        className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none"
                        style={{ borderColor: 'var(--border)', background: 'var(--cream)' }} placeholder="Ingredient" />
                      <button onClick={() => setEditIngredients(prev => prev.filter((_, j) => j !== i))}
                        className="shrink-0 text-lg leading-none transition-opacity hover:opacity-60" style={{ color: '#C0392B' }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setEditIngredients(prev => [...prev, { amount: '', item: '' }])}
                    className="text-xs mt-1 transition-opacity hover:opacity-70" style={{ color: 'var(--green)' }}>+ Add ingredient</button>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-lora), serif' }}>Instructions</h3>
                  {editInstructions.map((step, i) => (
                    <div key={i} className="flex gap-2 items-start mb-3">
                      <span className="font-bold mt-2 shrink-0 text-sm" style={{ color: 'var(--green)', minWidth: '20px' }}>{i + 1}.</span>
                      <textarea value={step} onChange={e => setEditInstructions(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                        rows={2} className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none resize-y"
                        style={{ borderColor: 'var(--border)', background: 'var(--cream)', fontFamily: 'Georgia, serif' }} />
                      <button onClick={() => setEditInstructions(prev => prev.filter((_, j) => j !== i))}
                        className="shrink-0 text-lg leading-none mt-1 transition-opacity hover:opacity-60" style={{ color: '#C0392B' }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setEditInstructions(prev => [...prev, ''])}
                    className="text-xs mt-1 transition-opacity hover:opacity-70" style={{ color: 'var(--green)' }}>+ Add step</button>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-bold text-base mb-3" style={{ fontFamily: 'var(--font-lora), serif' }}>Prep Ahead</h3>
                {editPrepAhead.map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start mb-2">
                    <span className="font-bold mt-2 shrink-0" style={{ color: 'var(--green)' }}>✓</span>
                    <textarea value={tip} onChange={e => setEditPrepAhead(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                      rows={2} className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none resize-y"
                      style={{ borderColor: 'var(--border)', background: 'var(--cream)', fontFamily: 'Georgia, serif' }} />
                    <button onClick={() => setEditPrepAhead(prev => prev.filter((_, j) => j !== i))}
                      className="shrink-0 text-lg leading-none mt-1 transition-opacity hover:opacity-60" style={{ color: '#C0392B' }}>×</button>
                  </div>
                ))}
                <button onClick={() => setEditPrepAhead(prev => [...prev, ''])}
                  className="text-xs mt-1 transition-opacity hover:opacity-70" style={{ color: 'var(--green)' }}>+ Add prep step</button>
              </div>

              <textarea value={overrideNotes} onChange={e => setOverrideNotes(e.target.value)}
                rows={2} placeholder="What did you change? (optional note for yourself…)"
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none mb-5"
                style={{ borderColor: 'var(--border)', background: 'var(--cream)', fontFamily: 'Georgia, serif' }} />

              {showSaveChoice ? (
                <div className="rounded-xl p-4 border" style={{ background: 'var(--cream)', borderColor: 'var(--border)' }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>How would you like to save?</p>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>
                    Your edits will always be used when this recipe appears in future menus. Would you also like to add it to My Recipes?
                  </p>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => saveMine(true)} disabled={savingMine}
                      className="w-full py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{ background: 'var(--green)', color: '#fff' }}>
                      {savingMine ? 'Saving…' : '✓ Save to My Recipes too'}
                    </button>
                    <button onClick={() => saveMine(false)} disabled={savingMine}
                      className="w-full py-2.5 rounded-full text-sm font-semibold border transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-2)', background: 'var(--white)' }}>
                      Remember quietly — just for future menus
                    </button>
                    <button onClick={() => setShowSaveChoice(false)}
                      className="text-xs text-center py-1 transition-opacity hover:opacity-60"
                      style={{ color: 'var(--text-3)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setShowSaveChoice(true)}
                    className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'var(--green)', color: '#fff' }}>
                    ✓ Remember my changes
                  </button>
                  <button onClick={() => setEditMode(false)}
                    className="px-6 py-2.5 rounded-full text-sm transition-opacity hover:opacity-70"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) :
          /* ── Read-only mode ── */
          <div>
            {appliedSub && (
              <div className="mb-4 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3"
                   style={{ background: 'var(--green-lt)', color: 'var(--green-dk)' }}>
                <span>
                  ✓ Recipe rewritten — replaced <strong>{appliedSub.original}</strong> with <strong>{appliedSub.substitute}</strong>.
                </span>
                <button onClick={() => setAppliedSub(null)}
                  className="text-xs transition-opacity hover:opacity-60"
                  style={{ color: 'var(--text-3)' }}>✕</button>
              </div>
            )}
            {/* Override badge + edit/restore actions */}
            {!meal.isLeftover && meal.recipeLoaded && (
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                {isOverride ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: '#FEF6E4', color: '#7A5B10' }}>
                    ✏ Your version
                  </span>
                ) : savedMine ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
                    ✓ Saved as your version
                  </span>
                ) : <span />}
                <div className="flex gap-2">
                  {isOverride && (
                    <button onClick={restoreOriginal}
                      className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                      style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                      Restore original
                    </button>
                  )}
                  <button onClick={startEdit}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
                    {isOverride ? 'Edit my version' : 'Edit recipe'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4" style={{ fontFamily: 'var(--font-lora), serif' }}>
                {recipeLang === 'tr' ? 'Ingredientes' : 'Ingredients'}
              </h3>
              {simplified && simplifyResult?.note && (
                <p className="text-xs italic mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
                  ✂ {simplifyResult.note}
                </p>
              )}
              <ul className="space-y-2">
                {((() => {
                  const base = (() => {
                    if (recipeLang === 'tr' && trIngredients?.length) return trIngredients;
                    if (simplified && simplifyResult?.simplifiedIngredients?.length) return simplifyResult.simplifiedIngredients;
                    return meal.ingredients || [];
                  })();
                  return scaleIngredients(base, meal.serves || 4, scaledServes);
                })()).map((rawIng, i) => {
                  const ing = convertIngredient(rawIng, unitMode);
                  const isDisliked = dislikedIngredients.some(d =>
                    ing.item?.toLowerCase().includes(d.toLowerCase())
                  );
                  return (
                    <li key={i} className="flex gap-3 py-2 text-sm border-b"
                        style={{ borderColor: 'var(--cream)' }}>
                      <span className="font-semibold min-w-20 shrink-0" style={{ color: 'var(--green)' }}>
                        {ing.amount}
                      </span>
                      <span style={{ color: isDisliked ? '#C0392B' : 'inherit' }}>
                        {ing.item}{isDisliked ? ' ⚠️' : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4" style={{ fontFamily: 'var(--font-lora), serif' }}>
                {recipeLang === 'tr' ? 'Instrucciones' : 'Instructions'}
              </h3>
              <ol className="instruction-list space-y-3">
                {((() => {
                  if (recipeLang === 'tr' && trInstructions?.length) return trInstructions;
                  if (simplified && simplifyResult?.simplifiedInstructions?.length) return simplifyResult.simplifiedInstructions;
                  return meal.instructions || [];
                })()).map((step, i) => (
                  <li key={i} className="instruction-step text-sm leading-relaxed py-1">{convertText(step, unitMode)}</li>
                ))}
              </ol>
            </div>
          </div>
          </div>
        )}

        {/* Prep ahead tab */}
        {tab === 'prep' && (
          recipeLoading ? (
            <div className="flex items-center gap-3 py-10 justify-center" style={{ color: 'var(--text-2)' }}>
              <div className="spinner w-6 h-6 shrink-0" />
              <LoadingMessage size="sm" />
            </div>
          ) :
          <div>
            <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
              {prepLang === 'tr' ? 'Reduce el estrés del día haciendo estos pasos con antelación:' : 'Reduce stress on the day by doing these steps in advance:'}
            </p>
            <ul className="space-y-3">
              {((prepLang === 'tr' && trPrepAhead) ? trPrepAhead : (meal.prep_ahead || [])).map((tip, i) => (
                <li key={i} className="flex gap-3 rounded-xl p-4 text-sm leading-relaxed"
                    style={{ background: 'var(--green-lt)' }}>
                  <span className="font-bold text-base shrink-0" style={{ color: 'var(--green)' }}>✓</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Side dish recipes ── */}
        {tab === 'recipe' && !recipeLoading && meal.sides?.some(s => s.instructions?.length) && (
          <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--green)' }}>
              Side Dishes — cooks while the main is on
            </p>
            {((recipeLang === 'tr' && trSides) ? trSides : meal.sides).filter(s => s.instructions?.length).map((side, i) => (
              <div key={i} className={i > 0 ? 'mt-5 pt-5 border-t' : ''} style={{ borderColor: 'var(--border)' }}>
                <p className="font-semibold mb-3" style={{ color: 'var(--text)', fontFamily: 'var(--font-lora), serif' }}>
                  {side.name}
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  {side.ingredients?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Ingredients</p>
                      <ul className="space-y-1">
                        {side.ingredients.map((ing, j) => (
                          <li key={j} className="flex gap-3 py-1.5 text-sm border-b" style={{ borderColor: 'var(--cream)' }}>
                            <span className="font-semibold min-w-20 shrink-0" style={{ color: 'var(--green)' }}>{ing.amount}</span>
                            <span>{ing.item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Steps</p>
                    <ol className="space-y-2">
                      {side.instructions!.map((step, j) => (
                        <li key={j} className="flex gap-2 text-sm leading-relaxed">
                          <span className="font-bold shrink-0" style={{ color: 'var(--green)', minWidth: '20px' }}>{j + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Share + Admin ── */}
        {meal.ingredients?.length ? (
          <div className="mt-4 flex justify-end items-center gap-3 flex-wrap">
            {isAdmin && (
              <button
                onClick={async () => {
                  if (addedToGlobal) return;
                  setAddingToGlobal(true);
                  try {
                    await fetch('/api/admin/recipes', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: meal.name, cuisine: meal.cuisine || '', mealType: meal.tags?.[0] || 'Any',
                        serves: meal.serves || 4, total_time: meal.total_time || '',
                        prep_time: meal.prep_time || '', cook_time: meal.cook_time || '',
                        difficulty: meal.difficulty || 'Easy', description: meal.description || '',
                        tags: meal.tags || [], ingredients: meal.ingredients || [],
                        instructions: meal.instructions || [], prep_ahead: meal.prep_ahead || [],
                        sides: meal.sides || [], photo_url: meal.photo_url || '',
                        source_site: meal.source_site || '',
                      }),
                    });
                    setAddedToGlobal(true);
                  } finally {
                    setAddingToGlobal(false);
                  }
                }}
                disabled={addingToGlobal || addedToGlobal}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-60"
                style={{ background: addedToGlobal ? 'var(--green-lt)' : '#FEF6E4', color: addedToGlobal ? 'var(--green)' : '#7A5B10', border: '1px solid currentColor' }}>
                {addedToGlobal ? '✓ In global library' : addingToGlobal ? 'Adding…' : '🌐 Add to global library'}
              </button>
            )}
            <ShareButton recipe={meal} size="sm" />
          </div>
        ) : null}

        {/* ── Feedback section ── */}
        {!meal.isLeftover && (
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-2)' }}>
              {feedbackSaved ? 'Your feedback' : 'How did this turn out?'}
            </h3>

            {/* Rating buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {([
                { rating: 'liked' as FeedbackRating,          label: '👍 Loved it',          active: { background: 'var(--green)', color: '#fff' } },
                { rating: 'liked_adjusted' as FeedbackRating, label: '✏️ Made adjustments',  active: { background: '#4A7AB5', color: '#fff' } },
                { rating: 'disliked' as FeedbackRating,       label: '👎 Never again',        active: { background: '#C0392B', color: '#fff' } },
              ]).map(({ rating, label, active }) => (
                <button key={rating}
                  onClick={() => {
                    setFeedback(rating);
                    setFeedbackSaved(false);
                    setShowLikedFollowUp(false);
                    setShowKeepChoice(false);
                    if (hasSides) {
                      setFeedbackPendingRating(rating);
                      setShowFeedbackTarget(true);
                    } else {
                      proceedWithFeedback(rating, 'whole');
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                  style={feedback === rating
                    ? active
                    : { background: 'var(--cream)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Target picker — shown when meal has sides */}
            {showFeedbackTarget && feedbackPendingRating && (
              <div className="mt-3 rounded-xl p-4" style={{ background: 'var(--cream)', border: '1px solid var(--border)' }}>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Apply to:</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => proceedWithFeedback(feedbackPendingRating, 'whole')}
                    className="px-3 py-2 rounded-full text-sm font-medium transition-all"
                    style={{ background: 'var(--green)', color: '#fff' }}>
                    🍽 Whole meal
                  </button>
                  <button onClick={() => proceedWithFeedback(feedbackPendingRating, 'main')}
                    className="px-3 py-2 rounded-full text-sm font-medium transition-all"
                    style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    ✦ {meal.name}
                  </button>
                  {meal.sides!.map(side => (
                    <button key={side.name} onClick={() => proceedWithFeedback(feedbackPendingRating, side.name)}
                      className="px-3 py-2 rounded-full text-sm font-medium transition-all"
                      style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                      + {side.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loved it — follow-up */}
            {showLikedFollowUp && (
              <div className="rounded-xl p-4 mt-2 animate-slide-up"
                   style={{ background: 'var(--green-lt)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--green)' }}>
                  {feedbackTarget === 'whole' || feedbackTarget === 'main'
                    ? 'Glad you loved it! What would you like to do?'
                    : `Glad you loved the ${feedbackTarget}! What would you like to do?`}
                </p>

                {savedToRecipes ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm px-4 py-2 rounded-lg font-medium"
                          style={{ background: 'var(--green)', color: '#fff' }}>
                      ✓ Saved to My Recipes
                    </span>
                    <ShareButton recipe={meal} size="sm" />
                    <button onClick={() => setShowLikedFollowUp(false)}
                      className="text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-60"
                      style={{ color: 'var(--text-3)' }}>
                      Done
                    </button>
                  </div>
                ) : showPhotoStep ? (
                  /* Step 2 — choose photo then confirm */
                  <div className="space-y-3">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Choose a photo for this recipe:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setPendingPhotoUrl(meal.photo_url || '')}
                        className="text-sm px-4 py-2 rounded-lg font-medium transition-all"
                        style={pendingPhotoUrl === (meal.photo_url || '')
                          ? { background: 'var(--green)', color: '#fff' }
                          : { background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                        {pendingPhotoUrl === (meal.photo_url || '') ? '✓ ' : ''}Keep current photo
                      </button>
                      <label className="text-sm px-4 py-2 rounded-lg font-medium cursor-pointer transition-opacity hover:opacity-80"
                        style={pendingPhotoUrl !== null && pendingPhotoUrl !== (meal.photo_url || '')
                          ? { background: 'var(--green)', color: '#fff' }
                          : { background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                        {pendingPhotoUrl !== null && pendingPhotoUrl !== (meal.photo_url || '') ? '✓ ' : ''}Upload my own
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return;
                            if (file.size > 5 * 1024 * 1024) return;
                            const fd = new FormData();
                            fd.append('file', file);
                            const res = await fetch('/api/recipes/upload-photo', { method: 'POST', body: fd });
                            const { url } = await res.json();
                            setPendingPhotoUrl(url || '');
                          }} />
                      </label>
                    </div>
                    <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>
                      ⚠️ Uploaded photos will be publicly accessible.
                    </p>
                    {pendingPhotoUrl !== null && (
                      <button
                        onClick={async () => {
                          setSavingToRecipes(true);
                          const isSideTarget = feedbackTarget !== 'whole' && feedbackTarget !== 'main';
                          const side = isSideTarget ? meal.sides?.find(s => s.name === feedbackTarget) : null;
                          await fetch('/api/recipes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(side ? {
                              name: side.name, cuisine: meal.cuisine || '',
                              mealType: 'Side Dish', serves: meal.serves || 4,
                              total_time: '', prep_time: '', cook_time: '',
                              difficulty: meal.difficulty || 'Easy', description: '',
                              tags: ['side dish'], ingredients: side.ingredients || [],
                              instructions: side.instructions || [], prep_ahead: [],
                              source: '', photo_url: pendingPhotoUrl,
                            } : {
                              name: meal.name, cuisine: meal.cuisine || '',
                              mealType: meal.tags?.[0] || 'Any', serves: meal.serves || 4,
                              total_time: meal.total_time || '', prep_time: meal.prep_time || '',
                              cook_time: meal.cook_time || '', difficulty: meal.difficulty || 'Easy',
                              description: meal.description || '', tags: meal.tags || [],
                              ingredients: meal.ingredients || [], instructions: meal.instructions || [],
                              prep_ahead: meal.prep_ahead || [], source: meal.source_site || '',
                              photo_url: pendingPhotoUrl,
                            }),
                          });
                          setSavingToRecipes(false);
                          setSavedToRecipes(true);
                        }}
                        disabled={savingToRecipes}
                        className="w-full py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ background: 'var(--green)', color: '#fff' }}>
                        {savingToRecipes ? 'Saving…' : '✓ Save to My Recipes'}
                      </button>
                    )}
                  </div>
                ) : (
                  /* Step 1 — main choice */
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setShowPhotoStep(true); setPendingPhotoUrl(null); }}
                      className="w-full py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{ background: 'var(--green)', color: '#fff' }}>
                      📖 {feedbackTarget !== 'whole' && feedbackTarget !== 'main'
                        ? `Save ${feedbackTarget} to My Recipes`
                        : 'Save to My Recipes'}
                    </button>
                    <button
                      onClick={() => {
                        if (feedbackTarget === 'whole') {
                          setShowKeepChoice(true);
                        } else {
                          setShowLikedFollowUp(false);
                        }
                      }}
                      className="w-full py-2.5 rounded-full text-sm font-semibold border transition-opacity hover:opacity-80"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-2)', background: 'var(--white)' }}>
                      ✓ Just keep for weekly menus
                    </button>
                    {showKeepChoice && (
                      <div className="flex flex-col gap-2 pt-1">
                        <button onClick={() => { setShowKeepChoice(false); setShowLikedFollowUp(false); }}
                          className="w-full py-2.5 rounded-full text-sm font-medium border transition-opacity hover:opacity-80"
                          style={{ borderColor: 'var(--green)', color: 'var(--green)', background: 'transparent' }}>
                          🔗 As this combination — main with these sides
                        </button>
                        <button onClick={() => { setShowKeepChoice(false); setShowLikedFollowUp(false); }}
                          className="w-full py-2.5 rounded-full text-sm font-medium border transition-opacity hover:opacity-80"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-2)', background: 'var(--white)' }}>
                          🔀 Separately — to mix and match freely
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Adjustments text area */}
            {feedback === 'liked_adjusted' && (
              <div className="space-y-2">
                <textarea
                  value={adjustments}
                  onChange={e => { setAdjustments(e.target.value); setFeedbackSaved(false); }}
                  placeholder="What did you change? (e.g. added lemon, reduced salt, swapped chicken for tofu…)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                  style={{ background: 'var(--cream)', borderColor: 'var(--border)' }}
                />
                <button onClick={() => saveFeedback('liked_adjusted', adjustments)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: 'var(--green)' }}>
                  Save
                </button>
              </div>
            )}

            {feedbackSaved && (
              <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
                {feedback === 'disliked'
                  ? "Got it — this meal won't appear in future menus."
                  : feedback === 'liked_adjusted' && adjustments
                  ? `Saved: "${adjustments}"`
                  : 'Feedback saved ✓'}
              </p>
            )}
          </div>
        )}

        {/* ── Ask Chef Claude ── */}
        {!meal.isLeftover && meal.recipeLoaded && (
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            {!chatOpen ? (
              <button onClick={() => setChatOpen(true)}
                className="w-full py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 flex items-center justify-center gap-2"
                style={{ background: 'var(--green-lt)', color: 'var(--green-dk)', border: '1px solid var(--green)' }}>
                <img src="/icons/this-week.png" alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                Ask Chef Claude about this recipe
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                    <img src="/icons/this-week.png" alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                    Ask Chef Claude about this recipe
                  </p>
                  <button onClick={() => { setChatOpen(false); setChatQ(''); }}
                    className="text-xs transition-opacity hover:opacity-60"
                    style={{ color: 'var(--text-3)' }}>
                    Close
                  </button>
                </div>
                <p className="text-xs italic mb-3" style={{ color: 'var(--text-3)' }}>
                  Substitutions, technique, timing, scaling, what to serve it with — anything specific to this dish.
                </p>
                <div className="flex gap-2 mb-3">
                  <textarea value={chatQ}
                    onChange={e => setChatQ(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) askChefClaude(); }}
                    rows={2}
                    placeholder="e.g. Can I use butter instead of olive oil? What wine pairs well? How do I scale this for 8 people?"
                    className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                    style={{ background: 'var(--cream)', borderColor: 'var(--border)', fontFamily: 'Georgia, serif' }} />
                  <button onClick={askChefClaude}
                    disabled={chatLoading || !chatQ.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40 shrink-0"
                    style={{ background: 'var(--green)', color: '#fff' }}>
                    {chatLoading ? '…' : 'Ask'}
                  </button>
                </div>
                <p className="text-xs text-right" style={{ color: 'var(--text-3)' }}>⌘ + Enter</p>
                {chatHistory.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {chatHistory.map((entry, i) => (
                      <div key={i} className="rounded-xl p-4" style={{ background: 'var(--green-lt)', border: '1px solid var(--green)' }}>
                        <p className="text-xs italic mb-2" style={{ color: 'var(--green-dk)' }}>
                          You asked: {entry.q}
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text)' }}>
                          {entry.a}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {meal.source_site && (
          <p className="mt-4 text-xs text-center" style={{ color: 'var(--text-3)' }}>
            Inspired by: {meal.source_site}
          </p>
        )}
        </div>{/* end p-7 body */}
      </div>
    </div>
  );
}
