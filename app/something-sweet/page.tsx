'use client';
import { useState } from 'react';
import RecipeCardModal from '@/components/RecipeCardModal';
import LoadingMessage from '@/components/LoadingMessage';
import Toast from '@/components/Toast';
import PageBackground from '@/components/PageBackground';
import { UserRecipe } from '@/lib/types';

interface SweetCard {
  name: string;
  category: string;
  description: string;
  total_time: string;
  prep_time: string;
  cook_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  serves: number;
  bakersTip?: string;
}

const CATEGORIES = ['All', 'Cakes', 'Cookies', 'Tarts', 'Pastry & Bread', 'Puddings & Creams', 'Ice Cream & Gelato', 'Chocolate'];
const DIFFICULTIES = ['Any', 'Easy', 'Medium', 'Hard'];

const DIFF_STYLE: Record<string, React.CSSProperties> = {
  Easy:   { background: 'var(--green-lt)', color: 'var(--green)' },
  Medium: { background: '#FEF6E4',         color: '#7A5B10' },
  Hard:   { background: '#FDEDEB',         color: '#C0392B' },
};

const CATEGORY_ICONS: Record<string, string> = {
  'Cakes': '🎂', 'Cookies': '🍪', 'Tarts': '🥧', 'Pastry & Bread': '🥐',
  'Puddings & Creams': '🍮', 'Ice Cream & Gelato': '🍦', 'Chocolate': '🍫',
};

export default function SomethingSweetPage() {
  const [category, setCategory]   = useState('All');
  const [difficulty, setDifficulty] = useState('Any');
  const [loading, setLoading]     = useState(false);
  const [cards, setCards]         = useState<SweetCard[]>([]);
  const [error, setError]         = useState<string | null>(null);

  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [viewRecipe, setViewRecipe]       = useState<UserRecipe | null>(null);
  const [selectedCard, setSelectedCard]   = useState<SweetCard | null>(null);

  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved]   = useState<Set<string>>(new Set());
  const [toast, setToast]   = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setCards([]);
    try {
      const res = await fetch('/api/something-sweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, difficulty }),
      });
      if (!res.ok) throw new Error('Generation failed');
      setCards(await res.json());
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openRecipe = async (card: SweetCard) => {
    setSelectedCard(card);
    setLoadingRecipe(true);
    try {
      const res = await fetch('/api/something-sweet/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setViewRecipe({
        name: card.name,
        cuisine: card.category,
        mealType: 'Dessert',
        serves: card.serves,
        total_time: card.total_time,
        prep_time: card.prep_time,
        cook_time: card.cook_time,
        difficulty: card.difficulty,
        description: card.description,
        tags: [card.category, card.difficulty],
        ingredients: data.ingredients || [],
        instructions: data.instructions || [],
        prep_ahead: data.prep_ahead || [],
        source: 'Something Sweet',
        background: card.bakersTip ? `Baker's tip: ${card.bakersTip}` : '',
      });
    } catch {
      setToast({ msg: 'Could not load recipe. Please try again.', type: 'error' });
      setSelectedCard(null);
    } finally {
      setLoadingRecipe(false);
    }
  };

  const saveRecipe = async (e: React.MouseEvent, card: SweetCard) => {
    e.stopPropagation();
    if (saved.has(card.name)) return;
    setSaving(card.name);
    try {
      const recipeRes = await fetch('/api/something-sweet/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      if (!recipeRes.ok) throw new Error();
      const data = await recipeRes.json();
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: card.name, cuisine: card.category, mealType: 'Dessert',
          serves: card.serves, total_time: card.total_time,
          prep_time: card.prep_time, cook_time: card.cook_time,
          difficulty: card.difficulty, description: card.description,
          tags: [card.category, card.difficulty],
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          prep_ahead: data.prep_ahead || [],
          source: 'Something Sweet',
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(prev => new Set([...prev, card.name]));
      setToast({ msg: `${card.name} saved to your recipes ✓`, type: 'success' });
    } catch {
      setToast({ msg: 'Could not save recipe', type: 'error' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <PageBackground src="/backgrounds/something-sweet-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Full-recipe modal */}
      {loadingRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(247,244,238,0.92)' }}>
          <LoadingMessage size="md" />
        </div>
      )}
      {viewRecipe && !loadingRecipe && (
        <RecipeCardModal recipe={viewRecipe} onClose={() => { setViewRecipe(null); setSelectedCard(null); }} readOnly />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
          Something Sweet
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          Desserts, cakes, and bakes — something for every sweet tooth.
        </p>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className="px-4 py-2 rounded-full font-semibold transition-all"
            style={{
              background: category === c ? 'var(--green)' : 'var(--cream)',
              color: category === c ? '#fff' : 'var(--text)',
              border: `1.5px solid ${category === c ? 'var(--green)' : 'var(--border)'}`,
              fontFamily: 'AbramoSerif, serif',
              fontSize: '15px',
            }}>
            {CATEGORY_ICONS[c] ? `${CATEGORY_ICONS[c]} ${c}` : c}
          </button>
        ))}
      </div>

      {/* Difficulty pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {DIFFICULTIES.map(d => (
          <button key={d} onClick={() => setDifficulty(d)}
            className="px-4 py-2 rounded-full font-semibold transition-all"
            style={{
              ...(difficulty === d ? (DIFF_STYLE[d] ?? { background: 'var(--green)', color: '#fff' }) : { background: 'var(--cream)', color: 'var(--text)' }),
              border: `1.5px solid ${difficulty === d ? 'transparent' : 'var(--border)'}`,
              fontFamily: 'AbramoSerif, serif',
              fontSize: '15px',
            }}>
            {d}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button onClick={generate} disabled={loading}
        className="mb-8 px-8 py-3 rounded-full font-semibold transition-all hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--green)', color: '#fff', fontFamily: 'AbramoSerif, serif', fontSize: '16px' }}>
        {loading ? 'Generating…' : cards.length ? '↻ Generate new selection' : 'Generate recipes'}
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

      {/* Card grid */}
      {!loading && cards.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card, i) => (
            <div key={i}
              className="rounded-[22px] overflow-hidden ring-1 group relative cursor-pointer transition-all hover:shadow-lg"
              style={{ background: 'var(--card)', boxShadow: '0 4px 16px rgba(47,58,50,0.06)' }}
              onClick={() => openRecipe(card)}>

              {/* Color header band */}
              <div className="w-full flex items-center justify-center"
                   style={{ height: '120px', background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 50%, #f3e5f5 100%)' }}>
                <span style={{ fontSize: '56px' }}>{CATEGORY_ICONS[card.category] ?? '🍬'}</span>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-[17px] leading-tight font-semibold"
                      style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
                    {card.name}
                  </h3>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={DIFF_STYLE[card.difficulty]}>
                    {card.difficulty}
                  </span>
                </div>

                <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {card.description}
                </p>

                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-3)' }}>
                  <span>⏱ {card.total_time}</span>
                  <span>·</span>
                  <span>Serves {card.serves}</span>
                  <span>·</span>
                  <span className="px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--cream)', color: 'var(--text-2)' }}>
                    {card.category}
                  </span>
                </div>

                {card.bakersTip && (
                  <p className="mt-3 text-xs italic px-3 py-2 rounded-xl"
                     style={{ background: '#FEF6E4', color: '#7A5B10', borderLeft: '3px solid #F0C060' }}>
                    💡 {card.bakersTip}
                  </p>
                )}
              </div>

              {/* Save button — hover */}
              <button
                onClick={e => saveRecipe(e, card)}
                disabled={!!saving || saved.has(card.name)}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-80"
                style={{
                  background: saved.has(card.name) ? 'rgba(255,255,255,0.9)' : 'var(--green)',
                  color: saved.has(card.name) ? 'var(--text-3)' : '#fff',
                  backdropFilter: 'blur(4px)',
                }}>
                {saved.has(card.name) ? '✓ Saved' : saving === card.name ? '…' : '+ Save recipe'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && cards.length === 0 && !error && (
        <div className="text-center py-20">
          <img src="/icons/something-sweet.png" alt=""
             style={{ width: '140px', height: '140px', objectFit: 'contain', margin: '0 auto 16px' }} />
          <p className="italic" style={{ color: 'var(--text-2)' }}>
            Choose a category and generate your sweet selection.
          </p>
        </div>
      )}
    </>
  );
}
