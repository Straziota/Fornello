'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';

interface Kitchen {
  id: number;
  slug: string;
  contributor: string;
  name: string;
  country: string;
  image_url: string;
  href: string | null;
  display_order: number;
}

const emptyDraft = {
  slug: '', contributor: '', name: '', country: '',
  image_url: '', href: '', display_order: 0,
};

export default function AdminKitchensPage() {
  const [items, setItems] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/heritage-kitchens');
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    const data = await res.json();
    setItems(data.kitchens || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Auto-slug from the kitchen name (e.g., "Babushka's Kitchen" → "babushkas")
  const updateName = (name: string) => {
    const auto = name.toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .replace(/-kitchen$/, '') || `kitchen-${Date.now()}`;
    setDraft(d => ({ ...d, name, slug: d.slug || auto }));
  };

  const onPickFile = async (file: File) => {
    if (!draft.slug) {
      setToast({ msg: 'Set the kitchen name first so the photo has a slug to file under.', type: 'error' });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('slug', draft.slug);
      const res = await fetch('/api/admin/heritage-kitchens/upload-photo', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setDraft(prev => ({ ...prev, image_url: d.url }));
      setToast({ msg: 'Photo uploaded ✓', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e.message || 'Upload failed', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!draft.slug || !draft.contributor || !draft.name || !draft.country || !draft.image_url) {
      setToast({ msg: 'Fill in name, country, contributor, and upload a photo.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/heritage-kitchens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          href: draft.href || `/heritage-kitchen/${draft.slug}`,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setToast({ msg: `${draft.name} saved ✓`, type: 'success' });
      setDraft(emptyDraft);
      load();
    } catch (e: any) {
      setToast({ msg: e.message || 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (k: Kitchen) => {
    if (!confirm(`Remove ${k.name}? Recipes attributed to ${k.contributor} won't show on the heritage grid until you re-add a kitchen for them.`)) return;
    const res = await fetch('/api/admin/heritage-kitchens', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: k.slug }),
    });
    if (res.ok) { setToast({ msg: 'Removed', type: 'success' }); load(); }
    else setToast({ msg: 'Could not remove', type: 'error' });
  };

  if (forbidden) return (
    <div className="text-center py-20">
      <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>Not allowed</h2>
      <p className="italic" style={{ color: 'var(--text-2)' }}>Only admins can see this page.</p>
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
        Heritage Kitchens
      </h1>
      <p className="mt-2 mb-8 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
        Each kitchen is one grandmother's collection. Add a kitchen here, then attribute recipes to its contributor on /admin/heritage/new.
      </p>

      {/* Add form */}
      <div className="rounded-[22px] p-6 ring-1 mb-10"
           style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
        <h2 className="text-lg mb-4" style={{ fontFamily: 'AbramoSerif, serif' }}>+ Add a kitchen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Kitchen name *</label>
            <input value={draft.name} onChange={e => updateName(e.target.value)}
              placeholder="e.g. Babushka's Kitchen"
              className="w-full mt-1 px-4 py-2.5 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Country *</label>
            <input value={draft.country} onChange={e => setDraft(d => ({ ...d, country: e.target.value }))}
              placeholder="e.g. Russia"
              className="w-full mt-1 px-4 py-2.5 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Contributor name *</label>
            <input value={draft.contributor} onChange={e => setDraft(d => ({ ...d, contributor: e.target.value }))}
              placeholder="e.g. Babushka Olga"
              className="w-full mt-1 px-4 py-2.5 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
            <p className="text-xs italic mt-1" style={{ color: 'var(--text-3)' }}>
              This is the name you'll attribute recipes to. Must match exactly.
            </p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Slug</label>
            <input value={draft.slug} onChange={e => setDraft(d => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
              placeholder="auto-generated from name"
              className="w-full mt-1 px-4 py-2.5 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)' }} />
            <p className="text-xs italic mt-1" style={{ color: 'var(--text-3)' }}>
              URL segment: /heritage-kitchen/<strong>{draft.slug || 'slug'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-2">
          {draft.image_url ? (
            <img src={draft.image_url} alt="" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '12px' }} />
          ) : (
            <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
              📷
            </div>
          )}
          <div>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp"
                   onChange={e => { const f = e.target.files?.[0]; if (f) onPickFile(f); }}
                   style={{ display: 'none' }} />
            <button onClick={() => fileInput.current?.click()} disabled={uploading || !draft.slug}
              className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--cream)' }}>
              {uploading ? '⏳ Uploading…' : (draft.image_url ? '↻ Replace photo' : '📷 Upload kitchen photo')}
            </button>
            <p className="text-xs italic mt-2" style={{ color: 'var(--text-3)' }}>
              PNG / JPG / WebP, under 8MB. Use a photo of the kitchen with no food in it.
            </p>
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity disabled:opacity-40 hover:opacity-80 mt-4"
          style={{ background: 'var(--green)', color: '#fff' }}>
          {saving ? '⏳ Saving…' : 'Save kitchen'}
        </button>
      </div>

      {/* Existing list */}
      <h2 className="text-lg mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>All kitchens</h2>
      {loading ? (
        <p className="italic text-center py-8" style={{ color: 'var(--text-3)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <p className="italic text-center py-8" style={{ color: 'var(--text-3)' }}>No kitchens yet.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {items.map(k => (
            <li key={k.slug} className="rounded-2xl ring-1 overflow-hidden"
                style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.04)' }}>
              <img src={k.image_url} alt={k.name}
                   className="w-full object-cover block"
                   style={{ aspectRatio: '4 / 3' }} />
              <div className="p-4">
                <p className="text-[18px]" style={{ fontFamily: 'AbramoSerif, serif', fontStyle: 'italic' }}>{k.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] mt-1" style={{ color: 'var(--text-3)' }}>{k.country}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{k.contributor}</p>
                <p className="text-xs italic mt-1" style={{ color: 'var(--text-3)' }}>{k.href || `/heritage-kitchen/${k.slug}`}</p>
                <button onClick={() => remove(k)}
                  className="mt-3 text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                  style={{ border: '1px solid #FDEDEB', color: '#C0392B' }}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
