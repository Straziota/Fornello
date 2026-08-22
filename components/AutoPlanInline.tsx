'use client';
import { useState, useEffect } from 'react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * "have it in your inbox every Sunday" — sits beside Generate.
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
    <span className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--green)', whiteSpace: 'nowrap' }}>
      <img src="/icons/Email.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
      ✓ In your inbox every {day}
    </span>
  );

  // Secondary to Generate, but not invisible: it was 11px in the faintest grey
  // in the palette, which is indistinguishable from a caption. Brand green on a
  // soft tint reads as tappable while staying clearly the smaller of the two
  // choices.
  return (
    <button onClick={enable} disabled={saving}
      title={`Have your week in your inbox every ${day}`}
      className="inline-flex items-center gap-2 text-xs transition-opacity hover:opacity-70 disabled:opacity-50"
      style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
      <img src="/icons/Email.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
      {saving ? 'setting up…' : <>have it in your inbox every {day}</>}
    </button>
  );
}
