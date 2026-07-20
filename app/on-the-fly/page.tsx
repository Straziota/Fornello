'use client';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import LoadingMessage from '@/components/LoadingMessage';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';

interface OnTheFlyOption {
  name: string;
  cuisine: string;
  description: string;
  total_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  usedIngredients: string[];
  missingIngredients: string[];
}

interface OnTheFlyRecipe extends OnTheFlyOption {
  prep_time: string;
  cook_time: string;
  serves: number;
  ingredients: { amount: string; item: string }[];
  instructions: string[];
  prep_ahead: string[];
}

interface IngredientCheck {
  essential: boolean;
  verdict: string;
  substitute: string | null;
}

const DIFF_STYLE: Record<string, React.CSSProperties> = {
  Easy:   { background: 'var(--green-lt)', color: 'var(--green)' },
  Medium: { background: '#FEF6E4',         color: '#7A5B10' },
  Hard:   { background: '#FDEDEB',         color: '#C0392B' },
};

const fieldStyle: React.CSSProperties = {
  width: '100%', background: 'var(--cream)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '6px 10px', fontSize: '13px',
  color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
};

export default function OnTheFlyPage() {
  const [input, setInput]     = useState('');
  const [tags, setTags]       = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingRecipe, setLoadingRecipe]   = useState(false);
  const [options, setOptions]   = useState<OnTheFlyOption[]>([]);
  const [recipe, setRecipe]     = useState<OnTheFlyRecipe | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ingredient checks
  const [checking, setChecking] = useState<Record<string, boolean>>({});
  const [checks, setChecks]     = useState<Record<string, IngredientCheck>>({});

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState<OnTheFlyRecipe | null>(null);

  // Save to recipes
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [toast, setToast]   = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Admin-only: add this recipe to the shared global library
  const [isAdmin, setIsAdmin] = useState(false);
  const [addingGlobal, setAddingGlobal] = useState(false);
  const [addedGlobal, setAddedGlobal]   = useState(false);
  useEffect(() => {
    fetch('/api/admin/check').then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => {});
  }, []);

  const addTag = (val: string) => {
    const trimmed = val.trim().replace(/,+$/, '').trim();
    if (trimmed && !tags.includes(trimmed)) setTags(prev => [...prev, trimmed]);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const generateOptions = async () => {
    if (!tags.length) return;
    setLoadingOptions(true);
    setError(null);
    setRecipe(null);
    setOptions([]);
    setChecks({});
    setSaved(false);
    setAddedGlobal(false);
    setEditing(false);
    try {
      const res = await fetch('/api/on-the-fly/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: tags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setOptions(data.options || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingOptions(false);
    }
  };

  const selectOption = async (option: OnTheFlyOption) => {
    setLoadingRecipe(true);
    setError(null);
    setChecks({});
    setSaved(false);
    setAddedGlobal(false);
    setEditing(false);
    try {
      const res = await fetch('/api/on-the-fly/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option, ingredients: tags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load recipe');
      setRecipe(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingRecipe(false);
    }
  };

  const backToOptions = () => {
    setRecipe(null);
    setChecks({});
    setSaved(false);
    setAddedGlobal(false);
    setEditing(false);
  };

  const checkIngredient = async (ingredient: string) => {
    if (!recipe || checking[ingredient] || checks[ingredient]) return;
    setChecking(prev => ({ ...prev, [ingredient]: true }));
    try {
      const res = await fetch('/api/on-the-fly/check-ingredient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient,
          dish: recipe.name,
          cuisine: recipe.cuisine,
          allIngredients: recipe.ingredients.map(i => i.item),
        }),
      });
      if (res.ok) {
        const result: IngredientCheck = await res.json();
        setChecks(prev => ({ ...prev, [ingredient]: result }));
      }
    } finally {
      setChecking(prev => ({ ...prev, [ingredient]: false }));
    }
  };

  const startEdit = () => {
    if (!recipe) return;
    setDraft(JSON.parse(JSON.stringify(recipe)));
    setEditing(true);
  };

  const discardEdit = () => { setEditing(false); setDraft(null); };

  const applyEdit = () => {
    if (!draft) return;
    setRecipe(draft);
    setEditing(false);
    setDraft(null);
    setSaved(false);
    setChecks({});
  };

  const setDraftIngredient = (i: number, field: 'amount' | 'item', value: string) =>
    setDraft(d => d ? { ...d, ingredients: d.ingredients.map((ing, j) => j === i ? { ...ing, [field]: value } : ing) } : d);

  const addDraftIngredient = () =>
    setDraft(d => d ? { ...d, ingredients: [...d.ingredients, { amount: '', item: '' }] } : d);

  const removeDraftIngredient = (i: number) =>
    setDraft(d => d ? { ...d, ingredients: d.ingredients.filter((_, j) => j !== i) } : d);

  const setDraftInstruction = (i: number, value: string) =>
    setDraft(d => d ? { ...d, instructions: d.instructions.map((s, j) => j === i ? value : s) } : d);

  const addDraftInstruction = () =>
    setDraft(d => d ? { ...d, instructions: [...d.instructions, ''] } : d);

  const removeDraftInstruction = (i: number) =>
    setDraft(d => d ? { ...d, instructions: d.instructions.filter((_, j) => j !== i) } : d);

  const saveRecipe = async () => {
    if (!recipe || saving || saved) return;
    setSaving(true);
    try {
      const res = await fetch('/api/on-the-fly/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });
      if (!res.ok) throw new Error('Could not save');
      setSaved(true);
      setToast({ msg: `"${recipe.name}" added to your recipes ✓`, type: 'success' });
    } catch {
      setToast({ msg: 'Could not save recipe — please try again', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const addToGlobal = async () => {
    if (!recipe || addingGlobal || addedGlobal) return;
    setAddingGlobal(true);
    try {
      const res = await fetch('/api/admin/global-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add');
      setAddedGlobal(true);
      setToast({
        msg: data.added
          ? `"${recipe.name}" added to global recipes ✓`
          : `"${recipe.name}" is already in global recipes`,
        type: 'success',
      });
    } catch (e: any) {
      setToast({ msg: e.message || 'Could not add to global recipes', type: 'error' });
    } finally {
      setAddingGlobal(false);
    }
  };

  const display = editing && draft ? draft : recipe;

  return (
    <>
      <PageBackground src="/backgrounds/on-the-fly-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="mb-8">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ color: 'var(--text)', fontFamily: 'AbramoSerif, serif' }}>
          On the Fly
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          Tell us what's in your fridge — we'll make dinner out of it.
        </p>
      </div>

      {/* Ingredient input card */}
      <div className="rounded-[22px] p-6 ring-1 mb-6"
           style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-2)' }}>
          What do you have?
        </p>
        <div
          className="flex flex-wrap gap-2 rounded-xl px-3 py-2.5 min-h-[56px] cursor-text border"
          style={{ background: 'var(--cream)', borderColor: 'var(--border)' }}
          onClick={() => inputRef.current?.focus()}
        >
          {tags.map((tag, i) => (
            <span key={i}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
              style={{ background: 'var(--green)', color: '#fff' }}>
              {tag}
              <button
                onClick={e => { e.stopPropagation(); setTags(prev => prev.filter((_, j) => j !== i)); }}
                className="opacity-70 hover:opacity-100 leading-none">×</button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (input.trim()) addTag(input); }}
            placeholder={tags.length ? '' : 'e.g. chicken, zucchini, garlic… press Enter to add each'}
            className="flex-1 min-w-[200px] bg-transparent outline-none text-sm"
            style={{ color: 'var(--text)' }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
          Press Enter or comma after each ingredient.
        </p>
        <button
          onClick={generateOptions}
          disabled={!tags.length || loadingOptions || loadingRecipe}
          className="mt-4 rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity disabled:opacity-40 hover:opacity-80"
          style={{ background: 'var(--green)', color: '#fff' }}>
          {loadingOptions ? 'Finding ideas…' : options.length || recipe ? 'Get new ideas' : 'Find recipes'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-5 py-4 mb-6 text-sm" style={{ background: '#FDEDEB', color: '#C0392B' }}>
          {error}
        </div>
      )}

      {loadingOptions && <div className="py-10"><LoadingMessage /></div>}

      {/* Options grid — shown when we have options but no recipe selected yet */}
      {options.length > 0 && !recipe && !loadingRecipe && (
        <div>
          <p className="text-sm italic mb-3" style={{ color: 'var(--text-2)' }}>
            {options.length} ideas from your ingredients — pick one to see the full recipe.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {options.map((opt, i) => (
              <button key={i} onClick={() => selectOption(opt)}
                className="text-left rounded-[18px] p-5 ring-1 transition-all hover:shadow-md"
                style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.06)' }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg leading-tight" style={{ fontFamily: 'var(--font-lora), serif', color: 'var(--text)' }}>
                    {opt.name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                        style={DIFF_STYLE[opt.difficulty] || DIFF_STYLE.Easy}>
                    {opt.difficulty}
                  </span>
                </div>
                <p className="text-xs italic mb-3" style={{ color: 'var(--text-3)' }}>
                  {opt.cuisine} · {opt.total_time}
                </p>
                <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>{opt.description}</p>
                {opt.usedIngredients?.length > 0 && (
                  <p className="text-xs" style={{ color: 'var(--green)' }}>
                    ✓ Uses: {opt.usedIngredients.join(', ')}
                  </p>
                )}
                {opt.missingIngredients?.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: '#7A5B10' }}>
                    + Also need: {opt.missingIngredients.join(', ')}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {loadingRecipe && (
        <div className="py-10">
          <LoadingMessage />
          <p className="text-center text-sm italic mt-3" style={{ color: 'var(--text-3)' }}>
            Preparing the full recipe…
          </p>
        </div>
      )}

      {display && recipe && !loadingRecipe && (
        <div className="rounded-[22px] overflow-hidden ring-1"
             style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>

          {/* Header */}
          <div className="px-7 py-6 border-b flex items-start justify-between gap-4"
               style={{ borderColor: 'var(--border)' }}>
            <div className="flex-1">
              {editing ? (
                <>
                  <input
                    value={draft!.name}
                    onChange={e => setDraft(d => d ? { ...d, name: e.target.value } : d)}
                    style={{ ...fieldStyle, fontSize: '22px', fontFamily: 'var(--font-lora), serif', marginBottom: '8px' }}
                  />
                  <textarea
                    rows={2}
                    value={draft!.description}
                    onChange={e => setDraft(d => d ? { ...d, description: e.target.value } : d)}
                    style={{ ...fieldStyle, resize: 'vertical' }}
                  />
                </>
              ) : (
                <>
                  <h2 className="text-[28px] leading-tight mb-2"
                      style={{ fontFamily: 'var(--font-lora), serif', color: 'var(--text)' }}>
                    {display.name}
                  </h2>
                  <p className="text-sm italic" style={{ color: 'var(--text-2)' }}>{display.description}</p>
                </>
              )}
            </div>
            {/* Edit / confirm / discard controls */}
            {!editing ? (
              <button
                onClick={startEdit}
                className="shrink-0 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.15em] transition-opacity hover:opacity-70"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'transparent' }}>
                ✎ Edit
              </button>
            ) : (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={discardEdit}
                  className="rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.15em] transition-opacity hover:opacity-70"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-3)', background: 'transparent' }}>
                  Discard
                </button>
                <button
                  onClick={applyEdit}
                  className="rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.15em] transition-opacity hover:opacity-80"
                  style={{ background: 'var(--green)', color: '#fff', border: 'none' }}>
                  Save changes
                </button>
              </div>
            )}
          </div>

          <div className="p-7">
            {/* Used / Missing pills — hide in edit mode to reduce noise */}
            {!editing && (
              <div className="flex flex-wrap gap-3 mb-5">
                {display.usedIngredients?.length > 0 && (
                  <div className="rounded-xl px-4 py-3 text-sm flex-1 min-w-[160px]"
                       style={{ background: 'var(--green-lt)' }}>
                    <span className="font-semibold block mb-1" style={{ color: 'var(--green)' }}>✓ From your fridge</span>
                    <span style={{ color: 'var(--text-2)' }}>{display.usedIngredients.join(', ')}</span>
                  </div>
                )}
                {display.missingIngredients?.length > 0 && (
                  <div className="rounded-xl px-4 py-3 text-sm flex-1 min-w-[160px]"
                       style={{ background: '#FEF6E4' }}>
                    <span className="font-semibold block mb-1" style={{ color: '#7A5B10' }}>+ You'll also need</span>
                    <span style={{ color: 'var(--text-2)' }}>{display.missingIngredients.join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Meta strip */}
            <div className="flex flex-wrap gap-4 rounded-xl p-4 mb-5" style={{ background: 'var(--cream)' }}>
              {([
                ['⏱ Total', display.total_time],
                ['🔪 Prep',  display.prep_time],
                ['🔥 Cook',  display.cook_time],
                ['🍴 Serves', String(display.serves)],
                ['🌍 Cuisine', display.cuisine],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</span>
                  <strong className="text-sm">{val}</strong>
                </div>
              ))}
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>📊 Level</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full mt-0.5"
                      style={DIFF_STYLE[display.difficulty] || DIFF_STYLE.Easy}>
                  {display.difficulty}
                </span>
              </div>
            </div>

            {/* Ingredients + Instructions */}
            <div className="grid md:grid-cols-2 gap-8">

              {/* ── Ingredients ── */}
              <div>
                <h3 className="font-bold text-lg mb-2" style={{ fontFamily: 'var(--font-lora), serif' }}>
                  Ingredients
                </h3>

                {editing ? (
                  <>
                    <ul className="space-y-2 mb-3">
                      {draft!.ingredients.map((ing, i) => (
                        <li key={i} className="flex gap-2 items-center">
                          <input
                            value={ing.amount}
                            onChange={e => setDraftIngredient(i, 'amount', e.target.value)}
                            placeholder="amount"
                            style={{ ...fieldStyle, width: '90px', flexShrink: 0 }}
                          />
                          <input
                            value={ing.item}
                            onChange={e => setDraftIngredient(i, 'item', e.target.value)}
                            placeholder="ingredient"
                            style={{ ...fieldStyle, flex: 1 }}
                          />
                          <button
                            onClick={() => removeDraftIngredient(i)}
                            className="shrink-0 text-sm opacity-40 hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={addDraftIngredient}
                      className="text-xs rounded-full px-3 py-1 transition-opacity hover:opacity-70"
                      style={{ border: '1px dashed var(--border)', color: 'var(--text-3)', background: 'transparent', cursor: 'pointer' }}>
                      + Add ingredient
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs mb-4 italic" style={{ color: 'var(--text-3)' }}>
                      Tap any ingredient you don't have to check if it's essential.
                    </p>
                    <ul className="space-y-1">
                      {display.ingredients.map((ing, i) => {
                        const key = ing.item;
                        const check = checks[key];
                        const isChecking = checking[key];
                        const isMarked = !!check || isChecking;
                        return (
                          <li key={i}>
                            <button
                              onClick={() => checkIngredient(key)}
                              disabled={isChecking || !!check}
                              className="w-full text-left flex gap-3 py-2 px-2 rounded-lg text-sm border-b transition-colors hover:bg-amber-50 disabled:cursor-default"
                              style={{
                                borderColor: 'var(--cream)',
                                background: isMarked
                                  ? (check?.essential ? 'rgba(220,38,38,0.05)' : 'rgba(34,197,94,0.05)')
                                  : 'transparent',
                              }}>
                              <span className="font-semibold min-w-20 shrink-0" style={{ color: 'var(--green)' }}>
                                {ing.amount}
                              </span>
                              <span className={isMarked ? 'line-through opacity-60' : ''}>{ing.item}</span>
                              {isChecking && (
                                <span className="ml-auto shrink-0 text-xs italic" style={{ color: 'var(--text-3)' }}>checking…</span>
                              )}
                            </button>
                            {check && (
                              <div className="mx-2 mb-2 mt-1 rounded-lg px-3 py-2 text-xs leading-relaxed"
                                   style={{
                                     background: check.essential ? '#FDEDEB' : 'var(--green-lt)',
                                     color: check.essential ? '#C0392B' : 'var(--green)',
                                   }}>
                                <span className="font-semibold">{check.essential ? '✗ Essential' : '✓ Can skip'}</span>
                                {' — '}
                                {check.verdict}
                                {check.substitute && (
                                  <span style={{ color: 'var(--text-2)' }}> · Sub: <em>{check.substitute}</em></span>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>

              {/* ── Instructions ── */}
              <div>
                <h3 className="font-bold text-lg mb-4" style={{ fontFamily: 'var(--font-lora), serif' }}>
                  Instructions
                </h3>

                {editing ? (
                  <>
                    <ol className="space-y-2 mb-3">
                      {draft!.instructions.map((step, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="text-xs font-bold mt-2.5 min-w-[18px]" style={{ color: 'var(--green)' }}>{i + 1}.</span>
                          <textarea
                            rows={2}
                            value={step}
                            onChange={e => setDraftInstruction(i, e.target.value)}
                            style={{ ...fieldStyle, flex: 1, resize: 'vertical' }}
                          />
                          <button
                            onClick={() => removeDraftInstruction(i)}
                            className="shrink-0 text-sm mt-1.5 opacity-40 hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            ✕
                          </button>
                        </li>
                      ))}
                    </ol>
                    <button
                      onClick={addDraftInstruction}
                      className="text-xs rounded-full px-3 py-1 transition-opacity hover:opacity-70"
                      style={{ border: '1px dashed var(--border)', color: 'var(--text-3)', background: 'transparent', cursor: 'pointer' }}>
                      + Add step
                    </button>
                  </>
                ) : (
                  <ol className="instruction-list space-y-3">
                    {display.instructions.map((step, i) => (
                      <li key={i} className="instruction-step text-sm leading-relaxed py-1">{step}</li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="mt-8 pt-6 border-t flex items-center justify-between gap-4 flex-wrap"
                 style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={saveRecipe}
                disabled={saving || saved || editing}
                className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{
                  background: saved ? 'var(--green-lt)' : 'var(--green)',
                  color: saved ? 'var(--green)' : '#fff',
                  border: saved ? '1px solid var(--green)' : 'none',
                }}>
                {saved ? '✓ Saved to recipes' : saving ? 'Saving…' : 'Save to my recipes'}
              </button>
              {isAdmin && (
                <button
                  onClick={addToGlobal}
                  disabled={addingGlobal || addedGlobal || editing}
                  className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{
                    background: addedGlobal ? 'var(--green-lt)' : 'var(--cream)',
                    color: 'var(--green)',
                    border: '1px solid var(--green)',
                  }}>
                  {addedGlobal ? '✓ In global recipes' : addingGlobal ? 'Adding…' : '🌍 Add to global recipes'}
                </button>
              )}
              <button
                onClick={backToOptions}
                disabled={loadingRecipe || editing}
                className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--green)' }}>
                ← Back to other options
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
