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
const STYLE = [
  'Loose confident watercolour brushwork with visible paper texture, on cream parchment.',
  'Soft edges with gentle bleed.',
  'The whole vessel visible and centred, occupying roughly two-thirds of the frame width,',
  'with clear even margin on all four sides — never cropped by the frame edge.',
  'Viewed from slightly above at a consistent three-quarter angle.',
  'Plain cream background.',
  'No text, no lettering, no hands, no people, no cutlery, no props.',
  'Simple enough to read clearly at thumbnail size.',
].join(' ');

export function illustrationPrompt(meal: {
  name?: string; description?: string; technique?: string; tags?: string[];
}): { prompt: string; vessel: string; finish: string; reason: string } {
  const { vessel, finish, reason } = vesselFor(meal);
  const dish = (meal.name || 'a dish').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const prompt =
    `Vintage cookbook watercolour illustration of ${dish} in a ${finish} ${vessel}. ${STYLE}`;
  return { prompt, vessel, finish, reason };
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
