import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';

// Marks the correction notice as seen. Kept rather than deleted, so there is a
// record that a household's allergy entry was changed and acknowledged.
export async function POST() {
  const { user, error } = await requireUser();
  if (error) return error;
  const { data } = await adminClient
    .from('settings').select('restrictions_corrected').eq('user_id', user!.id).maybeSingle();
  const cur = (data?.restrictions_corrected as any) || {};
  await adminClient.from('settings')
    .update({ restrictions_corrected: { ...cur, acknowledged: true, acknowledgedAt: new Date().toISOString() } })
    .eq('user_id', user!.id);
  return NextResponse.json({ ok: true });
}
