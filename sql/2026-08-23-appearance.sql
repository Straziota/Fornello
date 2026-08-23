-- What the dish looks like, written by whoever wrote the recipe.
--
-- The illustrator was naming ingredients and hoping the image model knew what
-- they looked like. "Guanciale" is a weak visual prior — a specialist word the
-- model has no confident picture of — so it painted generic diced pork. Same
-- reason a cider braise came out ivory and gricia came out as spaghetti in red
-- sauce: the prompt named things instead of describing them.
--
-- The recipe generator already writes about the dish and knows its ingredients
-- and method, so asking it for one visual sentence costs almost nothing, is
-- written once, stores with the recipe, and gives the illustrator real material
-- every time. Fixes pasta shape, sauce colour and unrecognisable ingredients as
-- one change rather than three.
--
-- Additive & safe to re-run.
ALTER TABLE global_recipes ADD COLUMN IF NOT EXISTS appearance text;
ALTER TABLE user_recipes   ADD COLUMN IF NOT EXISTS appearance text;
