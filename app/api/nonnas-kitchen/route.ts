import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  // Nonna's Kitchen shows only recipes contributed by Nonna Ingrid
  const { data } = await adminClient
    .from('template_recipes')
    .select('*')
    .eq('contributor', 'Nonna Ingrid')
    .order('name');
  return NextResponse.json(data || []);
}
