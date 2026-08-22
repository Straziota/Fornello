-- Let a household choose which day their week arrives.
--
-- Until now the send day was derived: the day before the week starts. That is
-- the right DEFAULT, but not the only sensible choice — someone whose week
-- begins Monday may want the email on Friday so they can shop at the weekend.
-- Forcing that through week_start_day would move their whole planning week to
-- change a delivery preference.
--
-- NULL means "keep deriving it", so nobody is pinned to a day they never chose
-- and changing the week start still moves the email with it.
--
-- Additive & safe to re-run.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS auto_plan_day int;
