import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/db';
import { adminClient } from '@/lib/supabase-admin';
import { applyOffer, offerKey, type DayOffer, type OfferLog } from '@/lib/day-offers';

// POST /api/settings/day-offer
// Accept or decline one standing-preference offer. Accepting writes the per-day
// setting; both outcomes are recorded so the same question is never asked twice.
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { offer, accepted } = await req.json() as { offer: DayOffer; accepted: boolean };
  if (!offer?.day || !offer?.kind) {
    return NextResponse.json({ error: 'Bad offer' }, { status: 400 });
  }

  const settings = await getSettings(user!.id);
  if (accepted) {
    await saveSettings(user!.id, {
      ...settings,
      schedule: applyOffer(settings.schedule || {}, offer),
    });
  }

  // Declines matter more than accepts here: an offer that keeps coming back
  // after "no thanks" is worse than never having offered.
  const log: OfferLog = { ...(settings as any).dayOffers || {} };
  log[offerKey(offer.day, offer.kind)] = accepted ? 'accepted' : 'declined';
  const { error: logError } = await adminClient
    .from('settings').update({ day_offers: log }).eq('user_id', user!.id);
  if (logError) {
    // Column not there yet. The setting still saved, which is the part that
    // matters; the household may just see this offer once more.
    console.warn('[day-offer] could not record decision:', logError.message);
  }

  return NextResponse.json({ ok: true, recorded: !logError });
}
