'use client';
import { useState, useEffect } from 'react';

/**
 * Tells a household we changed their allergy entries, and what to.
 *
 * The correction was made without asking, because an allergy two of three
 * safeguards cannot see is a live risk. But changing someone's allergy record
 * and never mentioning it is not acceptable — they have to be able to check our
 * reading and undo it.
 */
export default function RestrictionCorrectionNotice({
  onRestore,
}: { onRestore: (previous: string[]) => void }) {
  const [info, setInfo] = useState<{ from: string[]; to: string[] } | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      const c = s?.restrictionsCorrected;
      if (c && !c.acknowledged) setInfo({ from: c.from || [], to: c.to || [] });
    }).catch(() => {});
  }, []);

  const dismiss = async () => {
    setInfo(null);
    fetch('/api/settings/acknowledge-correction', { method: 'POST' }).catch(() => {});
  };

  if (!info) return null;

  return (
    <div className="rounded-xl px-5 py-4 mb-4 text-sm" style={{ background: 'var(--green-lt)', border: '1px solid var(--green)' }}>
      <p className="mb-2" style={{ color: 'var(--green)' }}>
        <strong>We adjusted how your allergies were written down.</strong>
      </p>
      <p className="mb-2" style={{ color: 'var(--text-2)' }}>
        Fornello checks recipes by ingredient name, and some of our checks weren&apos;t
        recognising what you&apos;d entered — so an allergy might not have been caught
        everywhere it should have been. We&apos;ve fixed that, and rewritten your entry so
        every check sees it.
      </p>
      <p className="mb-3" style={{ color: 'var(--text-2)' }}>
        <span style={{ color: 'var(--text-3)' }}>You wrote:</span> {info.from.join(' · ')}<br />
        <span style={{ color: 'var(--text-3)' }}>Now stored as:</span> <strong>{info.to.join(' · ')}</strong>
      </p>
      <p className="text-xs mb-3 italic" style={{ color: 'var(--text-3)' }}>
        Nothing was removed. If this isn&apos;t right, please change it — your entry is
        what we go by.
      </p>
      {/* The correction makes the checks work; it does not make them
          sufficient. Recipes are model-generated, allergens hide in stocks,
          sauces and condiments, and a household living with a serious allergy
          needs to hear that the last check is theirs. */}
      <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.6)', color: '#8B2E22' }}>
        <strong>Please still read every ingredient before you cook.</strong> Fornello
        does its best to keep these out, but recipes are generated automatically and
        allergens hide in stocks, sauces and condiments. For a serious allergy, the
        final check has to be yours.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button onClick={dismiss}
          className="rounded-full px-4 py-2 text-xs text-white" style={{ background: 'var(--green)' }}>
          That&apos;s right, thanks
        </button>
        <button onClick={() => { onRestore(info.from); dismiss(); }}
          className="rounded-full px-4 py-2 text-xs" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          Put back what I wrote
        </button>
      </div>
    </div>
  );
}
