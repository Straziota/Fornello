'use client';
import { useState, useEffect } from 'react';

/**
 * Offered right after a first menu exists, not at signup.
 *
 * At signup nobody knows what they'd be agreeing to. Having just watched a week
 * appear, the offer is concrete: this, every week, without coming back.
 */
export default function AutoPlanOffer({ onDone }: { onDone?: () => void }) {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      // Only ask someone who hasn't already decided.
      if (s && !s.autoPlan && !localStorage.getItem('fornello:autoPlanAsked')) setShow(true);
    }).catch(() => {});
  }, []);

  const answer = async (enabled: boolean) => {
    setSaving(true);
    localStorage.setItem('fornello:autoPlanAsked', '1');
    try {
      await fetch('/api/auto-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
    } finally {
      setShow(false); setSaving(false); onDone?.();
    }
  };

  if (!show) return null;

  return (
    <div className="rounded-[22px] px-6 py-6 mb-6" style={{ background: 'var(--cream)', border: '1px solid var(--border)' }}>
      <h3 className="text-xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>
        Want next week to just show up?
      </h3>
      <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-2)' }}>
        Fornello can plan each week for you and email it the day before your week starts —
        the dinners, the prep, the shopping list. You don&apos;t have to come back for it.
        You can stop any time, and I&apos;ll pause on my own if you stop opening them.
      </p>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => answer(true)} disabled={saving}
          className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--green)' }}>
          Yes, send me my week
        </button>
        <button onClick={() => answer(false)} disabled={saving}
          className="rounded-full px-6 py-3 text-sm transition-opacity hover:opacity-70 disabled:opacity-50"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          No thanks, I&apos;ll plan it myself
        </button>
      </div>
    </div>
  );
}
