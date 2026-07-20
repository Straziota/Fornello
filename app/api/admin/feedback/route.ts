import { NextRequest, NextResponse } from 'next/server';
import { checkIsAdmin } from '@/lib/auth';
import { getAllUserFeedback, updateFeedbackStatus, deleteUserFeedback } from '@/lib/db';

async function requireAdmin() {
  const ok = await checkIsAdmin();
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET() {
  const deny = await requireAdmin();
  if (deny) return deny;
  try {
    const items = await getAllUserFeedback();
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { id, status } = await req.json();
  if (!id || !['new', 'read', 'archived'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  try {
    await updateFeedbackStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await deleteUserFeedback(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
