// Per-model Claude API prices, USD per million tokens.
// Source: platform.claude.com/docs/en/pricing (checked 2026-08-13).
// Only models this app actually calls need an entry; UNKNOWN_MODEL_RATE is the
// deliberately-pessimistic fallback so a new model ID can never bill as $0 and
// silently slip past the quota check.

export type ModelRate = { input: number; output: number };

const RATES: Record<string, ModelRate> = {
  'claude-haiku-4-5':  { input: 1,  output: 5 },
  'claude-sonnet-4-6': { input: 3,  output: 15 },
  'claude-sonnet-5':   { input: 3,  output: 15 },
  'claude-opus-4-8':   { input: 5,  output: 25 },
  'claude-opus-5':     { input: 5,  output: 25 },
  'claude-fable-5':    { input: 10, output: 50 },
};

// Priced as the most expensive model we know of, so an unrecognised ID
// over-counts rather than under-counts against the user's cap.
const UNKNOWN_MODEL_RATE: ModelRate = { input: 10, output: 50 };

// Cache reads bill at ~0.1x the input rate; 5-minute cache writes at ~1.25x.
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

export function rateFor(model: string): ModelRate {
  return RATES[model] ?? UNKNOWN_MODEL_RATE;
}

export function isKnownModel(model: string): boolean {
  return model in RATES;
}

export type TokenCounts = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
};

/** Cost of a single Claude call, in USD. */
export function costOf(model: string, t: TokenCounts): number {
  const rate = rateFor(model);
  const perToken = (millions: number) => millions / 1_000_000;
  return (
    perToken(t.inputTokens) * rate.input +
    perToken(t.outputTokens) * rate.output +
    perToken(t.cacheReadTokens ?? 0) * rate.input * CACHE_READ_MULTIPLIER +
    perToken(t.cacheCreationTokens ?? 0) * rate.input * CACHE_WRITE_MULTIPLIER
  );
}
