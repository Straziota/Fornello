'use client';
import RecipeForm from '@/components/RecipeForm';

export default function NewRecipePage() {
  const handleSave = async (recipe: any) => {
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    if (!res.ok) throw new Error('Failed to save recipe');
  };

  return <RecipeForm title="Add Recipe" onSave={handleSave} />;
}
