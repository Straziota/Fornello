import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { translateRecipeDraft } from '@/lib/translate-recipe';

// POST /api/heritage/translate
// Turn a transcribed card into English (or any target language) WITHOUT
// discarding the original. The caller keeps both and decides which to show.
export async function POST(req: NextRequest) {
  const { error } = await requireUser('heritage:translate');
  if (error) return error;

  const body = await req.json();
  const draft = body?.draft;
  if (!draft || typeof draft !== 'object') {
    return NextResponse.json({ error: 'No recipe to translate.' }, { status: 400 });
  }
  const from = String(body.from || '').trim() || 'the original language';
  const to = String(body.to || 'English').trim() || 'English';

  try {
    // anthropicClient() meters the call itself against the ambient user
    // context requireUser() set up — nothing to record here.
    const translation = await translateRecipeDraft(draft, from, to, getAnthropicKey());
    return NextResponse.json({ translation, from, to });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Could not translate this recipe. The original is unchanged.' },
      { status: 500 },
    );
  }
}
