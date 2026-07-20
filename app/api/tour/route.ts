import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/db';

export async function POST() {
  const { user, error } = await requireUser();
  if (error) return error;
  const settings = await getSettings(user!.id);
  await saveSettings(user!.id, { ...settings, hasSeenTour: true } as any);
  return NextResponse.json({ ok: true });
}
