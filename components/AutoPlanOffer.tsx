'use client';
import { useState, useEffect } from 'react';

/**
 * Offered on the grocery list, in the first session.
 *
 * It cannot wait for someone to prove they value it: this feature exists for
 * households who don't come back, so offering it only to returners would mean
 * never offering it to the people it is for.
 *
 * It also must not stand in front of the menu — that reveal is what onboarding
 * was building to. The list is the second thing opened, it is short enough that
 * the top is seen rather than reached, and she is holding the exact artefact she
 * would be receiving. "This list, every Sunday" lands here in a way it cannot at
 * the bottom of a seven-day view.
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
        Your week, in your inbox, Sunday morning
      </h3>
      <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-2)' }}>
        This list, and the dinners it&apos;s for, sent the day before your week starts.
        You don&apos;t have to come back for it — and you can stop any time, in one tap.
      </p>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => answer(true)} disabled={saving}
          className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--green)' }}>
          Send me my week
        </button>
        <button onClick={() => answer(false)} disabled={saving}
          className="rounded-full px-6 py-3 text-sm transition-opacity hover:opacity-70 disabled:opacity-50"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          No thanks
        </button>
      </div>
    </div>
  );
}
