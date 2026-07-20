'use client';
import { useState, useRef, useEffect } from 'react';
import RecipeCardModal from '@/components/RecipeCardModal';
import LoadingMessage from '@/components/LoadingMessage';
import Toast from '@/components/Toast';
import PageBackground from '@/components/PageBackground';
import { UserRecipe } from '@/lib/types';

interface TraditionCard {
  name: string;
  cuisine: string;
  description: string;
  culturalContext: string;
  occasion: string;
  total_time: string;
  prep_time: string;
  cook_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  serves: number;
}

const DIFF_STYLE: Record<string, React.CSSProperties> = {
  Easy:   { background: 'var(--green-lt)', color: 'var(--green)' },
  Medium: { background: '#FEF6E4',         color: '#7A5B10' },
  Hard:   { background: '#FDEDEB',         color: '#C0392B' },
};

const POPULAR_CULTURES = [
  'Italian', 'Japanese', 'Mexican', 'Moroccan', 'Indian', 'French',
  'Greek', 'Lebanese', 'Thai', 'Spanish', 'Ethiopian', 'Korean',
  'Chinese', 'Turkish', 'Persian', 'Vietnamese',
];

// Watercolor flag images — emoji fallback for missing flags (Mexican, Lebanese, Korean)
const FLAG_IMG: Record<string, string> = {
  'Italian':    '/icons/Flags/PNG/Italy.png',
  'Japanese':   '/icons/Flags/PNG/japonsko.png',
  'Moroccan':   '/icons/Flags/PNG/Maroko.png',
  'Indian':     '/icons/Flags/PNG/indie.png',
  'French':     '/icons/Flags/PNG/Francie.png',
  'Greek':      '/icons/Flags/PNG/Greece.png',
  'Thai':       '/icons/Flags/PNG/Thajsko.png',
  'Spanish':    '/icons/Flags/PNG/Spain.png',
  'Ethiopian':  '/icons/Flags/PNG/Etiopie.png',
  'Chinese':    '/icons/Flags/PNG/China.png',
  'Turkish':    '/icons/Flags/PNG/Turecko.png',
  'Persian':    '/icons/Flags/PNG/Iran.png',
  'Vietnamese': '/icons/Flags/PNG/Vietnam.png',
};

const FLAG_EMOJI: Record<string, string> = {
  'Mexican':  '🇲🇽',
  'Lebanese': '🇱🇧',
  'Korean':   '🇰🇷',
};

// Static fallback suggestions shown instantly while Claude loads
const STATIC_TRADITIONS: Record<string, string[]> = {
  'Italian':    ['Sunday Ragù', 'Christmas Eve', 'Easter', 'Carnival', 'Ferragosto', 'New Year\'s Eve', 'Harvest Season', 'Village Feast Day'],
  'Japanese':   ['New Year (Oshōgatsu)', 'Cherry Blossom (Hanami)', 'Obon Festival', 'Summer Matsuri', 'Winter Solstice', 'Everyday Bento', 'Children\'s Day', 'Moon Viewing'],
  'Mexican':    ['Día de los Muertos', 'Christmas Posadas', 'Quinceañera', 'Independence Day', 'Easter (Semana Santa)', 'Sunday Family Lunch', 'Carnival', 'Harvest Festival'],
  'Moroccan':   ['Ramadan Iftar', 'Eid al-Adha', 'Wedding Feast', 'Friday Couscous', 'Berber New Year', 'Everyday Tagine', 'Eid al-Fitr', 'Harvest Season'],
  'Indian':     ['Diwali', 'Holi', 'Eid', 'Wedding Feast', 'Sunday Family Lunch', 'Navratri', 'Pongal Harvest', 'Raksha Bandhan'],
  'French':     ['Christmas Réveillon', 'Bastille Day', 'Easter', 'Sunday Roast', 'New Year\'s Eve', 'Harvest Season', 'Mardi Gras', 'Village Market Day'],
  'Greek':      ['Easter (Pascha)', 'Christmas', 'Name Day Celebration', 'Summer Festival', 'Sunday Lunch', 'Carnival (Apokries)', 'Harvest Season', 'Wedding Feast'],
  'Lebanese':   ['Eid Celebration', 'Christmas', 'Sunday Mezze', 'Wedding Feast', 'Easter', 'Ramadan Iftar', 'Harvest Season', 'Family Gathering'],
  'Thai':       ['Songkran (New Year)', 'Loy Krathong', 'Buddhist Lent', 'Royal Ploughing', 'Wedding Feast', 'Street Food Culture', 'Vegetarian Festival', 'Harvest Season'],
  'Spanish':    ['Christmas Eve (Nochebuena)', 'Easter (Semana Santa)', 'Sunday Paella', 'New Year\'s Eve', 'La Tomatina', 'Harvest Festival', 'Feria', 'San Juan Night'],
  'Ethiopian':  ['Timkat (Epiphany)', 'Enkutatash (New Year)', 'Easter (Fasika)', 'Coffee Ceremony', 'Sunday Injera', 'Wedding Feast', 'Meskel Festival', 'Ramadan'],
  'Korean':     ['Chuseok (Harvest)', 'Seollal (Lunar New Year)', 'Buddha\'s Birthday', 'Wedding Feast', 'Kimchi Season', 'Everyday Banchan', 'Dano Festival', 'Coming of Age'],
  'Chinese':    ['Lunar New Year', 'Mid-Autumn Festival', 'Dragon Boat Festival', 'Winter Solstice', 'Qingming Festival', 'Wedding Banquet', 'Lantern Festival', 'Double Ninth Festival'],
  'Turkish':    ['Ramadan Iftar', 'Eid al-Fitr', 'Wedding Feast', 'Hıdrellez Spring', 'New Year\'s Eve', 'Sunday Breakfast', 'Eid al-Adha', 'Harvest Season'],
  'Persian':    ['Nowruz (New Year)', 'Yalda Night', 'Eid al-Fitr', 'Chaharshanbe Suri', 'Wedding Feast', 'Friday Family Lunch', 'Tirgan Festival', 'Mehregan Harvest'],
  'Vietnamese': ['Tết (Lunar New Year)', 'Mid-Autumn Festival', 'Wandering Souls Day', 'Wedding Feast', 'Buddha\'s Birthday', 'Everyday Pho', 'Hùng Kings Festival', 'Winter Solstice'],
};

export default function TraditionsPage() {
  const [culture, setCulture]         = useState('');
  const [tradition, setTradition]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [cards, setCards]             = useState<TraditionCard[]>([]);
  const [lastCulture, setLastCulture] = useState('');
  const [lastTradition, setLastTradition] = useState('');
  const [error, setError]             = useState<string | null>(null);
  const cultureRef = useRef<HTMLInputElement>(null);

  // Tradition suggestions
  const [suggestions, setSuggestions]         = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsFor, setSuggestionsFor]   = useState('');

  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [viewRecipe, setViewRecipe]       = useState<UserRecipe | null>(null);

  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved]   = useState<Set<string>>(new Set());
  const [toast, setToast]   = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Fetch suggestions whenever the active culture changes
  const fetchSuggestions = async (c: string) => {
    const trimmed = c.trim();
    if (!trimmed || trimmed === suggestionsFor) return;
    setSuggestionsFor(trimmed);
    setTradition('');

    // Show static fallback immediately
    const staticFallback = STATIC_TRADITIONS[trimmed] ?? [];
    setSuggestions(staticFallback);

    // Fire Claude call to get richer / more specific suggestions
    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/traditions/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ culture: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestions?.length) setSuggestions(data.suggestions);
      }
    } catch {
      // Static fallback already showing — nothing to do
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const pickCulture = (c: string) => {
    setCulture(c);
    fetchSuggestions(c);
  };

  const handleCultureBlur = () => {
    if (culture.trim() && culture.trim() !== suggestionsFor) {
      fetchSuggestions(culture.trim());
    }
  };

  const handleCultureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (culture.trim() && culture.trim() !== suggestionsFor) {
        fetchSuggestions(culture.trim());
      } else if (culture.trim()) {
        generate();
      }
    }
  };

  const generate = async () => {
    if (!culture.trim()) { cultureRef.current?.focus(); return; }
    setLoading(true);
    setError(null);
    setCards([]);
    try {
      const res = await fetch('/api/traditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ culture: culture.trim(), occasion: tradition.trim() }),
      });
      if (!res.ok) throw new Error();
      setCards(await res.json());
      setLastCulture(culture.trim());
      setLastTradition(tradition.trim());
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openRecipe = async (card: TraditionCard) => {
    setLoadingRecipe(true);
    try {
      const res = await fetch('/api/traditions/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setViewRecipe({
        name: card.name,
        cuisine: card.cuisine,
        mealType: '',
        serves: card.serves,
        total_time: card.total_time,
        prep_time: card.prep_time,
        cook_time: card.cook_time,
        difficulty: card.difficulty,
        description: card.description,
        tags: [card.cuisine, card.occasion].filter(Boolean),
        ingredients: data.ingredients || [],
        instructions: data.instructions || [],
        prep_ahead: data.prep_ahead || [],
        source: 'Traditions',
        background: card.culturalContext,
      });
    } catch {
      setToast({ msg: 'Could not load recipe. Please try again.', type: 'error' });
    } finally {
      setLoadingRecipe(false);
    }
  };

  const saveRecipe = async (e: React.MouseEvent, card: TraditionCard) => {
    e.stopPropagation();
    if (saved.has(card.name)) return;
    setSaving(card.name);
    try {
      const recipeRes = await fetch('/api/traditions/recipe', {
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
          name: card.name, cuisine: card.cuisine, mealType: '',
          serves: card.serves, total_time: card.total_time,
          prep_time: card.prep_time, cook_time: card.cook_time,
          difficulty: card.difficulty, description: card.description,
          tags: [card.cuisine, card.occasion].filter(Boolean),
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          prep_ahead: data.prep_ahead || [],
          source: 'Traditions',
          background: card.culturalContext,
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
      <PageBackground src="/backgrounds/traditions-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {loadingRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(247,244,238,0.92)' }}>
          <LoadingMessage size="md" />
        </div>
      )}
      {viewRecipe && !loadingRecipe && (
        <RecipeCardModal recipe={viewRecipe} onClose={() => setViewRecipe(null)} readOnly />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
          Traditions
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          Explore the culinary heritage of any culture — everyday dishes, feast day recipes, and everything in between.
        </p>
      </div>

      {/* Culture input */}
      <div className="mb-4 max-w-sm">
        <input
          ref={cultureRef}
          value={culture}
          onChange={e => setCulture(e.target.value)}
          onBlur={handleCultureBlur}
          onKeyDown={handleCultureKeyDown}
          placeholder="Enter a cuisine or culture…"
          className="w-full px-5 py-3.5 rounded-xl"
          style={{
            background: '#fff', border: '1.5px solid var(--border)',
            fontFamily: 'AbramoSerif, serif', color: 'var(--text)',
            fontSize: '17px', fontWeight: '500', outline: 'none',
          }}
        />
      </div>

      {/* Popular culture pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {POPULAR_CULTURES.map(c => (
          <button key={c} onClick={() => pickCulture(c)}
            className="flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full font-semibold transition-all"
            style={{
              background: culture === c ? 'var(--green)' : 'var(--cream)',
              color: culture === c ? '#fff' : 'var(--text)',
              border: `1.5px solid ${culture === c ? 'var(--green)' : 'var(--border)'}`,
              fontFamily: 'AbramoSerif, serif',
              fontSize: '15px',
            }}>
            {FLAG_IMG[c] ? (
              <img src={FLAG_IMG[c]} alt={c}
                   style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }} />
            ) : (
              <span style={{ fontSize: '22px', lineHeight: 1, width: '32px', textAlign: 'center', flexShrink: 0 }}>
                {FLAG_EMOJI[c]}
              </span>
            )}
            {c}
          </button>
        ))}
      </div>

      {/* Tradition suggestions */}
      {(suggestions.length > 0 || loadingSuggestions) && culture.trim() && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <p className="font-bold" style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)', fontSize: '17px' }}>
              Traditions in {suggestionsFor}
            </p>
            {loadingSuggestions && (
              <span className="text-sm italic" style={{ color: 'var(--text-3)' }}>refining…</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button key={s} onClick={() => setTradition(t => t === s ? '' : s)}
                className="px-4 py-2 rounded-full transition-all"
                style={{
                  background: tradition === s ? 'var(--green)' : '#fff',
                  color: tradition === s ? '#fff' : 'var(--text)',
                  border: `1.5px solid ${tradition === s ? 'var(--green)' : 'var(--border)'}`,
                  fontFamily: 'AbramoSerif, serif',
                  fontSize: '15px',
                  fontWeight: tradition === s ? '700' : '500',
                }}>
                {s}
              </button>
            ))}
          </div>

          {/* Custom tradition input */}
          <div className="mt-4 max-w-sm">
            <input
              value={tradition}
              onChange={e => setTradition(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="Or type a custom tradition…"
              className="w-full px-5 py-3 rounded-xl"
              style={{
                background: '#fff',
                border: tradition && !suggestions.includes(tradition)
                  ? '1.5px solid var(--green)'
                  : '1.5px solid var(--border)',
                fontFamily: 'AbramoSerif, serif', color: 'var(--text)',
                fontSize: '16px', fontWeight: '500', outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Generate button */}
      <button onClick={generate} disabled={loading || !culture.trim()}
        className="mb-8 px-8 py-3 rounded-full font-semibold transition-all hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--green)', color: '#fff', fontFamily: 'AbramoSerif, serif', fontSize: '16px' }}>
        {loading ? 'Exploring…' : cards.length ? '↻ Explore again' : 'Explore this cuisine'}
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

      {/* Results heading */}
      {!loading && cards.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[22px] font-semibold" style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
            {lastCulture}{lastTradition ? ` · ${lastTradition}` : ''}
          </h2>
        </div>
      )}

      {/* Card grid */}
      {!loading && cards.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card, i) => (
            <div key={i}
              className="rounded-[22px] overflow-hidden ring-1 ring-[var(--border)] group relative cursor-pointer transition-all hover:shadow-lg"
              style={{ background: 'var(--card)', boxShadow: '0 4px 16px rgba(47,58,50,0.06)' }}
              onClick={() => openRecipe(card)}>

              <div className="w-full px-5 py-4 flex items-end"
                   style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #dce8d4 60%, #c8dfc0 100%)', minHeight: '90px' }}>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium mb-1"
                        style={{ background: 'rgba(255,255,255,0.7)', color: 'var(--text-2)' }}>
                    {card.occasion}
                  </span>
                  <h3 className="text-[18px] leading-tight font-semibold"
                      style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
                    {card.name}
                  </h3>
                </div>
              </div>

              <div className="p-4">
                <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {card.description}
                </p>
                <p className="text-xs italic mb-3 px-3 py-2 rounded-xl leading-relaxed"
                   style={{ background: 'var(--cream)', color: 'var(--text-3)', borderLeft: '3px solid var(--border)' }}>
                  {card.culturalContext}
                </p>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-3)' }}>
                  <span>⏱ {card.total_time}</span>
                  <span>·</span>
                  <span>Serves {card.serves}</span>
                  <span>·</span>
                  <span className="px-2 py-0.5 rounded-full" style={DIFF_STYLE[card.difficulty]}>
                    {card.difficulty}
                  </span>
                </div>
              </div>

              <button
                onClick={e => saveRecipe(e, card)}
                disabled={!!saving || saved.has(card.name)}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
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
          <img src="/icons/traditions.png" alt=""
               style={{ width: '140px', height: '140px', objectFit: 'contain', margin: '0 auto 16px' }} />
          <p className="italic" style={{ color: 'var(--text-2)' }}>
            Pick a culture to explore its culinary traditions.
          </p>
        </div>
      )}
    </>
  );
}
