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

export interface Vessel {
  /** Phrase dropped straight into the image prompt. */
  vessel: string;
  /** Why this was chosen — useful when a picture looks wrong. */
  reason: string;
}

const DEFAULT: Vessel = { vessel: 'shallow round braiser', reason: 'default' };

// Ordered: the first match wins, so put the specific before the generic.
// Keyed on dish NAME, which is the only field reliably populated.
const BY_NAME: [RegExp, string][] = [
  [/\bpaella\b/i,                                   'wide flat two-handled paella pan'],
  [/\btacos?\b|\btostadas?\b|\bquesadillas?\b/i,    'flat oval platter'],
  [/\bstir[- ]?fry|\bwok\b|\bpad thai\b|\bpad krapow\b|\bkrapow\b|\blo mein\b|\bfried rice\b/i, 'round steel-rimmed wok'],
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
  name?: string; technique?: string; tags?: string[];
}): Vessel {
  const tech = (meal.technique || '').toLowerCase().trim();
  if (tech && BY_TECHNIQUE[tech]) {
    return { vessel: BY_TECHNIQUE[tech], reason: `technique: ${meal.technique}` };
  }

  // Tags carry a technique for some meals even when the field is empty.
  for (const t of (meal.tags || [])) {
    const key = String(t).toLowerCase().trim();
    if (BY_TECHNIQUE[key]) return { vessel: BY_TECHNIQUE[key], reason: `tag: ${t}` };
  }

  const name = meal.name || '';

  // "Slow Cooker Chana Masala" states its technique in the title. That is an
  // explicit choice and should beat any inference from the rest of the name.
  for (const [key, vessel] of Object.entries(BY_TECHNIQUE)) {
    if (new RegExp(`\\b${key.replace(/[- ]/g, '[- ]?')}\\b`, 'i').test(name)) {
      return { vessel, reason: `technique in title: ${key}` };
    }
  }

  for (const [re, vessel] of BY_NAME) {
    if (re.test(name)) return { vessel, reason: `name matched ${re.source.slice(0, 28)}…` };
  }

  return DEFAULT;
}
