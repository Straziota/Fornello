'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Tour from './Tour';

const TourContext = createContext<{ startTour: () => void }>({ startTour: () => {} });
export const useTour = () => useContext(TourContext);

// Tour should never appear on these (unauthenticated) pages
const PUBLIC_PATHS = ['/login', '/signup', '/privacy', '/reset-password', '/welcome', '/offline'];
const isPublic = (p?: string | null) => PUBLIC_PATHS.some(x => (p || '').startsWith(x));

export default function TourWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showTour, setShowTour] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  // "We have confirmed this account has onboarded." NOT "we have run a check" —
  // that distinction is the whole bug. Signing in leaves the wrapper mounted, so
  // a flag meaning "checked" was already true from the login page and the app
  // painted the moment /this-week mounted, before the new check could answer.
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Skip on public pages — user isn't logged in yet
    // Public pages render themselves; there is no app behind them to leak.
    if (PUBLIC_PATHS.some(p => pathname?.startsWith(p))) return;
    fetch('/api/settings').then(async r => {
      // Not signed in. The middleware sends them to /login; nothing to gate.
      if (!r.ok) { setVerified(true); return; }
      const s = await r.json();
      // Only show welcome to authenticated users who haven't seen the tour
      // (familySize check guards against malformed responses)
      // First-run questionnaire takes precedence over everything else. A user
      // who has never answered it is sent there instead of being dropped into an
      // unconfigured product with a "want a tour?" modal on top — that was three
      // gates before anyone saw a dinner.
      if (s && !s.onboardedAt) {
        // Deliberately leaves `verified` false, so nothing behind this paints
        // while the navigation is in flight.
        router.replace('/welcome');
        return;
      }
      if (s && typeof s.familySize === 'number' && !s.hasSeenTour) {
        setShowWelcome(true);
      }
      setVerified(true);
    }).catch(() => setVerified(true));
  }, [pathname]);

  const markSeen = () => fetch('/api/tour', { method: 'POST' }).catch(() => {});

  const startTour = () => { setShowWelcome(false); setShowTour(true); };

  const handleDone = () => {
    setShowTour(false);
    markSeen();
  };

  const handleSkipWelcome = () => {
    setShowWelcome(false);
    markSeen();
  };

  // Nothing behind a private path renders until this account is confirmed
  // onboarded. Signing in used to paint the full home screen — nav icons, this
  // week, the lot — and then yank it away as the redirect landed, which reads
  // as the app breaking rather than as a questionnaire starting.
  //
  // Public paths are exempt, and `verified` stays true once set, so this costs
  // one held frame per session rather than one per navigation.
  if (!isPublic(pathname) && !verified) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: 'var(--cream, #F7F4EE)' }}>
        <div className="text-center">
          <img src="/Fornello Logo.png" alt="Fornello" style={{ width: '160px', margin: '0 auto 16px' }} />
          <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>Your family meal planner</p>
        </div>
      </div>
    );
  }

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}

      {/* Welcome prompt */}
      {showWelcome && !showTour && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-[22px] p-8 max-w-sm w-full animate-slide-up"
               style={{ background: 'var(--white)', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <div className="text-center mb-6">
              <img src="/Fornello Logo.png" alt="Fornello" style={{ width: '120px', margin: '0 auto 16px' }} />
              <h2 className="text-2xl mb-2" style={{ fontFamily: 'AbramoSerif, serif' }}>
                Welcome to Fornello!
              </h2>
              <p className="text-sm italic" style={{ color: 'var(--text-2)' }}>
                Your family's personal meal planner. Would you like a quick tour of the app?
              </p>
            </div>
            <button onClick={startTour}
              className="w-full py-3 rounded-xl font-semibold text-white mb-3 transition-opacity hover:opacity-90"
              style={{ background: 'var(--green)' }}>
              Show me around!
            </button>
            <button onClick={handleSkipWelcome}
              className="w-full py-2 text-sm transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-3)' }}>
              Skip, I'll explore on my own
            </button>
          </div>
        </div>
      )}

      {/* Tour */}
      {showTour && <Tour onDone={handleDone} />}
    </TourContext.Provider>
  );
}
