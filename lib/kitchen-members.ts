import { adminClient } from './supabase-admin';

/**
 * Who may open a Kitchen, and what they may do inside it.
 *
 * Two roles, deliberately. Every additional permission is one more thing an
 * owner has to reason about while they are thinking about their grandmother,
 * and a matrix nobody understands is a matrix nobody sets correctly.
 */
export type KitchenRole = 'view' | 'add';
export type KitchenAccess = { role: KitchenRole | 'owner' } | null;

export interface Member {
  id: string;
  email: string;
  role: KitchenRole;
  invited_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
}

/**
 * What this person may do with this Kitchen — the single answer every read and
 * write is checked against.
 *
 * Membership is re-read on every request rather than baked into a session.
 * That is what makes revocation immediate: a removed member keeps whatever
 * Fornello session they had, and stops being able to open the Kitchen with it.
 */
export async function accessFor(
  profile: { id: string; owner_id: string; visibility?: string },
  user: { id: string; email?: string | null } | null,
): Promise<KitchenAccess> {
  if (user && profile.owner_id === user.id) return { role: 'owner' };
  if (profile.visibility === 'public') return { role: 'view' };
  if (!user?.email) return null;

  const { data } = await adminClient
    .from('kitchen_members')
    .select('role, revoked_at')
    .eq('profile_id', profile.id)
    .eq('email', user.email.toLowerCase())
    .maybeSingle();

  if (!data || data.revoked_at) return null;
  return { role: data.role as KitchenRole };
}

export const canRead = (a: KitchenAccess) => a !== null;
export const canAdd = (a: KitchenAccess) => a?.role === 'owner' || a?.role === 'add';

/** Editing and deleting: the owner anywhere, a contributor only their own. */
export function canEditRecipe(
  a: KitchenAccess,
  recipe: { contributed_by?: string | null },
  userId: string,
): boolean {
  if (a?.role === 'owner') return true;
  // Must still be a contributor, not merely the original author. Downgrading
  // someone to view-only is an owner saying "stop changing things"; without
  // this check they could still edit and delete everything they had added,
  // which is most of what "stop changing things" means.
  if (!canAdd(a)) return false;
  return Boolean(recipe.contributed_by && recipe.contributed_by === userId);
}

/** Quietly, so a busy owner still sees who is actually using the Kitchen. */
export function touchLastSeen(profileId: string, email: string): void {
  void adminClient
    .from('kitchen_members')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .eq('email', email.toLowerCase())
    .then(undefined, () => {});
}

export async function listMembers(profileId: string): Promise<Member[]> {
  const { data } = await adminClient
    .from('kitchen_members')
    .select('id, email, role, invited_at, last_seen_at, revoked_at')
    .eq('profile_id', profileId)
    .order('invited_at', { ascending: true });
  return (data || []) as Member[];
}

/**
 * Rate limiting for the access page, by address AND by IP.
 *
 * Without the address limit, one mailbox can be flooded from many IPs. Without
 * the IP limit, one attacker can walk a list of addresses looking for the one
 * that behaves differently — which is the whole reason the page refuses to
 * behave differently in the first place.
 */
const PER_EMAIL_PER_HOUR = 5;
const PER_IP_PER_HOUR = 20;

export async function withinRateLimit(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [byEmail, byIp] = await Promise.all([
    adminClient.from('kitchen_access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('email', email.toLowerCase()).gte('created_at', since),
    adminClient.from('kitchen_access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip).gte('created_at', since),
  ]);
  return (byEmail.count ?? 0) < PER_EMAIL_PER_HOUR && (byIp.count ?? 0) < PER_IP_PER_HOUR;
}

export async function recordAccessRequest(profileId: string, email: string, ip: string) {
  await adminClient.from('kitchen_access_requests')
    .insert({ profile_id: profileId, email: email.toLowerCase(), ip });
}
