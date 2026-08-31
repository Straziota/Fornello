import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';

// The Kitchen's name, and only when its owner said it may be shown.
//
// Default off: a page bookmarked on a phone should not hand a family's name to
// whoever borrows the phone. An unknown slug and an opted-out Kitchen return
// exactly the same empty answer, so this cannot be used to test which Kitchens
// exist either.
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({});
  const { data } = await adminClient
    .from('heritage_profiles')
    .select('person_name, access_page_shows_name')
    .eq('slug', slug).maybeSingle();
  if (!data?.access_page_shows_name) return NextResponse.json({});
  return NextResponse.json({ name: data.person_name });
}
