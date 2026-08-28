'use client';
import { useEffect, useState, useCallback } from 'react';
import { isNativeApp } from '@/lib/native';
import { shouldLock, authenticate, markActive, lockEnabled, biometryAvailable } from '@/lib/biometric';
import BiometricOffer from './BiometricOffer';

/**
 * Holds the app behind Face ID when the device has asked for it.
 *
 * Renders nothing at all on the web and for anyone who has not turned the lock
 * on, so it cannot affect a browser session.
 *
 * The lock screen deliberately offers a way forward when a face fails: a retry,
 * and the passcode fallback the plugin provides. An app that can trap someone
 * out of their own week is worse than one that unlocks slightly too easily.
 */
export default function BiometricGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState('Face ID');

  useEffect(() => { biometryAvailable().then(b => { if (b.name) setName(b.name); }); }, []);

  const unlock = useCallback(async () => {
    setFailed(false);
    const ok = await authenticate('Unlock Fornello');
    if (ok) { setLocked(false); markActive(); } else { setFailed(true); }
  }, []);

  useEffect(() => {
    if (!isNativeApp() || !lockEnabled()) { setChecking(false); return; }
    if (shouldLock()) { setLocked(true); void unlock(); }
    setChecking(false);

    // Re-lock when the app has been in the background long enough. `pagehide`
    // rather than `visibilitychange` alone: iOS fires it reliably when the app
    // is backgrounded, where visibility events can be missed.
    const away = () => markActive();
    const back = () => { if (shouldLock()) { setLocked(true); void unlock(); } };
    document.addEventListener('pagehide', away);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) away(); else back();
    });
    return () => { document.removeEventListener('pagehide', away); };
  }, [unlock]);

  // Nothing renders until we know, so the week never flashes behind the lock.
  if (checking && isNativeApp() && lockEnabled()) return null;

  if (locked) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6"
           style={{ background: 'var(--cream, #F7F4EE)' }}>
        <div className="text-center" style={{ maxWidth: 320 }}>
          <img src="/Fornello Logo.png" alt="Fornello" style={{ width: 140, margin: '0 auto 24px' }} />

          {/* The face outline iOS itself uses. Without it this screen is a logo
              and a sentence, indistinguishable from a login page — and after a
              failed scan the one thing that must be obvious is that another
              scan is a tap away. */}
          <svg width="46" height="46" viewBox="0 0 44 44" fill="none"
               style={{ margin: '0 auto 16px', display: 'block' }}
               aria-hidden="true">
            <g stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13V8a5 5 0 0 1 5-5h5M31 3h5a5 5 0 0 1 5 5v5M41 31v5a5 5 0 0 1-5 5h-5M13 41H8a5 5 0 0 1-5-5v-5" />
              <path d="M15 17v3M29 17v3" />
              <path d="M22 17v6h-2" />
              <path d="M15 29c1.8 1.8 4.2 2.6 7 2.6s5.2-.8 7-2.6" />
            </g>
          </svg>

          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-2)' }}>
            {failed
              ? `${name} didn't recognise you. Try again, or use your passcode.`
              : `Unlocking with ${name}…`}
          </p>

          <button onClick={unlock}
            className="rounded-full px-6 py-3.5 text-sm text-white w-full"
            style={{ background: 'var(--green)' }}>
            {failed ? `Try ${name} again` : `Unlock with ${name}`}
          </button>

          {/* An escape that does not require a face. Three failed scans and iOS
              stops offering Face ID until the passcode is entered, and without
              a way out of this screen the only remaining option would be
              deleting the app. */}
          {failed && (
            <p className="text-xs mt-4 leading-relaxed" style={{ color: 'var(--text-3)' }}>
              The passcode option appears inside the {name} prompt itself.
            </p>
          )}
        </div>
      </div>
    );
  }
  return <>{children}<BiometricOffer /></>;
}
