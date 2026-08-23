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
  'Rendered as a refined hand-painted culinary illustration in loose but controlled transparent watercolour.',
  'Warm, understated European vintage-cookbook aesthetic. Confident brushwork with visible watercolour pigment granulation,',
  'subtle blooms, irregular washes, slight colour variation, and visible cold-pressed paper texture.',
  'Edges are softly defined rather than photographic, with occasional gentle pigment bleed,',
  'while the food remains clearly recognizable and appetizing.',
  'Detailed enough to identify the ingredients, but simplified enough to read immediately at small thumbnail size.',

  'Use a restrained, harmonious palette of warm cream, parchment, muted sage and forest green, soft grey-green,',
  'ochre, golden brown, terracotta, burnt sienna, and natural food colours.',
  'Avoid excessively bright, saturated, modern, or photographic colours.',
  'Highlights should come primarily from unpainted or lightly washed paper rather than hard white reflections.',

  'Landscape 3:2 composition. Show the entire vessel, fully contained within the image and never cropped.',
  'Centre it precisely in the frame, occupying approximately two-thirds of the total frame width,',
  'with generous, visually even negative space on all four sides.',
  'View consistently from a three-quarter angle, slightly above, showing both the food surface and the front/side wall of the vessel.',
  'Do not use a straight overhead view and do not use a low side angle.',

  'Place the vessel alone against a plain warm cream parchment background with subtle natural paper texture.',
  'Allow only a very soft, diffuse watercolour grounding shadow beneath the vessel.',
  'No tabletop, kitchen environment, marble, linen, wood grain, decorative setting, or surrounding scene.',

  'The food should look abundant but naturally arranged rather than meticulously styled.',
  'Preserve the defining visual characteristics of the recipe — its ingredients, cooking method, browning, texture,',
  'sauce consistency, and characteristic colour.',
  'Sauces should have the correct opacity, thickness, gloss, and amount for the particular dish;',
  'do not invent excess pooled sauce. Roasted or fried dishes should remain visibly dry and crisp where appropriate.',

  'Maintain the appearance of an actual traditional watercolour painting rather than digital illustration,',
  'ink drawing, colored-pencil rendering, photorealism, or hyper-detailed food photography.',
  'Avoid hard outlines, excessive micro-detail, artificial shine, uniform textures, perfect geometry, and overly crisp digital edges.',

  'No text, no lettering, no labels, no hands, no people, no cutlery, no napkins,',
  'no ingredients scattered around the vessel, no garnish placed outside the dish, and no decorative props.',
  'One vessel, one recipe, plain cream background.',
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
    `Vintage cookbook watercolour food illustration of ${dish}.`,
    // The vessel is ASSIGNED, not left to the model to pick from a list: two
    // dishes in the same week sharing a silhouette is the failure this exists
    // to prevent, and an image model converges on the same pale oval given the
    // choice. See lib/vessel.ts.
    `Present the finished recipe inside one ${finish} ${vessel}.`,
    'The vessel should have a simple vintage character, with no elaborate decoration or patterns.',
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
    /**
     * A style reference. Sent to /v1/images/edits rather than /generations.
     *
     * Adjectives are worst at exactly the qualities still missing — stippled
     * vessel surfaces, accumulated fine brush marks, sheen from tonal modelling
     * rather than painted white strokes. "Fine brushwork built from many small
     * marks" is a sentence a model can nod at and not obey. An example is not.
     */
    referenceUrl?: string;
  } = {},
): Promise<IllustrationResult> {
  const derived = illustrationPrompt(meal);
  const { vessel, finish, reason } = derived;
  const prompt = opts.promptOverride || derived.prompt;

  let res: Response;
  if (opts.referenceUrl) {
    // Style transfer: the reference carries the handling, the prompt the subject.
    const refRes = await fetch(opts.referenceUrl);
    if (!refRes.ok) throw new Error(`reference image ${refRes.status}`);
    const refBytes = Buffer.from(await refRes.arrayBuffer());

    const form = new FormData();
    form.append('model', MODEL);
    form.append('prompt', prompt);
    form.append('size', '1536x1024');
    if (opts.quality) form.append('quality', opts.quality);
    form.append('image', new Blob([new Uint8Array(refBytes)], { type: 'image/png' }), 'reference.png');

    res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } else {
    res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        // Closest landscape the model offers to the card's 4:3; the margin in
        // the prompt is what makes the crop safe.
        size: '1536x1024',
        n: 1,
        ...(opts.quality ? { quality: opts.quality } : {}),
      }),
    });
  }

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
