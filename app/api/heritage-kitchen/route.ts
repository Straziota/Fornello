import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';

// GET /api/heritage-kitchen                  → all heritage recipes (Nonna Ingrid excluded)
// GET /api/heritage-kitchen?kitchen=<slug>    → only recipes in that kitchen
// GET /api/heritage-kitchen?contributor=<X>   → legacy: filter by exact contributor
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const kitchen = req.nextUrl.searchParams.get('kitchen');
  const contributor = req.nextUrl.searchParams.get('contributor');
  let query = adminClient.from('template_recipes').select('*').order('name');
  if (kitchen) {
    query = query.eq('kitchen_slug', kitchen);
  } else if (contributor) {
    query = query.eq('contributor', contributor);
  } else {
    query = query.neq('contributor', 'Nonna Ingrid');
  }
  const { data } = await query;
  return NextResponse.json(data || []);
}
