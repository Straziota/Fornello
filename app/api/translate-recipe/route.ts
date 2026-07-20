import { NextRequest, NextResponse } from 'next/server';
import { translateToEnglish } from '@/lib/claude';

// No auth required — used by the browser extension (localhost only in production)
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    const body = await req.json();
    const translated = await translateToEnglish(apiKey, body);
    return NextResponse.json(translated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Translation failed' }, { status: 500 });
  }
}
