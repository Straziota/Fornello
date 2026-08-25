# The weekly email

Fornello plans the week and emails it, so coming back is optional. This is the
one part of the product that runs without anyone opening it, which is exactly
why its failure modes are quiet ones.

## What runs

One route, `app/api/cron/auto-plan/route.ts`, on a daily schedule:

```json
{ "crons": [ { "path": "/api/cron/auto-plan?send=1", "schedule": "0 12 * * *" } ] }
```

Every day it selects households with `auto_plan = true` and `auto_plan_paused =
false`, works out whether *tomorrow* is the day their week begins, and for those
it matches: generates the menu and grocery list if they don't already have one,
then sends it.

`?send=1` is what arms it. Without that parameter the route is a dry run — it
reports what it would have done and sends nothing. `?day=N` and `?allDays=1`
make a specific slot testable without waiting for the calendar.

## Why noon UTC

The send is timed to when someone can act on it, not to when it is convenient to
run. A Monday-start household is emailed on Sunday; Sunday morning is when people
plan and shop. `0 12 * * *` is 8am Eastern — the moment the email is useful.

The obvious alternative, 22:00 UTC, is 6pm Eastern. That lands Sunday evening,
too late to buy anything for a week starting the next morning.

**The assumption, stated plainly:** this is correct for Eastern, tolerable at 5am
Pacific, and wrong for anyone in Europe, where it arrives mid-afternoon. That is
fine for fifteen households who are all known personally. It stops being fine
somewhere around a hundred, and the fix then is timezone-aware sending — storing
a timezone per household and bucketing the daily run — not a different single
hour. Nobody should be surprised by this later.

## The failure this pipeline already had

Between 22 August and 23 August 2026 the entire thing was built, tested, and
unreachable. The commit that turned a single Sunday send into a daily
per-household send deleted `vercel.json` and renamed the route, and never wrote
the replacement schedule. No error was ever raised: an unscheduled route is
silent, and a schedule pointing at a route that no longer exists is a 404 nobody
reads.

`scripts/cron-coverage.mjs` now asserts both directions — every cron route has a
schedule pointing at it, and every scheduled path resolves to a route that
exists. It runs on `prebuild`, so a deploy that disconnects them fails.

This was the fifth instance in one day of the same shape: allergies fetched and
discarded, an unsubscribe pointing at a dead flag, an `appearance` column written
and never selected, `weekly_email` defaulting to true, and this. None were broken
code. All were **disconnected** code, and none of them errored. That is the class
of bug this codebase actually has, and the checks worth writing are the ones that
assert two things are still wired to each other.

## Rollout

1. Ship the schedule at `send=1`. Harmless while nobody is opted in — it runs,
   finds nobody, does nothing — and it is the only way to prove the schedule
   actually fires.
2. Opt in the owner's own account.
3. One week as user zero. A real end-to-end run with a recipient who will notice
   anything wrong.
4. Then invite real households.

## The week-one check-in

Seven days after a household's first menu, once. `/api/cron/week-one?send=1`,
daily at 13:00 UTC — an hour after the auto-plan run, so the two never contend
for the same minute.

Email rather than in-app, deliberately. An in-app check-in reaches only the
people who came back, which is exactly the wrong half: the households this
exists for are the ones drifting, and they are not opening the app.

Two shapes:

**Used the week** — up to three questions, each derived from something that
actually happened, each one tap, each writing a real setting. Not a
questionnaire, and never a list of settings. If nothing specific was observed,
nothing is sent: "here's what I noticed" followed by nothing is a generic
message wearing a specific subject line.

**Did nothing** — no tuning questions at all. One honest question, "Did it
work?", and a reply that reaches a person. That is customer development
arriving at the right moment from someone with a legitimate reason to ask, and
it is currently the most valuable thing this feature can produce.

Silence deliberately does NOT require an unopened menu. An earlier definition
did, and against real data it produced zero silent households — everyone who
generated a menu also glanced at it once, months ago, and never returned. Those
are precisely the households the variant is for. Generating one menu, looking at
it, and never rating, asking or generating again is doing nothing.

### One suggestion, never a list

A catalogue of adjustable settings turns a specific message into a feature menu
and is functionally the settings page relocated into an inbox. So: one
capability they have not used, chosen from behaviour, with a button that opens
the screen — never a path like "Settings → Cooking Schedule".

Only observable signals are used. "Never opened the grocery list" would be a
good suggestion and is in the original brief, but nothing records grocery-list
opens; a suggestion picked from a signal we do not have is a guess wearing
behaviour's clothes. What IS observable: ratings, Chef Claude questions, menu
count, heritage recipes and scans, auto-plan state, and the hour a menu was
generated. Swap counts are not recorded either — if swap logging ever lands,
`pickSuggestion` is the first caller that wants it.

### The window, and why the cron is not armed

The check-in fires between 7 and 21 days after a household's first menu. The
upper bound is not tidiness: without it, the first armed run sends a "week one"
check-in to everyone who ever generated a menu, including households whose first
week was four months ago. That is a cold email wearing a check-in's clothes, and
it spends the one moment this message is credible. Anyone past the window has
missed it — the correct outcome, not a backlog to flush.

The schedule is deliberately registered WITHOUT `?send=1`, so it runs daily and
reports who it would reach without writing to anyone. It is the only piece of
this work that contacts strangers, and the households in range have not heard
from Fornello in weeks. Arming it is one edit to vercel.json.

### Later, not now

Once auto-plan is running for real households, the weekly menu email is a better
home for feature discovery than any one-off: a single rotating line at the
bottom, drawn from what a household has not touched, inside a message they
already open for the food. A slow drip through an existing channel beats a
catalogue in a message sent once. Not built.
