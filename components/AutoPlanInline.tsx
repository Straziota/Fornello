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
  // null until the household's own week start is known. Seeding this with a day
  // would flash "Sunday" at a Saturday-week family before correcting itself, and
  // the whole point of the label is that it names THEIR day.
  const [day, setDay] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      setOn(!!s?.autoPlan);
      // The email lands the day before their week starts, so name that day
      // rather than assuming everyone's week begins on Monday.
      const start = typeof s?.weekStartDay === 'number' ? s.weekStartDay : 1;
      setDay(DAYS[(start + 6) % 7]);
    }).catch(() => { setOn(false); setDay(DAYS[0]); });
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

  // Render nothing until BOTH are known — no flash of the wrong day.
  if (on === null || day === null || (on && !done)) return null;

  if (done) return (
    <span className="inline-flex flex-col items-center gap-1 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--green)', whiteSpace: 'nowrap' }}>
      <img src="/icons/Email.png" alt="" style={{ width: 112, height: 112, objectFit: 'cover', borderRadius: '10px' }} />
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
      className="inline-flex flex-col items-center gap-1 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70 disabled:opacity-50"
      style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
      <img src="/icons/Email.png" alt="" style={{ width: 112, height: 112, objectFit: 'cover', borderRadius: '10px' }} />
      {saving ? 'setting up…' : <>have it in your inbox every {day}</>}
    </button>
  );
}
