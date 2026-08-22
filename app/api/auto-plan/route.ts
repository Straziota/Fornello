import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';

// Turning auto-planning on or off. Opting in also clears any pause and resets
// the ignored streak — saying yes again is a fresh start, not a resumption of
// whatever made us stop.
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { enabled } = await req.json();
  const { error: e } = await adminClient.from('settings').update({
    auto_plan: !!enabled,
    auto_plan_paused: false,
    auto_plan_ignored: 0,
    // Stamped on BOTH answers. Declining cannot be inferred from auto_plan,
    // which defaults to false — without this, "no thanks" is indistinguishable
    // from never having been asked, and we would ask again on the next device.
    auto_plan_offer_answered_at: new Date().toISOString(),
  }).eq('user_id', user!.id);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true, autoPlan: !!enabled });
}
