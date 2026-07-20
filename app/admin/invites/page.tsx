'use client';
import { useState, useEffect } from 'react';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';

interface Invite {
  email: string;
  note: string;
  added_at: string;
  signedUp: boolean;
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/invites');
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    const data = await res.json();
    setInvites(data.invites || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    const res = await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail.trim(), note: newNote.trim() }),
    });
    setAdding(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const sent = data.emailSent;
      const errMsg = data.emailError;
      const msg = sent
        ? `${newEmail.trim()} invited & emailed ✉️ ✓`
        : errMsg
          ? `${newEmail.trim()} added — email failed (${errMsg})`
          : `${newEmail.trim()} added — email not configured (allowlist only)`;
      setToast({ msg, type: sent || !errMsg ? 'success' : 'error' });
      setNewEmail(''); setNewNote('');
      load();
    } else {
      setToast({ msg: data.error || 'Could not add', type: 'error' });
    }
  };

  const remove = async (email: string) => {
    if (!confirm(`Remove ${email} from the invite list?\n(If they've already signed up, their account stays — this only removes them from the allowlist.)`)) return;
    const res = await fetch('/api/admin/invites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setToast({ msg: `${email} removed`, type: 'success' });
      load();
    } else {
      setToast({ msg: 'Could not remove', type: 'error' });
    }
  };

  if (forbidden) return (
    <div className="text-center py-20">
      <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>Not allowed</h2>
      <p className="italic" style={{ color: 'var(--text-2)' }}>This page is only available to admins.</p>
    </div>
  );

  const pending = invites.filter(i => !i.signedUp);
  const signedUp = invites.filter(i => i.signedUp);

  return (
    <>
      <PageBackground src="/backgrounds/Settings-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="mb-8">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ color: 'var(--text)', fontFamily: 'AbramoSerif, serif' }}>
          Beta invites
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          Add people to the allowlist so they can sign up at fornello.app.
        </p>
      </div>

      {/* Add form */}
      <div className="rounded-[22px] p-6 ring-1 mb-8"
           style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-2)' }}>Add a new beta tester</p>
        <div className="flex flex-col md:flex-row gap-2">
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
            placeholder="friend@example.com"
            onKeyDown={e => e.key === 'Enter' && add()}
            className="flex-1 px-4 py-2.5 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
          <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
            placeholder="optional note (e.g. 'work friend')"
            onKeyDown={e => e.key === 'Enter' && add()}
            className="flex-1 md:max-w-xs px-4 py-2.5 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
          <button onClick={add} disabled={adding || !newEmail.trim()}
            className="rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity disabled:opacity-40 hover:opacity-80"
            style={{ background: 'var(--green)', color: '#fff' }}>
            {adding ? 'Adding…' : 'Invite'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="italic text-center py-10" style={{ color: 'var(--text-3)' }}>Loading…</p>
      ) : (
        <>
          {/* Pending section */}
          <Section
            title={`Pending (${pending.length})`}
            subtitle="They're on the allowlist but haven't signed up yet."
            invites={pending}
            onRemove={remove}
          />

          {/* Signed up section */}
          <Section
            title={`Signed up (${signedUp.length})`}
            subtitle="These users have created an account."
            invites={signedUp}
            onRemove={remove}
          />
        </>
      )}
    </>
  );
}

function Section({ title, subtitle, invites, onRemove }: {
  title: string; subtitle: string; invites: Invite[]; onRemove: (email: string) => void;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-xl mb-1" style={{ fontFamily: 'AbramoSerif, serif' }}>{title}</h2>
      <p className="text-xs italic mb-3" style={{ color: 'var(--text-3)' }}>{subtitle}</p>
      {invites.length === 0 ? (
        <p className="italic text-sm py-4" style={{ color: 'var(--text-3)' }}>— Nobody here yet —</p>
      ) : (
        <ul className="space-y-2">
          {invites.map(inv => (
            <li key={inv.email}
                className="rounded-xl px-4 py-3 ring-1 flex items-center justify-between gap-3 flex-wrap"
                style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.04)' }}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {inv.signedUp && <span className="mr-2" style={{ color: 'var(--green)' }}>✓</span>}
                  {inv.email}
                </p>
                {inv.note && (
                  <p className="text-xs italic mt-0.5" style={{ color: 'var(--text-3)' }}>{inv.note}</p>
                )}
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Added {new Date(inv.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => onRemove(inv.email)}
                className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                style={{ border: '1px solid var(--border)', color: 'var(--text-3)', background: 'transparent' }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
