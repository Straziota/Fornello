-- Generalise the ledger from tokens to cost.
--
-- Its purpose was always a dollar ceiling; tokens were a proxy. An image API is
-- priced per image, and bending that into a token shape would leave the schema
-- lying about what it measures — and would need bending again for whatever
-- non-token API comes next.
--
-- `payer` matters as much as the unit. Every other AI cost belongs to the
-- household that caused it. An illustration does not: it is generated once and
-- reused by every household that ever cooks that dish, so billing whoever
-- happened to trigger it would mean the first family pays for a picture the
-- next hundred use free — and could have their monthly cap consumed generating
-- assets for the shared library. Illustrations are a COMPANY cost and must not
-- count against a household ceiling.
--
-- Additive & safe to re-run.
ALTER TABLE ai_usage
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'tokens',
  ADD COLUMN IF NOT EXISTS units numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payer text NOT NULL DEFAULT 'household';

CREATE INDEX IF NOT EXISTS ai_usage_payer_idx ON ai_usage (payer, created_at DESC);
