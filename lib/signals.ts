import { adminClient } from './supabase-admin';

/**
 * Behaviour worth recording now, so it can be used later.
 *
 * The week-one suggestion engine picks from absences — "hasn't asked Chef
 * Claude", "the list was empty" — because absences are the only thing stored.
 * An absence cannot distinguish someone who tried a feature and disliked it
 * from someone who never found it, which is exactly the distinction a
 * suggestion needs.
 *
 * Both writers below are deliberately silent and never awaited by their caller.
 * A signal is not worth one millisecond of a user's time, and it is certainly
 * not worth an error: if the column is missing or the write fails, the thing
 * the user actually asked for must still happen.
 */

/** A meal was swapped out of a week. Repeated swaps mean "nearly right". */
export function recordSwap(userId: string, menuId: number): void {
  void (async () => {
    try {
      const { data } = await adminClient
        .from('menus').select('swaps').eq('id', menuId).eq('user_id', userId).maybeSingle();
      // Read-modify-write rather than an RPC increment: swaps are rare, one per
      // deliberate human action, so there is no contention to lose.
      await adminClient.from('menus')
        .update({ swaps: ((data?.swaps as number) ?? 0) + 1 })
        .eq('id', menuId).eq('user_id', userId);
    } catch { /* a signal must never break the thing it observes */ }
  })();
}

/** The shopping list for a week was opened. First time only. */
export function recordGroceriesOpened(userId: string, menuId: number): void {
  void (async () => {
    try {
      await adminClient.from('menus')
        .update({ groceries_opened_at: new Date().toISOString() })
        .eq('id', menuId).eq('user_id', userId)
        .is('groceries_opened_at', null);
    } catch { /* as above */ }
  })();
}
