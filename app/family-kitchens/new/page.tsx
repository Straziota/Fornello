'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';
import { T } from '@/components/T';

const RELATIONSHIPS = ['Myself', 'Mother', 'Grandmother', 'Auntie', 'Father', 'Grandfather', 'Uncle', 'Other'];

export default function NewProfilePage() {
  const router = useRouter();
  const [personName, setPersonName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [portraitUrl, setPortraitUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadPortrait = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/heritage/upload-portrait', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setPortraitUrl(data.url);
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!personName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/heritage/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_name: personName, relationship, origin_country: country,
          bio, portrait_url: portraitUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create profile');
      router.push(`/family-kitchens/${data.profile.slug}`);
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' });
      setSaving(false);
    }
  };

  return (
    <>
      <PageBackground src="/backgrounds/Nonna's kitchen-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <Link href="/family-kitchens" className="inline-block text-xs uppercase tracking-widest mb-6 transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-3)' }}>
        ← <T>Family Kitchens</T>
      </Link>

      <div className="max-w-2xl mb-8">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
          <T>Create a profile</T>
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          <T>Dedicate a kitchen to someone special. You can add their recipes — and scan their original cards — once the profile is created.</T>
        </p>
      </div>

      <div className="max-w-2xl rounded-[22px] p-6 ring-1 space-y-5"
           style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
        {/* Portrait */}
        <div className="flex items-center gap-5">
          <div className="rounded-2xl overflow-hidden ring-1 flex items-center justify-center flex-shrink-0"
               style={{ width: 96, height: 96, background: 'var(--cream)', borderColor: 'var(--border)' }}>
            {portraitUrl ? <img src={portraitUrl} alt="" className="w-full h-full object-cover" /> : <img src="/icons/Heritage kitchen.png" alt="" className="w-full h-full object-cover" />}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadPortrait(f); }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.16em] transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              {uploading ? <T>Uploading…</T> : portraitUrl ? <T>Change portrait</T> : <T>Add a portrait</T>}
            </button>
            <p className="text-xs mt-1.5 italic" style={{ color: 'var(--text-3)' }}><T>Optional — a photo of the person</T></p>
          </div>
        </div>

        <Field label="Their name" required>
          <input type="text" value={personName} onChange={e => setPersonName(e.target.value)}
            placeholder="e.g. Nonna Ingrid" className="w-full input" style={inputStyle} />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Relationship">
            <select value={relationship} onChange={e => setRelationship(e.target.value)} className="w-full input" style={inputStyle}>
              <option value=""></option>
              {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Origin / country (optional)">
            <input type="text" value={country} onChange={e => setCountry(e.target.value)}
              placeholder="e.g. Italy" className="w-full input" style={inputStyle} />
          </Field>
        </div>

        <Field label="A few words about them (optional)">
          <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)}
            placeholder="Who they were, what their cooking meant, a memory of their table…"
            className="w-full input resize-y" style={inputStyle} />
        </Field>

        <button onClick={save} disabled={saving || !personName.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: 'var(--green)' }}>
          {saving ? <T>Creating…</T> : <T>Create profile</T>}
        </button>
      </div>

      <style>{`
        .input { padding: 9px 13px; border: 1px solid; border-radius: 10px; font-size: 14px; outline: none; font-family: Georgia, serif; }
        .input:focus { border-color: var(--green); background: white; }
      `}</style>
    </>
  );
}

const inputStyle = { background: 'var(--cream)', borderColor: 'var(--border)' };

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
        <T>{label}</T>{required && <span style={{ color: 'var(--green)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}
