'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * "Weekly staples" — a peer of the other controls on the grocery list.
 *
 * Staples are the things a household buys every week regardless of what is
 * cooking: milk, coffee, bread. They are a SOURCE that feeds the list — each one
 * appears as its own row with a staple badge — so the weekly shop is complete
 * rather than only covering the recipes. (They are de-duplicated against recipe
 * ingredients so nothing is listed twice.)
 *
 * Same shape as the weekly-email button: the button says what it is, the dialog
 * explains why it matters, and the link lands on the exact section rather than
 * the top of a long settings page.
 */
export default function StaplesPrompt() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json())
      .then(s => setCount((s?.staples || []).length))
      .catch(() => setCount(0));
  }, []);

  if (count === null) return null;
  const has = count > 0;

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] backdrop-blur-sm transition-opacity hover:opacity-80"
        style={{
          border: `1px solid ${has ? 'var(--green)' : 'var(--border)'}`,
          background: has ? 'var(--green-lt)' : 'rgba(255,255,255,0.7)',
          color: has ? 'var(--green)' : 'var(--text-2)',
          boxShadow: '0 2px 8px rgba(47,58,50,0.06)',
        }}>
        <img src="/icons/groceries.png" alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
        Weekly staples
      </button>

      {open && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.45)' }}
             onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()}
               className="rounded-[22px] p-8 max-w-sm w-full animate-slide-up"
               style={{ background: 'var(--white)', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setOpen(false)} aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-3)', fontSize: '18px', lineHeight: 1 }}>
              ×
            </button>


            <div className="text-center mb-5">
              <img src="/icons/groceries.png" alt="" style={{ width: 96, height: 96, objectFit: 'contain', margin: '0 auto 10px' }} />
              <h2 className="text-2xl" style={{ fontFamily: 'AbramoSerif, serif' }}>
                The things you buy every week
              </h2>
            </div>

            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>
              Milk, coffee, bread — the things you pick up every week whatever you&apos;re
              cooking. Add them once and they&apos;ll be on every shopping list from now on,
              so the list is your whole shop, not just the recipes.
            </p>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
              {has
                ? `You have ${count} staple${count === 1 ? '' : 's'}. They appear on each week's list with a staple badge, and won't be listed twice if a recipe calls for one.`
                : 'You haven’t added any yet, so your list only covers what this week’s recipes need.'}
            </p>

            <Link href="/settings?section=staples"
              className="block w-full py-3 rounded-xl font-semibold text-white text-center transition-opacity hover:opacity-90"
              style={{ background: 'var(--green)' }}>
              {has ? 'Edit my staples' : 'Add my staples'}
            </Link>

            <p className="text-xs mt-5 pt-4 text-center" style={{ color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
              They live in <strong>Settings → Pantry Staples</strong>, and you can change them
              any time.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
