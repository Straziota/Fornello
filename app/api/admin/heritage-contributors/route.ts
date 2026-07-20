import { NextRequest, NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';
import { getHeritageContributors, addHeritageContributor, removeHeritageContributor } from '@/lib/db';
import { sendHeritageContributorInvite } from '@/lib/email';

async function requireAdmin() {
  const ok = await checkIsAdmin();
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET() {
  const deny = await requireAdmin();
  if (deny) return deny;
  try {
    return NextResponse.json({ contributors: await getHeritageContributors() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { email, display_name, kitchen_slug, note } = await req.json();
  if (!email?.trim() || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  if (!display_name?.trim()) {
    return NextResponse.json({ error: 'Display name required (e.g. "Nonna Maria") — this is the name that will appear on all their submissions' }, { status: 400 });
  }
  if (!kitchen_slug?.trim()) {
    return NextResponse.json({ error: 'Kitchen required — pick which kitchen this contributor belongs to' }, { status: 400 });
  }
  try {
    await addHeritageContributor(email.trim(), display_name.trim(), kitchen_slug.trim(), note);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // Fire the invite email — same Resend setup as the general invites flow.
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL;
  const fromName = process.env.INVITE_FROM_NAME || 'Fornello Heritage Kitchen';
  let emailSent = false;
  let emailError: string | undefined;
  if (apiKey && fromEmail) {
    try {
      await sendHeritageContributorInvite(apiKey, fromEmail, fromName, email.trim(), display_name.trim());
      emailSent = true;
    } catch (e: any) {
      emailError = e?.message || 'Email send failed';
    }
  } else {
    emailError = 'Resend not configured — set RESEND_API_KEY and INVITE_FROM_EMAIL.';
  }

  return NextResponse.json({ ok: true, emailSent, emailError });
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
  try {
    await removeHeritageContributor(email);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
