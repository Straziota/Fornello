import { adminClient } from './supabase-admin';
import { costOf, isKnownModel, TokenCounts } from './pricing';
import { requestUsageContext } from './request-context';

/** Called by requireUser() so later Claude calls in this request are attributable. */
export function beginUsageContext(userId: string, feature: string): void {
  const ctx = requestUsageContext();
  ctx.userId = userId;
  ctx.feature = feature;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

// Monthly ceiling on Claude spend per user, in USD. These are cost caps, not
// prices — they exist so one runaway account can't run up an unbounded bill.
// A full weekly menu (menu + grocery list + per-meal recipes) costs roughly
// $0.10–0.15, and a handwritten-recipe scan roughly $0.08, so `free` is about
// five weeks of normal use.
export const PLAN_MONTHLY_AI_BUDGET_USD: Record<string, number> = {
  free: 0.75,
  home: 6,
  unlimited: Infinity,
};

export const DEFAULT_PLAN = 'free';

export function budgetForPlan(plan: string | null | undefined): number {
  return PLAN_MONTHLY_AI_BUDGET_USD[plan ?? DEFAULT_PLAN] ?? PLAN_MONTHLY_AI_BUDGET_USD[DEFAULT_PLAN];
}

export class QuotaExceededError extends Error {
  readonly spent: number;
  readonly budget: number;
  readonly plan: string;
  constructor(plan: string, spent: number, budget: number) {
    super(
      `You've used this month's recipe-generation allowance. It resets on the 1st.`
    );
    this.name = 'QuotaExceededError';
    this.plan = plan;
    this.spent = spent;
    this.budget = budget;
  }
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

/** UTC first-of-month, the boundary the monthly allowance resets on. */
export function currentPeriodStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

type AnthropicUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

/**
 * Record one Claude call against the user in the ambient usage context.
 *
 * Deliberately never throws: a failed usage insert must not take down a
 * generation the user already paid for in latency. Failures are logged and
 * surface as under-counting, which the next quota check will simply miss —
 * the cap is a guardrail, not an accounting ledger.
 */
/**
 * Record a non-token cost — an image, or anything else priced per unit.
 *
 * `payer: 'company'` keeps it out of the household's monthly ceiling. An
 * illustration is generated once and reused by every household that cooks that
 * dish, so charging whoever triggered it would make the first family pay for a
 * picture the next hundred use free.
 */
export async function recordUnitCost(opts: {
  model: string;
  feature: string;
  unit: string;
  units: number;
  costUsd: number;
  payer?: 'household' | 'company';
  userId?: string | null;
}): Promise<void> {
  const payer = opts.payer ?? 'company';
  const userId = opts.userId ?? requestUsageContext().userId ?? null;
  // A household row needs someone to bill; a company row does not.
  if (payer === 'household' && !userId) return;
  try {
    const { error } = await adminClient.from('ai_usage').insert({
      user_id: userId,
      feature: opts.feature,
      model: opts.model,
      unit: opts.unit,
      units: opts.units,
      cost_usd: opts.costUsd,
      payer,
    });
    if (error) {
      // Loud on purpose. This failed silently for 77 illustrations because
      // user_id was NOT NULL and nothing downstream reads company rows yet — so
      // unmetered spend looked exactly like no spend.
      console.error(`[usage] UNMETERED ${opts.unit} — $${opts.costUsd} for ${opts.feature} was NOT recorded: ${error.message}`);
    }
  } catch (e) {
    console.error(`[usage] UNMETERED ${opts.unit} — $${opts.costUsd} for ${opts.feature} was NOT recorded:`, e);
  }
}

export async function recordUsage(model: string, usage: AnthropicUsage | undefined): Promise<void> {
  const ctx = requestUsageContext();
  if (!ctx.userId || !usage) return;

  const tokens: TokenCounts = {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
  };

  try {
    if (!isKnownModel(model)) {
      console.warn(`[usage] unpriced model "${model}" — billing at the fallback rate`);
    }
    const { error } = await adminClient.from('ai_usage').insert({
      user_id: ctx.userId!,
      feature: ctx.feature,
      model,
      input_tokens: tokens.inputTokens,
      output_tokens: tokens.outputTokens,
      cache_read_tokens: tokens.cacheReadTokens,
      cache_creation_tokens: tokens.cacheCreationTokens,
      unit: 'tokens',
      units: tokens.inputTokens + tokens.outputTokens,
      payer: 'household',
      cost_usd: costOf(model, tokens),
    });
    if (error) console.error('[usage] insert failed:', error.message);
  } catch (e) {
    console.error('[usage] insert threw:', e);
  }
}

// ---------------------------------------------------------------------------
// Quota
// ---------------------------------------------------------------------------

/** Month-to-date Claude spend for a user, in USD. */
export async function monthToDateCost(userId: string): Promise<number> {
  const { data, error } = await adminClient
    .from('ai_usage')
    .select('cost_usd')
    .eq('user_id', userId)
    // Company-paid rows — illustrations — must not count against a household's
    // ceiling. They are generated once and reused by everyone.
    .eq('payer', 'household')
    .gte('created_at', currentPeriodStart().toISOString());

  if (error) {
    console.error('[usage] month-to-date query failed:', error.message);
    // Fail open. A Supabase blip should degrade to "no cap enforced" rather
    // than locking every paying user out of the product.
    return 0;
  }
  return (data ?? []).reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0);
}

export async function planForUser(userId: string): Promise<string> {
  const { data, error } = await adminClient
    .from('settings')
    .select('plan')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[usage] plan lookup failed:', error.message);
    return DEFAULT_PLAN;
  }
  return data?.plan ?? DEFAULT_PLAN;
}

export type QuotaStatus = {
  plan: string;
  spent: number;
  budget: number;
  remaining: number;
  exceeded: boolean;
};

export async function quotaStatus(userId: string): Promise<QuotaStatus> {
  const [plan, spent] = await Promise.all([planForUser(userId), monthToDateCost(userId)]);
  const budget = budgetForPlan(plan);
  return {
    plan,
    spent,
    budget,
    remaining: Math.max(0, budget - spent),
    exceeded: spent >= budget,
  };
}

/** Throws QuotaExceededError when the user is out of allowance for the month. */
export async function assertWithinQuota(userId: string): Promise<void> {
  const status = await quotaStatus(userId);
  if (status.exceeded) {
    throw new QuotaExceededError(status.plan, status.spent, status.budget);
  }
}
