'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Cat { category: string; items: { item: string; amount?: string }[] }

function Inner() {
  const token = useSearchParams().get('t');
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [week, setWeek] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) { setErr('This link is missing its code.'); return; }
    fetch(`/api/shop?t=${encodeURIComponent(token)}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load');
        setCats(d.categories); setWeek(d.weekStart);
      })
      .catch(e => setErr(e.message));
    // Ticks are kept on the device — the list is reachable by anyone with the
    // link, so it should not write shopping state back to the household.
    try { setDone(new Set(JSON.parse(localStorage.getItem('fornello:shop') || '[]'))); } catch { /* first visit */ }
  }, [token]);

  const toggle = (key: string) => {
    setDone(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem('fornello:shop', JSON.stringify([...next]));
      return next;
    });
  };

  if (err) return <p className="text-center py-20 text-sm" style={{ color: 'var(--text-2)' }}>{err}</p>;
  if (!cats) return <p className="text-center py-20 text-sm" style={{ color: 'var(--text-3)' }}>Loading your list…</p>;

  const total = cats.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <h1 className="text-3xl mb-1" style={{ fontFamily: 'AbramoSerif, serif' }}>Your list</h1>
      <p className="text-xs uppercase tracking-[0.2em] mb-7" style={{ color: 'var(--text-3)' }}>
        Week of {week} · {done.size}/{total}
      </p>

      {cats.map(c => (
        <div key={c.category} className="mb-7">
          <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>{c.category}</p>
          {c.items.map(i => {
            const key = `${c.category}:${i.item}`;
            const on = done.has(key);
            return (
              <button key={key} onClick={() => toggle(key)}
                className="w-full text-left flex items-start gap-3 py-3 border-b"
                style={{ borderColor: 'var(--border)', opacity: on ? 0.4 : 1 }}>
                <span style={{ color: on ? 'var(--green)' : 'var(--text-3)', flexShrink: 0 }}>{on ? '✓' : '○'}</span>
                <span className="text-sm" style={{ textDecoration: on ? 'line-through' : 'none' }}>
                  {i.amount ? <strong>{i.amount} </strong> : null}{i.item}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function ShopPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
