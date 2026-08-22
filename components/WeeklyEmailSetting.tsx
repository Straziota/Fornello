'use client';
import { useState, useEffect } from 'react';

/**
 * The weekly email, controllable after the fact.
 *
 * The offer on the grocery list is asked once and then never again — which is
 * right for a prompt, but only if declining hides the PROMPT rather than the
 * FEATURE. Someone who says no in week one may well want it in week five, and
 * without this there was no way back: "No thanks" was effectively "never".
 */
export default function WeeklyEmailSetting() {
  const [on, setOn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json())
      .then(s => setOn(!!s?.autoPlan))
      .catch(() => setOn(false));
  }, []);

  const toggle = async (next: boolean) => {
    setSaving(true); setNote('');
    try {
      const res = await fetch('/api/auto-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error();
      setOn(next);
      setNote(next
        ? "Your week will arrive the day before it starts."
        : "Stopped. You can turn it back on here whenever you like.");
    } catch {
      setNote('Could not save that — try again in a moment.');
    } finally { setSaving(false); }
  };

  if (on === null) return null;

  return (
    <>
      <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>
        Fornello plans your week and emails it the day before your week starts — the dinners,
        the prep, and a shopping list you can tick off on your phone. You don&apos;t have to
        come back for it.
      </p>
      <button onClick={() => toggle(!on)} disabled={saving}
        className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{
          background: on ? 'var(--green)' : 'transparent',
          color: on ? '#fff' : 'var(--text-2)',
          border: `1px solid ${on ? 'var(--green)' : 'var(--border)'}`,
        }}>
        {saving ? 'Saving…' : on ? '✓ Sending every week' : 'Send me my week'}
      </button>
      {note && <p className="text-xs mt-3 italic" style={{ color: 'var(--text-3)' }}>{note}</p>}
    </>
  );
}
