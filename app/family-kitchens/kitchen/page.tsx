'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import FamilyKitchen from '@/components/routes/FamilyKitchen';

function Inner() {
  const slug = useSearchParams().get('slug');
  if (!slug) return null;
  return <FamilyKitchen slug={slug} />;
}

// One static file that reads the slug at runtime, so the app can reach any
// slug without it having existed at build time. useSearchParams needs a
// Suspense boundary to prerender.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
