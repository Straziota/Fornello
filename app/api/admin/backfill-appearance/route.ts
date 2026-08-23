import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { anthropicClient } from '@/lib/anthropic';

export const maxDuration = 300;

// Writes the `appearance` line for library recipes that predate the field.
//
// New recipes get it from the recipe generator, which already knows the
// ingredients and method. These 92 do not, so it is derived once from what they
// already store. Haiku, because this is description, not reasoning.
//
// ?limit=N to work through it in batches; dry by default.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get('write') !== '1';
  const limit = Number(req.nextUrl.searchParams.get('limit') || 10);

  const { data: rows } = await adminClient
    .from('global_recipes')
    .select('id, name, description, ingredients, category')
    .is('appearance', null)
    .neq('category', 'side')          // sides are never illustrated
    .limit(limit);

  if (!rows?.length) return NextResponse.json({ done: true, remaining: 0 });

  const client = anthropicClient({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const results: { name: string; appearance?: string; error?: string }[] = [];

  for (const r of rows) {
    const ings = (r.ingredients as any[] || []).map(i => i.item).filter(Boolean).slice(0, 14).join(', ');
    try {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        messages: [{ role: 'user', content:
`In ONE sentence, describe what this finished dish LOOKS like in the pan — the shape and colour of the main component, the colour and consistency of any sauce, and how the key ingredients appear and are distributed.

Describe appearance, never ingredient names alone. A specialist name is useless to someone painting it: not "guanciale" but "irregular strips of crisped cured pork, deeply browned at the edges, fat rendered translucent". Not "gremolata" but "a scattering of finely chopped bright green herb and pale zest".

Dish: ${r.name}
${r.description ? `About: ${r.description}` : ''}
Ingredients: ${ings}

Reply with the sentence only — no preamble, no quotes.` }],
      });
      const appearance = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
      if (!dry && appearance) {
        await adminClient.from('global_recipes').update({ appearance }).eq('id', r.id);
      }
      results.push({ name: r.name, appearance });
    } catch (e: any) {
      results.push({ name: r.name, error: e.message });
    }
  }

  const { count } = await adminClient
    .from('global_recipes').select('id', { count: 'exact', head: true })
    .is('appearance', null).neq('category', 'side');

  return NextResponse.json({ dryRun: dry, processed: results.length, remaining: count ?? 0, results });
}
