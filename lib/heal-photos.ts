import { adminClient } from './supabase-admin';

/**
 * Fill in any illustration a menu is missing, from the library, on read.
 *
 * The generation path attaches illustrations after the response has been sent,
 * which is right — nobody should wait on an image API to see their week — but
 * it means the write can fail in ways the request never learns about: a frozen
 * function, a slow lookup, a later pass overwriting the row. All three happened.
 *
 * So this does not trust that path. Every time a menu is read, any meal without
 * a photo is matched against the library and repaired in place. It is a map
 * lookup against names, costs one query, and converges: once a meal has its
 * illustration there is nothing left to do. A menu that was generated wrong is
 * correct the next time anyone opens it, without a cron, a backfill, or anyone
 * noticing it was ever wrong.
 *
 * It only ever FILLS a gap — an existing photo is never replaced — so it cannot
 * undo a deliberate choice, and it never generates: if the library has nothing,
 * the meal keeps its parchment tile and stays visibly empty.
 */
export async function healMenuPhotos(
  userId: string,
  menu: { id?: number; meals?: any[] } | null,
): Promise<typeof menu> {
  const meals = menu?.meals;
  if (!menu?.id || !Array.isArray(meals)) return menu;

  const missing = meals.filter(m => m && !m.isLeftover && !m.photo_url && m.name);
  if (!missing.length) return menu;

  try {
    const db = adminClient;
    const { data } = await db
      .from('global_recipes')
      .select('name, photo_url')
      .in('name', missing.map(m => m.name));

    const byName = new Map(
      (data || [])
        .filter(r => r.photo_url)
        .map(r => [String(r.name).toLowerCase().trim(), r.photo_url as string]),
    );
    if (!byName.size) return menu;

    let healed = 0;
    for (const meal of meals) {
      if (meal?.isLeftover || meal?.photo_url || !meal?.name) continue;
      const url = byName.get(String(meal.name).toLowerCase().trim());
      if (url) { meal.photo_url = url; healed++; }
    }
    if (!healed) return menu;

    // Read-modify-write on the row we just read. Worst case two readers heal the
    // same menu to the same values, which is harmless.
    const { data: row } = await db.from('menus').select('data').eq('id', menu.id).eq('user_id', userId).maybeSingle();
    if (row?.data) {
      await db.from('menus')
        .update({ data: { ...row.data, meals } })
        .eq('id', menu.id).eq('user_id', userId);
    }
    console.log(`[heal-photos] menu ${menu.id}: filled ${healed} illustration(s)`);
  } catch (e) {
    // Never block a menu on this. A missing picture is a smaller problem than a
    // week that will not load.
    console.error('[heal-photos] failed:', (e as Error).message);
  }
  return menu;
}
