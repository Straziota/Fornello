'use client';
import { useState, useEffect } from 'react';
import { Meal } from '@/lib/types';

const MEAL_TYPES = [
  { value: 'meat',           label: '🥩 Meat' },
  { value: 'chicken',        label: '🍗 Chicken' },
  { value: 'seafood',        label: '🦞 Seafood' },
  { value: 'pasta',          label: '🍝 Pasta' },
  { value: 'vegetarian',     label: '🥗 Vegetarian' },
  { value: 'soup or stew',   label: '🍜 Soup' },
  { value: 'Mexican',        label: '🌮 Mexican' },
  { value: 'Asian',          label: '🍣 Asian' },
];

type ReplaceType = 'whole' | 'main' | 'sides';
type View = 'pick-type' | 'options' | 'recipes' | 'archive';

interface Props {
  day: string;
  menuId: number;
  currentMeal: Meal;
  onReplaced: (newMeal: Meal) => void;
  onClose: () => void;
}

export default function ReplaceMealModal({ day, menuId, currentMeal, onReplaced, onClose }: Props) {
  const [replaceType, setReplaceType] = useState<ReplaceType | null>(null);
  const [view, setView] = useState<View>('pick-type');
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [archive, setArchive] = useState<any[]>([]);
  const [techniques, setTechniques] = useState<string[]>([]);
  const [selectedTechnique, setSelectedTechnique] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => setTechniques(s.cookingTechniques || []));
  }, []);

  useEffect(() => {
    if (view === 'recipes') fetch('/api/recipes').then(r => r.json()).then(setRecipes);
    if (view === 'archive') {
      fetch('/api/menu/history').then(r => r.json()).then(menus => {
        const all = menus.flatMap((m: any) =>
          (m.meals || []).filter((meal: any) => !meal.isLeftover)
            .map((meal: any) => ({ ...meal, weekStart: m.week_start }))
        );
        const unique = Array.from(new Map(all.map((m: any) => [m.name, m])).values())
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        setArchive(unique);
      });
    }
  }, [view]);

  const replace = async (type: string, opts: any = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/menu/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuId, day, type, replaceType,
          technique: selectedTechnique || undefined,
          ...opts
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onReplaced(data);
      onClose();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const goBack = () => {
    if (view === 'options') { setView('pick-type'); setReplaceType(null); }
    else setView('options');
  };

  const selectReplaceType = (t: ReplaceType) => {
    setReplaceType(t);
    if (t === 'sides') {
      // Sides: no need to pick from recipes/archive, go straight to generate
      setView('options');
    } else {
      setView('options');
    }
  };

  const title = view === 'pick-type'
    ? `Replace on ${day}`
    : replaceType === 'sides'
    ? 'New sides'
    : replaceType === 'main'
    ? 'Replace main dish'
    : 'Replace whole meal';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.5)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-t-[24px] md:rounded-[24px] overflow-hidden"
           style={{ background: 'var(--white)', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)', maxHeight: '80vh', overflowY: 'auto' }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            {view !== 'pick-type' && (
              <button onClick={goBack} className="text-xs mb-1 block" style={{ color: 'var(--text-3)' }}>← Back</button>
            )}
            <h2 className="text-xl" style={{ fontFamily: 'AbramoSerif, serif' }}>{title}</h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-3)', fontSize: '20px' }}>✕</button>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#FDEDEB', color: '#C0392B' }}>{error}</div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-10 gap-3" style={{ color: 'var(--text-2)' }}>
              <div className="spinner w-6 h-6 shrink-0" />
              <span className="italic">Finding a new recipe…</span>
            </div>
          )}

          {/* Screen 1: What to replace */}
          {!loading && view === 'pick-type' && (
            <div className="space-y-3">
              <p className="text-sm italic mb-4" style={{ color: 'var(--text-3)' }}>
                Currently: <strong>{currentMeal.name}</strong>
                {currentMeal.sides?.length ? ` + ${currentMeal.sides.map(s => s.name).join(', ')}` : ''}
              </p>
              {[
                { type: 'whole' as ReplaceType, label: '🍽 Whole meal', desc: 'Replace main dish and sides' },
                { type: 'main'  as ReplaceType, label: '🥘 Just the main', desc: 'Keep the sides, change the main dish' },
                { type: 'sides' as ReplaceType, label: '🥗 Just the sides', desc: 'Keep the main dish, get new sides' },
              ].map(opt => (
                <button key={opt.type} onClick={() => selectReplaceType(opt.type)}
                  className="w-full text-left px-5 py-4 rounded-xl transition-all hover:opacity-80"
                  style={{ background: 'var(--cream)', border: '1px solid var(--border)' }}>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{opt.label}</p>
                  <p className="text-xs italic mt-0.5" style={{ color: 'var(--text-3)' }}>{opt.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Screen 2: Generate options */}
          {!loading && view === 'options' && (
            <>
              {/* Technique selector */}
              {techniques.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Cooking technique</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedTechnique('')}
                      className="px-3 py-1.5 rounded-full text-xs transition-all"
                      style={{ background: !selectedTechnique ? 'var(--green)' : 'var(--cream)', color: !selectedTechnique ? '#fff' : 'var(--text-2)', border: '1px solid var(--border)' }}>
                      Any
                    </button>
                    {techniques.map(t => (
                      <button key={t} onClick={() => setSelectedTechnique(t === selectedTechnique ? '' : t)}
                        className="px-3 py-1.5 rounded-full text-xs transition-all"
                        style={{ background: selectedTechnique === t ? 'var(--green)' : 'var(--cream)', color: selectedTechnique === t ? '#fff' : 'var(--text-2)', border: '1px solid var(--border)' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* For sides-only: single generate button */}
              {replaceType === 'sides' ? (
                <>
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Generate new sides</p>
                  <button onClick={() => replace('generate')}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                    style={{ background: 'var(--green)', color: '#fff' }}>
                    Generate new sides
                  </button>
                </>
              ) : (
                <>
                  {/* Meal type selector */}
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Type of meal</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    <button onClick={() => setSelectedMealType('')}
                      className="px-4 py-2 rounded-full text-sm transition-all"
                      style={{ background: !selectedMealType ? 'var(--green)' : 'var(--green-lt)', color: !selectedMealType ? '#fff' : 'var(--green)', border: '1px solid var(--border)' }}>
                      Any
                    </button>
                    {MEAL_TYPES.map(mt => (
                      <button key={mt.value} onClick={() => setSelectedMealType(mt.value === selectedMealType ? '' : mt.value)}
                        className="px-4 py-2 rounded-full text-sm transition-all"
                        style={{ background: selectedMealType === mt.value ? 'var(--green)' : 'var(--green-lt)', color: selectedMealType === mt.value ? '#fff' : 'var(--green)', border: '1px solid var(--border)' }}>
                        {mt.label}
                      </button>
                    ))}
                  </div>

                  {/* Generate button */}
                  <button onClick={() => replace('generate', { mealType: selectedMealType || 'any' })}
                    className="w-full py-3 rounded-xl text-sm font-semibold mb-6 transition-all hover:opacity-80"
                    style={{ background: 'var(--green)', color: '#fff' }}>
                    Generate
                    {selectedMealType || selectedTechnique
                      ? ` — ${[selectedMealType, selectedTechnique].filter(Boolean).join(' + ')}`
                      : ''}
                  </button>

                  {/* Or pick from */}
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Or pick from</p>
                  <div className="flex gap-3">
                    <button onClick={() => setView('recipes')}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                      style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                      📖 Recipes
                    </button>
                    <button onClick={() => setView('archive')}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                      style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                      📅 Archive
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Screen 3: Recipes list */}
          {!loading && view === 'recipes' && (
            <div className="space-y-2">
              {recipes.length === 0 && <p className="italic text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>No saved recipes yet.</p>}
              {recipes.map((r: any) => (
                <button key={r.id} onClick={() => replace('pick', { meal: r })}
                  className="w-full text-left px-4 py-3 rounded-xl transition-all hover:opacity-80"
                  style={{ background: 'var(--cream)', border: '1px solid var(--border)' }}>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{r.name}</p>
                  <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>{r.cuisine} · {r.total_time}</p>
                </button>
              ))}
            </div>
          )}

          {/* Screen 3: Archive list */}
          {!loading && view === 'archive' && (
            <div className="space-y-2">
              {archive.length === 0 && <p className="italic text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>No archived meals yet.</p>}
              {archive.map((m: any, i: number) => (
                <button key={i} onClick={() => replace('pick', { meal: m })}
                  className="w-full text-left px-4 py-3 rounded-xl transition-all hover:opacity-80"
                  style={{ background: 'var(--cream)', border: '1px solid var(--border)' }}>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{m.name}</p>
                  <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>{m.cuisine} · {m.total_time}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
