'use client';
import RecipeForm from '@/components/RecipeForm';

export default function AdminNewHeritagePage() {
  return (
    <RecipeForm
      title="Add a Heritage Recipe"
      heritage
      redirectTo="/admin/heritage"
      onSave={async recipe => {
        const res = await fetch('/api/admin/heritage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: recipe.name, cuisine: recipe.cuisine, mealType: recipe.mealType,
            serves: recipe.serves, total_time: recipe.total_time, prep_time: recipe.prep_time,
            cook_time: recipe.cook_time, difficulty: recipe.difficulty,
            description: recipe.description, tags: recipe.tags,
            ingredients: recipe.ingredients, instructions: recipe.instructions,
            prep_ahead: recipe.prep_ahead, source: recipe.source,
            photo_url: recipe.photo_url || '',
            // Heritage-specific
            contributor: (recipe as any).contributor,
            kitchen_slug: (recipe as any).kitchen_slug,
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
