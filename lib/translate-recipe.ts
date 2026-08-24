import { anthropicClient } from './anthropic';
import type { TranscribedRecipeDraft } from './claude';

/**
 * Translate a transcribed family recipe, without flattening it.
 *
 * The scan transcriber is deliberately told NOT to translate — it keeps the
 * writer's voice, dialect and measurements, because a grandmother's card is
 * partly about being in her words. This runs afterwards and separately, and the
 * original is kept beside the translation rather than replaced by it.
 *
 * The hard part of a recipe translation is not the language, it is knowing what
 * to leave alone. "Soffritto" and "sofrito" are not the same thing and neither
 * is "mirepoix"; a "tazza" in an Italian home kitchen is not a US cup; and
 * "quanto basta" means something a number cannot say. Translating those into
 * tidy English is how a family recipe turns into a generic one.
 */
export interface RecipeTranslation {
  name: string;
  description: string;
  ingredients: { amount: string; item: string }[];
  instructions: string[];
  prep_ahead: string[];
  nonna_wisdom: string[];
  /** Terms kept in the original with a short gloss, e.g. soffritto. */
  kept_terms: { term: string; meaning: string }[];
  /** Anything the translator had to interpret rather than translate. */
  translator_notes: string[];
}

export async function translateRecipeDraft(
  draft: Partial<TranscribedRecipeDraft>,
  fromLanguage: string,
  toLanguage: string,
  apiKey?: string,
): Promise<RecipeTranslation> {
  const client = anthropicClient({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY! });

  const prompt = `You are translating a family recipe from ${fromLanguage} into ${toLanguage}. It was transcribed from a handwritten card, so it may contain dialect, old-fashioned terms, household shorthand and imprecise quantities.

Translate so that someone can COOK from it, while keeping it recognisably this family's recipe.

Rules:
- Translate the instructions into natural ${toLanguage}. Do not stiffen them into recipe-website prose — if the writer says "add a little wine and let it sing", keep that voice.
- KEEP culinary terms that have no honest equivalent, in the original, and list them in "kept_terms" with a one-line meaning. Examples of terms to keep: soffritto, sofrito, mirepoix, roux, ragù, dashi, garam masala, mise en place. Do not replace them with an approximation.
- Do NOT convert measurements into another system. Translate the words ("una tazza" → "one cup") but never silently change an amount, and never turn an imprecise quantity into a precise one. "Quanto basta" becomes "as much as needed", not "1 tsp".
- If a word is ambiguous or you had to make a judgement call, translate it AND record the call in "translator_notes" so the family can correct you. This matters more than fluency: they know what their grandmother meant and you do not.
- Keep any names of people, places, dishes or festivals as written. "Torta della Nonna" does not become "Grandmother's Cake".
- If something is already in ${toLanguage}, leave it exactly as it is.
- Never add an ingredient, a step, or a quantity that is not in the source.

The recipe:
${JSON.stringify({
    name: draft.name,
    description: draft.description,
    ingredients: draft.ingredients,
    instructions: draft.instructions,
    prep_ahead: draft.prep_ahead,
    nonna_wisdom: draft.nonna_wisdom,
  }, null, 2)}

Respond with ONLY a JSON object of this exact shape (no prose, no markdown fence):
{
  "name": "string",
  "description": "string",
  "ingredients": [{ "amount": "string", "item": "string" }],
  "instructions": ["step 1", "step 2"],
  "prep_ahead": ["..."],
  "nonna_wisdom": ["..."],
  "kept_terms": [{ "term": "soffritto", "meaning": "the slow-cooked base of onion, carrot and celery" }],
  "translator_notes": ["..."]
}`;

  const message = await client.messages.create({
    // Same model as the transcription. A translation that quietly loses a
    // dialect word costs more than the tokens saved by a smaller one.
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not read the translation.');

  const parsed = JSON.parse(match[0]) as Partial<RecipeTranslation>;
  return {
    name: parsed.name || draft.name || '',
    description: parsed.description || '',
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
    prep_ahead: Array.isArray(parsed.prep_ahead) ? parsed.prep_ahead : [],
    nonna_wisdom: Array.isArray(parsed.nonna_wisdom) ? parsed.nonna_wisdom : [],
    kept_terms: Array.isArray(parsed.kept_terms) ? parsed.kept_terms : [],
    translator_notes: Array.isArray(parsed.translator_notes) ? parsed.translator_notes : [],
  };
}
