# Recipe illustrations — design, decided before building

Watercolour illustrations replace Pexels stock. Not yet implemented: it needs an
image service, which the project does not have. This records what was decided so
it is not re-derived later.

## Why, in order of weight

1. **Accuracy.** `fetchPexelsPhoto` takes the first result for "<dish> food".
   For an obscure dish Pexels has no photo of it at all, so it returns the
   nearest food-shaped thing. Measured on the live library: 55 photos across 50
   distinct images — three different French chicken dishes (Poulet à la
   Normande, Coq au Blanc, Poulet Rôti à la Moutarde) share one photograph. The
   failure users notice is not "this doesn't look like my dinner" but the same
   picture appearing twice in one week.
2. **A photograph makes a claim an illustration doesn't.** It reads as *this is
   what yours will look like*. Same class of problem as `source_site` claiming a
   recipe came from Serious Eats, and `source_url` offering a fabricated link.
3. **Consistency.** Dozens of photographers, bright high-contrast marble flat
   lays, inside parchment and watercolour icons. Assembled, not designed.
4. **Licensing.** Pexels permits commercial use but verifies nothing about
   uploader ownership, warrants nothing, and indemnifies nothing — liability
   sits with us, with no paid upgrade path. Small tail risk at 16 households;
   worse in a product that charges, and cheap to remove now.

## Vessel and finish — assigned, never left to the model

`lib/vessel.ts`. Silhouette does most of the work of separating thumbnails; left
to itself an image model converges (ask for a braise and a casserole, get the
same pale oval twice).

- Shape from technique → technique tag → technique in title → dish name →
  default. `settings.schedule[day].technique` is set on 3 of 96 real meals, so
  the dish NAME is the load-bearing signal.
- Finish contrasts with the food's own value: pale food → forest green, dark →
  warm cream, else terracotta. A pale dish in a pale vessel on cream parchment
  is three values of the same thing and vanishes at 128px.

## Open decisions, with reasoning

### Photo lookup must not key on exact name
`global_recipes` is keyed by name and names drift. Measured: 22 near-duplicate
pairs in 92 recipes. Reuse the variation matcher from `/api/menu/generate`, but
at a STRICTER threshold than the repeat check — a wrongly-blocked repeat is
invisible, a wrong picture is not.

Evidence for the threshold: every dangerous pair shares exactly 2 meaningful
tokens ("Sole Meunière with Haricots Verts" vs "Steamed Haricots Verts";
"Shakshuka with Feta and Warm Flatbread" vs "Warm Flatbread"), while the sound
ones share 3 ("Lemon Bars with Candied Lemon Zest" vs "…Peel"). So: require ≥3,
not ≥2.

**Same-preparation-different-protein is the class ≥3 cannot see.** "Roasted
Lemon Herb Chicken" vs "Roasted Lemon Herb Salmon" shares 3 tokens at 75%
overlap — matches cleanly and serves salmon a picture of chicken. Guard: compare the two protein SETS for
equality and refuse any inequality, regardless of score.

Set-equality, not presence-and-difference. "Roasted Lemon Herb Chicken" vs
"Roasted Lemon Herb Vegetables" is {chicken} vs {} — one side has no protein at
all, so a presence-and-difference test lets it through and the vegetarian dish
inherits a picture of chicken. Worse than the wrong meat. Unequal sets block;
equal sets (including both empty) allow.

List: chicken, beef, pork, lamb, veal, duck, turkey, sausage, salmon, cod, tuna,
fish, seafood, shrimp, prawn, tofu.

Verified: the guard blocks Chicken-vs-Salmon and does NOT block "Lemon Bars with
Candied Lemon Zest" vs "…Peel", which has no protein and should share. It fires
zero times against the current 77 non-side recipes — the class does not exist in
a library this small, which is precisely why it must be built before the library
grows and the backfill becomes expensive to redo.

**The stopword list must not be shared with repeat detection.** "Slow Cooker
Beef Stew" vs "Slow Cooker Chicken Stew" never reaches the threshold, because
"slow" and "cooker" are stopwords — safe by accident, not by design.

That list was tuned for repeat detection and would now silently govern which
dishes share a picture as well. Someone later removing "cooker" to tighten
repeat-checking would loosen image-matching in the same edit, with nothing
connecting the two decisions and no test that notices. Give photo matching its
own stopword list, and pin its behaviour with its own tests, so a stopword edit
fails a test rather than quietly changing pictures.

**Sides never render an image, so do not generate one for them.** Measured: 15
side rows in the library, 0 with a photo, and sides appear only nested inside a
meal modal as text — never as their own card. This dissolves the inheritance bug
("Warm Flatbread" inheriting shakshuka's picture) rather than guarding against
it, and removes the cost.

### Generation must not block the menu
The Pexels fetch is currently awaited before `saveMenu`. Onboarding was
deliberately made to produce a menu immediately; making that path wait on seven
image calls would undo it. Render the menu at once with an in-style placeholder
and fill images in as they land.

### It must go through the usage ledger, attributed to the right payer
Every Claude call is costed and capped via `lib/anthropic.ts`. An image API is a
new cost path, and a cost path outside the meter is the same class of gap as the
seventeen routes that never saw the household's allergies — nothing looks
broken, it simply isn't covered. `recordUsage` is currently token-shaped. Do NOT bend images into that shape:
the ledger's purpose is a dollar ceiling, and tokens were only ever a proxy for
cost. Generalise it to record cost with a unit label, letting tokens become one
input rather than the schema — which also covers whatever non-token API comes
next.

**Attribution is not obvious here and must be decided, not defaulted.** Every
other AI cost belongs to the household that caused it: `requireUser('feature')`
puts them in the ambient context and `recordUsage` bills them. An illustration
is different — it is generated once and then reused by every household that ever
cooks that dish. Billing it to whoever happened to trigger the generation is
arbitrary: the first household pays for a picture the next hundred use free, and
a heavy user's cap could be consumed by generating images for the shared library.

So an illustration is a COMPANY cost, not a household one. The ledger needs an
attribution field distinguishing the two, and illustration spend must not count
against a household's monthly ceiling. Without that, the first family to cook an
unusual dish is quietly charged for enriching the shared library.

### Remove Pexels, do not demote it to a fallback
A quiet fallback on generation failure produces the mixed-media menu the
all-or-nothing rule exists to prevent, and does it intermittently, which is
worse than consistently. Fail to a plain in-style placeholder.

### Provenance: same object, opposite visibility
An **illustration** belongs to the shared library — generated once, reused by
every household, stored on `global_recipes`. A **user's photo** belongs to that
household's row and must never be promoted to the library. Same object type,
opposite visibility; the existing provenance gate is about recipes, not images,
so it does not cover this.

## Serving the images

Stored once at full size (1536x1024 PNG, ~3.4MB) and resized by Supabase Storage
on request. The master is never destroyed: regenerating 92 illustrations is
expensive and irreversible, storage is neither, and a print run or a larger
render later stays possible. Two representations, one file.

Measured on a real illustration, master 3,371KB PNG:

| request | size | format |
|---|---|---|
| `?width=384&quality=80` | 95KB | webp |
| `?width=576` | 140KB | webp |
| `?width=768` | 182KB | webp |
| `?width=1536` | 269KB | webp |
| master, untransformed | 3,371KB | png |

Note 1536 is 12x smaller than the master at identical dimensions — that is
format alone. WebP is negotiated from the browser's Accept header, so older
clients get PNG with no branching.

`lib/image.ts`:

- **A fixed ladder — 384, 768, 1536 — never computed from the viewport.** Each
  distinct width is a separately cached CDN object; deriving widths from screen
  size would produce hundreds of near-identical variants and destroy the hit
  rate.
- **srcset, not a single width.** 384 suits a 192pt card at 2x, but a 3x phone
  wants 576 and would upscale 384 into something soft.
- **Falls back to the master on error.** Transformation is a paid Supabase
  feature; if the plan lapses every request fails, and failing silently would
  empty the app of pictures with nothing to explain why. The fallback costs a
  phone 3.4MB instead of 95KB — bad, but the app still shows food. Slow beats
  broken.

The concern is per-image weight, not library size: 276MB of storage is nothing,
3MB for a thumbnail on a phone is not.

## Cost

~92 library recipes to backfill. Per-image pricing NOT verified — check current
rates before committing to an estimate. Whatever it is, the shape holds: one
cost per recipe, amortised across every household that ever cooks it.

## Later, once illustrations exist

### Regenerate button
An illustration is generated once and reused everywhere, which is the whole
economic argument — and also means one bad image is permanent for every
household that ever cooks that dish. There has to be a way to say "this one is
wrong" and produce a new one.

Consequences to handle rather than discover:
- Regeneration replaces the library image, so it changes the picture for
  everyone, not just the person who asked. That is correct — a wrong picture is
  wrong for all of them — but it means the control belongs in admin, or is at
  least rate-limited, or the cost is unbounded.
- The old image should be replaced at the same storage key, or every stale
  `photo_url` in a saved menu keeps pointing at the rejected one.

### User photo replaces the illustration, for that household only
If illustrations are the default, then every photograph in Fornello is someone's
actual dinner. That is a coherent thing to be, and it makes the user-photo
feature meaningful rather than decorative — a photo becomes evidence that
somebody cooked this.

**The visibility rule is the load-bearing part.** An illustration lives on
`global_recipes` and is shared. A user's photo lives on that household's row and
must never be promoted to the library, no matter how good it is. Same object
type, opposite direction of travel.

`mayEnterGlobalLibrary` does NOT cover this: it reasons about recipes, not
images, so a household photo could ride into the shared library attached to a
recipe that is itself legitimately promotable. That needs its own check.

Rendering order, per household: their own photo → the shared illustration → an
in-style placeholder. Never a stock photograph.
