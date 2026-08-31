import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';
import { getHeritageProfileBySlug } from '@/lib/db';
import { listMembers } from '@/lib/kitchen-members';

// Everything here is owner-only. A contributor may add recipes; deciding who
// else gets in is not a contribution.
async function ownerOf(slug: string, userId: string) {
  const profile = await getHeritageProfileBySlug(slug);
  if (!profile || profile.owner_id !== userId) return null;
  return profile;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const profile = await ownerOf((await params).slug, user!.id);
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ members: await listMembers(profile.id) });
}

// Invite, or change someone's role. Roles are set explicitly by the caller —
// the form offers two buttons rather than a toggle with a default, so nobody
// grants write access by not noticing a switch.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const profile = await ownerOf((await params).slug, user!.id);
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { email, role } = await req.json();
  const address = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return NextResponse.json({ error: 'That does not look like an email address.' }, { status: 400 });
  }
  if (!['view', 'add'].includes(role)) {
    return NextResponse.json({ error: 'Choose view or add.' }, { status: 400 });
  }
  if (address === (user!.email || '').toLowerCase()) {
    return NextResponse.json({ error: 'You already own this Kitchen.' }, { status: 400 });
  }

  // Re-inviting someone previously removed restores them rather than failing on
  // the unique constraint — an owner who changed their mind should not have to
  // understand why the obvious thing does not work.
  const { error: upsertError } = await adminClient.from('kitchen_members').upsert(
    { profile_id: profile.id, email: address, role, revoked_at: null },
    { onConflict: 'profile_id,email' },
  );
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fornello.app';
  return NextResponse.json({
    ok: true,
    members: await listMembers(profile.id),
    // The owner shares this, not a sign-in link: the access page is stable and
    // safe to forward, where a link is single-use and bound to one address.
    accessUrl: `${site}/k/${profile.slug}`,
  });
}

// Removing access, never content. Their recipes stay, still attributed.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const profile = await ownerOf((await params).slug, user!.id);
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { email } = await req.json();
  await adminClient.from('kitchen_members')
    .update({ revoked_at: new Date().toISOString() })
    .eq('profile_id', profile.id).eq('email', String(email || '').toLowerCase());

  // Nothing else is needed to end their access. Membership is re-read on every
  // request rather than baked into a session, so the next thing they open is
  // already refused — even with a Fornello session that is still valid.
  return NextResponse.json({ ok: true, members: await listMembers(profile.id) });
}
