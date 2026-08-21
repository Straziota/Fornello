'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Meal, Settings } from '@/lib/types';
import { reasonsFor } from '@/lib/why';

/**
 * "Why is this here?" — collapsed by default, one tap to open.
 *
 * Doubles as the discovery path for settings: each reason links to the control
 * that changes it, so someone learns the controls exist at the moment they
 * disagree with one, rather than from a tour they skip.
 */
export default function WhyThisMeal({ meal }: { meal: Meal }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Partial<Settings> | null>(null);

  useEffect(() => {
    if (!open || settings) return;
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => setSettings({}));
  }, [open, settings]);

  if (meal.isLeftover) return null;

  return (
    <div className="mt-4">
      <button onClick={() => setOpen(o => !o)}
        className="text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-60"
        style={{ color: 'var(--text-3)' }}>
        {open ? '× Close' : 'Why is this here?'}
      </button>

      {open && (
        <div className="mt-3 rounded-[18px] px-5 py-4" style={{ background: 'var(--cream)' }}>
          {!settings ? (
            <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>One moment…</p>
          ) : (
            <ul className="space-y-2.5">
              {reasonsFor(meal, settings).map((r, i) => (
                <li key={i} className="flex gap-3 text-sm" style={{ color: 'var(--text-2)' }}>
                  <span aria-hidden style={{ flexShrink: 0 }}>{r.icon}</span>
                  <span>
                    {r.text}
                    {r.href && (
                      <>
                        {' '}
                        <Link href={r.href} className="underline" style={{ color: 'var(--green)' }}>
                          {r.action || 'change'}
                        </Link>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
