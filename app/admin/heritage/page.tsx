'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';

interface Row {
  id: number;
  name: string;
  cuisine: string;
  contributor: string | null;
  meal_type: string;
  total_time: string;
  difficulty: string;
  photo_url: string;
}

export default function AdminHeritagePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/heritage');
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    const data = await res.json();
    setRows(data.recipes || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (row: Row) => {
    if (!confirm(`Delete "${row.name}"? This removes it from Heritage Kitchen / Nonna's Kitchen permanently.`)) return;
    const res = await fetch('/api/admin/heritage', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id }),
    });
    if (res.ok) {
      setToast({ msg: 'Deleted', type: 'success' });
      load();
    } else {
      setToast({ msg: 'Could not delete', type: 'error' });
    }
  };

  if (forbidden) return (
    <div className="text-center py-20">
      <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>Not allowed</h2>
      <p className="italic" style={{ color: 'var(--text-2)' }}>Only admins can see this page.</p>
    </div>
  );

  // Group by contributor
  const grouped = rows.reduce<Record<string, Row[]>>((acc, r) => {
    const k = r.contributor || '(no contributor)';
    (acc[k] = acc[k] || []).push(r);
    return acc;
  }, {});

  return (
    <>
      <PageBackground src="/backgrounds/Settings-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <Link href="/admin" className="text-xs uppercase tracking-widest mb-2 inline-block"
            style={{ color: 'var(--text-3)' }}>
            ← Admin
          </Link>
          <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
              style={{ color: 'var(--text)', fontFamily: 'AbramoSerif, serif' }}>
            Heritage & Nonna's Kitchens
          </h1>
          <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
            Recipes contributed by grandmothers from around the world. Nonna Ingrid's go to her dedicated page.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/heritage/submissions"
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            📥 Submissions
          </Link>
          <Link href="/admin/heritage/contributors"
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            👤 Contributors
          </Link>
          <Link href="/admin/heritage/kitchens"
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            🏡 Kitchens
          </Link>
          <button onClick={async () => {
              if (!confirm("Insert Nonna Ingrid's Carbonnade à la Flamande (with Oven + Slow cooker variants)?")) return;
              const r = await fetch('/api/admin/heritage/seed-carbonnade', { method: 'POST' });
              const d = await r.json();
              if (r.ok) {
                setToast({ msg: d.inserted ? 'Carbonnade inserted ✓' : (d.message || 'Already present'), type: 'success' });
                load();
              } else {
                setToast({ msg: d.error || `HTTP ${r.status}`, type: 'error' });
              }
            }}
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--green)', color: 'var(--green)', background: 'var(--green-lt)' }}>
            🍲 Seed Carbonnade
          </button>
          <Link href="/admin/heritage/new"
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em]"
            style={{ background: 'var(--green)', color: '#fff' }}>
            + Add recipe
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="italic text-center py-12" style={{ color: 'var(--text-3)' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 rounded-[22px] ring-1"
             style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.05)' }}>
          <div className="text-5xl mb-3">👵</div>
          <p className="italic" style={{ color: 'var(--text-2)' }}>No Heritage recipes yet.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([contributor, list]) => (
          <div key={contributor} className="mb-8">
            <h2 className="text-xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>
              {contributor} <span className="text-sm italic font-normal" style={{ color: 'var(--text-3)' }}>({list.length})</span>
            </h2>
            <ul className="space-y-2">
              {list.map(r => (
                <li key={r.id}
                    className="rounded-xl px-4 py-3 ring-1 flex items-center gap-3 flex-wrap"
                    style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.04)' }}>
                  {r.photo_url ? (
                    <img src={r.photo_url} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👵</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{r.name}</p>
                    <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>
                      {[r.cuisine, r.meal_type, r.total_time, r.difficulty].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/heritage/${r.id}`}
                      className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                      style={{ background: 'var(--green-lt)', color: 'var(--green)', border: '1px solid var(--green)' }}>
                      ✎ Edit
                    </Link>
                    <button onClick={() => remove(r)}
                      className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </>
  );
}
