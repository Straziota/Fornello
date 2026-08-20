-- Separate "where this recipe came from" from "what it was written in the style of".
--
-- Why: the menu generator is told to take inspiration from the family's
-- favourite sites, and it stamps that site into `source_site`. That value then
-- got copied into `user_recipes.source` when a meal was saved, and rendered as
-- "Source: seriouseats.com" — telling the reader a recipe came from Serious
-- Eats when Fornello wrote it. Nothing was copied; the label was simply wrong.
--
-- One field was carrying two meanings. Now:
--   source      / source_site  = real provenance. A URL the user imported from,
--                               or a person who contributed it. Rendered "Source:".
--   inspired_by                = a stylistic nod, model-generated. Rendered
--                               "Inspired by:". Never implies authorship.
--
-- Additive & safe to re-run.

ALTER TABLE global_recipes
  ADD COLUMN IF NOT EXISTS inspired_by text;

ALTER TABLE user_recipes
  ADD COLUMN IF NOT EXISTS inspired_by text;
