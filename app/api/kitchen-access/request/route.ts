import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { withinRateLimit, recordAccessRequest } from '@/lib/kitchen-members';

// The same answer, always.
//
// This endpoint must never behave differently for an address that has access
// and one that does not — not in its body, not in its status, and as far as
// possible not in its timing. Anything else turns a bookmarkable page into an
// oracle for testing who belongs to a particular family.
const SAME_ANSWER = { ok: true, message: "If that address has access, we've sent a link." };

export async function POST(req: NextRequest) {
  const { slug, email } = await req.json().catch(() => ({}));
  const address = String(email || '').trim().toLowerCase();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

  if (!slug || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return NextResponse.json(SAME_ANSWER);
  }

  // Rate limiting comes first and is also silent. Telling someone they have
  // been limited tells them the requests were reaching something.
  if (!(await withinRateLimit(address, ip))) return NextResponse.json(SAME_ANSWER);

  const { data: profile } = await adminClient
    .from('heritage_profiles').select('id, slug, person_name').eq('slug', slug).maybeSingle();
  if (!profile) return NextResponse.json(SAME_ANSWER);

  await recordAccessRequest(profile.id, address, ip);

  const { data: member } = await adminClient
    .from('kitchen_members')
    .select('id, revoked_at')
    .eq('profile_id', profile.id).eq('email', address).maybeSingle();

  if (member && !member.revoked_at) {
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fornello.app';
    // Passwordless throughout: a password reset goes to this same inbox, so the
    // address is the credential either way. Adding one would only cost an older
    // relative a login they cannot complete.
    await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: address,
      options: { redirectTo: `${site}/family-kitchens/${profile.slug}` },
    }).then(async ({ data, error }) => {
      if (error || !data?.properties?.action_link) return;
      const { sendKitchenAccessEmail } = await import('@/lib/email');
      await sendKitchenAccessEmail(
        {
          resendApiKey: process.env.RESEND_API_KEY!,
          fromEmail: process.env.INVITE_FROM_EMAIL!,
          fromName: process.env.INVITE_FROM_NAME || 'Fornello',
        },
        address,
        { link: data.properties.action_link, kitchenName: profile.person_name },
      ).catch(() => {});
    }).catch(() => {});
  }

  return NextResponse.json(SAME_ANSWER);
}
