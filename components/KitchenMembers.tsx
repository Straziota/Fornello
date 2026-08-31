'use client';
import { useEffect, useState } from 'react';

interface Member {
  id: string; email: string; role: 'view' | 'add';
  invited_at: string; last_seen_at: string | null; revoked_at: string | null;
}

/**
 * Who else is in this Kitchen — owner only.
 *
 * Two invite buttons rather than a role toggle with a default. A toggle is
 * something you can fail to notice; two buttons make you say which one you
 * meant, and the difference between "can read my grandmother's recipes" and
 * "can add to them" deserves to be said out loud.
 */
export default function KitchenMembers({ slug }: { slug: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accessUrl, setAccessUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const load = () =>
    fetch(`/api/heritage/profiles/${slug}/members`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMembers(d.members || []); })
      .catch(() => {});

  useEffect(() => { void load(); }, [slug]);

  const invite = async (role: 'view' | 'add') => {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/heritage/profiles/${slug}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not invite');
      setMembers(d.members || []);
      setAccessUrl(d.accessUrl || '');
      setEmail('');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const revoke = async (address: string) => {
    const res = await fetch(`/api/heritage/profiles/${slug}/members`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: address }),
    });
    const d = await res.json().catch(() => null);
    if (d?.members) setMembers(d.members);
  };

  const active = members.filter(m => !m.revoked_at);

  return (
    <div className="rounded-[22px] p-6 mt-6" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
      <h3 className="text-lg mb-1" style={{ fontFamily: 'AbramoSerif, serif' }}>Who can open this Kitchen</h3>
      <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-2)' }}>
        Nobody but you, unless you invite them. Invited people sign in with their
        email — there&apos;s no password to pass around.
      </p>

      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="their@email.com" autoComplete="off"
        className="w-full rounded-xl px-4 py-3 text-sm mb-3"
        style={{ border: '1px solid var(--border)', background: 'var(--cream)' }} />

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => invite('view')} disabled={busy || !email}
          className="rounded-full px-4 py-2.5 text-xs disabled:opacity-40"
          style={{ border: '1px solid var(--green)', color: 'var(--green)' }}>
          Invite to view
        </button>
        <button onClick={() => invite('add')} disabled={busy || !email}
          className="rounded-full px-4 py-2.5 text-xs text-white disabled:opacity-40"
          style={{ background: 'var(--green)' }}>
          Invite to add recipes
        </button>
      </div>
      {error && <p className="text-sm mt-3" style={{ color: '#C0392B' }}>{error}</p>}

      {accessUrl && (
        <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--green-lt)' }}>
          <p className="mb-2" style={{ color: 'var(--text-2)' }}>
            Send them this page. It&apos;s where they ask for a link whenever they want
            to come back — safe to forward, because it opens nothing on its own.
          </p>
          <button onClick={() => { navigator.clipboard?.writeText(accessUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="text-xs underline" style={{ color: 'var(--green)' }}>
            {copied ? 'Copied ✓' : accessUrl}
          </button>
        </div>
      )}

      {active.length > 0 && (
        <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          {active.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-3 py-2 flex-wrap">
              <div>
                <p className="text-sm" style={{ color: 'var(--text)' }}>{m.email}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {m.role === 'add' ? 'Can add recipes' : 'Can view'}
                  {' · '}
                  {m.last_seen_at
                    ? `last here ${new Date(m.last_seen_at).toLocaleDateString()}`
                    : 'not been in yet'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => invite(m.role === 'add' ? 'view' : 'add')}
                  onMouseDown={() => setEmail(m.email)}
                  className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {m.role === 'add' ? 'View only' : 'Allow adding'}
                </button>
                <button onClick={() => revoke(m.email)}
                  className="text-xs" style={{ color: '#8B2E22' }}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          <p className="text-xs mt-3 italic" style={{ color: 'var(--text-3)' }}>
            Removing someone takes away their access, not their recipes. Anything they
            added stays here, still theirs.
          </p>
        </div>
      )}
    </div>
  );
}
