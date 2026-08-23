import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/db';
import { getAnthropicKey } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';
import { normalizeOnSave } from '@/lib/normalize-restrictions';

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  const s = await getSettings(user!.id);
  return NextResponse.json(s);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const body = await req.json();
    // Merge with existing settings so fields the client omits (like hasSeenTour, which
    // the settings page doesn't manage) are preserved instead of reset to defaults.
    const existing = await getSettings(user!.id);
    const merged = { ...existing, ...body };

    // Allergies are the one free-text field where a typo has a consequence, so
    // they get rewritten into matchable ingredient names on the way in rather
    // than waiting for someone to press a button asking us to check.
    let correction = null;
    if (Array.isArray(body.restrictions)) {
      const out = await normalizeOnSave(getAnthropicKey(), body.restrictions, existing.restrictions || []);
      merged.restrictions = out.restrictions;
      correction = out.correction;
    }

    await saveSettings(user!.id, merged);
    if (correction) {
      await adminClient.from('settings')
        .update({ restrictions_corrected: correction }).eq('user_id', user!.id);
    }
    return NextResponse.json({ ok: true, restrictions: merged.restrictions, corrected: !!correction });
  } catch (e: any) {
    console.error('saveSettings failed:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
