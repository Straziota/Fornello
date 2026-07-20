import { createServer } from './supabase-server';
import { NextResponse } from 'next/server';

export async function requireUser() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  return { user, error: null };
}

export async function requireAdmin() {
  const { user, error } = await requireUser();
  if (error) return { ok: false, error };
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user!.email !== adminEmail) {
    return { ok: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, error: null };
}

export async function checkIsAdmin(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === adminEmail;
}

export function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Anthropic API key not configured on the server.');
  return key;
}

export function getPexelsKey(): string | undefined {
  return process.env.PEXELS_API_KEY || undefined;
}
