'use client';
import { useState } from 'react';

/**
 * Shows a household what their allergies were understood as.
 *
 * The correction itself is only half the safeguard. If "Nut sllergy" is read as
 * tree nuts and that reading is wrong, nobody ever finds out — so the
 * interpretation is shown and has to be accepted. Making the system's
 * understanding visible is the part that catches a bad normalisation.
 */
export default function RestrictionNormalizer({
  restrictions, onApply,
}: { restrictions: string[]; onApply: (next: string[]) => void }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ normalized: string[]; changed: boolean } | null>(null);

  const check = async () => {
    setChecking(true); setResult(null);
    try {
      const res = await fetch('/api/settings/normalize-restrictions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restrictions }),
      });
      setResult(await res.json());
    } finally { setChecking(false); }
  };

  if (!restrictions.length) return null;

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
      {!result ? (
        <button onClick={check} disabled={checking}
          className="text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70 disabled:opacity-50"
          style={{ color: 'var(--green)' }}>
          {checking ? 'Checking…' : '✓ Check these are understood correctly'}
        </button>
      ) : result.changed ? (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#FDEDEB', border: '1px solid #E8B4AC' }}>
          <p className="mb-2" style={{ color: '#8B2E22' }}>
            <strong>These would be clearer as:</strong>
          </p>
          <p className="mb-3" style={{ color: 'var(--text-2)' }}>
            {result.normalized.join(' · ')}
          </p>
          <p className="text-xs mb-3 italic" style={{ color: 'var(--text-3)' }}>
            Fornello matches allergies by ingredient name, so a phrase or a typo can
            stop some checks recognising it.
          </p>
          <div className="flex gap-2">
            <button onClick={() => { onApply(result.normalized); setResult(null); }}
              className="rounded-full px-4 py-2 text-xs text-white" style={{ background: 'var(--green)' }}>
              Use these
            </button>
            <button onClick={() => setResult(null)}
              className="rounded-full px-4 py-2 text-xs" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              Keep mine
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--green)' }}>
          ✓ Understood as: {result.normalized.join(' · ')}
        </p>
      )}
    </div>
  );
}
