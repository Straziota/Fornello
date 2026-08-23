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
overlap — matches cleanly and serves salmon a picture of chicken. Guard: if both
names contain a protein token and they differ, refuse regardless of score.
List: chicken, beef, pork, lamb, salmon, shrimp, prawn, fish, tofu, duck,
turkey, veal.

Verified: the guard blocks Chicken-vs-Salmon and does NOT block "Lemon Bars with
Candied Lemon Zest" vs "…Peel", which has no protein and should share. It fires
zero times against the current 77 non-side recipes — the class does not exist in
a library this small, which is precisely why it must be built before the library
grows and the backfill becomes expensive to redo.

Note: "Slow Cooker Beef Stew" vs "Slow Cooker Chicken Stew" does not reach the
threshold at all, because "slow" and "cooker" are stopwords — so that pair is
safe by accident, not by design. Do not rely on the stopword list for this.

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

### It must go through the usage ledger
Every Claude call is costed and capped via `lib/anthropic.ts`. An image API is a
new cost path, and a cost path outside the meter is the same class of gap as the
seventeen routes that never saw the household's allergies — nothing looks
broken, it simply isn't covered. `recordUsage` is currently token-shaped. Do NOT bend images into that shape:
the ledger's purpose is a dollar ceiling, and tokens were only ever a proxy for
cost. Generalise it to record cost with a unit label, letting tokens become one
input rather than the schema — which also covers whatever non-token API comes
next.

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

## Cost

~92 library recipes to backfill. Per-image pricing NOT verified — check current
rates before committing to an estimate. Whatever it is, the shape holds: one
cost per recipe, amortised across every household that ever cooks it.
