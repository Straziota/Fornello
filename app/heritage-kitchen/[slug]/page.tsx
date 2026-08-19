'use client';
import { use } from 'react';
import HeritageKitchen from '@/components/routes/HeritageKitchen';

// Website route. The app cannot use this shape — a static export has no list of
// slugs to prerender — so scripts/build-app.mjs stubs this file for the app
// build and the app renders the ?slug= twin instead. Same component either way.
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <HeritageKitchen slug={slug} />;
}
