-- Per-user metering of Claude spend, plus the plan that sets each user's cap.
--
-- Why: every /api route that calls Claude was previously uncapped, so a single
-- account in a loop was an unbounded charge on the Anthropic bill. ai_usage is
-- the ledger; settings.plan picks which ceiling in PLAN_MONTHLY_AI_BUDGET_USD
-- (lib/usage.ts) applies. The same ledger is what paid plan limits will read
-- once billing lands, so it is deliberately per-call rather than a rollup.
--
-- Additive & safe to re-run.

-- 1. Plan on the existing settings table. Everyone starts on 'free'.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

-- 2. The usage ledger. One row per Claude API call.
CREATE TABLE IF NOT EXISTS ai_usage (
  id                     bigserial PRIMARY KEY,
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at             timestamptz NOT NULL DEFAULT now(),
  feature                text,
  model                  text NOT NULL,
  input_tokens           integer NOT NULL DEFAULT 0,
  output_tokens          integer NOT NULL DEFAULT 0,
  cache_read_tokens      integer NOT NULL DEFAULT 0,
  cache_creation_tokens  integer NOT NULL DEFAULT 0,
  -- 8 decimal places: a single Haiku call can cost well under a hundredth of a cent.
  cost_usd               numeric(12, 8) NOT NULL DEFAULT 0
);

-- Every quota check is "sum cost_usd for this user since the 1st", so the
-- index leads with user_id and carries created_at for the range scan.
CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx
  ON ai_usage (user_id, created_at DESC);

-- 3. RLS. Writes only ever happen through the service-role admin client, so
-- there is no insert/update/delete policy at all — only a read policy, so a
-- user can see their own consumption in the app.
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_select_own ON ai_usage;
CREATE POLICY ai_usage_select_own ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);
