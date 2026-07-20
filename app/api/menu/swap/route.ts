import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getLatestMenu, updateMenuData } from '@/lib/db';
import { Meal } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { menuId, dayA, dayB } = await req.json();
  const menu = await getLatestMenu(user!.id);
  if (!menu) return NextResponse.json({ error: 'No menu' }, { status: 404 });

  const meals: Meal[] = menu.meals || [];
  const idxA = meals.findIndex(m => m.day === dayA);
  const idxB = meals.findIndex(m => m.day === dayB);
  if (idxA === -1 || idxB === -1) return NextResponse.json({ error: 'Day not found' }, { status: 400 });

  const updated = meals.map((m, i) => {
    if (i === idxA) return { ...meals[idxB], day: dayA };
    if (i === idxB) return { ...meals[idxA], day: dayB };
    return m;
  });

  await updateMenuData(user!.id, menuId, { ...menu, meals: updated });
  return NextResponse.json({ meals: updated });
}
