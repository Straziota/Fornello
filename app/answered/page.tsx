'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function Inner() {
  const yes = useSearchParams().get('a') === 'yes';
  return (
    <div className="max-w-md mx-auto py-20 text-center">
      <div className="text-5xl mb-4">{yes ? '🍽' : '👋'}</div>
      <h1 className="text-3xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>
        {yes ? 'Good — they keep coming' : 'Stopped'}
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
        {yes
          ? "Your week will arrive the day before it starts, as before."
          : "No more weekly plans. Your recipes, kitchens and history are all still here — nothing else changed, and you can turn them back on whenever you like."}
      </p>
      <Link href="/this-week" className="text-sm underline" style={{ color: 'var(--green)' }}>
        Open Fornello
      </Link>
    </div>
  );
}

export default function AnsweredPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
