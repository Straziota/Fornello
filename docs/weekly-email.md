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
