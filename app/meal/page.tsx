'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Inner() {
  const p = useSearchParams();
  const token = p.get('t');
  const day = p.get('d');
  const [meal, setMeal] = useState<any>(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token || !day) { setErr('This link is incomplete.'); return; }
    fetch(`/api/meal?t=${encodeURIComponent(token)}&d=${encodeURIComponent(day)}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load');
        setMeal(d.meal);
      })
      .catch(e => setErr(e.message));
  }, [token, day]);

  if (err) return <p className="text-center py-20 text-sm" style={{ color: 'var(--text-2)' }}>{err}</p>;
  if (!meal) return <p className="text-center py-20 text-sm" style={{ color: 'var(--text-3)' }}>Loading…</p>;

  const rate = (r: 'liked' | 'disliked') =>
    `/api/rate?t=${encodeURIComponent(token!)}&m=${encodeURIComponent(meal.name)}&r=${r}`;

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <p className="text-xs uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--text-3)' }}>{meal.day}</p>
      <h1 className="text-3xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>{meal.name}</h1>
      {meal.description && <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>{meal.description}</p>}
      <p className="text-xs mb-7" style={{ color: 'var(--text-3)' }}>
        {[meal.total_time, meal.serves ? `serves ${meal.serves}` : null, meal.difficulty].filter(Boolean).join(' · ')}
      </p>

      {!!(meal.ingredients || []).length && (
        <>
          <p className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>Ingredients</p>
          <ul className="mb-8">
            {meal.ingredients.map((i: any, n: number) => (
              <li key={n} className="flex gap-3 py-2 border-b text-sm" style={{ borderColor: 'var(--border)' }}>
                <span style={{ minWidth: 72, color: 'var(--green)', fontWeight: 700 }}>{i.amount}</span>
                <span>{i.item}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {!!(meal.instructions || []).length && (
        <>
          <p className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>Method</p>
          <ol className="mb-8">
            {meal.instructions.map((step: string, n: number) => (
              <li key={n} onClick={() => setDone(d => { const x = new Set(d); x.has(n) ? x.delete(n) : x.add(n); return x; })}
                  className="flex gap-3 py-3 border-b text-sm cursor-pointer"
                  style={{ borderColor: 'var(--border)', opacity: done.has(n) ? 0.4 : 1 }}>
                <span style={{ color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>{done.has(n) ? '✓' : n + 1}</span>
                <span style={{ textDecoration: done.has(n) ? 'line-through' : 'none' }}>{step}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {!!(meal.prep_ahead || []).length && (
        <>
          <p className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>The night before</p>
          <ul className="mb-8">
            {meal.prep_ahead.map((s: string, n: number) => (
              <li key={n} className="py-2 text-sm" style={{ color: 'var(--text-2)' }}>· {s}</li>
            ))}
          </ul>
        </>
      )}

      <div className="flex gap-3 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
        <a href={rate('liked')} className="rounded-full px-5 py-2.5 text-xs"
           style={{ background: 'var(--green-lt)', color: 'var(--green)', border: '1px solid var(--green)' }}>
          👍 We loved this
        </a>
        <a href={rate('disliked')} className="rounded-full px-5 py-2.5 text-xs"
           style={{ color: '#C0392B', border: '1px solid #C0392B' }}>
          👎 Never again
        </a>
      </div>
    </div>
  );
}

export default function MealPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
