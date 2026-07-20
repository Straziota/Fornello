'use client';
import { useEffect, useState, use } from 'react';
import RecipeForm from '@/components/RecipeForm';

export default function AdminEditHeritagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [initial, setInitial] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/heritage/${id}`).then(async r => {
      if (r.status === 404) { setNotFound(true); return; }
      if (!r.ok) return;
      const d = await r.json();
      setInitial({
        name: d.name, cuisine: d.cuisine, mealType: d.meal_type, serves: d.serves,
        total_time: d.total_time, prep_time: d.prep_time, cook_time: d.cook_time,
        difficulty: d.difficulty, description: d.description, source: d.source,
        tags: d.tags || [], ingredients: d.ingredients || [],
        instructions: d.instructions || [], prep_ahead: d.prep_ahead || [],
        photo_url: d.photo_url || '',
        contributor: d.contributor || '', background: d.background || '',
        nonna_wisdom: d.nonna_wisdom || [],
      });
    });
  }, [id]);

  if (notFound) return (
    <div className="text-center py-20">
      <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>Recipe not found</h2>
    </div>
  );

  if (!initial) return (
    <p className="italic text-center py-20" style={{ color: 'var(--text-3)' }}>Loading…</p>
  );

  return (
    <RecipeForm
      title={`Edit: ${initial.name}`}
      heritage
      redirectTo="/admin/heritage"
      initial={initial}
      onSave={async recipe => {
        const res = await fetch(`/api/admin/heritage/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: recipe.name, cuisine: recipe.cuisine, mealType: recipe.mealType,
            serves: recipe.serves, total_time: recipe.total_time, prep_time: recipe.prep_time,
            cook_time: recipe.cook_time, difficulty: recipe.difficulty,
            description: recipe.description, tags: recipe.tags,
            ingredients: recipe.ingredients, instructions: recipe.instructions,
            prep_ahead: recipe.prep_ahead, source: recipe.source,
            photo_url: recipe.photo_url || '',
            contributor: (recipe as any).contributor,
            background: (recipe as any).background,
            nonna_wisdom: (recipe as any).nonna_wisdom,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to save');
        }
      }}
    />
  );
}
