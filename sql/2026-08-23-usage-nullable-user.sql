-- Company-paid usage has no household to bill.
--
-- ai_usage.user_id was NOT NULL, so every company-paid insert failed. The
-- helper logs and returns, so 77 illustrations were generated and none were
-- recorded — roughly $3 of spend invisible to the ledger. A cost path outside
-- the meter is exactly the class of gap the coverage audit exists to prevent,
-- and it failed silently because nothing downstream reads those rows yet.
--
-- Safe: only relaxes a constraint.
ALTER TABLE ai_usage ALTER COLUMN user_id DROP NOT NULL;
