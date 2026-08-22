-- Who is receiving weeks without ever showing a sign of life?
--
-- Run this before deciding whether a hard stop is needed. The reason to stop is
-- deliverability, not cost: Gmail and Outlook score senders on engagement, and a
-- tail of never-engaging accounts drags the domain down for the households who
-- DO want their Sunday menu. Dead accounts poison the channel for live ones.
--
-- The threshold worth acting on: two unanswered asks and no engagement of any
-- kind across roughly a year. Someone who read every Sunday and cooked from it
-- for twelve months without once opening the shopping list, rating a meal,
-- swapping a dish or answering an ask is close to hypothetical.

SELECT
  u.email,
  s.auto_plan,
  s.auto_plan_ignored                                   AS quiet_weeks,
  s.auto_plan_asks_sent                                 AS asks_sent,
  s.last_engaged_at,
  CASE
    WHEN s.last_engaged_at IS NULL THEN NULL
    ELSE date_part('day', now() - s.last_engaged_at)::int
  END                                                   AS days_since_any_engagement,
  (SELECT count(*) FROM menus m
    WHERE m.user_id = s.user_id AND m.auto_planned)      AS weeks_we_planned,
  (SELECT count(*) FROM menus m
    WHERE m.user_id = s.user_id AND m.auto_planned AND m.engaged_at IS NOT NULL)
                                                        AS of_those_engaged
FROM settings s
JOIN auth.users u ON u.id = s.user_id
WHERE s.auto_plan
ORDER BY s.last_engaged_at NULLS FIRST;
