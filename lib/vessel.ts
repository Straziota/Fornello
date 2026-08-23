/**
 * Which vessel a dish is illustrated in — assigned, never left to the model.
 *
 * Silhouette does most of the work of telling seven thumbnails apart: at 128px
 * a round braiser and an oval casserole read as different dinners while two
 * sauces of similar value do not. Left to its own devices an image model
 * converges — ask it for a braise and a casserole and you get the same pale oval
 * with the same two handles twice.
 *
 * So the vessel is derived here and passed in as an explicit parameter.
 *
 * The obvious source — settings.schedule[day].technique — is populated on 3 of
 * 96 real meals, because it only exists when a household assigns a per-day
 * technique and almost none do. The dish NAME carries the signal instead:
 * "Paella Valenciana" and "Boeuf Bourguignon" say what they are cooked in.
 * Technique and tags are consulted first where present, since an explicit choice
 * should beat an inference.
 */

/**
 * How the food itself should read.
 *
 * The three-value bucket that picks a contrasting vessel is too coarse for
 * this: "Poulet à la Normande" (cider, calvados, apples, cream) and "Coq au
 * Blanc" (white wine, cream) both classify as pale, yet they were exactly the
 * pair that needed colour to separate them — they share a braiser silhouette,
 * so if both come out ivory nothing tells them apart.
 *
 * Colour therefore comes from named ingredients, not from the value bucket.
 * Ordered: the first match wins, so the more specific sits above the generic.
 */
const FOOD_COLOUR: [RegExp, string][] = [
  [/\bsaffron\b/i,                      'saffron-gold'],
  [/\bcider\b|\bcalvados\b/i,           'warm amber-gold, glossy'],
  [/\bpaprika\b|\bpaprik[aá]s\b/i,      'opaque brick-red'],
  [/\bcurry\b|\bturmeric\b|\bmasala\b/i, 'deep golden-ochre'],
  [/\bred wine\b|bourguignon|\bburgundy\b/i, 'deep burgundy-brown, thick'],
  [/\bsoy\b|\bteriyaki\b|\bhoisin\b|\btamarind\b/i, 'dark soy-brown, glossy'],
  [/\btomato|\bmarinara\b|amatriciana|arrabbiata/i, 'warm brick-red'],
  [/\bpesto\b|\bherb\b|\bsalsa verde\b/i, 'fresh green'],
  [/\bwhite wine\b|\bcr[eè]me fra[iî]che\b|\bcream\b|\bb[eé]chamel\b/i, 'pale ivory, thin and silky'],
  [/\bpecorino\b|\bparmesan\b|cacio e pepe|\bgricia\b|\bcarbonara\b/i, 'pale straw, glossy and barely-there'],
  [/\blemon\b|\bpiccata\b/i,           'pale gold'],
];

export interface Vessel {
  /** Shape phrase — the silhouette, which is what separates thumbnails. */
  vessel: string;
  /** Finish phrase, chosen to contrast with the food's value. */
  finish: string;
  /** How the food itself should read — empty when nothing named is decisive. */
  foodColour: string;
  /** Why this was chosen — useful when a picture looks wrong. */
  reason: string;
}

/**
 * Roughly how light the food itself reads.
 *
 * A pale dish in a pale vessel on cream parchment is three values of the same
 * thing, and disappears at thumbnail size — carbonara, risotto, chowder, roast
 * potatoes. There are a lot of beige dinners, so the vessel has to carry the
 * contrast the food cannot.
 */
type FoodValue = 'pale' | 'mid' | 'dark';

const PALE = /carbonara|alfredo|risotto|cacio e pepe|gricia|chowder|\bcream\b|\bwhite wine\b|\bpolenta\b|\bmash(ed)?\b|\bpotato(es)?\b|\bcauliflower\b|\bblanquette\b|\bnormande\b|\bpiccata\b|\bscampi\b|\bfettuccine\b|\brice\b|\bcod\b|\bsole\b|\bhalibut\b|\bchicken breast\b/i;
const DARK = /\bpad thai\b|\btamarind\b|bourguignon|\bstew\b|\bragù|\bragu\b|\bmole\b|\bsoy\b|\bteriyaki\b|\bhoisin\b|\bblack bean\b|\bbalsamic\b|\bred wine\b|\bchocolate\b|\bmushroom\b|\bbeef\b|\bbraised?\b|\bgoulash\b|\bdal makhani\b|\bmarsala\b|\bbulgogi\b|\bstir[- ]?fry\b/i;

function foodValue(text: string): FoodValue {
  // "rice noodles" is not pale rice, and "sweet potato" is not a pale potato.
  // Strip the compounds before testing, or the modifier decides the value.
  const t = text
    .replace(/rice noodles?/gi, 'noodles')
    .replace(/sweet potatoe?s?/gi, 'sweetpotato')
    .replace(/cream(y)? of/gi, 'creamof');
  if (DARK.test(t)) return 'dark';
  if (PALE.test(t)) return 'pale';
  return 'mid';
}

// Finishes that read clearly against cream parchment, grouped by how dark they
// are. Pale food gets a saturated or dark vessel; dark food gets a pale one.
const FINISH: Record<FoodValue, string> = {
  pale: 'deep forest-green enamel with a darker rim',
  dark: 'warm cream enamel with a soft pale rim',
  mid:  'muted terracotta-ochre glaze',
};

const DEFAULT_SHAPE = 'shallow round braiser';

// Ordered: the first match wins, so put the specific before the generic.
// Keyed on dish NAME, which is the only field reliably populated.
const BY_NAME: [RegExp, string][] = [
  // ── Baked and sweet, FIRST ────────────────────────────────────────────────
  // Every one of these previously fell through to the default and was drawn in
  // a savoury braising pan. Ordered before the savoury rules so a "tart" is a
  // tart and not caught by something else.
  //
  // Small individual items are finger food: they are arranged on something flat
  // and shared, never plated in a cooking vessel.
  [/\bmadeleines?\b|\bcookies?\b|\bbiscuits?\b|\bmacarons?\b|\bscones?\b|\bshortbread\b|\bpanallets\b|\bpetits? fours?\b|\btruffles?\b|\bbites\b|\btartlets?\b|\bcanap[eé]s?\b|\bcrisps?\b|\btartines?\b/i,
                                                    'pale ceramic serving platter'],
  // A whole cake is presented, not cooked, in what it sits on.
  [/\bcakes?\b|\bgateau\b|\btorta\b|\bloaf\b|\bpavlova\b|\bcheesecake\b/i,
                                                    'simple footed cake stand'],
  // Cut from a tray and served as squares — a board reads better than a dish.
  [/\bbars?\b|\bbrownies?\b|\bblondies?\b|\bflapjacks?\b|\bslices?\b|\bsquares?\b|\bfudge\b/i,
                                                    'flat wooden serving board'],
  // Baked in their dish and served from it.
  [/\bcrumbles?\b|\bcobblers?\b|\bcrisps? \(dessert\)|\bbread pudding\b|\bclafoutis\b|\btiramis[uù]\b|\btrifle\b/i,
                                                    'oval enamelled baking dish'],
  [/\btarts?\b|\bpies?\b|\bgalettes?\b|\bquiche\b|\bflan\b/i,
                                                    'fluted ceramic tart dish'],
  [/\bmuffins?\b|\bcupcakes?\b/i,                 'pale ceramic serving platter'],
  [/\bpaella\b/i,                                   'wide flat two-handled paella pan'],
  [/\btacos?\b|\btostadas?\b|\bquesadillas?\b/i,    'flat oval platter'],
  // Noodle dishes are plated, not served in the wok — and two Thai dishes in
  // one week would otherwise share a silhouette. Cooked-in-the-wok stays a wok.
  [/\bpad thai\b|\blo mein\b|\bnoodles?\b/i,      'wide shallow noodle bowl'],
  [/\bstir[- ]?fry|\bwok\b|\bpad krapow\b|\bkrapow\b|\bfried rice\b/i, 'round steel-rimmed wok'],
  // Before the pasta rule: "Baked Pasta Gratin" is a gratin dish, not a bowl.
  [/\bgratin\b|\blasagn|\bbaked?\b.*\bpasta\b|\bpasta\b.*\bbake[dr]?\b|\bziti\b/i,
                                                    'oval enamelled gratin dish'],
  [/\bpasta|spaghetti|linguine|penne|rigatoni|orecchiette|tagliatelle|pappardelle|carbonara|amatriciana|gricia|cacio e pepe|noodles?\b/i,
                                                    'wide shallow pasta bowl'],
  [/\brisotto\b/i,                                  'wide shallow bowl'],
  [/\bsoup\b|\bbroth\b|\bchowder\b|\bbisque\b|\bramen\b|\bpho\b/i, 'deep two-handled soup pot'],
  [/\bstew\b|bourguignon|\bcassoulet\b|\bgoulash\b|\btagine\b|\bcurry\b|\bdal\b|\bchili\b/i,
                                                    'deep round casserole'],
  [/\broast(ed)?\b|\bsheet[- ]?pan\b|\btray[- ]?bake\b|\bschnitzel\b|\bwings?\b/i,
                                                    'flat sheet pan'],
  [/\bgratin\b|\blasagn|\bbake[dr]?\b|\bcasserole\b|\bmoussaka\b|\benchiladas?\b/i,
                                                    'oval enamelled gratin dish'],
  [/\bskillet\b|\bgrill(ed)?\b|\bsear(ed)?\b|\bpan[- ]?fried\b|\bsteak\b|\bpiccata\b|\bmarsala\b|\bsaltimbocca\b|\bmeunière\b/i,
                                                    'black cast-iron skillet'],
  [/\bbraise[d]?\b|\bcoq au\b|\bpoulet\b|\bosso buco\b|\bshanks?\b|\bcacciatore\b|\bparprikas?\b|\bpaprikás\b/i,
                                                    'shallow round braiser'],
  [/\bshakshuka\b|\bfrittata\b|\bomelette?\b|\beggs?\b/i, 'small round cast-iron pan'],
  [/\bsalad\b|\bbowls?\b|\bgrain bowl\b/i,          'wide shallow serving bowl'],
  [/\bfish\b|\bsalmon\b|\bbranzino\b|\bsea bass\b|\bhalibut\b|\bsole\b|\bcod\b/i,
                                                    'long oval fish platter'],
];

// An explicitly-assigned technique beats anything inferred from the name.
const BY_TECHNIQUE: Record<string, string> = {
  'slow cooker': 'deep lidded slow-cooker pot',
  'air fryer':   'flat perforated air-fryer basket',
  'grill':       'ridged cast-iron grill pan',
  'baked':       'oval enamelled gratin dish',
  'oven':        'flat sheet pan',
  'roast':       'flat sheet pan',
  'skillet':     'black cast-iron skillet',
  'braise':      'shallow round braiser',
};

export function vesselFor(meal: {
  name?: string; technique?: string; tags?: string[]; description?: string;
  /** 'dinner' | 'side' | 'dessert' | 'special' | 'tradition' */
  category?: string;
}): Vessel {
  // Value is judged from name AND description — "creamy" rarely appears in a
  // title but almost always in the blurb.
  const blob = `${meal.name || ''} ${meal.description || ''}`;
  const value = foodValue(blob);
  const finish = FINISH[value];
  const foodColour = FOOD_COLOUR.find(([re]) => re.test(blob))?.[1] || '';
  const done = (vessel: string, reason: string): Vessel =>
    ({ vessel, finish, foodColour, reason: `${reason} · food reads ${value}` });

  const tech = (meal.technique || '').toLowerCase().trim();
  if (tech && BY_TECHNIQUE[tech]) {
    return done(BY_TECHNIQUE[tech], `technique: ${meal.technique}`);
  }

  // Tags carry a technique for some meals even when the field is empty.
  for (const t of (meal.tags || [])) {
    const key = String(t).toLowerCase().trim();
    if (BY_TECHNIQUE[key]) return done(BY_TECHNIQUE[key], `tag: ${t}`);
  }

  const name = meal.name || '';

  // "Slow Cooker Chana Masala" states its technique in the title. That is an
  // explicit choice and should beat any inference from the rest of the name.
  for (const [key, vessel] of Object.entries(BY_TECHNIQUE)) {
    if (new RegExp(`\\b${key.replace(/[- ]/g, '[- ]?')}\\b`, 'i').test(name)) {
      return done(vessel, `technique in title: ${key}`);
    }
  }

  for (const [re, vessel] of BY_NAME) {
    if (re.test(name)) return done(vessel, `name matched ${re.source.slice(0, 24)}…`);
  }

  // A sweet dish whose name matched nothing savoury should still not land in a
  // braising pan — the default exists for dinners.
  if (meal.category === 'dessert') return done('pale ceramic serving platter', 'category: dessert');

  return done(DEFAULT_SHAPE, 'default');
}
