import { NextRequest, NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';
import { getHeritageKitchens, saveHeritageKitchen, deleteHeritageKitchen } from '@/lib/db';

async function requireAdmin() {
  const ok = await checkIsAdmin();
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET() {
  const deny = await requireAdmin();
  if (deny) return deny;
  try {
    return NextResponse.json({ kitchens: await getHeritageKitchens() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const body = await req.json();
  if (!body.slug?.trim()) return NextResponse.json({ error: 'Slug required' }, { status: 400 });
  if (!body.contributor?.trim()) return NextResponse.json({ error: 'Contributor required' }, { status: 400 });
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  if (!body.country?.trim()) return NextResponse.json({ error: 'Country required' }, { status: 400 });
  if (!body.image_url?.trim()) return NextResponse.json({ error: 'Photo required' }, { status: 400 });
  try {
    await saveHeritageKitchen({
      slug: body.slug, contributor: body.contributor, name: body.name,
      country: body.country, image_url: body.image_url,
      href: body.href || null, display_order: body.display_order ?? 0,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
  try {
    await deleteHeritageKitchen(slug);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
