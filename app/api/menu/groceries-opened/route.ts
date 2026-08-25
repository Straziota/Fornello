import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { recordGroceriesOpened } from '@/lib/signals';

// The groceries page loads its data from /api/menu, which This Week also uses,
// so opening the shopping list is invisible in the request log. This is the
// smallest honest way to see it: one ping from that page, recorded once per
// week's menu.
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { menuId } = await req.json().catch(() => ({ menuId: null }));
  if (typeof menuId === 'number') recordGroceriesOpened(user!.id, menuId);
  return NextResponse.json({ ok: true });
}
