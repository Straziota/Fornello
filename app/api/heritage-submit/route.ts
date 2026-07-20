import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getContributorByEmail, saveHeritageSubmission } from '@/lib/db';
import { REPLY_TO_EMAIL } from '@/lib/email';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  // Gate: must be an approved contributor — and we take the display name from the
  // server-side record, not whatever the client posts. That keeps the contributor
  // name consistent across every submission from this email.
  const contributor = await getContributorByEmail(user!.email || '');
  if (!contributor) {
    return NextResponse.json(
      { error: 'You\'re not on the contributor list yet. Contact Claudia to be added.' },
      { status: 403 }
    );
  }
  const contributorName = contributor.display_name || user!.email || 'Anonymous';

  const body = await req.json();
  const required = ['recipe_name', 'ingredients', 'instructions'] as const;
  for (const f of required) {
    if (!body[f]?.toString().trim()) {
      return NextResponse.json({ error: `Missing required field: ${f}` }, { status: 400 });
    }
  }

  try {
    await saveHeritageSubmission(user!.id, {
      submitter_email: user!.email,
      contributor_name: contributorName,
      kitchen_slug: contributor.kitchen_slug,
      recipe_name: body.recipe_name.trim(),
      cuisine: body.cuisine?.trim() || undefined,
      cultural_background: body.cultural_background?.trim() || undefined,
      ingredients: body.ingredients.trim(),
      instructions: body.instructions.trim(),
      wisdom: body.wisdom?.trim() || undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not save' }, { status: 500 });
  }

  // Email notification to admin
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (apiKey && fromEmail && adminEmail) {
    const resend = new Resend(apiKey);
    resend.emails.send({
      from: `Fornello Heritage <${fromEmail}>`,
      replyTo: user!.email || REPLY_TO_EMAIL,
      to: [adminEmail],
      subject: `🥄 New Heritage recipe submission: ${body.recipe_name}`,
      html: `<!DOCTYPE html><html><body style="font-family:Georgia,serif;max-width:600px;margin:24px auto;background:white;padding:24px;border:1px solid #E7E0D6;border-radius:12px;color:#2F3A32">
        <h2 style="margin:0 0 16px;color:#4A7859">🥄 New Heritage Kitchen submission</h2>
        <p><strong>From:</strong> ${user!.email || '(no email)'}</p>
        <p><strong>Contributor:</strong> ${contributorName}</p>
        <p><strong>Recipe:</strong> ${body.recipe_name}${body.cuisine ? ` (${body.cuisine})` : ''}</p>
        <p style="margin-top:24px;color:#7A847B;font-size:13px"><a href="https://www.fornello.app/admin/heritage/submissions" style="color:#4A7859">Review in admin →</a></p>
      </body></html>`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
