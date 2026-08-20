-- Marks when a household finished the first-run questionnaire.
--
-- Distinct from has_seen_tour: the tour is a UI walkthrough, onboarding is what
-- makes the first menu personal. NULL means they have never answered, so they
-- are sent to /welcome on their next visit.
--
-- Additive & safe to re-run.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Everyone who already has settings predates onboarding. Without this line they
-- would all be marched through the questionnaire on next login — and it REWRITES
-- the weekly schedule from two simple answers, which would wipe per-day meal
-- types and cooking techniques that are already configured.
-- Their existing setup is the answer. Stamp it and leave them alone.
UPDATE settings
   SET onboarded_at = COALESCE(onboarded_at, now())
 WHERE onboarded_at IS NULL;

SELECT count(*) FILTER (WHERE onboarded_at IS NOT NULL) AS already_onboarded,
       count(*) FILTER (WHERE onboarded_at IS NULL)     AS will_see_questionnaire
  FROM settings;
