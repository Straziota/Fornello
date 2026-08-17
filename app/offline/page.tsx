'use client';

import Link from 'next/link';

// Shown only when a page is requested that has never been cached and there is
// no connection. Pages already visited come from the cache instead, so reaching
// this screen should be rare — it exists so the app never shows Safari's dinosaur.
export default function OfflinePage() {
  return (
    <div className="text-center py-20 max-w-md mx-auto">
      <h1 className="text-3xl mb-4" style={{ fontFamily: 'AbramoSerif, serif' }}>
        No connection
      </h1>
      <p className="italic mb-8" style={{ color: 'var(--text-2)' }}>
        This page hasn&rsquo;t been saved for offline use yet. Anything you&rsquo;ve already
        opened is still here.
      </p>

      <div className="flex flex-col gap-3 items-center">
        <Link href="/this-week" style={{ color: 'var(--green)' }}>This Week</Link>
        <Link href="/groceries" style={{ color: 'var(--green)' }}>From the Market</Link>
        <Link href="/recipes" style={{ color: 'var(--green)' }}>Recipes</Link>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="mt-10 px-5 py-2 rounded-full"
        style={{ border: '1px solid var(--border-2)', color: 'var(--text-2)' }}
      >
        Try again
      </button>
    </div>
  );
}
