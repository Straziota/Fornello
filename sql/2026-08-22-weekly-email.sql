-- Weekly menu email: preference + unsubscribe.
--
-- These users signed up for an app, not a mailing list. So: opt-out stored per
-- household, and a token that unsubscribes in one click without logging in —
-- an unsubscribe that requires a password is not an unsubscribe.
--
-- Default TRUE is deliberate and worth stating: the email carries the week they
-- already asked us to plan, not marketing. Anyone who disagrees gets out from
-- the footer of the first one.
--
-- Additive & safe to re-run.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS weekly_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_token uuid NOT NULL DEFAULT gen_random_uuid();

-- One-click unsubscribe looks the token up directly.
CREATE UNIQUE INDEX IF NOT EXISTS settings_email_token_idx ON settings (email_token);
