'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';

interface Submission {
  id: number;
  user_id: string | null;
  submitter_email: string | null;
  contributor_name: string;
  recipe_name: string;
  cuisine: string | null;
  cultural_background: string | null;
  ingredients: string;
  instructions: string;
  wisdom: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

function formatAsText(s: Submission): string {
  const lines: string[] = [];
  lines.push(`Recipe: ${s.recipe_name}`);
  lines.push(`Contributor: ${s.contributor_name}`);
  if (s.cuisine) lines.push(`Cuisine: ${s.cuisine}`);
  lines.push('');
  if (s.cultural_background) {
    lines.push('--- Cultural background ---');
    lines.push(s.cultural_background.trim());
    lines.push('');
  }
  lines.push('--- Ingredients ---');
  lines.push(s.ingredients.trim());
  lines.push('');
  lines.push('--- Instructions ---');
  lines.push(s.instructions.trim());
  if (s.wisdom?.trim()) {
    lines.push('');
    lines.push('--- Wisdom & tips ---');
    lines.push(s.wisdom.trim());
  }
  lines.push('');
  lines.push(`---`);
  lines.push(`Submitted by: ${s.submitter_email || '(unknown)'} on ${new Date(s.created_at).toLocaleString()}`);
  return lines.join('\n');
}

export default function AdminSubmissionsPage() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/heritage-submissions');
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    const data = await res.json();
    setItems(data.submissions || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: number, status: 'pending' | 'approved' | 'rejected') => {
    const res = await fetch('/api/admin/heritage-submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) load();
    else setToast({ msg: 'Could not update', type: 'error' });
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this submission permanently?')) return;
    const res = await fetch('/api/admin/heritage-submissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  };

  const copyAsText = async (s: Submission) => {
    try {
      await navigator.clipboard.writeText(formatAsText(s));
      setToast({ msg: 'Copied as text ✓', type: 'success' });
    } catch {
      setToast({ msg: 'Could not copy', type: 'error' });
    }
  };

  if (forbidden) return (
    <div className="text-center py-20">
      <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>Not allowed</h2>
    </div>
  );

  const filtered = items.filter(i => filter === 'all' || i.status === filter);
  const counts = {
    pending: items.filter(i => i.status === 'pending').length,
    all: items.length,
    approved: items.filter(i => i.status === 'approved').length,
    rejected: items.filter(i => i.status === 'rejected').length,
  };

  return (
    <>
      <PageBackground src="/backgrounds/Settings-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <Link href="/admin/heritage" className="text-xs uppercase tracking-widest mb-2 inline-block"
        style={{ color: 'var(--text-3)' }}>
        ← Heritage admin
      </Link>
      <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
          style={{ color: 'var(--text)', fontFamily: 'AbramoSerif, serif' }}>
        Recipe Submissions
      </h1>
      <p className="mt-2 mb-6 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
        Recipes contributors have sent in for review. Use "Copy as text" to paste a formatted version for Claude.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          ['pending',  `Pending (${counts.pending})`],
          ['all',      `All (${counts.all})`],
          ['approved', `Approved (${counts.approved})`],
          ['rejected', `Rejected (${counts.rejected})`],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className="text-xs px-4 py-2 rounded-full transition-all"
            style={{
              background: filter === key ? 'var(--green)' : 'var(--cream)',
              color: filter === key ? '#fff' : 'var(--text-2)',
              border: `1px solid ${filter === key ? 'var(--green)' : 'var(--border)'}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="italic text-center py-12" style={{ color: 'var(--text-3)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-[22px] ring-1"
             style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.05)' }}>
          <div className="text-5xl mb-3">📭</div>
          <p className="italic" style={{ color: 'var(--text-2)' }}>No submissions in this view.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(s => {
            const isOpen = expanded === s.id;
            return (
              <li key={s.id} className="rounded-2xl ring-1 overflow-hidden"
                  style={{
                    background: 'var(--white)',
                    boxShadow: '0 4px 16px rgba(47,58,50,0.04)',
                    borderLeft: s.status === 'pending' ? '4px solid var(--green)' : '4px solid transparent',
                  }}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-widest"
                              style={
                                s.status === 'pending'  ? { background: 'var(--green-lt)', color: 'var(--green)' } :
                                s.status === 'approved' ? { background: '#E7F4E1', color: '#2D6F2F' } :
                                                          { background: '#FDEDEB', color: '#C0392B' }}>
                          {s.status}
                        </span>
                        {s.cuisine && (
                          <span className="text-xs px-2 py-0.5 rounded-full italic" style={{ color: 'var(--text-3)' }}>
                            {s.cuisine}
                          </span>
                        )}
                      </div>
                      <p className="text-lg" style={{ fontFamily: 'var(--font-lora), serif', color: 'var(--text)' }}>
                        {s.recipe_name}
                      </p>
                      <p className="text-sm italic mt-0.5" style={{ color: 'var(--text-2)' }}>
                        by {s.contributor_name}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                        Submitted by {s.submitter_email || 'unknown'} · {new Date(s.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setExpanded(isOpen ? null : s.id)}
                        className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                        style={{ border: '1px solid var(--green)', color: 'var(--green)' }}>
                        {isOpen ? 'Hide' : 'View'}
                      </button>
                      <button onClick={() => copyAsText(s)}
                        className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                        style={{ background: 'var(--green)', color: '#fff' }}>
                        📋 Copy as text
                      </button>
                      {s.status !== 'approved' && (
                        <button onClick={() => setStatus(s.id, 'approved')}
                          className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                          style={{ border: '1px solid var(--border)', color: '#2D6F2F' }}>
                          Mark approved
                        </button>
                      )}
                      {s.status !== 'rejected' && (
                        <button onClick={() => setStatus(s.id, 'rejected')}
                          className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                          style={{ border: '1px solid var(--border)', color: '#C0392B' }}>
                          Reject
                        </button>
                      )}
                      <button onClick={() => remove(s.id)}
                        className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                        style={{ border: '1px solid #FDEDEB', color: '#C0392B' }}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t space-y-4 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                      {s.cultural_background && (
                        <div>
                          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Story</p>
                          <p className="whitespace-pre-line italic">{s.cultural_background}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Ingredients</p>
                        <p className="whitespace-pre-line">{s.ingredients}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Instructions</p>
                        <p className="whitespace-pre-line">{s.instructions}</p>
                      </div>
                      {s.wisdom && (
                        <div>
                          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Wisdom & tips</p>
                          <p className="whitespace-pre-line italic">{s.wisdom}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
