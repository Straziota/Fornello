import { NextRequest, NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';

async function requireAdmin() {
  const ok = await checkIsAdmin();
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET() {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { data, error } = await adminClient
    .from('template_recipes')
    .select('id, name, cuisine, contributor, meal_type, total_time, difficulty, photo_url')
    .order('contributor', { ascending: true, nullsFirst: false })
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recipes: data || [] });
}

export async function POST(req: NextRequest) {
  const deny = await requireAdmin();
  if (deny) return deny;

  const r = await req.json();
  if (!r.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  if (!r.contributor?.trim()) return NextResponse.json({ error: 'Contributor required' }, { status: 400 });

  const { data, error } = await adminClient.from('template_recipes').insert({
    name: r.name, cuisine: r.cuisine || '', meal_type: r.mealType || '',
    serves: r.serves || 4, total_time: r.total_time || '',
    prep_time: r.prep_time || '', cook_time: r.cook_time || '',
    difficulty: r.difficulty || 'Medium', description: r.description || '',
    tags: r.tags || [], ingredients: r.ingredients || [],
    instructions: r.instructions || [], prep_ahead: r.prep_ahead || [],
    source: r.source || '', photo_url: r.photo_url || '',
    background: r.background || '', nonna_wisdom: r.nonna_wisdom || [],
    contributor: r.contributor,
    kitchen_slug: r.kitchen_slug || null,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await adminClient.from('template_recipes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
