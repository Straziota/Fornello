'use client';
import { useState } from 'react';
import { formatList, type ShareRow } from '@/lib/share-list';

/**
 * Gets the shopping list out of Fornello.
 *
 * Until Instacart reopens applications, the list has no exit except retyping
 * it. Plain text goes into Walmart's search, Amazon's, Notes, or a message to
 * whoever is actually going — every retailer, no approval from any of them.
 *
 * The share sheet where the platform offers one, the clipboard otherwise. Both
 * end in the same place: the list somewhere other than here.
 */
export default function ShareListButton({
  rows, title,
}: { rows: ShareRow[]; title: string }) {
  const [done, setDone] = useState<'copied' | 'shared' | null>(null);

  // Nothing to share is not a disabled button to puzzle over — it is no button.
  if (!rows.length) return null;

  const send = async () => {
    const text = formatList(rows, title);
    try {
      // Web Share carries the list into any app on the phone, which is the
      // whole point; it needs a user gesture, so it must be called straight
      // from the click rather than after an await.
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text });
        setDone('shared');
      } else {
        await navigator.clipboard.writeText(text);
        setDone('copied');
      }
    } catch {
      // A cancelled share sheet throws exactly like a failure does. Falling back
      // to the clipboard means "cancel" still leaves the list somewhere useful,
      // rather than looking like the button is broken.
      try {
        await navigator.clipboard.writeText(text);
        setDone('copied');
      } catch { /* nothing more to offer */ }
    }
    setTimeout(() => setDone(null), 2500);
  };

  return (
    <button onClick={send}
      className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] backdrop-blur-sm transition-opacity hover:opacity-80"
      style={{
        border: `1px solid ${done ? 'var(--green)' : 'var(--border)'}`,
        background: done ? 'var(--green-lt)' : 'rgba(255,255,255,0.7)',
        color: done ? 'var(--green)' : 'var(--text-2)',
        boxShadow: '0 2px 8px rgba(47,58,50,0.06)',
      }}>
      {done === 'shared' ? 'Sent ✓' : done === 'copied' ? 'Copied ✓' : 'Send list'}
    </button>
  );
}
