import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { saveUserFeedback } from '@/lib/db';
import { REPLY_TO_EMAIL } from '@/lib/email';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { message, category, email } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  try {
    await saveUserFeedback(user!.id, {
      message: message.trim(),
      category: category?.trim() || undefined,
      email: email?.trim() || user?.email || undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not save' }, { status: 500 });
  }

  // Fire off email notification to admin (best effort — don't block response)
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (apiKey && fromEmail && adminEmail) {
    const resend = new Resend(apiKey);
    resend.emails.send({
      from: `Fornello Feedback <${fromEmail}>`,
      replyTo: email?.trim() || user?.email || REPLY_TO_EMAIL,
      to: [adminEmail],
      subject: `New Fornello feedback${category ? ` — ${category}` : ''}`,
      html: `<!DOCTYPE html><html><body style="font-family:Georgia,serif;max-width:600px;margin:24px auto;background:white;padding:24px;border:1px solid #E7E0D6;border-radius:12px;color:#2F3A32">
        <h2 style="margin:0 0 16px;color:#4A7859">📝 New feedback</h2>
        <p><strong>From:</strong> ${email?.trim() || user?.email || '(no email)'}</p>
        ${category ? `<p><strong>Category:</strong> ${category}</p>` : ''}
        <div style="background:#F7F4EE;padding:16px;border-radius:8px;margin-top:16px;white-space:pre-line;line-height:1.6">${message.trim().replace(/[<>]/g, (c: string) => c === '<' ? '&lt;' : '&gt;')}</div>
        <p style="margin-top:24px;color:#7A847B;font-size:13px"><a href="https://www.fornello.app/admin/feedback" style="color:#4A7859">View in admin →</a></p>
      </body></html>`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
