'use client';
import { useRouter } from 'next/navigation';
import RecipeForm from '@/components/RecipeForm';

export default function AdminNewRecipePage() {
  const router = useRouter();
  return (
    <RecipeForm
      title="Add to Global Library"
      redirectTo="/admin/recipes"
      onSave={async recipe => {
        const res = await fetch('/api/admin/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: recipe.name, cuisine: recipe.cuisine, mealType: recipe.mealType,
            serves: recipe.serves, total_time: recipe.total_time, prep_time: recipe.prep_time,
            cook_time: recipe.cook_time, difficulty: recipe.difficulty,
            description: recipe.description, tags: recipe.tags,
            ingredients: recipe.ingredients, instructions: recipe.instructions,
            prep_ahead: recipe.prep_ahead, source_site: recipe.source,
            photo_url: recipe.photo_url || '',
          }),
        });
        if (!res.ok) throw new Error('Failed to save');
        router.push('/admin/recipes');
      }}
    />
  );
}
