import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getLatestMenu, getSettings, deleteMenu } from '@/lib/db';

function currentWeekStart(startDay: number) {
  const today = new Date();
  const diff = ((today.getDay() - startDay) % 7 + 7) % 7;
  const d = new Date(today);
  d.setDate(today.getDate() - diff);
  return d.toISOString().split('T')[0];
}

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  const [menu, settings] = await Promise.all([
    getLatestMenu(user!.id),
    getSettings(user!.id),
  ]);
  if (!menu) return NextResponse.json(null);
  const startDay = (settings as any).weekStartDay ?? 1;
  // Menu is current if its week_start is this week or the upcoming week (pre-generated)
  if (menu.week_start < currentWeekStart(startDay)) return NextResponse.json(null);
  return NextResponse.json(menu);
}

export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await req.json();
  await deleteMenu(user!.id, id);
  return NextResponse.json({ ok: true });
}
