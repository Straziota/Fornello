import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { saveUserRecipe } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const recipe = await req.json();
  const id = await saveUserRecipe(user!.id, {
    name: recipe.name,
    cuisine: recipe.cuisine || '',
    mealType: '',
    serves: recipe.serves || 4,
    total_time: recipe.total_time || '',
    prep_time: recipe.prep_time || '',
    cook_time: recipe.cook_time || '',
    difficulty: recipe.difficulty || 'Medium',
    description: recipe.description || '',
    tags: [],
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
    prep_ahead: recipe.prep_ahead || [],
    source: 'On the Fly',
  });
  return NextResponse.json({ id });
}
