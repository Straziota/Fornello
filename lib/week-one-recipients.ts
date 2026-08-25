import { adminClient } from './supabase-admin';
import { analyseWeekOne, type WeekOne } from './week-one';

export type CheckInVariant = 'week-one' | 'long-silent' | 'questions';

export interface Recipient {
  userId: string;
  email: string;
  token: string;
  variant: CheckInVariant;
  week: WeekOne;
  days: number;
}

/**
 * Who is due a week-one check-in, resolved in ONE place.
 *
 * There were two implementations of this — the cron and the preview script —
 * and they disagreed. The cron selected from `settings`; the preview walked the
 * auth user list. A household with menus but no settings row therefore appeared
 * in the preview and was invisible to the sender, so the report of who would be
 * emailed was simply wrong. Two implementations of "who gets mail" will always
 * drift, and the one that drifts silently is the report.
 *
 * So selection starts from MENUS — having generated a week is what makes a
 * household eligible, and it is the only fact that cannot be missing — then
 * fills in whatever the settings row owes, creating one where it does not exist
 * so there is always a token for the unsubscribe link.
 */
export async function weekOneRecipients(): Promise<{
  due: Recipient[];
  skipped: { email: string; days: number; reason: string }[];
}> {
  const db = adminClient;

  const { data: menuRows } = await db.from('menus').select('user_id');
  const userIds = [...new Set((menuRows || []).map(m => m.user_id as string))];

  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const email = Object.fromEntries(
    (list?.users || []).map((u: { id: string; email?: string }) => [u.id, u.email || '']),
  );

  const due: Recipient[] = [];
  const skipped: { email: string; days: number; reason: string }[] = [];

  for (const userId of userIds) {
    const to = email[userId];
    const week = await analyseWeekOne(userId);
    if (!week) continue;
    const days = (Date.now() - new Date(week.firstMenuAt).getTime()) / 86_400_000;
    const note = (reason: string) => skipped.push({ email: to || userId, days, reason });

    if (!to) { note('no email address'); continue; }

    let { data: settings } = await db
      .from('settings').select('email_token, week_one_checkin_sent_at, auto_plan')
      .eq('user_id', userId).maybeSingle();

    if (settings?.week_one_checkin_sent_at) { note('already sent'); continue; }
    if (settings?.auto_plan) { note('auto-plan on — rides on the weekly menu'); continue; }
    if (days < 7) { note('too early'); continue; }

    const variant: CheckInVariant | null = week.silent
      ? (days <= 21 ? 'week-one' : 'long-silent')
      : (days <= 21 && week.questions.length ? 'questions' : null);
    if (!variant) { note(days > 21 ? 'used it and moved on' : 'nothing observed'); continue; }

    // No settings row means no token, and no token means no unsubscribe link —
    // which is the one thing that must never be missing from an email to
    // someone who has stopped using the product.
    if (!settings?.email_token) {
      const { data: created } = await db
        .from('settings').upsert({ user_id: userId }, { onConflict: 'user_id' })
        .select('email_token, week_one_checkin_sent_at, auto_plan').single();
      settings = created ?? settings;
    }
    if (!settings?.email_token) { note('could not obtain an email token'); continue; }

    due.push({ userId, email: to, token: settings.email_token as string, variant, week, days });
  }
  return { due, skipped };
}
