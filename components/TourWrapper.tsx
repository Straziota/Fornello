'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import Tour from './Tour';

const TourContext = createContext<{ startTour: () => void }>({ startTour: () => {} });
export const useTour = () => useContext(TourContext);

// Tour should never appear on these (unauthenticated) pages
const PUBLIC_PATHS = ['/login', '/signup', '/privacy', '/reset-password'];

export default function TourWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showTour, setShowTour] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Skip on public pages — user isn't logged in yet
    if (PUBLIC_PATHS.some(p => pathname?.startsWith(p))) {
      setChecked(true);
      return;
    }
    fetch('/api/settings').then(async r => {
      if (!r.ok) { setChecked(true); return; }
      const s = await r.json();
      // Only show welcome to authenticated users who haven't seen the tour
      // (familySize check guards against malformed responses)
      if (s && typeof s.familySize === 'number' && !s.hasSeenTour) {
        setShowWelcome(true);
      }
      setChecked(true);
    }).catch(() => setChecked(true));
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

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}

      {/* Welcome prompt */}
      {checked && showWelcome && !showTour && (
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
