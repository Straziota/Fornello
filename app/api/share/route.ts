import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import { generateRecipePDF } from '@/lib/pdf';
import { sendRecipeEmail } from '@/lib/email';

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const { recipe, toEmail } = await req.json();
    const settings = await getSettings(user!.id) as any;

    const resendApiKey = process.env.RESEND_API_KEY || settings.resendApiKey;
    const fromEmail = process.env.FROM_EMAIL || settings.fromEmail;

    if (!resendApiKey || !fromEmail) {
      return NextResponse.json({ error: 'Email not configured.' }, { status: 400 });
    }

    const pdfBuffer = await generateRecipePDF(recipe);
    const fornelloJson = JSON.stringify({ fornello: '1.0', type: 'recipe', data: recipe }, null, 2);

    await sendRecipeEmail(
      { resendApiKey, fromEmail, fromName: settings.emailFromName || 'Fornello' },
      toEmail, recipe, pdfBuffer, fornelloJson
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
