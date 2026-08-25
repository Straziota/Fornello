-- Two signals worth having, both only collectable going forward.
--
-- The week-one suggestion engine currently picks from ABSENCES — "hasn't asked
-- Chef Claude", "the list was empty" — because those are the only things the
-- database records. Absence is a weak signal: it cannot tell someone who tried
-- a feature and disliked it from someone who never found it.
--
-- Both of these are per-menu rather than per-household, which is the
-- granularity the check-in actually needs: what happened during THAT week, not
-- ever. Same argument as the Chef Claude logging — record now, use later.
ALTER TABLE menus
  -- How many meals were swapped out of this week. Repeated swapping is the
  -- clearest signal that the menu was nearly right rather than wrong.
  ADD COLUMN IF NOT EXISTS swaps int NOT NULL DEFAULT 0,
  -- First time the shopping list for this week was opened. A timestamp rather
  -- than a flag: "opened it on the Sunday" and "opened it on the Thursday" are
  -- different behaviours.
  ADD COLUMN IF NOT EXISTS groceries_opened_at timestamptz;
