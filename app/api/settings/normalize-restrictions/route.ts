import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getAnthropicKey } from '@/lib/auth';
import { normalizeRestrictions } from '@/lib/normalize-restrictions';

// Normalise what a household typed, and hand back BOTH versions so the UI can
// show what was understood. A silent correction is its own hazard: if we read
// "Nut sllergy" as tree nuts and are wrong, nobody ever finds out.
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  void user;

  const { restrictions } = await req.json();
  if (!Array.isArray(restrictions)) {
    return NextResponse.json({ error: 'restrictions must be an array' }, { status: 400 });
  }

  try {
    const out = await normalizeRestrictions(getAnthropicKey(), restrictions);
    return NextResponse.json({ ...out, original: restrictions });
  } catch (e: any) {
    // Failing open is right here: an unnormalised restriction still reaches the
    // prompt verbatim, which is what happens today. Blocking the save would be
    // worse than a slightly messy entry.
    return NextResponse.json({ normalized: restrictions, changed: false, original: restrictions, error: e.message });
  }
}
