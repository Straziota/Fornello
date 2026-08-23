import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { sendRestrictionCorrectionEmail } from '@/lib/email';

export const maxDuration = 300;

// Tells the households whose allergy entry we rewrote that we rewrote it.
//
// A route rather than a script because Vercel's `env pull` returns "" for
// encrypted values, so the Resend key only exists inside a deployment.
//
// Guarded by the service-role key, which already grants everything this does.
// Dry by default; ?preview=<address> sends one sample copy and writes nothing.
export async function POST(req: NextRequest) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || req.headers.get('authorization') !== `Bearer ${key}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL;
  if (!resendApiKey || !fromEmail) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }
  const creds = { resendApiKey, fromEmail, fromName: process.env.INVITE_FROM_NAME || 'Fornello' };
  const settingsUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fornello.app'}/settings`;

  const preview = req.nextUrl.searchParams.get('preview');
  if (preview) {
    await sendRestrictionCorrectionEmail(creds, preview, {
      from: ['Nut sllergy', 'No pork'], to: ['Tree nuts', 'Peanuts', 'Pork'], settingsUrl,
    });
    return NextResponse.json({ preview: preview });
  }

  const send = req.nextUrl.searchParams.get('send') === '1';
  const db = adminClient;
  const { data: rows } = await db.from('settings').select('user_id, restrictions_corrected');
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const email = Object.fromEntries((list?.users || []).map((u: { id: string; email?: string }) => [u.id, u.email]));

  const results: string[] = [];
  for (const r of rows || []) {
    const c = r.restrictions_corrected as { from: string[]; to: string[]; notifiedAt?: string } | null;
    if (!c || c.notifiedAt) continue;          // corrected households only, once each
    const to = email[r.user_id];
    if (!to) { results.push(`${r.user_id}: no email`); continue; }
    if (!send) { results.push(`would send -> ${to}`); continue; }
    try {
      await sendRestrictionCorrectionEmail(creds, to, { from: c.from, to: c.to, settingsUrl });
      await db.from('settings')
        .update({ restrictions_corrected: { ...c, notifiedAt: new Date().toISOString() } })
        .eq('user_id', r.user_id);
      results.push(`sent -> ${to}`);
    } catch (e) {
      results.push(`FAILED -> ${to}: ${(e as Error).message}`);
    }
  }
  return NextResponse.json({ dry: !send, results });
}
