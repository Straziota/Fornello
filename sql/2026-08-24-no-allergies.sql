-- An explicit "nobody here has an allergy", so an empty restrictions list stops
-- being ambiguous.
--
-- Until now a household with no allergies and a household that skipped the
-- question looked identical in the database: restrictions = []. That matters
-- because the two deserve opposite treatment — one can be left alone, the other
-- should be asked again before it is trusted.
--
-- A timestamp rather than a boolean: it records WHEN someone said it, so a
-- declaration made eight months and two babies ago can be re-confirmed. NULL
-- means never answered, which is exactly the state we could not previously see.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS no_allergies_confirmed_at timestamptz;
