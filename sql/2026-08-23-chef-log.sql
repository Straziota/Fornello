-- Log what households ask Chef Claude, and what he answered.
--
-- Nothing was stored: question in, answer out, kept nowhere. So there is no
-- record of which recipes get challenged, no way to notice a recipe three
-- households all queried, and no material for the QA loop the shared library
-- would benefit from.
--
-- Owner-scoped. RLS backstop only — the app writes via the service-role client.
--
-- Additive & safe to re-run.
CREATE TABLE IF NOT EXISTS chef_questions (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  meal_name   text NOT NULL,
  question    text NOT NULL,
  answer      text,
  -- Set when the answer could not be produced, so failures are visible rather
  -- than looking like questions nobody asked.
  error       text
);

CREATE INDEX IF NOT EXISTS chef_questions_meal_idx ON chef_questions (meal_name, created_at DESC);
CREATE INDEX IF NOT EXISTS chef_questions_user_idx ON chef_questions (user_id, created_at DESC);

ALTER TABLE chef_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chef_questions_select_own ON chef_questions;
CREATE POLICY chef_questions_select_own ON chef_questions
  FOR SELECT USING (auth.uid() = user_id);
