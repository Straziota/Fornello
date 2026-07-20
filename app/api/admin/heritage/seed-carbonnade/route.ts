import { NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';

// One-shot seed for Grandma Betty's Carbonnade à la Flamande, with two cooking
// variants (oven + slow cooker). Idempotent — checks for existing row by name.
export async function POST() {
  const ok = await checkIsAdmin();
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const name = 'Carbonnade à la Flamande';
  // If a row already exists (e.g. from a previous run with the wrong contributor),
  // delete it so we can re-seed with the corrected data.
  await adminClient.from('template_recipes').delete().ilike('name', name);

  const ingredients = [
    { amount: '3 lb', item: 'chuck roast or rump roast' },
    { amount: '4 Tbsp', item: 'olive oil' },
    { amount: '3 Tbsp', item: 'butter' },
    { amount: '1½ lb', item: 'thinly sliced onions (about 6 cups)' },
    { amount: '3 cloves', item: 'garlic, mashed' },
    { amount: '', item: 'Salt and pepper' },
    { amount: '1 cup', item: 'beef stock' },
    { amount: '3 cups', item: 'light beer (or ale for stronger flavor)' },
    { amount: '2 Tbsp', item: 'light brown sugar' },
    { amount: '', item: 'Bouquet garni: 4 parsley sprigs, 1 thyme sprig, 1 bay leaf tied together' },
    { amount: '1½ Tbsp', item: 'cornstarch mixed with 2 Tbsp balsamic vinegar' },
  ];

  const ovenSteps = [
    'Cut the beef into slices approximately ½ inch thick. Pat dry.',
    'Preheat oven to 325°F / 163°C.',
    'Heat 4 Tbsp oil in a heavy skillet until very hot. Brown the meat slices in batches, one layer at a time. Set aside.',
    'Reduce heat to medium. Add 3 Tbsp butter; sauté onions until golden brown. Stir in garlic, season with salt and pepper, and set aside.',
    'Heat the beef stock while the onions cook.',
    'In an oiled casserole dish, build alternating layers of meat and onions, starting with meat. Season each meat layer lightly.',
    'Pour the hot beef stock into the skillet, scrape up the browned bits, and add this liquid to the casserole. Bury the bouquet garni in the meat layers.',
    'Mix the brown sugar with the beer and pour over the layers.',
    'Bring to a boil on the stovetop, cover, and cook in the lower third of the oven for 2½–3 hours, until the meat is fork tender.',
    'Drain the cooking liquid into a saucepan over low heat. Add the cornstarch–balsamic mixture, stirring continuously for 3–4 minutes until the sauce thickens. Return to the casserole.',
    'Remove the bouquet garni. Serve with pommes frites, steamed potatoes, or mashed potatoes.',
  ];

  const slowCookerSteps = [
    'Cut the beef into slices approximately ½ inch thick. Pat dry.',
    'Brown the meat in batches: if your slow cooker has a brown/sauté function, do it directly in the cooker with 4 Tbsp oil. Otherwise brown in a heavy skillet and set aside.',
    'Sauté the onions until golden brown (same equipment as the meat). Add 3 Tbsp butter, the mashed garlic, salt, and pepper.',
    'Heat the beef stock.',
    'In the slow cooker, build alternating layers of meat and onions, starting with meat. Season each meat layer lightly.',
    'If you used a skillet, pour the hot beef stock into it, scrape up the browned bits, and add this liquid to the slow cooker. If you browned in the slow cooker itself, pour the stock in directly. Bury the bouquet garni in the meat layers.',
    'Mix the brown sugar with the beer and pour over the layers.',
    'Cover and cook on LOW for 2½–3 hours, until the meat is fork tender.',
    'Add the cornstarch–balsamic mixture directly to the slow cooker, stir into the juices, and continue cooking on LOW for about 10 minutes until the sauce thickens.',
    'Remove the bouquet garni. Serve with pommes frites, steamed potatoes, or mashed potatoes.',
  ];

  const variants = [
    { method: 'Oven', emoji: '🍳', total_time: '3 hr 20 min', cook_time: '2½–3 hours', instructions: ovenSteps },
    { method: 'Slow cooker', emoji: '🍲', total_time: '3 hr 20 min', cook_time: '2½–3 hours', instructions: slowCookerSteps },
  ];

  const { data, error } = await adminClient.from('template_recipes').insert({
    name,
    cuisine: 'Belgian / Flemish',
    meal_type: 'meat',
    serves: 6,
    total_time: '3 hr 20 min',
    prep_time: '20 min',
    cook_time: '3 hours',
    difficulty: 'Medium',
    description: 'Beef and Onions Braised in Beer — a Flemish stew with caramelized onions, beer, brown sugar, and balsamic vinegar. Comforting, deep, and traditional.',
    tags: ['Belgian', 'Flemish', 'beef stew', 'braised', 'comfort food'],
    ingredients,
    instructions: ovenSteps,   // base default = oven version, for any legacy reader
    prep_ahead: [
      'Slice onions and tie the bouquet garni up to a day ahead, refrigerated.',
      'Whole dish can be made a day ahead — flavors deepen overnight; gently reheat before serving.',
    ],
    source: '',
    photo_url: '/heritage-photos/carbonnade-a-la-flamande.png',
    background: "I first tried this Flemish beef stew when a Belgian friend invited me to a restaurant in Antwerp that specialized in this popular staple of Flemish cuisine. It is made with caramelized onions and beer, while brown sugar and balsamic vinegar soften the beer's bitterness and add a gentle sweetness to this comforting beef stew.",
    nonna_wisdom: [
      'To ensure a deep brown color on the meat, use high heat and brown it for the shortest possible time so it retains its juices.',
      'The onions should be sautéed over medium heat until they become golden brown without burning — give the process all the time it needs.',
      'A thick sauce is an important part of the final dish; once you add the cornstarch and balsamic mixture, stir thoroughly and allow enough time for the sauce to reach the right consistency.',
      'There are many variations to this recipe — mine is based on memories of the version I tried in Antwerp.',
    ],
    contributor: 'Nonna Ingrid',
    variants,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: true, id: data!.id, contributor: 'Nonna Ingrid' });
}
