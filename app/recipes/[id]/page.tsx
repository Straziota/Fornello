'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import RecipeForm from '@/components/RecipeForm';
import { UserRecipe } from '@/lib/types';

export default function EditRecipePage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState<UserRecipe | null>(null);

  useEffect(() => {
    fetch(`/api/recipes/${id}`).then(r => r.json()).then(setRecipe);
  }, [id]);

  const handleSave = async (updated: any) => {
    const res = await fetch(`/api/recipes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error('Failed to update recipe');
  };

  if (!recipe) return (
    <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>
  );

  return <RecipeForm title={`Edit: ${recipe.name}`} initial={recipe} onSave={handleSave} />;
}
