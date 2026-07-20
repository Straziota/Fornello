import { NextRequest, NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';

async function requireAdmin() {
  const ok = await checkIsAdmin();
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { id } = await params;
  const { data, error } = await adminClient
    .from('template_recipes')
    .select('*')
    .eq('id', Number(id))
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { id } = await params;
  const r = await req.json();

  const { error } = await adminClient.from('template_recipes').update({
    name: r.name, cuisine: r.cuisine || '', meal_type: r.mealType || '',
    serves: r.serves || 4, total_time: r.total_time || '',
    prep_time: r.prep_time || '', cook_time: r.cook_time || '',
    difficulty: r.difficulty || 'Medium', description: r.description || '',
    tags: r.tags || [], ingredients: r.ingredients || [],
    instructions: r.instructions || [], prep_ahead: r.prep_ahead || [],
    source: r.source || '', photo_url: r.photo_url || '',
    background: r.background || '', nonna_wisdom: r.nonna_wisdom || [],
    contributor: r.contributor || null,
  }).eq('id', Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
