import { NextRequest, NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';
import { sendInviteEmail } from '@/lib/email';

async function requireAdmin() {
  const ok = await checkIsAdmin();
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET() {
  const deny = await requireAdmin();
  if (deny) return deny;

  // Pull the allowlist + every signed-up user, then join in JS
  const [{ data: invites }, { data: usersResp }] = await Promise.all([
    adminClient.from('allowed_signups').select('email, note, added_at').order('added_at', { ascending: false }),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const signedUpEmails = new Set<string>(
    (usersResp?.users || []).map((u: any) => (u.email || '').toLowerCase())
  );

  const list = (invites || []).map((row: any) => ({
    email: row.email,
    note: row.note || '',
    added_at: row.added_at,
    signedUp: signedUpEmails.has((row.email || '').toLowerCase()),
  }));

  return NextResponse.json({ invites: list });
}

export async function POST(req: NextRequest) {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { email, note } = await req.json();
  const clean = (email || '').trim().toLowerCase();
  if (!clean || !clean.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const { error } = await adminClient.from('allowed_signups').upsert(
    { email: clean, note: (note || '').trim() || null },
    { onConflict: 'email' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Optional: send an invite email if Resend is configured
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL;
  const fromName = process.env.INVITE_FROM_NAME || 'Fornello';
  let emailSent = false;
  let emailError: string | undefined;
  if (apiKey && fromEmail) {
    try {
      await sendInviteEmail(apiKey, fromEmail, fromName, clean, 'Claudia');
      emailSent = true;
    } catch (e: any) {
      emailError = e?.message || 'Email send failed';
    }
  }

  return NextResponse.json({ ok: true, emailSent, emailError });
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const { error } = await adminClient.from('allowed_signups').delete().eq('email', email.toLowerCase());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
