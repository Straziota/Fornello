import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { translateContent } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const body = await req.json();
    const { targetLanguage, ...content } = body;
    const translated = await translateContent(getAnthropicKey(), content, targetLanguage);
    return NextResponse.json(translated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Translation failed' }, { status: 500 });
  }
}
