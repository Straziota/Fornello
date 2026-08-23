import { vesselFor } from './vessel';
import { adminClient } from './supabase-admin';

/**
 * Watercolour illustration for a recipe.
 *
 * Replaces Pexels stock, which fetched the first search result for "<dish>
 * food" — so three different French chicken dishes shared one photograph, and
 * an obscure dish got whatever food-shaped thing the search engine found. A
 * photograph also makes a claim an illustration doesn't: it reads as "this is
 * what yours will look like", when it is a picture of someone else's dinner.
 *
 * See docs/illustrations.md for the full reasoning.
 */

const MODEL = 'gpt-image-1';

/**
 * The invariant half of the prompt. Everything here is identical for every
 * dish — it is what makes a week of illustrations read as one set rather than
 * seven artists. Only the vessel, finish and dish vary.
 *
 * Landscape 3:2 with the vessel whole and centred: the meal card is 128x96
 * (4:3, object-cover), so anything filling the frame edge-to-edge loses its rim
 * when cropped. Margin is what lets one image serve the card, the email and
 * whatever layout comes next.
 */
/**
 * The invariant half of the prompt.
 *
 * This is a DESCRIPTION OF A PAINTING, not a specification. That distinction is
 * the whole finding: an earlier version listed constraints ("watercolour, soft
 * edges, plain background") and produced a soft, generic, airbrushed bowl. The
 * same call with the same model at the same quality, given the passage below,
 * produced a fine single-pass ink contour, visible granulation, paper tooth and
 * a dish that was actually depicted rather than approximated.
 *
 * Quality was tested and ruled out: `quality: high` alone changed almost
 * nothing. A chat product silently expands a short request into something like
 * this before the image model sees it, which is why hand-made tests looked so
 * much better than the first API results.
 *
 * Landscape 3:2 with the vessel whole and centred: the meal card is 128x96
 * (4:3, object-cover), so anything filling the frame edge-to-edge loses its rim
 * when cropped.
 */
const STYLE = [
  'The painting is in the style of a mid-century European cookbook plate:',
  'transparent watercolour washes laid wet-on-wet with visible granulation and pigment settling,',
  'delicate dry-brush texture on the rim of the vessel,',
  'and a fine loose ink contour drawn confidently in one pass and allowed to bleed slightly into the wash.',
  'Muted sage green, warm ochre, soft terracotta and umber on a cream laid-paper ground with visible tooth.',
  'Restrained palette, generous negative space, nothing photographic.',
  'Soft natural light from the upper left, no harsh highlights, no glossy specular shine on the food.',
  'The whole vessel visible and centred, occupying roughly two-thirds of the frame width,',
  'with clear even margin on all four sides, never cropped by the frame edge.',
  'Viewed from slightly above at a three-quarter angle.',
  'The background is flat unpainted cream paper, edge to edge:',
  'no surface, no table, no cloth, no cast shadow, no drop shadow, no vignette, no coloured wash behind the vessel.',
  'No text, no lettering, no hands, no people, no cutlery, no props.',
  'Composition simple and legible when reduced to a small thumbnail.',
].join(' ')

export function illustrationPrompt(meal: {
  name?: string; description?: string; appearance?: string; technique?: string; tags?: string[];
}): { prompt: string; vessel: string; finish: string; foodColour: string; reason: string } {
  const { vessel, finish, foodColour, reason } = vesselFor(meal);
  const dish = (meal.name || 'a dish').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  // The dish's own description matters: without it the model gets a name and a
  // bowl and invents the rest, which is how "Amatriciana" became generic red
  // pasta with no guanciale. Trimmed, because a long blurb crowds out the style.
  // `appearance` is written to describe how the dish LOOKS. The description is
  // marketing copy about how it tastes, which is why it produced generic pork
  // and the wrong sauce colour. Prefer the former; fall back only when absent.
  const detail = (meal.appearance || meal.description || '')
    .replace(/\s+/g, ' ').trim().slice(0, 320);
  const prompt = [
    `A hand-painted vintage cookbook watercolour illustration of ${dish},`,
    `served in a ${finish} ${vessel}.`,
    // Stated BEFORE the recipe blurb: the description mentions every component,
    // so left to itself the model paints whichever it saw last. Poulet à la
    // Normande came out ivory because "crème fraîche" won over "cider".
    foodColour ? `The sauce reads ${foodColour}.` : '',
    detail,
    STYLE,
  ].filter(Boolean).join(' ');
  return { prompt, vessel, finish, foodColour, reason };
}

export interface IllustrationResult {
  url: string;
  prompt: string;
  vessel: string;
  finish: string;
  reason: string;
  bytes: number;
}

/**
 * Generate one illustration and store it.
 *
 * Throws rather than falling back to anything. A quiet fallback to stock would
 * produce the mixed-media menu the all-or-nothing rule exists to prevent, and
 * would do it intermittently — worse than consistently.
 */
export async function generateIllustration(
  apiKey: string,
  meal: { name?: string; description?: string; technique?: string; tags?: string[] },
  opts: {
    slug?: string;
    /** gpt-image-1 accepts low | medium | high | auto. Passing nothing takes
        the default, which may be the cheap tier — invisible from the output. */
    quality?: string;
    /** Overrides the derived prompt entirely, for A/B testing. */
    promptOverride?: string;
  } = {},
): Promise<IllustrationResult> {
  const derived = illustrationPrompt(meal);
  const { vessel, finish, reason } = derived;
  const prompt = opts.promptOverride || derived.prompt;

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      // Closest landscape the model offers to the card's 4:3; the margin in the
      // prompt is what makes the crop safe.
      size: '1536x1024',
      n: 1,
      ...(opts.quality ? { quality: opts.quality } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`image API ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  const remote = json?.data?.[0]?.url;
  let bytes: Buffer;
  if (b64) {
    bytes = Buffer.from(b64, 'base64');
  } else if (remote) {
    const img = await fetch(remote);
    bytes = Buffer.from(await img.arrayBuffer());
  } else {
    throw new Error('image API returned neither b64_json nor url');
  }

  const slug = (opts.slug || meal.name || 'dish')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const path = `illustrations/${slug}.png`;

  const { error } = await adminClient.storage
    .from('recipe-photos')
    .upload(path, bytes, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`storage: ${error.message}`);

  const { data } = adminClient.storage.from('recipe-photos').getPublicUrl(path);
  return { url: data.publicUrl, prompt, vessel, finish, reason, bytes: bytes.length };
}
