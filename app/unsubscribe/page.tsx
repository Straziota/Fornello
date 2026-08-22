'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Inner() {
  const token = useSearchParams().get('t');
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');

  useEffect(() => {
    if (!token) { setState('error'); return; }
    fetch('/api/unsubscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(r => setState(r.ok ? 'done' : 'error')).catch(() => setState('error'));
  }, [token]);

  return (
    <div className="max-w-md mx-auto py-20 text-center">
      <h1 className="text-3xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>
        {state === 'working' ? 'One moment…' : state === 'done' ? 'Done' : 'Something went wrong'}
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-2)' }}>
        {state === 'done'
          ? "You won't get the weekly email again. Your recipes and menus are untouched — nothing else changes."
          : state === 'error'
          ? 'That link didn’t work. You can turn the weekly email off in Settings instead.'
          : ''}
      </p>
    </div>
  );
}

// No login required — an unsubscribe that needs a password is not an unsubscribe.
export default function UnsubscribePage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
