'use client';

import { useEffect } from 'react';

// App-wide error boundary. Any uncaught render error in a page becomes this
// friendly, recoverable card instead of a dead "page couldn't load" screen —
// and we quietly report it so we hear about issues before users do.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      // Report at most once per unique message per tab, so a render loop can't spam.
      const key = `fornello-err-${error?.message || 'unknown'}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          message: error?.message || 'Unknown error',
          stack: error?.stack || '',
          digest: error?.digest || '',
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    } catch {
      /* reporting must never throw */
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '460px',
          textAlign: 'center',
          background: '#FFFFFF',
          border: '1px solid #E7E0D6',
          borderRadius: '22px',
          padding: '40px 36px',
          boxShadow: '0 6px 24px rgba(47,58,50,0.08)',
          fontFamily: 'Georgia, serif',
          color: '#2F3A32',
        }}
      >
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>🍲</div>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px' }}>Something didn’t cook right</h1>
        <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#5E6A61', margin: '0 0 24px' }}>
          This page ran into a problem. It’s been noted, and you can try again — your
          data is safe.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            style={{
              background: '#4A7859',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '999px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 'bold',
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              background: 'transparent',
              color: '#4A7859',
              border: '1px solid #C7D4CB',
              borderRadius: '999px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 'bold',
              letterSpacing: '0.05em',
              textDecoration: 'none',
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
