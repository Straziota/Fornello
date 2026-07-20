import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getAnthropicKey } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';
import { transcribeRecipeImage } from '@/lib/claude';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB — scans of full recipe cards can be large

// POST /api/heritage/scan
// Accepts a photo of an original (handwritten) recipe card, stores it as a
// keepsake in the recipe-photos bucket, and runs Claude vision to return a
// structured draft the contributor can review before saving. The upload
// succeeds independently of transcription, so an illegible card still keeps
// its scan and can be typed in by hand.
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let scanUrl: string;
  let bytes: ArrayBuffer;
  let mediaType: (typeof ALLOWED_TYPES)[number];

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type as never)) {
      return NextResponse.json({ error: 'Only JPG, PNG and WebP images are allowed.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Image must be under 10MB.' }, { status: 400 });
    }
    mediaType = file.type as (typeof ALLOWED_TYPES)[number];

    const ext = mediaType === 'image/webp' ? 'webp' : mediaType === 'image/png' ? 'png' : 'jpg';
    const path = `heritage-scans/${user!.id}/${Date.now()}.${ext}`;
    bytes = await file.arrayBuffer();

    const { error: uploadError } = await adminClient.storage
      .from('recipe-photos')
      .upload(path, bytes, { contentType: mediaType, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    scanUrl = adminClient.storage.from('recipe-photos').getPublicUrl(path).data.publicUrl;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }

  // Transcription is best-effort — always return the stored scan so the
  // keepsake survives even when the handwriting can't be read.
  try {
    const base64 = Buffer.from(bytes).toString('base64');
    const draft = await transcribeRecipeImage(base64, mediaType, getAnthropicKey());
    return NextResponse.json({ scan_url: scanUrl, draft });
  } catch (e: any) {
    return NextResponse.json({
      scan_url: scanUrl,
      draft: null,
      transcription_error: e.message || 'Could not read the recipe automatically — you can type it in below.',
    });
  }
}
