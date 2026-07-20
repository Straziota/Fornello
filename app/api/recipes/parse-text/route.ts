import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeFromText } from '@/lib/claude';

// No auth — used by the browser extension. Pattern matches /api/translate-recipe.
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

    const body = await req.json();
    const { url, platform, pageText, ogTitle, ogDescription } = body;
    if (!url || !pageText) {
      return NextResponse.json({ error: 'url and pageText required' }, { status: 400 });
    }

    // For YouTube, fetch the transcript server-side — much richer than what the DOM gives us.
    let transcript = '';
    if (platform === 'youtube') {
      transcript = await fetchYouTubeTranscript(url).catch(() => '');
    }

    const recipe = await parseRecipeFromText(apiKey, {
      url,
      platform,
      pageText,
      ogTitle,
      ogDescription,
      transcript,
    });

    if (!recipe) {
      return NextResponse.json({ error: 'No recipe found in this post.' }, { status: 422 });
    }

    return NextResponse.json(recipe);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Parsing failed' }, { status: 500 });
  }
}

// Pulls captions from YouTube's timedtext endpoint. Works for videos with auto-generated
// or manual captions. Returns empty string if captions are unavailable.
async function fetchYouTubeTranscript(url: string): Promise<string> {
  const id = extractYouTubeId(url);
  if (!id) return '';

  // Fetch the watch page to extract the captions track URL
  const watchRes = await fetch(`https://www.youtube.com/watch?v=${id}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
  });
  if (!watchRes.ok) return '';
  const html = await watchRes.text();

  // The page embeds a captionTracks array with baseUrl entries
  const match = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
  if (!match) return '';

  let tracks: Array<{ baseUrl: string; languageCode: string }> = [];
  try {
    tracks = JSON.parse(match[1].replace(/\\u0026/g, '&'));
  } catch { return ''; }

  // Prefer English, fall back to first track
  const track = tracks.find(t => t.languageCode?.startsWith('en')) || tracks[0];
  if (!track?.baseUrl) return '';

  const captionRes = await fetch(track.baseUrl);
  if (!captionRes.ok) return '';
  const xml = await captionRes.text();

  // Strip XML tags and decode entities
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
