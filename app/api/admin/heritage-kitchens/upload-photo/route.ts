import { NextRequest, NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 8 * 1024 * 1024; // 8MB — kitchen photos tend to be larger

export async function POST(req: NextRequest) {
  const ok = await checkIsAdmin();
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const slug = (formData.get('slug') as string | null) || `kitchen-${Date.now()}`;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG and WebP images are allowed.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Image must be under 8MB.' }, { status: 400 });
    }

    const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
    const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const path = `kitchens/${safeSlug}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await adminClient.storage
      .from('recipe-photos')
      .upload(path, bytes, { contentType: file.type, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = adminClient.storage.from('recipe-photos').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}
