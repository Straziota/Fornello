'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function Inner() {
  const p = useSearchParams();
  const ok = p.get('ok') === '1';
  const rating = p.get('r');
  const meal = p.get('m') || 'that one';

  return (
    <div className="max-w-md mx-auto py-20 text-center">
      <div className="text-5xl mb-4">
        {!ok ? '🤔' : rating === 'liked' ? '👍' : rating === 'liked_adjusted' ? '✏️' : '👎'}
      </div>
      <h1 className="text-3xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>
        {ok ? 'Noted' : 'That link expired'}
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
        {!ok
          ? 'You can rate meals from your week any time.'
          : rating === 'liked'
            ? `${meal} will come back around. Not next week — I don't repeat inside twelve weeks — but it's on the list.`
            : rating === 'liked_adjusted'
              // Deliberately says what happens next: a dish that worked with
              // changes is worth keeping AND worth asking about, and the ask
              // only makes sense if they know the note goes somewhere.
              ? `${meal} is on the list, and I'll remember it needed changing. Tell me what you changed in the app and I'll cook it your way next time.`
              : `${meal} won't be suggested again. Not a variation of it either.`}
      </p>
      <Link href="/this-week" className="text-sm underline" style={{ color: 'var(--green)' }}>
        See this week
      </Link>
    </div>
  );
}

export default function RatedPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
