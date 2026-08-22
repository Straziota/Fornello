-- Remember that the weekly-email offer was answered — either way.
--
-- Acceptance was durable because the cron needs it; refusal lived only in the
-- browser's localStorage. So the system reliably remembered yes and forgot no,
-- which is backwards: the person who declined got asked again on their phone,
-- while the person who accepted never had to repeat themselves. Refusal should
-- be at least as durable as acceptance.
--
-- It could not be inferred from auto_plan either, because that defaults to
-- false — a decline wrote a value indistinguishable from a never-asked account.
--
-- Additive & safe to re-run.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS auto_plan_offer_answered_at timestamptz;

-- Anyone already opted in has plainly answered.
UPDATE settings
   SET auto_plan_offer_answered_at = COALESCE(auto_plan_offer_answered_at, now())
 WHERE auto_plan AND auto_plan_offer_answered_at IS NULL;
