-- Ask rather than assume, and give the email something worth tapping.
-- Additive & safe to re-run.

-- When we last asked "still want these?", so we ask once and then wait for an
-- answer instead of nagging.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS auto_plan_asked_at timestamptz;
