'use client';
import { useEffect, useState } from 'react';
import { biometryAvailable, lockEnabled, setLockEnabled, authenticate,
         getRelockMs, setRelockMs, RELOCK_OPTIONS, markOffered } from '@/lib/biometric';

/**
 * Renders nothing unless this device can actually do it.
 *
 * A "Enable Face ID" switch on a laptop is a promise the machine cannot keep,
 * and this is the same Settings page served to a browser and to the phone.
 */
export default function BiometricSetting() {
  const [name, setName] = useState('');
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [delay, setDelay] = useState(0);

  useEffect(() => {
    biometryAvailable().then(b => {
      if (b.available) { setName(b.name); setOn(lockEnabled()); setDelay(getRelockMs()); }
    });
  }, []);

  if (!name) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (!on) {
        // Prove it works before promising it. Turning the lock on without
        // testing it is how someone discovers at the door that the key does
        // not fit.
        const ok = await authenticate(`Turn on ${name} for Fornello`);
        if (!ok) return;
      }
      setLockEnabled(!on);
      setOn(!on);
      // Answering here counts as answering, so the sign-in offer never appears
      // for someone who has already decided in Settings.
      markOffered();
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={on} disabled={busy} onChange={toggle}
               className="mt-1" style={{ accentColor: 'var(--green)', width: 16, height: 16 }} />
        <span className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          <strong>Ask for {name} to open Fornello</strong> — you stay signed in, but the app
          asks for {name} when you come back to it. This phone only.
        </span>
      </label>

      {on && (
        <div className="mt-4 pl-7">
          <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
            Ask again
          </p>
          <div className="flex flex-wrap gap-2">
            {RELOCK_OPTIONS.map(o => (
              <button key={o.ms} type="button"
                onClick={() => { setRelockMs(o.ms); setDelay(o.ms); }}
                className="rounded-full px-3.5 py-1.5 text-xs"
                style={{
                  border: `1px solid ${delay === o.ms ? 'var(--green)' : 'var(--border)'}`,
                  background: delay === o.ms ? 'var(--green)' : 'transparent',
                  color: delay === o.ms ? '#fff' : 'var(--text-2)',
                }}>
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2 italic" style={{ color: 'var(--text-3)' }}>
            How long Fornello can sit in the background before it asks again.
          </p>
        </div>
      )}
    </div>
  );
}
