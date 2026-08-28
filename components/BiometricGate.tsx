'use client';
import { useEffect, useState, useCallback } from 'react';
import { isNativeApp } from '@/lib/native';
import { shouldLock, authenticate, markActive, lockEnabled } from '@/lib/biometric';

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
          <img src="/Fornello Logo.png" alt="Fornello" style={{ width: 150, margin: '0 auto 20px' }} />
          <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
            {failed ? 'Not recognised. Try again, or use your passcode.' : 'Unlocking…'}
          </p>
          <button onClick={unlock}
            className="rounded-full px-6 py-3 text-sm text-white"
            style={{ background: 'var(--green)' }}>
            Unlock Fornello
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
