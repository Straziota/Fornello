import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/db';

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
    await saveSettings(user!.id, { ...existing, ...body });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('saveSettings failed:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
