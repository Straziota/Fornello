import { anthropicClient } from './anthropic';

/**
 * Turn free-text allergy entries into ingredient names the system can match.
 *
 * Found in production: one household had declared 'Nut sllergy'. The word "Nut"
 * survives well enough that a model may still infer the allergy from a prompt,
 * but every deterministic layer fails — the exploration-theme filter matches on
 * \bpeanut\b, and the allergen notice stems the whole phrase, so neither sees
 * it. The household believes they have declared a nut allergy and two of three
 * safeguards do not agree.
 *
 * Spelling is only half of it. 'All Nuts, Super Spicy' is a single array
 * element, so exact matching looks for one ingredient of that name and finds
 * nothing. And a phrase — "Nut allergy", "No pork" — is not an ingredient,
 * which is what every matcher expects.
 *
 * Deliberately a model call rather than a dictionary: the input is unbounded
 * ("no shellfish except prawns", "lactose"), and a dictionary would silently
 * pass through whatever it did not recognise — the same failure in a new place.
 */
export async function normalizeRestrictions(
  apiKey: string,
  raw: string[],
): Promise<{ normalized: string[]; changed: boolean }> {
  const input = (raw || []).map(s => String(s).trim()).filter(Boolean);
  if (!input.length) return { normalized: [], changed: false };

  const client = anthropicClient({ apiKey });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content:
`Normalise these dietary restrictions into a clean list of INGREDIENT names.

Rules:
- Correct misspellings. "Nut sllergy" is a nut allergy.
- Split entries containing several things. "All Nuts, Super Spicy" becomes two.
- Turn phrases into ingredients: "Nut allergy" → "Tree nuts". "No pork" → "Pork".
- Use the common plural food name: Peanuts, Tree nuts, Shellfish, Dairy, Eggs, Gluten, Soy, Fish, Sesame.
- Keep anything genuinely unusual rather than dropping it — better an odd entry than a lost allergy.
- Never invent a restriction that is not implied by the input.

Input: ${JSON.stringify(input)}

Reply with ONLY a JSON array of strings.` }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return { normalized: input, changed: false };

  let parsed: unknown;
  try { parsed = JSON.parse(match[0]); } catch { return { normalized: input, changed: false }; }
  if (!Array.isArray(parsed)) return { normalized: input, changed: false };

  const normalized = parsed
    .map(x => String(x).trim())
    .filter(Boolean)
    .filter((x, i, a) => a.findIndex(y => y.toLowerCase() === x.toLowerCase()) === i);

  // Never let normalisation LOSE a restriction. An empty or shrunken result is
  // more likely a bad parse than a household with fewer allergies than they
  // typed, and dropping one silently is the worst outcome available.
  if (!normalized.length || normalized.length < input.length) {
    const merged = [...normalized];
    for (const orig of input) {
      if (!merged.some(n => n.toLowerCase().includes(orig.toLowerCase().split(/[\s,]/)[0]))) {
        merged.push(orig);
      }
    }
    return { normalized: merged, changed: JSON.stringify(merged) !== JSON.stringify(input) };
  }

  return { normalized, changed: JSON.stringify(normalized) !== JSON.stringify(input) };
}
