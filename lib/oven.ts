/**
 * Does this recipe use the oven, and does it say to preheat it first?
 *
 * A preheat buried at step four is a recipe that has already wasted fifteen
 * minutes by the time you read it — you have chopped everything and now stand
 * waiting for the oven. It belongs at the top, which is where every cookbook
 * puts it.
 *
 * The detection has to be careful. "Dutch oven" is a pot that lives on the hob,
 * "baking powder" and "baking soda" are ingredients, and a "baking sheet" can be
 * used under a grill. Matching the word loosely finds dozens of recipes that
 * never turn an oven on, and prepending a preheat to those would be worse than
 * doing nothing.
 */

// The pot, the ingredients, and the tin — none of these mean the appliance.
const NOT_THE_APPLIANCE = /\b(dutch oven|baking (powder|soda)|oven[- ]?safe|oven[- ]?proof|oven mitt)\b/gi;

/**
 * A real instruction to use the oven — not a word that merely mentions one.
 *
 * "Stir in the roasted red pepper strips" describes an ingredient, and an
 * earlier version counted it: Chicken Paprikas, a dish cooked entirely on the
 * hob, was about to be given a preheat step. So a bare "roasted" is not enough.
 * Either the oven is named, or a bake/roast verb is tied to a temperature or a
 * time — which is what an actual instruction looks like.
 */
const OVEN_VERB = new RegExp([
  /preheat(ed)?\s+(the\s+)?oven/,
  /in(to)?\s+the\s+oven/,
  /oven\s+(to|at)\s+\d/,
  /\d{3}\s*°?\s*[FC]?\s*oven/,
  // Imperative and gerund only. "roasted"/"baked" are usually adjectives
  // describing an ingredient, and "stir in the roasted red peppers and warm
  // through for 2 minutes" matched the for-a-number rule — which is how a
  // stovetop paprikash was nearly given a preheat step.
  /\b(bake|roast|broil)(s|ing)?\b[^.]{0,40}\b(at|for)\s+\d/,
  /\b(bake|roast|broil)(s|ing)?\b[^.]{0,20}\b(until|uncovered|covered)\b/,
].map(r => r.source).join('|'), 'i');

/**
 * The temperature an OVEN is set to — never a doneness temperature.
 *
 * "Cook until the chicken registers 165°F" is about the meat, and an earlier
 * version read it as an oven setting: it proposed preheating to 165°F, which
 * would have ruined the dish while reading as authoritative. So the number has
 * to be attached to the oven or to a bake/roast instruction.
 */
const OVEN_TEMPERATURE = new RegExp([
  /oven\s+(?:to|at)\s+(\d{3})\s*°?\s*(?:degrees\s*)?(F|C)?/,
  // The other word order: "place in the 425°F oven". Real recipes write both.
  /(\d{3})\s*°?\s*(F|C)?\s*oven\b/,
  /\b(?:bake|roast|broil)(?:s|ing)?\b[^.]{0,30}?\bat\s+(\d{3})\s*°?\s*(?:degrees\s*)?(F|C)?/,
].map(r => r.source).join('|'), 'i');

const PREHEAT = /\bpre-?heat/i;

const withoutFalseFriends = (text: string) => text.replace(NOT_THE_APPLIANCE, ' ');

export function usesOven(instructions: string[] = []): boolean {
  const text = withoutFalseFriends(instructions.join(' '));
  return OVEN_VERB.test(text);
}

/** The temperature the oven is set to, normalised. Null when none is stated. */
export function ovenTemperature(instructions: string[] = []): string | null {
  const m = OVEN_TEMPERATURE.exec(withoutFalseFriends(instructions.join(' ')));
  if (!m) return null;
  // Two alternatives, each with its own capture pair.
  // Three alternatives, each contributing its own capture pair.
  const degrees = m[1] || m[3] || m[5];
  const unit = (m[2] || m[4] || m[6] || 'F').toUpperCase();
  if (!degrees) return null;
  return `${degrees}°${unit}`;
}

/**
 * True when the oven is used and the first step does not preheat it.
 *
 * Only the FIRST step counts. A preheat at step three is the problem being
 * described, not an acceptable variation of the fix.
 */
export function needsPreheatFirst(instructions: string[] = []): boolean {
  if (!instructions.length) return false;
  if (!usesOven(instructions)) return false;
  return !PREHEAT.test(instructions[0]);
}

/**
 * Put the preheat at the top, if the recipe needs one and states a temperature.
 *
 * Returns the instructions unchanged when there is no temperature to state —
 * inventing one would be worse than leaving the recipe as the model wrote it,
 * because a wrong oven temperature ruins the food and reads as authoritative.
 */
export function withPreheatFirst(instructions: string[] = []): string[] {
  if (!needsPreheatFirst(instructions)) return instructions;
  const temp = ovenTemperature(instructions);
  if (!temp) return instructions;
  return [`Preheat the oven to ${temp}.`, ...instructions];
}
