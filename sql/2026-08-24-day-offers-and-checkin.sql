-- Two columns for offering settings in context instead of listing them.
--
-- day_offers records which standing-preference offers a household has already
-- seen, so a declined offer is never shown again. Shape:
--   { "Thursday:minutes": "declined", "Monday:technique": "accepted" }
-- Keyed by day and kind rather than by a counter, because the question is
-- always "have we already asked this household about THIS", not "how many
-- times have we asked".
--
-- week_one_checkin_sent_at stamps the seven-day check-in so it goes once. A
-- timestamp rather than a boolean: it is also the record of when we asked,
-- which is what makes an answer interpretable later.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS day_offers               jsonb,
  ADD COLUMN IF NOT EXISTS week_one_checkin_sent_at timestamptz;

COMMENT ON COLUMN settings.day_offers IS
  'Standing-preference offers already made, keyed "<Day>:<kind>" → accepted|declined. Never re-offer a declined key.';
