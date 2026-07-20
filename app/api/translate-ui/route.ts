import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { translateUIStrings } from '@/lib/claude';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const { strings, targetLanguage } = await req.json();
    if (!strings || typeof strings !== 'object') {
      return NextResponse.json({ error: 'strings object required' }, { status: 400 });
    }
    const translated = await translateUIStrings(getAnthropicKey(), strings, targetLanguage || 'English');
    return NextResponse.json({ strings: translated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Translation failed' }, { status: 500 });
  }
}
