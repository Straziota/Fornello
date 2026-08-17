import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { quotaStatus } from '@/lib/usage';

// Current user's month-to-date Claude spend against their plan's allowance.
// Called bare (no feature) — reading your own quota must never be blocked by
// having exhausted it, and it spends nothing itself.
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const status = await quotaStatus(user!.id);
  return NextResponse.json({
    plan: status.plan,
    // Fractions of a cent are noise to a caller deciding whether to show a
    // "running low" nudge; round to cents at the boundary.
    spentUsd: Number(status.spent.toFixed(4)),
    budgetUsd: status.budget === Infinity ? null : status.budget,
    percentUsed:
      status.budget === Infinity ? 0 : Math.min(100, Math.round((status.spent / status.budget) * 100)),
    exceeded: status.exceeded,
  });
}
