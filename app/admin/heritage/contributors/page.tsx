'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';

interface Contributor {
  email: string;
  display_name: string | null;
  kitchen_slug: string | null;
  note: string | null;
  added_at: string;
}

interface KitchenOption {
  slug: string;
  name: string;
  country: string;
}

export default function AdminContributorsPage() {
  const [items, setItems] = useState<Contributor[]>([]);
  const [kitchens, setKitchens] = useState<KitchenOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [kitchenSlug, setKitchenSlug] = useState('');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    setLoading(true);
    const [contribsRes, kitchensRes] = await Promise.all([
      fetch('/api/admin/heritage-contributors'),
      fetch('/api/heritage-kitchens'),
    ]);
    if (contribsRes.status === 403) { setForbidden(true); setLoading(false); return; }
    const data = await contribsRes.json();
    setItems(data.contributors || []);
    const k = await kitchensRes.json().catch(() => ({ kitchens: [] }));
    setKitchens(k.kitchens || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!email.trim() || !displayName.trim() || !kitchenSlug) return;
    const res = await fetch('/api/admin/heritage-contributors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, display_name: displayName, kitchen_slug: kitchenSlug, note }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      const emailLine = d.emailSent
        ? `${displayName} added & invite emailed ✓`
        : `${displayName} added — but invite email did NOT send: ${d.emailError || 'unknown reason'}`;
      setToast({ msg: emailLine, type: d.emailSent ? 'success' : 'error' });
      setEmail(''); setDisplayName(''); setKitchenSlug(''); setNote(''); load();
    } else {
      setToast({ msg: d.error || 'Could not add', type: 'error' });
    }
  };

  const remove = async (e: string) => {
    if (!confirm(`Remove ${e} as a contributor?`)) return;
    const res = await fetch('/api/admin/heritage-contributors', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e }),
    });
    if (res.ok) load();
  };

  if (forbidden) return (
    <div className="text-center py-20">
      <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>Not allowed</h2>
    </div>
  );

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
        Heritage Contributors
      </h1>
      <p className="mt-2 mb-8 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
        Users on this list see the "🥄 Submit a recipe" option on Heritage Kitchen. Every recipe they submit is automatically attributed to the display name you assign here — they don't get to type it themselves.
      </p>

      <div className="rounded-[22px] p-6 ring-1 mb-8"
           style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Add a contributor</p>
        <p className="text-xs italic mb-3" style={{ color: 'var(--text-3)' }}>
          The display name is what appears on all their recipes (e.g. "Nonna Maria"). Pick it carefully — every submission from this email will use it.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com"
            onKeyDown={e => e.key === 'Enter' && add()}
            className="px-4 py-2.5 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="Display name (e.g. Abuela María)"
            onKeyDown={e => e.key === 'Enter' && add()}
            className="px-4 py-2.5 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
          <select value={kitchenSlug} onChange={e => setKitchenSlug(e.target.value)}
            className="px-4 py-2.5 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--cream)', borderColor: 'var(--border)' }}>
            <option value="">— Pick a kitchen —</option>
            {kitchens.map(k => (
              <option key={k.slug} value={k.slug}>{k.name} ({k.country})</option>
            ))}
          </select>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="Private note (optional)"
            onKeyDown={e => e.key === 'Enter' && add()}
            className="px-4 py-2.5 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
        </div>
        <button onClick={add} disabled={!email.trim() || !displayName.trim() || !kitchenSlug}
          className="rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity disabled:opacity-40 hover:opacity-80"
          style={{ background: 'var(--green)', color: '#fff' }}>
          Add contributor
        </button>
      </div>

      {loading ? (
        <p className="italic text-center py-12" style={{ color: 'var(--text-3)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <p className="italic text-center py-12" style={{ color: 'var(--text-3)' }}>No contributors yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(c => (
            <li key={c.email} className="rounded-xl px-4 py-3 ring-1 flex items-center justify-between gap-3 flex-wrap"
                style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.04)' }}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {c.display_name || <span className="italic" style={{ color: 'var(--text-3)' }}>(no display name)</span>}
                  {c.kitchen_slug && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
                      {kitchens.find(k => k.slug === c.kitchen_slug)?.name || c.kitchen_slug}
                    </span>
                  )}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{c.email}</p>
                {c.note && <p className="text-xs italic mt-0.5" style={{ color: 'var(--text-3)' }}>{c.note}</p>}
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Added {new Date(c.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => remove(c.email)}
                className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
