'use client';
import { useState, useEffect } from 'react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * "Weekly email" — a peer of Print week, Days off and Regenerate.
 *
 * Placed beside Generate because pressing Generate is the manual act this
 * replaces: anyone who came back to plan another week has just demonstrated the
 * behaviour the feature removes.
 *
 * The button explains nothing; the dialog does. Turning on a recurring email
 * deserves more than a single tap on a line of small print — someone should know
 * what arrives, when, and how to stop it before they agree to it.
 */
export default function AutoPlanInline() {
  const [on, setOn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // null until the household's own week start is known — naming the wrong day,
  // even briefly, undermines the one thing the label is for.
  const [defaultDay, setDefaultDay] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);

  const load = () =>
    fetch('/api/settings').then(r => r.json()).then(s => {
      setOn(!!s?.autoPlan);
      const start = typeof s?.weekStartDay === 'number' ? s.weekStartDay : 1;
      const derived = (start + 6) % 7;
      setDefaultDay(derived);
      setChosen(typeof s?.autoPlanDay === 'number' ? s.autoPlanDay : derived);
    }).catch(() => { setOn(false); setDefaultDay(0); setChosen(0); });

  useEffect(() => { load(); }, []);

  const save = async (enabled: boolean) => {
    setSaving(true);
    try {
      await fetch('/api/auto-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // Sending null when they've kept the default keeps the email FOLLOWING
        // the week start, so changing the week later moves it too. Only a
        // deliberate difference pins a specific day.
        body: JSON.stringify({ enabled, day: chosen === defaultDay ? null : chosen }),
      });
      setOn(enabled);
      setOpen(false);
    } finally { setSaving(false); }
  };

  if (on === null || defaultDay === null || chosen === null) return null;

  return (
    <>
      <button onClick={() => { load(); setOpen(true); }}
        className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] backdrop-blur-sm transition-opacity hover:opacity-80"
        style={{
          border: `1px solid ${on ? 'var(--green)' : 'var(--border)'}`,
          background: on ? 'var(--green-lt)' : 'rgba(255,255,255,0.7)',
          color: on ? 'var(--green)' : 'var(--text-2)',
          boxShadow: '0 2px 8px rgba(47,58,50,0.06)',
        }}>
        <img src="/icons/Email.png" alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
        Weekly email
      </button>

      {open && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.45)' }}
             onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()}
               className="rounded-[22px] p-8 max-w-sm w-full animate-slide-up"
               style={{ background: 'var(--white)', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setOpen(false)} aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-3)', fontSize: '18px', lineHeight: 1 }}>
              ×
            </button>


            <div className="text-center mb-5">
              <img src="/icons/Email.png" alt="" style={{ width: 96, height: 96, objectFit: 'contain', margin: '0 auto 10px' }} />
              <h2 className="text-2xl" style={{ fontFamily: 'AbramoSerif, serif' }}>
                Your week, in your inbox
              </h2>
            </div>

            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-2)' }}>
              Fornello plans the week for you and emails it: the dinners, what to prep ahead,
              and your shopping list. You don&apos;t have to come back for it.
            </p>

            <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
              Send it on
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => setChosen(i)}
                  className="rounded-full px-3 py-1.5 text-xs transition-all"
                  style={{
                    background: chosen === i ? 'var(--green)' : 'var(--cream)',
                    color: chosen === i ? '#fff' : 'var(--text-2)',
                    border: `1px solid ${chosen === i ? 'var(--green)' : 'var(--border)'}`,
                  }}>
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
            <p className="text-xs italic mb-6" style={{ color: 'var(--text-3)' }}>
              {chosen === defaultDay
                ? `${DAYS[chosen]} — the day before your week starts. Change it to whatever suits your shop.`
                : `${DAYS[chosen]}. Your week still starts ${DAYS[(defaultDay + 1) % 7]} — this only changes when the email arrives.`}
            </p>

            {on ? (
              <>
                <button onClick={() => save(true)} disabled={saving}
                  className="w-full py-3 rounded-xl font-semibold text-white mb-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--green)' }}>
                  {saving ? 'Saving…' : `Save — send on ${DAYS[chosen]}s`}
                </button>
                <button onClick={() => save(false)} disabled={saving}
                  className="w-full py-2.5 text-sm transition-opacity hover:opacity-70 disabled:opacity-50"
                  style={{ color: '#C0392B' }}>
                  Stop sending
                </button>
              </>
            ) : (
              <button onClick={() => save(true)} disabled={saving}
                className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--green)' }}>
                {saving ? 'Setting up…' : `Send me my week on ${DAYS[chosen]}s`}
              </button>
            )}

            <p className="text-xs mt-5 pt-4 text-center" style={{ color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
              You can stop it any time — here, from any email, or in{' '}
              <strong>Settings → First Day of the Week</strong>.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
