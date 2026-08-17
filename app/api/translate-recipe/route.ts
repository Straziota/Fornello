import { NextRequest, NextResponse } from 'next/server';
import { translateToEnglish } from '@/lib/claude';
import { requireUser } from '@/lib/auth';

// Called by the browser extension, which sends the session cookie — middleware
// already 401s anonymous callers, and requireUser() resolves the same session so
// the Claude spend is metered against whoever's extension made the request.
export async function POST(req: NextRequest) {
  const { error: authError } = await requireUser('translate-recipe');
  if (authError) return authError;
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
