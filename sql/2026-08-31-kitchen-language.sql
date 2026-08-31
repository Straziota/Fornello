-- A second language for a Kitchen, for the relatives who would rather read it
-- that way. One, not a list: a Kitchen has a family, and a family usually has
-- one other language.
ALTER TABLE heritage_profiles
  ADD COLUMN IF NOT EXISTS second_language text;
