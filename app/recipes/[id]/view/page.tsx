'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserRecipe } from '@/lib/types';
import ShareButton from '@/components/ShareButton';
import { scaleIngredients } from '@/lib/scaling';

const DIFF_STYLE: Record<string, React.CSSProperties> = {
  Easy:   { background: 'var(--green-lt)', color: 'var(--green)' },
  Medium: { background: '#FEF6E4',         color: '#7A5B10' },
  Hard:   { background: '#FDEDEB',         color: '#C0392B' },
};

export default function ViewRecipePage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<UserRecipe | null>(null);
  const [scaledServes, setScaledServes] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addingGlobal, setAddingGlobal] = useState(false);
  const [addedGlobal, setAddedGlobal] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`).then(r => r.json()).then(r => { setRecipe(r); setScaledServes(r.serves || 4); });
  }, [id]);

  useEffect(() => {
    fetch('/api/admin/check').then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => {});
  }, []);

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
    } catch {
      /* surfaced via the button staying available to retry */
    } finally {
      setAddingGlobal(false);
    }
  };

  if (!recipe) return (
    <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>
  );

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          header { display: none !important; }
          .print-break { page-break-inside: avoid; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print flex items-center gap-3 mb-8 flex-wrap">
        <button onClick={() => router.push('/recipes')}
          className="text-sm" style={{ color: 'var(--text-3)' }}>
          ← Recipes
        </button>
        <div className="flex-1" />
        <button onClick={() => router.push(`/recipes/${id}`)}
          className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
          style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-2)' }}>
          Edit
        </button>
        <button onClick={() => window.print()}
          className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
          style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-2)' }}>
          Print
        </button>
        {isAdmin && (
          <button onClick={addToGlobal} disabled={addingGlobal || addedGlobal}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ border: '1px solid var(--green)', background: addedGlobal ? 'var(--green-lt)' : 'rgba(255,255,255,0.7)', color: 'var(--green)' }}>
            {addedGlobal ? '✓ In global' : addingGlobal ? 'Adding…' : '🌍 Add to global'}
          </button>
        )}
        <ShareButton recipe={recipe} size="sm" />
      </div>

      {/* Recipe header */}
      <div className="mb-6 print-break">
        <h1 className="text-[38px] leading-[1.05] tracking-[-0.02em] mb-2"
            style={{ fontFamily: 'var(--font-lora), serif', color: 'var(--text)' }}>
          {recipe.name}
        </h1>
        {recipe.description && (
          <p className="text-[16px] italic leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>
            {recipe.description}
          </p>
        )}
        {recipe.source && (
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Source: {recipe.source}</p>
        )}
      </div>

      {/* Meta strip */}
      <div className="flex flex-wrap gap-4 rounded-xl p-4 mb-6 print-break"
           style={{ background: 'var(--cream)' }}>
        {([
          ['⏱ Total',   recipe.total_time],
          ['🔪 Prep',   recipe.prep_time],
          ['🔥 Cook',   recipe.cook_time],
          ['🍴 Serves', null],
          ['🌍 Cuisine', recipe.cuisine],
        ] as [string, string | null][]).filter(([, v]) => v).map(([label, val]) => (
          <div key={label} className="flex flex-col">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</span>
            <strong className="text-sm">{val}</strong>
          </div>
        ))}
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>🍴 Serves</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <button onClick={() => setScaledServes(s => Math.max(1, s - 1))}
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--border)', color: 'var(--text-2)' }}>−</button>
            <strong className="text-sm min-w-[20px] text-center">{scaledServes}</strong>
            <button onClick={() => setScaledServes(s => s + 1)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--border)', color: 'var(--text-2)' }}>+</button>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>📊 Level</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full mt-0.5"
                style={DIFF_STYLE[recipe.difficulty] || DIFF_STYLE.Easy}>
            {recipe.difficulty}
          </span>
        </div>
      </div>

      {/* Tags */}
      {recipe.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {recipe.tags.map((tag, i) => (
            <span key={i} className="px-3 py-1 rounded-full text-xs"
                  style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Ingredients + Instructions */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Ingredients */}
        {recipe.ingredients?.length > 0 && (
          <div className="rounded-[22px] p-6 ring-1 print-break"
               style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.05)' }}>
            <h2 className="font-bold text-lg mb-4" style={{ fontFamily: 'var(--font-lora), serif' }}>
              Ingredients
            </h2>
            <ul className="space-y-2">
              {scaleIngredients(recipe.ingredients, recipe.serves || 4, scaledServes).map((ing, i) => (
                <li key={i} className="flex gap-3 py-2 text-sm border-b"
                    style={{ borderColor: 'var(--cream)' }}>
                  <span className="font-semibold min-w-[80px] shrink-0" style={{ color: 'var(--green)' }}>
                    {ing.amount}
                  </span>
                  <span>{ing.item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {recipe.instructions?.length > 0 && (
          <div className="rounded-[22px] p-6 ring-1 print-break"
               style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.05)' }}>
            <h2 className="font-bold text-lg mb-4" style={{ fontFamily: 'var(--font-lora), serif' }}>
              Instructions
            </h2>
            <ol className="instruction-list space-y-3">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="instruction-step text-sm leading-relaxed py-1">{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Prep Ahead */}
      {recipe.prep_ahead?.length > 0 && (
        <div className="rounded-[22px] p-6 ring-1 print-break"
             style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.05)' }}>
          <h2 className="font-bold text-lg mb-4" style={{ fontFamily: 'var(--font-lora), serif' }}>
            Prep Ahead
          </h2>
          <ul className="space-y-3">
            {recipe.prep_ahead.map((tip, i) => (
              <li key={i} className="flex gap-3 rounded-xl p-4 text-sm leading-relaxed"
                  style={{ background: 'var(--green-lt)' }}>
                <span className="font-bold shrink-0" style={{ color: 'var(--green)' }}>✓</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
