'use client';

import { useEffect } from 'react';

// Last-resort boundary for errors thrown in the root layout itself.
// It must render its own <html>/<body> because the normal layout failed,
// so it cannot rely on global styles — everything here is inline.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          message: `[root layout] ${error?.message || 'Unknown error'}`,
          stack: error?.stack || '',
          digest: error?.digest || '',
          url: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F4EE',
          fontFamily: 'Georgia, serif',
          color: '#2F3A32',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            textAlign: 'center',
            background: '#FFFFFF',
            border: '1px solid #E7E0D6',
            borderRadius: '22px',
            padding: '40px 36px',
            boxShadow: '0 6px 24px rgba(47,58,50,0.08)',
          }}
        >
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>🍲</div>
          <h1 style={{ fontSize: '23px', margin: '0 0 10px' }}>Fornello hit a snag</h1>
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#5E6A61', margin: '0 0 24px' }}>
            Something went wrong loading the app. Please reload — your data is safe.
          </p>
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
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
