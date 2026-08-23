-- Records that we changed a household's allergy entries on their behalf.
--
-- Two of the four households with a declared allergy had written it in a form
-- the deterministic checks could not see — "Nut sllergy", "Nut Allergy". The
-- word reaches the prompt and a model can usually infer it, but the theme
-- filter and the recipe warning both match on ingredient names and saw nothing.
-- They believed they had declared a nut allergy; two of three safeguards
-- disagreed.
--
-- Corrected directly, because a nut allergy that two safeguards cannot see is a
-- risk sitting in production and the correction only ever adds. But an edit to
-- someone's allergy record must not be silent: this stores what it was, what it
-- became, and whether they have seen the notice.
--
-- Additive & safe to re-run.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS restrictions_corrected jsonb;
