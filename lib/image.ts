/**
 * Display URLs for recipe images.
 *
 * Illustrations are stored once at full size (1536x1024 PNG, ~3.4MB) and
 * resized by Supabase Storage on request. Nothing is pre-rendered and the
 * master is never destroyed — regenerating 92 illustrations is expensive and
 * irreversible, while storage is not, so a print run or a larger render later
 * stays possible.
 *
 * Measured on a real illustration (3,371KB PNG master):
 *
 *   width=384   →  95KB webp
 *   width=576   → 140KB webp
 *   width=768   → 182KB webp
 *   width=1536  → 269KB webp   (same dimensions as the master: 12x smaller)
 *
 * WebP is negotiated from the browser's Accept header, so older clients get PNG
 * without any branching here.
 */

/**
 * A FIXED ladder, deliberately not computed from the viewport.
 *
 * Every distinct width is a separately cached object at the CDN. Deriving
 * widths from screen size would produce hundreds of near-identical variants and
 * destroy the hit rate; three sizes keep it high.
 */
export const WIDTHS = [384, 768, 1536] as const;

const RENDER = '/storage/v1/render/image/public/';
const OBJECT = '/storage/v1/object/public/';

/** Only our own Supabase objects can be transformed. */
function isTransformable(url: string): boolean {
  return !!url && url.includes(OBJECT);
}

/**
 * One width. Returns the URL unchanged when it isn't ours to transform — a
 * legacy Pexels URL, or anything else — so callers never need to check.
 */
export function imageUrl(master: string, width: number, quality = 80): string {
  if (!isTransformable(master)) return master;
  return `${master.replace(OBJECT, RENDER)}?width=${width}&quality=${quality}`;
}

/**
 * Candidates for the browser to choose from.
 *
 * A single width is wrong: 384 suits a 192pt card at 2x, but a 3x phone wants
 * 576 and would upscale 384 into something soft. Letting the browser pick is
 * the difference between sharp on one device and sharp on all of them.
 */
export function imageSrcSet(master: string, quality = 80): string | undefined {
  if (!isTransformable(master)) return undefined;
  return WIDTHS.map(w => `${imageUrl(master, w, quality)} ${w}w`).join(', ');
}

/**
 * Fall back to the untransformed master.
 *
 * Image transformation is a paid Supabase feature. If the plan lapses, every
 * transformation request fails — and failing SILENTLY would empty the app of
 * pictures with nothing to explain why. Wiring this to an <img> onError means a
 * phone downloads 3.4MB instead of 95KB, which is bad, but the app still shows
 * food. Slow beats broken, and it should surface in monitoring rather than in a
 * user's complaint.
 */
export function masterUrl(url: string): string {
  return url.includes(RENDER) ? url.replace(RENDER, OBJECT).split('?')[0] : url;
}

/** Ready-made props for an <img>. */
export function imageProps(master: string, sizes: string) {
  return {
    src: imageUrl(master, WIDTHS[0]),
    srcSet: imageSrcSet(master),
    sizes,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const fallback = masterUrl(img.src);
      if (img.src !== fallback) { img.srcset = ''; img.src = fallback; }
    },
  };
}
