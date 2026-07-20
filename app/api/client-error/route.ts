import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Receives client-side crash reports from the error boundary and emails the admin.
// Best-effort and intentionally forgiving: a failure here must never surface to the user.
export async function POST(req: Request) {
  let body: { message?: string; stack?: string; digest?: string; url?: string; userAgent?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* malformed body — still return ok */
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (apiKey && fromEmail && adminEmail) {
    const esc = (s = '') => s.replace(/[<>]/g, c => (c === '<' ? '&lt;' : '&gt;'));
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: `Fornello Alerts <${fromEmail}>`,
        to: [adminEmail],
        subject: `⚠️ App error: ${(body.message || 'Unknown error').slice(0, 80)}`,
        html: `<!DOCTYPE html><html><body style="font-family:Georgia,serif;max-width:640px;margin:24px auto;background:white;padding:24px;border:1px solid #E7E0D6;border-radius:12px;color:#2F3A32">
          <h2 style="margin:0 0 16px;color:#B23A2E">⚠️ A user hit an error</h2>
          <p><strong>Message:</strong> ${esc(body.message)}</p>
          <p><strong>Page:</strong> ${esc(body.url)}</p>
          ${body.digest ? `<p><strong>Digest:</strong> ${esc(body.digest)}</p>` : ''}
          ${body.userAgent ? `<p style="color:#7A847B;font-size:13px"><strong>Browser:</strong> ${esc(body.userAgent)}</p>` : ''}
          ${body.stack ? `<pre style="background:#F7F4EE;padding:14px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-word;color:#5E6A61">${esc(body.stack).slice(0, 4000)}</pre>` : ''}
        </body></html>`,
      });
    } catch {
      /* swallow — reporting must never throw */
    }
  }

  return NextResponse.json({ ok: true });
}
