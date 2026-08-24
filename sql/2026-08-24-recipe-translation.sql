-- Translation as an ADDITION to a family recipe, never a replacement.
--
-- The scan transcriber is explicitly told not to translate: it preserves the
-- writer's voice, dialect and measurements ("una tazza", "un pizzico"), because
-- a grandmother's card is partly about being in her words. Translating over that
-- would quietly destroy the thing the Family Kitchen exists to keep.
--
-- So the English version lives beside the original. `original` holds the
-- untranslated recipe exactly as transcribed, `original_language` names it, and
-- the main columns hold whichever version the contributor chose to show by
-- default. Either can be displayed; neither is lost.
ALTER TABLE heritage_profile_recipes
  ADD COLUMN IF NOT EXISTS original          jsonb,
  ADD COLUMN IF NOT EXISTS original_language text;

COMMENT ON COLUMN heritage_profile_recipes.original IS
  'The recipe as written on the card, before translation. NULL when the card was already in English.';
