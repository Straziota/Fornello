-- Add a per-user measurement-units preference to the settings table.
-- 'us' = US customary (°F, cups, tbsp, tsp, oz, lb) — the app default.
-- 'metric' = grams / mL / °C.
-- Additive & safe: existing rows get the default; getSettings() also falls back
-- to 'us' when the value is null, so generation is US even before this runs.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS units text NOT NULL DEFAULT 'us';
