-- Give Family Kitchen recipes the two fields the curated `template_recipes`
-- already have: the family story behind the dish, and its regional variants.
--
-- Why: RecipeCardModal already renders `background` and `variants` — the
-- curated Heritage Kitchen passes both. Family Kitchen recipes could not,
-- because the table had nowhere to put them. In an heirloom app the story is
-- the heirloom; without this, moving a curated recipe into someone's own
-- kitchen silently drops the very thing worth keeping.
--
-- Additive & safe to re-run.

ALTER TABLE heritage_profile_recipes
  -- Free prose: where the dish comes from, who cooked it, when it was made.
  ADD COLUMN IF NOT EXISTS background text,
  -- [{ name, note }] — regional or family variations on the base recipe.
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]';
