'use client';
import { useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/native';
import { biometryAvailable, hasBeenOffered, markOffered, lockEnabled, setLockEnabled, authenticate } from '@/lib/biometric';

/**
 * Offers the lock once, just after signing in.
 *
 * A privacy feature buried in Settings protects the people who go looking for
 * it, which is nobody. The moment just after a sign-in is the one moment the
 * question makes sense on its own — the app has just become permanently open on
 * this phone, which is exactly the thing being offered to close.
 *
 * Asked once per device, ever. Declining is an answer, not a snooze.
 */
export default function BiometricOffer() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isNativeApp() || hasBeenOffered() || lockEnabled()) return;
    let cancelled = false;
    (async () => {
      const b = await biometryAvailable();
      if (!b.available || cancelled) return;
      // Only for someone actually signed in — offering this on the login
      // screen would be asking to protect an account they have not opened.
      //
      // Uses the flag TourWrapper already wrote rather than making its own
      // request: a second cold round trip to fornello.app on launch is exactly
      // what made the app feel slow, and this one would have been for a dialog.
      // The cached onboarded flag survives a sign-out, so it alone is not
      // evidence anyone is signed in NOW. A stored Supabase session is.
      let signedIn = false;
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i) || '';
          if (k.startsWith('sb-') && k.includes('auth-token')) { signedIn = true; break; }
        }
      } catch { /* private mode */ }
      if (!signedIn) return;
      if (cancelled) return;
      setName(b.name);
      setShow(true);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;

  const accept = async () => {
    setBusy(true);
    try {
      // Prove it works before promising it.
      if (await authenticate(`Turn on ${name} for Fornello`)) {
        setLockEnabled(true);
        markOffered();
        setShow(false);
      }
    } finally { setBusy(false); }
  };

  const decline = () => { markOffered(); setShow(false); };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5"
         style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="rounded-[22px] p-8 w-full animate-slide-up"
           style={{ background: 'var(--white)', maxWidth: 340, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
        <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>
          Use {name} to open Fornello?
        </h2>
        {/* No paragraph about who might pick up the phone. Someone who wants
            the lock does not need the danger explained, and someone who does
            not want it should be able to decline without having been made
            uneasy first. The question is enough. */}
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
          You can turn this on or off whenever you like in Settings, and change how
          long the app waits before asking again.
        </p>
        <button onClick={accept} disabled={busy}
          className="w-full rounded-full px-5 py-3 text-sm text-white mb-2 disabled:opacity-50"
          style={{ background: 'var(--green)' }}>
          Yes, use {name}
        </button>
        <button onClick={decline} disabled={busy}
          className="w-full rounded-full px-5 py-3 text-sm disabled:opacity-50"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          No thanks
        </button>
      </div>
    </div>
  );
}
