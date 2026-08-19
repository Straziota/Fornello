'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RecipeView from '@/components/routes/RecipeView';

function Inner() {
  const id = useSearchParams().get('id');
  if (!id) return null;
  return <RecipeView id={id} />;
}

// One static file that reads the id at runtime, so the app can reach any
// id without it having existed at build time. useSearchParams needs a
// Suspense boundary to prerender.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
