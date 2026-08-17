import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase-admin';
import { currentPeriodStart } from '@/lib/usage';

type Row = {
  user_id: string;
  feature: string | null;
  model: string;
  cost_usd: number | string;
  input_tokens: number;
  output_tokens: number;
};

// Month-to-date Claude spend across the whole install, broken down by user,
// feature, and model — the three cuts that answer "what is costing me money".
export async function GET() {
  const { ok, error } = await requireAdmin();
  // requireAdmin always supplies an error response when ok is false, but its
  // return type doesn't narrow, so fall back rather than returning null.
  if (!ok) return error ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const since = currentPeriodStart().toISOString();
  const { data, error: qErr } = await adminClient
    .from('ai_usage')
    .select('user_id, feature, model, cost_usd, input_tokens, output_tokens')
    .gte('created_at', since);

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  const total = rows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);

  const rollup = (key: (r: Row) => string) => {
    const acc = new Map<string, { calls: number; costUsd: number; inputTokens: number; outputTokens: number }>();
    for (const r of rows) {
      const k = key(r) || 'unknown';
      const cur = acc.get(k) ?? { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 };
      cur.calls += 1;
      cur.costUsd += Number(r.cost_usd ?? 0);
      cur.inputTokens += r.input_tokens ?? 0;
      cur.outputTokens += r.output_tokens ?? 0;
      acc.set(k, cur);
    }
    return [...acc.entries()]
      .map(([name, v]) => ({ name, ...v, costUsd: Number(v.costUsd.toFixed(4)) }))
      .sort((a, b) => b.costUsd - a.costUsd);
  };

  return NextResponse.json({
    periodStart: since,
    totalUsd: Number(total.toFixed(4)),
    totalCalls: rows.length,
    byUser: rollup(r => r.user_id),
    byFeature: rollup(r => r.feature ?? 'unknown'),
    byModel: rollup(r => r.model),
  });
}
