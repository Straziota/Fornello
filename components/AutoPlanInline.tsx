'use client';
import { useState, useEffect } from 'react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * "or have it arrive on Sundays" — a secondary line under Generate.
 *
 * Placed here because pressing Generate IS the manual act this replaces.
 * Someone who came back to plan a second week has just demonstrated the
 * behaviour the feature removes, which makes them the highest-intent audience
 * it will ever have — and they are standing right there.
 *
 * Deliberately permanent rather than dismissible: a returning user should meet
 * it every time until they act on it. It disappears only once auto-planning is
 * actually on. Settings is where this is managed afterwards; nobody browses
 * settings looking for a feature they don't know exists.
 */
export default function AutoPlanInline() {
  const [on, setOn] = useState<boolean | null>(null);
  const [day, setDay] = useState('Sunday');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      setOn(!!s?.autoPlan);
      // The email lands the day before their week starts, so name that day
      // rather than assuming everyone's week begins on Monday.
      const start = typeof s?.weekStartDay === 'number' ? s.weekStartDay : 1;
      setDay(DAYS[(start + 6) % 7]);
    }).catch(() => setOn(false));
  }, []);

  const enable = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/auto-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      if (res.ok) { setOn(true); setDone(true); }
    } finally { setSaving(false); }
  };

  if (on === null || (on && !done)) return null;

  if (done) return (
    <p className="text-xs mt-2 text-right" style={{ color: 'var(--green)' }}>
      ✓ Your week will arrive on {day}s
    </p>
  );

  // Secondary to Generate, but not invisible: it was 11px in the faintest grey
  // in the palette, which is indistinguishable from a caption. Brand green on a
  // soft tint reads as tappable while staying clearly the smaller of the two
  // choices.
  return (
    <button onClick={enable} disabled={saving}
      className="block ml-auto mt-2 rounded-full px-4 py-2 text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
      style={{
        background: 'var(--green-lt)',
        color: 'var(--green)',
        border: '1px solid var(--green)',
        whiteSpace: 'nowrap',
      }}>
      {saving ? 'setting up…' : <>✉ or have it arrive on {day}s</>}
    </button>
  );
}
