'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import LoadingMessage from '@/components/LoadingMessage';
import Toast from '@/components/Toast';
import PageBackground from '@/components/PageBackground';
import RecipeCardModal from '@/components/RecipeCardModal';
import { UserRecipe } from '@/lib/types';

interface Recipe {
  name: string;
  cuisine: string;
  description: string;
  total_time: string;
  prep_time: string;
  cook_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  serves: number;
  tags: string[];
  ingredients: { amount: string; item: string }[];
  instructions: string[];
  prep_ahead: string[];
}

const QUICK_PICKS = [
  'Beef Wellington', 'Chicken Tikka Masala', 'Pasta Carbonara',
  'Moroccan Lamb Tagine', 'Lemon Tart', 'Pad Thai',
  'French Onion Soup', 'Tiramisu', 'Shakshuka',
];

const DISH_LIST = [
  'Beef Wellington', 'Beef Bourguignon', 'Beef Stroganoff', 'Braised Short Ribs', 'Beef Pho',
  'Chicken Tikka Masala', 'Chicken Shawarma', 'Chicken Satay', 'Coq au Vin', 'Roast Chicken',
  'General Tso\'s Chicken', 'Arroz con Pollo', 'Mole Chicken', 'Katsu Curry',
  'Pasta Carbonara', 'Spaghetti Bolognese', 'Pasta all\'Amatriciana', 'Cacio e Pepe',
  'Lasagna', 'Fettuccine Alfredo', 'Pasta Puttanesca', 'Tagliatelle with Truffle',
  'Mushroom Risotto', 'Risotto ai Frutti di Mare', 'Seafood Risotto',
  'Pad Thai', 'Peking Duck', 'Mapo Tofu', 'Bibimbap', 'Dumplings', 'Spring Rolls',
  'Paella', 'Bouillabaisse', 'Grilled Salmon', 'Shrimp Scampi', 'Fish and Chips', 'Lobster Bisque',
  'French Onion Soup', 'Gazpacho', 'Minestrone', 'Tom Yum', 'Ramen', 'Clam Chowder',
  'Borscht', 'Lentil Soup', 'Vichyssoise',
  'Moroccan Lamb Tagine', 'Lamb Chops', 'Osso Buco', 'Pork Belly', 'Veal Saltimbocca',
  'Shakshuka', 'Hummus', 'Falafel', 'Couscous', 'Chicken Kebabs',
  'Tacos al Pastor', 'Ceviche', 'Empanadas', 'Black Bean Soup', 'Enchiladas',
  'Ratatouille', 'Eggplant Parmigiana', 'Spanakopita', 'Caprese Salad', 'Vegetable Curry',
  'Tiramisu', 'Crème Brûlée', 'Chocolate Lava Cake', 'Lemon Tart', 'Cheesecake',
  'Apple Tart', 'Profiteroles', 'Panna Cotta', 'Baklava', 'Churros', 'Soufflé', 'Opera Cake',
];

const INPUT_STYLE: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid var(--border)',
  fontFamily: 'Georgia, serif',
  color: 'var(--text)',
  fontSize: '17px',
  fontWeight: '400',
  outline: 'none',
  lineHeight: '1.5',
};

export default function FindARecipePage() {
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe]   = useState<Recipe | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [toast, setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [allDishes, setAllDishes]       = useState<string[]>(DISH_LIST);
  const [suggestions, setSuggestions]   = useState<string[]>([]);
  const [highlighted, setHighlighted]   = useState(-1);
  const [showDrop, setShowDrop]         = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/recipes')
      .then(r => r.ok ? r.json() : [])
      .then((data: { name: string }[]) => {
        if (!Array.isArray(data)) return;
        const saved = data.map((r: { name: string }) => r.name).filter(Boolean);
        setAllDishes(prev => {
          const combined = [...new Set([...saved, ...prev])];
          return combined;
        });
      })
      .catch(() => {});
  }, []);

  const updateSuggestions = useCallback((val: string) => {
    if (!val.trim()) { setSuggestions([]); setShowDrop(false); return; }
    const lower = val.toLowerCase();
    const matched = allDishes
      .filter(d => d.toLowerCase().includes(lower))
      .slice(0, 8);
    setSuggestions(matched);
    setShowDrop(matched.length > 0);
    setHighlighted(-1);
  }, [allDishes]);

  const generate = async (q?: string) => {
    const search = (q ?? query).trim();
    if (!search) { inputRef.current?.focus(); return; }
    setShowDrop(false);
    setLoading(true);
    setError(null);
    setRecipe(null);
    setSaved(false);
    setShowCard(false);
    try {
      const res = await fetch('/api/find-a-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: search }),
      });
      if (!res.ok) throw new Error();
      setRecipe(await res.json());
      setShowCard(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickSuggestion = (dish: string) => {
    setQuery(dish);
    setShowDrop(false);
    generate(dish);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDrop) {
      if (e.key === 'Enter') { e.preventDefault(); generate(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0) pickSuggestion(suggestions[highlighted]);
      else { setShowDrop(false); generate(); }
    } else if (e.key === 'Escape') {
      setShowDrop(false);
    }
  };

  const saveRecipe = async () => {
    if (!recipe || saved) return;
    setSaving(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipe.name, cuisine: recipe.cuisine, mealType: '',
          serves: recipe.serves, total_time: recipe.total_time,
          prep_time: recipe.prep_time, cook_time: recipe.cook_time,
          difficulty: recipe.difficulty, description: recipe.description,
          tags: recipe.tags || [], ingredients: recipe.ingredients,
          instructions: recipe.instructions, prep_ahead: recipe.prep_ahead,
          source: 'Find a Recipe',
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setToast({ msg: `${recipe.name} saved to your recipes ✓`, type: 'success' });
    } catch {
      setToast({ msg: 'Could not save recipe', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageBackground src="/backgrounds/find-a-recipe-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
          Find a Recipe
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          Name a dish or describe what you're craving — we'll write the recipe.
        </p>
      </div>

      {/* Search area */}
      <div className="max-w-2xl mb-4" style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); updateSuggestions(e.target.value); }}
          onKeyDown={onKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowDrop(true); }}
          onBlur={() => { closeTimer.current = setTimeout(() => setShowDrop(false), 150); }}
          placeholder="e.g. Beef Wellington, a creamy mushroom pasta, something light with salmon…"
          className="w-full px-5 py-4 rounded-2xl"
          style={INPUT_STYLE}
          autoComplete="off"
        />

        {/* Autocomplete dropdown */}
        {showDrop && (
          <ul style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: '#fff', border: '1.5px solid var(--border)',
            borderRadius: '16px', zIndex: 100,
            boxShadow: '0 8px 32px rgba(47,58,50,0.12)',
            overflow: 'hidden', margin: 0, padding: '6px 0', listStyle: 'none',
          }}>
            {suggestions.map((s, i) => (
              <li key={s}
                onMouseDown={() => { if (closeTimer.current) clearTimeout(closeTimer.current); pickSuggestion(s); }}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  padding: '10px 20px',
                  fontFamily: 'Georgia, serif',
                  fontSize: '16px',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  background: i === highlighted ? 'var(--cream)' : 'transparent',
                  transition: 'background 0.1s',
                }}>
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick-pick pills */}
      {!recipe && (
        <div className="flex flex-wrap gap-2 mb-6 max-w-2xl">
          {QUICK_PICKS.map(s => (
            <button key={s}
              onClick={() => { setQuery(s); generate(s); }}
              className="px-4 py-2 rounded-full font-semibold transition-all hover:opacity-80"
              style={{
                background: 'var(--cream)', color: 'var(--text)',
                border: '1.5px solid var(--border)',
                fontFamily: 'AbramoSerif, serif', fontSize: '15px',
              }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Find button */}
      <button onClick={() => generate()} disabled={loading || !query.trim()}
        className="mb-10 px-8 py-3 rounded-full font-semibold transition-all hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--green)', color: '#fff', fontFamily: 'AbramoSerif, serif', fontSize: '16px' }}>
        {loading ? 'Finding…' : recipe ? '↻ Search again' : 'Find Recipe'}
      </button>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <LoadingMessage size="md" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <p className="text-center italic py-8" style={{ color: 'var(--text-3)' }}>{error}</p>
      )}

      {/* Recipe card modal */}
      {!loading && recipe && showCard && (
        <RecipeCardModal
          recipe={{ ...recipe, mealType: '', source: 'Find a Recipe' } as UserRecipe}
          onClose={() => setShowCard(false)}
          readOnly
          onSave={saveRecipe}
          saving={saving}
          saved={saved}
        />
      )}

      {/* "View recipe" pill shown after modal is dismissed */}
      {!loading && recipe && !showCard && (
        <div className="flex gap-3">
          <button onClick={() => setShowCard(true)}
            className="px-6 py-3 rounded-full font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--green)', color: '#fff', fontFamily: 'AbramoSerif, serif', fontSize: '15px' }}>
            View: {recipe.name}
          </button>
          <button onClick={() => { setRecipe(null); setQuery(''); setSaved(false); inputRef.current?.focus(); }}
            className="px-6 py-3 rounded-full font-semibold transition-all hover:opacity-80"
            style={{ background: 'var(--cream)', color: 'var(--text)', border: '1.5px solid var(--border)', fontFamily: 'AbramoSerif, serif', fontSize: '15px' }}>
            Search again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !recipe && !error && (
        <div className="text-center py-16">
          <img src="/icons/find-a-recipe.png" alt="" style={{ width: '120px', height: '120px', objectFit: 'contain', margin: '0 auto 16px' }} />
          <p className="italic" style={{ color: 'var(--text-2)' }}>
            Type a dish name or describe what you're in the mood for.
          </p>
        </div>
      )}
    </>
  );
}
