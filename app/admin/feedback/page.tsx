'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';

interface FeedbackItem {
  id: number;
  user_id: string | null;
  email: string | null;
  category: string | null;
  message: string;
  status: 'new' | 'read' | 'archived';
  created_at: string;
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState<'new' | 'all' | 'archived'>('new');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/feedback');
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: number, status: 'new' | 'read' | 'archived') => {
    const res = await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) load();
    else setToast({ msg: 'Could not update', type: 'error' });
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this feedback permanently?')) return;
    const res = await fetch('/api/admin/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
    else setToast({ msg: 'Could not delete', type: 'error' });
  };

  if (forbidden) return (
    <div className="text-center py-20">
      <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>Not allowed</h2>
      <p className="italic" style={{ color: 'var(--text-2)' }}>Only admins can see this page.</p>
    </div>
  );

  const filtered = items.filter(i => {
    if (filter === 'new') return i.status === 'new';
    if (filter === 'archived') return i.status === 'archived';
    return true;
  });
  const counts = {
    new: items.filter(i => i.status === 'new').length,
    all: items.length,
    archived: items.filter(i => i.status === 'archived').length,
  };

  return (
    <>
      <PageBackground src="/backgrounds/Settings-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="mb-8">
        <Link href="/admin" className="text-xs uppercase tracking-widest mb-2 inline-block"
          style={{ color: 'var(--text-3)' }}>
          ← Admin
        </Link>
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ color: 'var(--text)', fontFamily: 'AbramoSerif, serif' }}>
          Feedback
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          Messages from your beta testers.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {([
          ['new', `Unread (${counts.new})`],
          ['all', `All (${counts.all})`],
          ['archived', `Archived (${counts.archived})`],
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
          <p className="italic" style={{ color: 'var(--text-2)' }}>No feedback yet in this view.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(f => (
            <li key={f.id} className="rounded-2xl p-5 ring-1"
                style={{
                  background: 'var(--white)',
                  boxShadow: '0 4px 16px rgba(47,58,50,0.04)',
                  borderLeft: f.status === 'new' ? '4px solid var(--green)' : '4px solid transparent',
                }}>
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {f.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
                        {f.category}
                      </span>
                    )}
                    {f.status === 'new' && (
                      <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--green)' }}>
                        New
                      </span>
                    )}
                    {f.status === 'archived' && (
                      <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {f.email || 'No email'} · {new Date(f.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  {f.email && (
                    <a href={`mailto:${f.email}?subject=Re: Fornello feedback`}
                      className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                      style={{ border: '1px solid var(--green)', color: 'var(--green)' }}>
                      ✉ Reply
                    </a>
                  )}
                  {f.status !== 'archived' && (
                    <button onClick={() => setStatus(f.id, 'archived')}
                      className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                      Archive
                    </button>
                  )}
                  {f.status === 'archived' && (
                    <button onClick={() => setStatus(f.id, 'read')}
                      className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                      Unarchive
                    </button>
                  )}
                  {f.status === 'new' && (
                    <button onClick={() => setStatus(f.id, 'read')}
                      className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                      Mark read
                    </button>
                  )}
                  <button onClick={() => remove(f.id)}
                    className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                    style={{ border: '1px solid #FDEDEB', color: '#C0392B' }}>
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line mt-3 pt-3 border-t"
                 style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                {f.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
