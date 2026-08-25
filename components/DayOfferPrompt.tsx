'use client';
import { useState } from 'react';
import type { DayOffer } from '@/lib/day-offers';

/**
 * Offers to make a one-week change permanent, where the change was made.
 *
 * Never blocking, always dismissible, and never shown twice for the same day
 * and kind. It sits inline rather than in a modal on purpose: a dialog demands
 * an answer, and the honest answer to most of these is "not now".
 */
export default function DayOfferPrompt({
  offer, onDone,
}: { offer: DayOffer; onDone: (accepted: boolean) => void }) {
  const [busy, setBusy] = useState(false);

  const answer = async (accepted: boolean) => {
    setBusy(true);
    // Optimistic: the answer is recorded in the background, because making
    // someone wait on a write to dismiss a suggestion is worse than losing the
    // record of a decline in the rare case it fails.
    onDone(accepted);
    fetch('/api/settings/day-offer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer, accepted }),
    }).catch(() => {});
  };

  return (
    <div className="rounded-[18px] px-5 py-4 mb-4 flex items-center gap-4 flex-wrap animate-slide-up"
         style={{ background: 'var(--green-lt)', border: '1px solid var(--green)' }}>
      <p className="text-sm flex-1" style={{ color: 'var(--text-2)', minWidth: 200 }}>
        <strong style={{ color: 'var(--green)' }}>{offer.question}</strong>{' '}
        I can make that the usual, not just this week.
      </p>
      <div className="flex gap-2">
        <button onClick={() => answer(true)} disabled={busy}
          className="rounded-full px-4 py-2 text-xs text-white disabled:opacity-50"
          style={{ background: 'var(--green)' }}>
          {offer.accept}
        </button>
        <button onClick={() => answer(false)} disabled={busy}
          className="rounded-full px-4 py-2 text-xs disabled:opacity-50"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          No thanks
        </button>
      </div>
    </div>
  );
}
