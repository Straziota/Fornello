import { adminClient } from './supabase-admin';
import { SupabaseClient } from '@supabase/supabase-js';
import { normalizeMenu } from './normalize';
import type {
  HeritageProfile, HeritageProfileRecipe, HeritageProfileRecipeInput, ProfileVisibility,
} from './types';

// ── Helpers ───────────────────────────────────────────────────────────────

function db(client?: SupabaseClient) {
  return client || adminClient;
}

// The `staples` column is a Postgres text[]. To attach a per-staple category without a
// schema change, each element is either a plain name (legacy) or a JSON string
// {"n":name,"c":category}. These helpers convert to/from that on-disk shape.
function decodeStaples(raw: unknown): { names: string[]; categories: Record<string, string> } {
  const names: string[] = [];
  const categories: Record<string, string> = {};
  for (const el of (Array.isArray(raw) ? raw : [])) {
    if (typeof el === 'string' && el.startsWith('{')) {
      try {
        const o = JSON.parse(el);
        if (o && typeof o.n === 'string') {
          names.push(o.n);
          if (o.c) categories[o.n] = o.c;
          continue;
        }
      } catch { /* not JSON — treat as a plain name */ }
    }
    if (typeof el === 'string') names.push(el);
  }
  return { names, categories };
}

function encodeStaples(names: string[], categories?: Record<string, string>): string[] {
  return (names || []).map(name => {
    const cat = categories?.[name];
    return cat ? JSON.stringify({ n: name, c: cat }) : name;
  });
}

// ── Settings ──────────────────────────────────────────────────────────────

export async function getSettings(userId: string) {
  const { data, error } = await adminClient
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) console.error('getSettings error:', error.message);

  if (!data) {
    return {
      familySize: 4, websites: [], preferences: [], restrictions: [],
      schedule: {}, randomizeMealTypes: false,
      randomizePool: [], prepSchedule: { type: 'daily' as const },
      prioritizeMyRecipes: false, fromEmail: '', emailFromName: 'Fornello',
    };
  }

  return {
    familySize: data.family_size ?? 4,
    websites: data.websites ?? [],
    preferences: data.preferences ?? [],
    restrictions: data.restrictions ?? [],
    schedule: data.schedule ?? {},
    randomizeMealTypes: data.randomize_meal_types ?? false,
    randomizePool: data.randomize_pool ?? [],
    prepSchedule: data.prep_schedule ?? { type: 'daily' },
    prioritizeMyRecipes: data.prioritize_my_recipes ?? false,
    fromEmail: data.from_email ?? '',
    emailFromName: data.email_from_name ?? 'Fornello',
    cookingTechniques: data.cooking_techniques ?? [],
    preferredSides: data.preferred_sides ?? [],
    avoidedSides: data.avoided_sides ?? [],
    skipIngredients: [...new Set([...(data.skip_ingredients ?? []), ...(data.disliked_ingredients ?? [])])],
    hasSeenTour: data.has_seen_tour ?? false,
    language: data.language ?? 'English',
    weekStartDay: data.week_start_day ?? 1,
    vacations: data.vacations ?? [],
    staples: decodeStaples(data.staples).names,
    stapleCategories: decodeStaples(data.staples).categories,
  };
}

export async function saveSettings(userId: string, s: {
  familySize: number; websites: string[]; preferences: string[];
  restrictions: string[]; schedule: object;
  randomizeMealTypes: boolean; randomizePool: string[]; prepSchedule: object;
  prioritizeMyRecipes: boolean; fromEmail?: string; emailFromName?: string; cookingTechniques?: string[];
  preferredSides?: string[]; avoidedSides?: string[]; skipIngredients?: string[]; hasSeenTour?: boolean; language?: string; weekStartDay?: number;
  vacations?: { start: string; end: string; note?: string }[];
  staples?: string[];
  stapleCategories?: Record<string, string>;
}) {
  const { error } = await adminClient.from('settings').upsert({
    user_id: userId,
    family_size: s.familySize,
    websites: s.websites,
    preferences: s.preferences,
    restrictions: s.restrictions,
    disliked_ingredients: [],
    schedule: s.schedule,
    randomize_meal_types: s.randomizeMealTypes,
    randomize_pool: s.randomizePool,
    prep_schedule: s.prepSchedule,
    prioritize_my_recipes: s.prioritizeMyRecipes,
    from_email: s.fromEmail ?? '',
    email_from_name: s.emailFromName ?? 'Fornello',
    cooking_techniques: s.cookingTechniques ?? [],
    preferred_sides: s.preferredSides ?? [],
    avoided_sides: s.avoidedSides ?? [],
    skip_ingredients: s.skipIngredients ?? [],
    has_seen_tour: s.hasSeenTour ?? false,
    language: s.language ?? 'English',
    week_start_day: s.weekStartDay ?? 1,
    vacations: s.vacations ?? [],
    staples: encodeStaples(s.staples ?? [], s.stapleCategories),
  }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

// ── Feedback ──────────────────────────────────────────────────────────────

export async function saveFeedback(userId: string, f: { mealName: string; rating: string; adjustments: string }) {
  await adminClient.from('meal_feedback').delete().eq('user_id', userId).eq('meal_name', f.mealName);
  await adminClient.from('meal_feedback').insert({ user_id: userId, meal_name: f.mealName, rating: f.rating, adjustments: f.adjustments });
}

export async function getFeedbackForMeal(userId: string, mealName: string) {
  const { data } = await adminClient.from('meal_feedback').select('*').eq('user_id', userId).eq('meal_name', mealName).maybeSingle();
  if (!data) return null;
  return { mealName: data.meal_name, rating: data.rating, adjustments: data.adjustments };
}

export async function addToNextWeek(userId: string, mealName: string) {
  const latest = await adminClient.from('menus').select('id, data').eq('user_id', userId).order('week_start', { ascending: false }).limit(1).maybeSingle();
  if (!latest?.data) return;
  const id = latest.data.id;
  const menu = latest.data.data as any;
  const picks: string[] = menu.next_week_picks || [];
  if (!picks.includes(mealName)) picks.push(mealName);
  await adminClient.from('menus').update({ data: { ...menu, next_week_picks: picks } }).eq('id', id);
}

export async function getNextWeekPicks(userId: string): Promise<string[]> {
  const latest = await adminClient.from('menus').select('data').eq('user_id', userId).order('week_start', { ascending: false }).limit(1).maybeSingle();
  return (latest?.data?.data as any)?.next_week_picks || [];
}

export async function removeFromNextWeek(userId: string, mealName: string) {
  const latest = await adminClient.from('menus').select('id, data').eq('user_id', userId).order('week_start', { ascending: false }).limit(1).maybeSingle();
  if (!latest?.data) return;
  const id = latest.data.id;
  const menu = latest.data.data as any;
  const picks: string[] = (menu.next_week_picks || []).filter((n: string) => n !== mealName);
  await adminClient.from('menus').update({ data: { ...menu, next_week_picks: picks } }).eq('id', id);
}

export async function getLovedMealNames(userId: string): Promise<string[]> {
  const { data } = await adminClient.from('meal_feedback').select('meal_name').eq('user_id', userId).in('rating', ['loved', 'liked']);
  return (data || []).map((r: any) => r.meal_name);
}

export async function getFeedbackAdjustments(userId: string): Promise<{ name: string; notes: string }[]> {
  const { data } = await adminClient.from('meal_feedback').select('meal_name, adjustments').eq('user_id', userId).neq('adjustments', '');
  return (data || []).filter((r: any) => r.adjustments?.trim()).map((r: any) => ({ name: r.meal_name, notes: r.adjustments.trim() }));
}

export async function getDislikedMealNames(userId: string): Promise<string[]> {
  const { data } = await adminClient.from('meal_feedback').select('meal_name').eq('user_id', userId).eq('rating', 'disliked');
  return (data || []).map((r: any) => r.meal_name);
}

// ── Menus ─────────────────────────────────────────────────────────────────

export async function saveMenu(userId: string, menu: object & { week_start: string }): Promise<number> {
  const clean = normalizeMenu(menu as Record<string, unknown>) as object & { week_start: string };
  const { data: existing } = await adminClient.from('menus').select('id').eq('user_id', userId).eq('week_start', clean.week_start).single();
  if (existing) {
    await adminClient.from('menus').update({ data: clean }).eq('id', existing.id);
    return existing.id;
  }
  const { data } = await adminClient.from('menus').insert({ user_id: userId, week_start: clean.week_start, data: clean }).select('id').single();
  return data!.id;
}

export async function getLatestMenu(userId: string) {
  const { data } = await adminClient.from('menus').select('*').eq('user_id', userId).order('week_start', { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  return { ...data.data, id: data.id, created_at: data.created_at };
}

export async function updateMenuData(userId: string, id: number, menu: object) {
  const clean = normalizeMenu(menu as Record<string, unknown>);
  await adminClient.from('menus').update({ data: clean }).eq('id', id).eq('user_id', userId);
}

export async function updateMealRecipe(userId: string, menuId: number, mealDay: string, recipe: { ingredients: object[]; instructions: string[]; prep_ahead: string[]; sides?: object[] }) {
  const { data } = await adminClient.from('menus').select('data').eq('id', menuId).eq('user_id', userId).maybeSingle();
  if (!data) return;
  const menu = data.data as any;
  const idx = menu.meals.findIndex((m: any) => m.day === mealDay);
  if (idx === -1) return;
  menu.meals[idx] = { ...menu.meals[idx], ...recipe, recipeLoaded: true };
  await adminClient.from('menus').update({ data: normalizeMenu(menu) }).eq('id', menuId);
}

export async function addMealToCurrentMenu(userId: string, meal: object & { day?: string }, targetDay: string) {
  const latest = await getLatestMenu(userId);
  if (!latest) return null;
  const menu = { ...latest };
  const updatedMeal = { ...meal, day: targetDay, recipeLoaded: !!(meal as any).ingredients?.length };
  const idx = menu.meals.findIndex((m: any) => m.day === targetDay);
  if (idx >= 0) { menu.meals[idx] = updatedMeal; } else { menu.meals.push(updatedMeal); }
  await adminClient.from('menus').update({ data: menu }).eq('id', menu.id);
  return menu;
}

export async function getAllMenus(userId: string) {
  const { data } = await adminClient.from('menus').select('*').eq('user_id', userId).order('week_start', { ascending: false });
  return (data || []).map((r: any) => ({ ...r.data, id: r.id, created_at: r.created_at }));
}

export async function deleteMenu(userId: string, id: number) {
  await adminClient.from('menus').delete().eq('id', id).eq('user_id', userId);
}

export async function getRecentMealNames(userId: string, weeksBack = 2): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const { data } = await adminClient.from('menus').select('data').eq('user_id', userId).gte('week_start', cutoff.toISOString().split('T')[0]);
  const names: string[] = [];
  (data || []).forEach((r: any) => (r.data?.meals || []).forEach((m: any) => names.push(m.name)));
  return [...new Set(names)];
}

// ── Pantry ────────────────────────────────────────────────────────────────

export async function getPantry(userId: string) {
  const { data } = await adminClient.from('pantry').select('*').eq('user_id', userId).order('name');
  return (data || []).map((r: any) => ({ id: r.id, name: r.name, quantity: r.quantity, addedAt: r.added_at }));
}

export async function addPantryItem(userId: string, name: string, quantity = '') {
  const { data: existing } = await adminClient.from('pantry').select('id').eq('user_id', userId).ilike('name', name).maybeSingle();
  if (existing) {
    await adminClient.from('pantry').update({ quantity }).eq('id', existing.id);
    return existing.id;
  }
  const { data } = await adminClient.from('pantry').insert({ user_id: userId, name, quantity }).select('id').single();
  return data!.id;
}

export async function removePantryItem(userId: string, id: number) {
  await adminClient.from('pantry').delete().eq('id', id).eq('user_id', userId);
}

export async function getPantryNames(userId: string): Promise<string[]> {
  const { data } = await adminClient.from('pantry').select('name').eq('user_id', userId);
  return (data || []).map((r: any) => r.name);
}

// ── User Recipes ──────────────────────────────────────────────────────────

function rowToRecipe(r: any) {
  return {
    id: r.id, name: r.name, cuisine: r.cuisine, mealType: r.meal_type,
    serves: r.serves, total_time: r.total_time, prep_time: r.prep_time,
    cook_time: r.cook_time, difficulty: r.difficulty, description: r.description,
    tags: r.tags ?? [], ingredients: r.ingredients ?? [],
    instructions: r.instructions ?? [], prep_ahead: r.prep_ahead ?? [],
    source: r.source, photo_url: r.photo_url || '', createdAt: r.created_at,
  };
}

export async function getUserRecipes(userId: string) {
  const { data } = await adminClient.from('user_recipes').select('*').eq('user_id', userId).order('name');
  return (data || []).map(rowToRecipe);
}

export async function getUserRecipe(userId: string, id: number) {
  const { data } = await adminClient.from('user_recipes').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  return data ? rowToRecipe(data) : null;
}

export async function saveUserRecipe(userId: string, recipe: {
  name: string; cuisine: string; mealType: string; serves: number;
  total_time: string; prep_time: string; cook_time: string; difficulty: string;
  description: string; tags: string[]; ingredients: object[];
  instructions: string[]; prep_ahead: string[]; source: string; photo_url?: string;
}) {
  const { data } = await adminClient.from('user_recipes').insert({
    user_id: userId, name: recipe.name, cuisine: recipe.cuisine,
    meal_type: recipe.mealType, serves: recipe.serves,
    total_time: recipe.total_time, prep_time: recipe.prep_time,
    cook_time: recipe.cook_time, difficulty: recipe.difficulty,
    description: recipe.description, tags: recipe.tags,
    ingredients: recipe.ingredients, instructions: recipe.instructions,
    prep_ahead: recipe.prep_ahead, source: recipe.source, photo_url: recipe.photo_url || '',
  }).select('id').single();
  // NOTE: user recipes intentionally do NOT flow into the global library — that's reserved
  // for Fornello-generated recipes to keep the library consistent across families.
  return data!.id;
}

export async function updateUserRecipe(userId: string, id: number, recipe: {
  name: string; cuisine: string; mealType: string; serves: number;
  total_time: string; prep_time: string; cook_time: string; difficulty: string;
  description: string; tags: string[]; ingredients: object[];
  instructions: string[]; prep_ahead: string[]; source: string; photo_url?: string;
}) {
  await adminClient.from('user_recipes').update({
    name: recipe.name, cuisine: recipe.cuisine, meal_type: recipe.mealType,
    serves: recipe.serves, total_time: recipe.total_time, prep_time: recipe.prep_time,
    cook_time: recipe.cook_time, difficulty: recipe.difficulty,
    description: recipe.description, tags: recipe.tags,
    ingredients: recipe.ingredients, instructions: recipe.instructions,
    prep_ahead: recipe.prep_ahead, source: recipe.source, photo_url: recipe.photo_url || '',
  }).eq('id', id).eq('user_id', userId);
}

export async function deleteUserRecipe(userId: string, id: number) {
  await adminClient.from('user_recipes').delete().eq('id', id).eq('user_id', userId);
}

// One-shot helper for the backfill admin endpoint. Pulls every user_recipes row
// across all users with the fields needed to push into global_recipes.
export async function getAllUserRecipesForBackfill() {
  const { data, error } = await adminClient.from('user_recipes').select('*');
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    name: r.name, cuisine: r.cuisine || '', mealType: r.meal_type || '',
    serves: r.serves || 4, total_time: r.total_time || '',
    prep_time: r.prep_time || '', cook_time: r.cook_time || '',
    difficulty: r.difficulty || 'Medium', description: r.description || '',
    tags: r.tags || [], ingredients: r.ingredients || [],
    instructions: r.instructions || [], prep_ahead: r.prep_ahead || [],
    photo_url: r.photo_url || '', source_site: r.source || '',
  }));
}

export async function getUserRecipeSummaries(userId: string) {
  const { data } = await adminClient.from('user_recipes').select('id,name,cuisine,meal_type,total_time,difficulty,serves').eq('user_id', userId).order('name');
  return (data || []).map((r: any) => ({
    id: r.id, name: r.name, cuisine: r.cuisine, mealType: r.meal_type,
    total_time: r.total_time, difficulty: r.difficulty, serves: r.serves,
  }));
}

// ── Recipe Cache ──────────────────────────────────────────────────────────

function rowToCache(r: any) {
  return {
    id: r.id, name: r.name, cuisine: r.cuisine || '', mealType: r.meal_type || '',
    serves: r.serves || 4, total_time: r.total_time || '', prep_time: r.prep_time || '',
    cook_time: r.cook_time || '', difficulty: r.difficulty || 'Easy',
    description: r.description || '', tags: r.tags ?? [],
    ingredients: r.ingredients ?? [], instructions: r.instructions ?? [],
    prep_ahead: r.prep_ahead ?? [], sides: r.sides ?? [],
    photo_url: r.photo_url || '', source_site: r.source_site || '',
    createdAt: r.created_at,
  };
}

export async function saveToRecipeCache(userId: string, meal: any) {
  if (!meal.ingredients?.length || !meal.instructions?.length) return;
  await adminClient.from('recipe_cache').upsert({
    user_id: userId, name: meal.name, cuisine: meal.cuisine || '',
    meal_type: meal.tags?.[0] || meal.mealType || '', serves: meal.serves || 4,
    total_time: meal.total_time || '', prep_time: meal.prep_time || '',
    cook_time: meal.cook_time || '', difficulty: meal.difficulty || 'Easy',
    description: meal.description || '', tags: meal.tags ?? [],
    ingredients: meal.ingredients, instructions: meal.instructions,
    prep_ahead: meal.prep_ahead ?? [], sides: meal.sides ?? [],
    photo_url: meal.photo_url || '', source_site: meal.source_site || meal.source || '',
  }, { onConflict: 'user_id,name' });
}

export async function getCacheEntry(userId: string, name: string) {
  const { data } = await adminClient.from('recipe_cache').select('*')
    .eq('user_id', userId).ilike('name', name).maybeSingle();
  return data ? rowToCache(data) : null;
}

export async function getRecipeCacheSummaries(userId: string) {
  const { data } = await adminClient.from('recipe_cache')
    .select('id,name,cuisine,meal_type,total_time,difficulty,serves')
    .eq('user_id', userId).order('name');
  return (data || []).map((r: any) => ({
    id: r.id, name: r.name, cuisine: r.cuisine, mealType: r.meal_type,
    total_time: r.total_time, difficulty: r.difficulty,
  }));
}

// ── Global Recipes ────────────────────────────────────────────────────────

function rowToGlobal(r: any) {
  return {
    id: r.id, name: r.name, cuisine: r.cuisine || '', mealType: r.meal_type || '',
    serves: r.serves || 4, total_time: r.total_time || '', prep_time: r.prep_time || '',
    cook_time: r.cook_time || '', difficulty: r.difficulty || 'Easy',
    description: r.description || '', tags: r.tags ?? [],
    ingredients: r.ingredients ?? [], instructions: r.instructions ?? [],
    prep_ahead: r.prep_ahead ?? [], sides: r.sides ?? [],
    photo_url: r.photo_url || '', source_site: r.source_site || '',
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export async function getGlobalRecipes() {
  const { data } = await adminClient.from('global_recipes').select('*').order('name');
  return (data || []).map(rowToGlobal);
}

export async function getGlobalRecipe(name: string) {
  const { data } = await adminClient.from('global_recipes').select('*').ilike('name', name).maybeSingle();
  return data ? rowToGlobal(data) : null;
}

export async function getGlobalRecipeById(id: number) {
  const { data } = await adminClient.from('global_recipes').select('*').eq('id', id).maybeSingle();
  return data ? rowToGlobal(data) : null;
}

export async function getGlobalRecipeSummaries() {
  const { data } = await adminClient.from('global_recipes')
    .select('id,name,cuisine,meal_type,total_time,difficulty,serves,category')
    .in('category', ['dinner', 'side'])
    .order('name');
  return (data || []).map((r: any) => ({
    id: r.id, name: r.name, cuisine: r.cuisine, mealType: r.meal_type,
    total_time: r.total_time, difficulty: r.difficulty,
  }));
}

export async function saveGlobalRecipeIfNew(recipe: {
  name: string; cuisine: string; mealType: string; serves: number;
  total_time: string; prep_time: string; cook_time: string; difficulty: string;
  description: string; tags: string[]; ingredients: object[];
  instructions: string[]; prep_ahead: string[]; sides?: object[];
  photo_url?: string; source_site?: string;
  category?: 'dinner' | 'side' | 'dessert' | 'special' | 'tradition';
  origin?: 'generated' | 'imported' | 'admin' | 'heritage' | 'special';
}) {
  const { data: existing } = await adminClient.from('global_recipes')
    .select('id').ilike('name', recipe.name).maybeSingle();
  if (existing) return false;
  const { error: insertError } = await adminClient.from('global_recipes').insert({
    name: recipe.name, cuisine: recipe.cuisine, meal_type: recipe.mealType,
    serves: recipe.serves, total_time: recipe.total_time, prep_time: recipe.prep_time,
    cook_time: recipe.cook_time, difficulty: recipe.difficulty,
    description: recipe.description, tags: recipe.tags,
    ingredients: recipe.ingredients, instructions: recipe.instructions,
    prep_ahead: recipe.prep_ahead, sides: recipe.sides ?? [],
    photo_url: recipe.photo_url || '', source_site: recipe.source_site || '',
    category: recipe.category ?? 'dinner',
    origin: recipe.origin ?? 'generated',
  });
  // Only swallow the unique-name race condition; bubble real schema/constraint errors
  if (insertError && !/duplicate/i.test(insertError.message)) {
    throw new Error(insertError.message);
  }

  // Also save each side as its own global recipe (category='side')
  if (recipe.sides?.length) {
    for (const side of recipe.sides as Array<{ name: string; ingredients?: object[]; instructions?: string[] }>) {
      if (!side?.name || !side.ingredients?.length) continue;
      await saveSideAsGlobalIfNew({
        name: side.name,
        cuisine: recipe.cuisine,
        ingredients: side.ingredients,
        instructions: side.instructions ?? [],
        serves: recipe.serves,
      });
    }
  }
  return true;
}

async function saveSideAsGlobalIfNew(side: {
  name: string; cuisine: string; serves: number;
  ingredients: object[]; instructions: string[];
}) {
  const { data: existing } = await adminClient.from('global_recipes')
    .select('id').ilike('name', side.name).maybeSingle();
  if (existing) return;
  try {
    await adminClient.from('global_recipes').insert({
      name: side.name, cuisine: side.cuisine || '', meal_type: 'side',
      serves: side.serves, total_time: '', prep_time: '', cook_time: '',
      difficulty: 'Easy', description: '', tags: ['side'],
      ingredients: side.ingredients, instructions: side.instructions,
      prep_ahead: [], sides: [],
      photo_url: '', source_site: '',
      category: 'side',
    });
  } catch { /* race condition — ignore */ }
}

export async function saveGlobalRecipe(recipe: {
  name: string; cuisine: string; mealType: string; serves: number;
  total_time: string; prep_time: string; cook_time: string; difficulty: string;
  description: string; tags: string[]; ingredients: object[];
  instructions: string[]; prep_ahead: string[]; sides?: object[];
  photo_url?: string; source_site?: string;
}) {
  const fields = {
    name: recipe.name, cuisine: recipe.cuisine, meal_type: recipe.mealType,
    serves: recipe.serves, total_time: recipe.total_time, prep_time: recipe.prep_time,
    cook_time: recipe.cook_time, difficulty: recipe.difficulty,
    description: recipe.description, tags: recipe.tags,
    ingredients: recipe.ingredients, instructions: recipe.instructions,
    prep_ahead: recipe.prep_ahead, sides: recipe.sides ?? [],
    photo_url: recipe.photo_url || '', source_site: recipe.source_site || '',
  };
  // Upsert by name so admin edits always overwrite the existing entry
  const { data: existing } = await adminClient.from('global_recipes')
    .select('id').ilike('name', recipe.name).maybeSingle();
  if (existing) {
    await adminClient.from('global_recipes').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', existing.id);
    return existing.id;
  }
  const { data } = await adminClient.from('global_recipes').insert(fields).select('id').single();
  return data!.id;
}

export async function updateGlobalRecipe(id: number, recipe: {
  name: string; cuisine: string; mealType: string; serves: number;
  total_time: string; prep_time: string; cook_time: string; difficulty: string;
  description: string; tags: string[]; ingredients: object[];
  instructions: string[]; prep_ahead: string[]; sides?: object[];
  photo_url?: string; source_site?: string;
}) {
  await adminClient.from('global_recipes').update({
    name: recipe.name, cuisine: recipe.cuisine, meal_type: recipe.mealType,
    serves: recipe.serves, total_time: recipe.total_time, prep_time: recipe.prep_time,
    cook_time: recipe.cook_time, difficulty: recipe.difficulty,
    description: recipe.description, tags: recipe.tags,
    ingredients: recipe.ingredients, instructions: recipe.instructions,
    prep_ahead: recipe.prep_ahead, sides: recipe.sides ?? [],
    photo_url: recipe.photo_url || '', source_site: recipe.source_site || '',
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

export async function deleteGlobalRecipe(id: number) {
  await adminClient.from('global_recipes').delete().eq('id', id);
}

// ── Recipe Overrides ──────────────────────────────────────────────────────

export async function getRecipeOverride(userId: string, recipeName: string) {
  const { data } = await adminClient.from('recipe_overrides').select('*')
    .eq('user_id', userId).ilike('recipe_name', recipeName).maybeSingle();
  if (!data) return null;
  return {
    recipeName: data.recipe_name,
    ingredients: data.ingredients ?? [],
    instructions: data.instructions ?? [],
    prep_ahead: data.prep_ahead ?? [],
    sides: data.sides ?? [],
    notes: data.notes || '',
  };
}

export async function saveRecipeOverride(userId: string, recipeName: string, override: {
  ingredients: object[]; instructions: string[]; prep_ahead: string[]; sides?: object[]; notes?: string;
}) {
  await adminClient.from('recipe_overrides').upsert({
    user_id: userId, recipe_name: recipeName,
    ingredients: override.ingredients, instructions: override.instructions,
    prep_ahead: override.prep_ahead, sides: override.sides ?? [],
    notes: override.notes || '', updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,recipe_name' });
}

export async function deleteRecipeOverride(userId: string, recipeName: string) {
  await adminClient.from('recipe_overrides').delete()
    .eq('user_id', userId).ilike('recipe_name', recipeName);
}

// ── Special Occasions ─────────────────────────────────────────────────────

export async function getSpecialOccasions(userId: string) {
  const { data } = await adminClient
    .from('special_occasions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data || []) as {
    id: number; occasion: string; guests: number | null;
    serving_time: string | null; event_date: string | null;
    created_at: string; result: any;
  }[];
}

export async function saveSpecialOccasion(
  userId: string,
  occasion: string,
  guests: number,
  servingTime: string,
  eventDate: string,
  result: object
): Promise<number> {
  const { data } = await adminClient.from('special_occasions').insert({
    user_id: userId,
    occasion,
    guests: guests || null,
    serving_time: servingTime || null,
    event_date: eventDate || null,
    result,
  }).select('id').single();
  return data!.id;
}

export async function deleteSpecialOccasion(userId: string, id: number) {
  await adminClient.from('special_occasions').delete().eq('id', id).eq('user_id', userId);
}

export async function getSpecialOccasion(userId: string, id: number) {
  const { data } = await adminClient
    .from('special_occasions').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  return data;
}

export async function updateSpecialOccasion(userId: string, id: number, result: object) {
  const { error } = await adminClient
    .from('special_occasions').update({ result }).eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// Overwrite an existing occasion in place (used when the user adjusts details
// and regenerates, so they don't accumulate many versions).
export async function replaceSpecialOccasion(
  userId: string, id: number,
  occasion: string, guests: number, servingTime: string, eventDate: string, result: object,
): Promise<boolean> {
  const { data, error } = await adminClient.from('special_occasions')
    .update({ occasion, guests: guests || null, serving_time: servingTime || null, event_date: eventDate || null, result })
    .eq('id', id).eq('user_id', userId).select('id');
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

// ── User Feedback ─────────────────────────────────────────────────────────

export async function saveUserFeedback(
  userId: string,
  feedback: { email?: string; category?: string; message: string }
) {
  const { error } = await adminClient.from('user_feedback').insert({
    user_id: userId,
    email: feedback.email || null,
    category: feedback.category || null,
    message: feedback.message,
    status: 'new',
  });
  if (error) throw new Error(error.message);
}

export async function getAllUserFeedback() {
  const { data, error } = await adminClient
    .from('user_feedback')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateFeedbackStatus(id: number, status: 'new' | 'read' | 'archived') {
  const { error } = await adminClient.from('user_feedback').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteUserFeedback(id: number) {
  const { error } = await adminClient.from('user_feedback').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Heritage Kitchens (admin-managed registry of grandmother kitchens) ────

export interface HeritageKitchenRow {
  id: number;
  slug: string;
  contributor: string;
  name: string;
  country: string;
  image_url: string;
  href: string | null;
  display_order: number;
}

export async function getHeritageKitchens(): Promise<HeritageKitchenRow[]> {
  const { data, error } = await adminClient
    .from('heritage_kitchens')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name');
  if (error) throw new Error(error.message);
  return (data as HeritageKitchenRow[]) || [];
}

export async function getHeritageKitchenBySlug(slug: string): Promise<HeritageKitchenRow | null> {
  const { data } = await adminClient
    .from('heritage_kitchens')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  return data as HeritageKitchenRow | null;
}

export async function saveHeritageKitchen(k: {
  slug: string; contributor: string; name: string; country: string;
  image_url: string; href?: string | null; display_order?: number;
}) {
  const { error } = await adminClient.from('heritage_kitchens').upsert({
    slug: k.slug.toLowerCase(),
    contributor: k.contributor.trim(),
    name: k.name.trim(),
    country: k.country.trim(),
    image_url: k.image_url,
    href: k.href || null,
    display_order: k.display_order ?? 0,
  }, { onConflict: 'slug' });
  if (error) throw new Error(error.message);
}

export async function deleteHeritageKitchen(slug: string) {
  const { error } = await adminClient.from('heritage_kitchens').delete().eq('slug', slug);
  if (error) throw new Error(error.message);
}

// ── Heritage Contributors ─────────────────────────────────────────────────

export async function getHeritageContributors() {
  const { data, error } = await adminClient
    .from('heritage_contributors')
    .select('*')
    .order('added_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function isHeritageContributor(email: string): Promise<boolean> {
  if (!email) return false;
  const { data } = await adminClient
    .from('heritage_contributors')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return !!data;
}

export async function getContributorByEmail(email: string): Promise<{ email: string; display_name: string | null; note: string | null; kitchen_slug: string | null } | null> {
  if (!email) return null;
  const { data } = await adminClient
    .from('heritage_contributors')
    .select('email, display_name, note, kitchen_slug')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return data || null;
}

export async function addHeritageContributor(email: string, displayName: string, kitchenSlug: string | null, note?: string) {
  const { error } = await adminClient.from('heritage_contributors').upsert(
    {
      email: email.toLowerCase(),
      display_name: displayName.trim() || null,
      kitchen_slug: kitchenSlug || null,
      note: note?.trim() || null,
    },
    { onConflict: 'email' }
  );
  if (error) throw new Error(error.message);
}

export async function removeHeritageContributor(email: string) {
  const { error } = await adminClient.from('heritage_contributors').delete().eq('email', email.toLowerCase());
  if (error) throw new Error(error.message);
}

// ── Heritage Submissions ──────────────────────────────────────────────────

export async function saveHeritageSubmission(userId: string, s: {
  submitter_email?: string;
  contributor_name: string;
  kitchen_slug?: string | null;
  recipe_name: string;
  cuisine?: string;
  cultural_background?: string;
  ingredients: string;
  instructions: string;
  wisdom?: string;
}) {
  const { error } = await adminClient.from('heritage_submissions').insert({
    user_id: userId,
    submitter_email: s.submitter_email || null,
    contributor_name: s.contributor_name,
    kitchen_slug: s.kitchen_slug || null,
    recipe_name: s.recipe_name,
    cuisine: s.cuisine || null,
    cultural_background: s.cultural_background || null,
    ingredients: s.ingredients,
    instructions: s.instructions,
    wisdom: s.wisdom || null,
    status: 'pending',
  });
  if (error) throw new Error(error.message);
}

export async function getAllHeritageSubmissions() {
  const { data, error } = await adminClient
    .from('heritage_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateHeritageSubmissionStatus(id: number, status: 'pending' | 'approved' | 'rejected') {
  const { error } = await adminClient.from('heritage_submissions').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteHeritageSubmission(id: number) {
  const { error } = await adminClient.from('heritage_submissions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Family Kitchens: user-created dedicated profiles ───────────────────────
// Owner-scoped (separate from the admin-curated heritage_kitchens/template_recipes).
// Private by default; a profile becomes gallery-visible at visibility='public'.

function slugifyPersonName(name: string): string {
  const base = name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'kitchen';
  // Always append a short random suffix so slugs are unique without a lookup loop.
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

function mapProfileRow(row: any): HeritageProfile {
  // Supabase can embed an aggregate as heritage_profile_recipes: [{ count: N }]
  const agg = Array.isArray(row.heritage_profile_recipes) ? row.heritage_profile_recipes[0] : null;
  return {
    id: row.id,
    owner_id: row.owner_id,
    slug: row.slug,
    person_name: row.person_name,
    relationship: row.relationship,
    origin_country: row.origin_country,
    portrait_url: row.portrait_url,
    bio: row.bio,
    visibility: row.visibility,
    created_at: row.created_at,
    updated_at: row.updated_at,
    recipe_count: agg ? Number(agg.count) : undefined,
  };
}

function mapProfileRecipeRow(row: any): HeritageProfileRecipe {
  return {
    id: row.id,
    profile_id: row.profile_id,
    owner_id: row.owner_id,
    name: row.name,
    cuisine: row.cuisine,
    meal_type: row.meal_type,
    serves: row.serves,
    total_time: row.total_time,
    prep_time: row.prep_time,
    cook_time: row.cook_time,
    difficulty: row.difficulty,
    description: row.description,
    tags: Array.isArray(row.tags) ? row.tags : [],
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    instructions: Array.isArray(row.instructions) ? row.instructions : [],
    prep_ahead: Array.isArray(row.prep_ahead) ? row.prep_ahead : [],
    nonna_wisdom: Array.isArray(row.nonna_wisdom) ? row.nonna_wisdom : [],
    original_scan_url: row.original_scan_url,
    photo_url: row.photo_url,
    transcription_status: row.transcription_status || 'none',
    display_order: row.display_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createHeritageProfile(ownerId: string, input: {
  person_name: string; relationship?: string; origin_country?: string;
  portrait_url?: string; bio?: string;
}): Promise<HeritageProfile> {
  const { data, error } = await adminClient.from('heritage_profiles').insert({
    owner_id: ownerId,
    slug: slugifyPersonName(input.person_name),
    person_name: input.person_name.trim(),
    relationship: input.relationship?.trim() || null,
    origin_country: input.origin_country?.trim() || null,
    portrait_url: input.portrait_url || null,
    bio: input.bio?.trim() || null,
  }).select('*').single();
  if (error) throw new Error(error.message);
  return mapProfileRow(data);
}

export async function getHeritageProfilesByOwner(ownerId: string): Promise<HeritageProfile[]> {
  const { data, error } = await adminClient
    .from('heritage_profiles')
    .select('*, heritage_profile_recipes(count)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapProfileRow);
}

export async function getPublicHeritageProfiles(): Promise<HeritageProfile[]> {
  const { data, error } = await adminClient
    .from('heritage_profiles')
    .select('*, heritage_profile_recipes(count)')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapProfileRow);
}

export async function getHeritageProfileBySlug(slug: string): Promise<HeritageProfile | null> {
  const { data } = await adminClient
    .from('heritage_profiles')
    .select('*, heritage_profile_recipes(count)')
    .eq('slug', slug)
    .maybeSingle();
  return data ? mapProfileRow(data) : null;
}

export async function updateHeritageProfile(ownerId: string, id: string, patch: {
  person_name?: string; relationship?: string | null; origin_country?: string | null;
  portrait_url?: string | null; bio?: string | null; visibility?: ProfileVisibility;
}): Promise<HeritageProfile> {
  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.person_name !== undefined) fields.person_name = patch.person_name.trim();
  if (patch.relationship !== undefined) fields.relationship = patch.relationship?.toString().trim() || null;
  if (patch.origin_country !== undefined) fields.origin_country = patch.origin_country?.toString().trim() || null;
  if (patch.portrait_url !== undefined) fields.portrait_url = patch.portrait_url || null;
  if (patch.bio !== undefined) fields.bio = patch.bio?.toString().trim() || null;
  if (patch.visibility !== undefined) fields.visibility = patch.visibility;

  const { data, error } = await adminClient
    .from('heritage_profiles')
    .update(fields)
    .eq('id', id)
    .eq('owner_id', ownerId) // owner scope enforced in code
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Profile not found');
  return mapProfileRow(data);
}

export async function deleteHeritageProfile(ownerId: string, id: string): Promise<void> {
  const { error } = await adminClient
    .from('heritage_profiles')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
}

// ── Family Kitchen recipes ─────────────────────────────────────────────────

export async function getHeritageProfileRecipes(profileId: string): Promise<HeritageProfileRecipe[]> {
  const { data, error } = await adminClient
    .from('heritage_profile_recipes')
    .select('*')
    .eq('profile_id', profileId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapProfileRecipeRow);
}

export async function getHeritageProfileRecipeById(id: string): Promise<HeritageProfileRecipe | null> {
  const { data } = await adminClient
    .from('heritage_profile_recipes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? mapProfileRecipeRow(data) : null;
}

function recipeInputToRow(input: HeritageProfileRecipeInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const setIf = (k: string, v: unknown) => { if (v !== undefined) row[k] = v; };
  setIf('name', input.name?.trim());
  setIf('cuisine', input.cuisine?.trim() || null);
  setIf('meal_type', input.meal_type?.trim() || null);
  setIf('serves', input.serves ?? null);
  setIf('total_time', input.total_time?.trim() || null);
  setIf('prep_time', input.prep_time?.trim() || null);
  setIf('cook_time', input.cook_time?.trim() || null);
  setIf('difficulty', input.difficulty?.trim() || null);
  setIf('description', input.description?.trim() || null);
  setIf('tags', input.tags ?? undefined);
  setIf('ingredients', input.ingredients ?? undefined);
  setIf('instructions', input.instructions ?? undefined);
  setIf('prep_ahead', input.prep_ahead ?? undefined);
  setIf('nonna_wisdom', input.nonna_wisdom ?? undefined);
  setIf('original_scan_url', input.original_scan_url ?? undefined);
  setIf('photo_url', input.photo_url ?? undefined);
  setIf('transcription_status', input.transcription_status ?? undefined);
  return row;
}

export async function addHeritageProfileRecipe(
  ownerId: string, profileId: string, input: HeritageProfileRecipeInput,
): Promise<HeritageProfileRecipe> {
  // Confirm the profile belongs to this owner before attaching a recipe to it.
  const { data: profile } = await adminClient
    .from('heritage_profiles').select('id').eq('id', profileId).eq('owner_id', ownerId).maybeSingle();
  if (!profile) throw new Error('Profile not found');

  const { data, error } = await adminClient
    .from('heritage_profile_recipes')
    .insert({ profile_id: profileId, owner_id: ownerId, ...recipeInputToRow(input) })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return mapProfileRecipeRow(data);
}

export async function updateHeritageProfileRecipe(
  ownerId: string, id: string, patch: Partial<HeritageProfileRecipeInput>,
): Promise<HeritageProfileRecipe> {
  const { data, error } = await adminClient
    .from('heritage_profile_recipes')
    .update({ ...recipeInputToRow(patch as HeritageProfileRecipeInput), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Recipe not found');
  return mapProfileRecipeRow(data);
}

export async function deleteHeritageProfileRecipe(ownerId: string, id: string): Promise<void> {
  const { error } = await adminClient
    .from('heritage_profile_recipes')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
}
