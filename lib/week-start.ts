/**
 * Which week a menu generated right now is for.
 *
 * Extracted so the generator and the auto-plan cron cannot disagree. They fire
 * on the same day for a Monday-start household — the cron sends on Sunday, and
 * Sunday is also a day manual generation plans ahead — so if their answers ever
 * diverged, the cron would overwrite a week someone had just planned by hand.
 *
 * The cutoff is Friday, not Sunday. Early in the week, "generate" means "feed
 * me now" and planning the week ahead would leave someone with nothing for
 * tonight. From Friday it means the opposite: nobody plans a week with two days
 * left in it, so a Friday or Saturday generation is the weekend shop for the
 * week to come.
 *
 * Days 0-3 from the week's start are this week; 4 onward is the next one.
 */
const PLAN_AHEAD_FROM = 4;

export function targetWeekStart(
  weekStartDay = 1,
  now: Date = new Date(),
  opts: { firstEver?: boolean } = {},
): string {
  const since = ((now.getDay() - weekStartDay) % 7 + 7) % 7;

  // A household's very first menu always covers the week they are standing in,
  // whatever day it is. Onboarding promises "I'll build your first week", and
  // someone who signs up on a Saturday evening wanting dinner should not be
  // handed a plan that starts on Monday.
  const ahead = opts.firstEver ? false : since >= PLAN_AHEAD_FROM;

  const start = new Date(now);
  start.setDate(now.getDate() + (ahead ? 7 - since : -since));
  return start.toISOString().split('T')[0];
}
