'use client';
import { use } from 'react';
import RecipeView from '@/components/routes/RecipeView';

// Website route. The app cannot use this shape — a static export has no list of
// ids to prerender — so scripts/build-app.mjs stubs this file for the app
// build and the app renders the ?id= twin instead. Same component either way.
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RecipeView id={id} />;
}
