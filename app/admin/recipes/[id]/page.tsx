'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import RecipeForm from '@/components/RecipeForm';
import { UserRecipe } from '@/lib/types';

export default function AdminEditRecipePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Partial<UserRecipe> | null>(null);

  useEffect(() => {
    fetch(`/api/admin/recipes/${id}`)
      .then(r => {
        if (r.status === 403) { router.push('/'); return null; }
        return r.json();
      })
      .then(d => d && setRecipe({ ...d, mealType: d.mealType || 'Any', source: d.source_site || '' }));
  }, [id]);

  if (!recipe) return <div className="text-center py-20" style={{ color: 'var(--text-2)' }}>Loading…</div>;

  return (
    <RecipeForm
      title="Edit Global Recipe"
      initial={recipe}
      onSave={async updated => {
        const res = await fetch(`/api/admin/recipes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updated.name, cuisine: updated.cuisine, mealType: updated.mealType,
            serves: updated.serves, total_time: updated.total_time, prep_time: updated.prep_time,
            cook_time: updated.cook_time, difficulty: updated.difficulty,
            description: updated.description, tags: updated.tags,
            ingredients: updated.ingredients, instructions: updated.instructions,
            prep_ahead: updated.prep_ahead, source_site: updated.source,
            photo_url: updated.photo_url || '',
          }),
        });
        if (!res.ok) throw new Error('Failed to update');
        router.push('/admin/recipes');
      }}
    />
  );
}
