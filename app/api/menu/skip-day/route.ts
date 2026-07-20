import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getLatestMenu, updateMenuData } from '@/lib/db';
import { Meal } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { menuId, index, day, name } = await req.json();
  if (typeof index !== 'number') {
    return NextResponse.json({ error: 'index required' }, { status: 400 });
  }

  const menu = await getLatestMenu(user!.id);
  if (!menu) return NextResponse.json({ error: 'No menu' }, { status: 404 });

  const meals: Meal[] = menu.meals || [];
  if (index < 0 || index >= meals.length) {
    return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
  }

  // Safety check: make sure the meal at this index matches what the client thinks it's removing.
  // If not, something has drifted — bail out rather than risk removing the wrong day.
  const target = meals[index];
  if ((day && target.day !== day) || (name && target.name !== name)) {
    return NextResponse.json({
      error: 'Menu has changed since this view — please refresh and try again.',
      expected: { day, name },
      found: { day: target.day, name: target.name },
    }, { status: 409 });
  }

  const next = meals.filter((_, i) => i !== index);
  await updateMenuData(user!.id, menuId, { ...menu, meals: next });
  return NextResponse.json({ meals: next });
}
