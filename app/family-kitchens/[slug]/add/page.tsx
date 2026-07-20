'use client';
import { useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';
import { T } from '@/components/T';
import type { TranscribedRecipeDraft } from '@/lib/claude';

const ingredientsToText = (list: { amount: string; item: string }[]) =>
  list.map(i => (i.amount ? `${i.amount} | ${i.item}` : i.item)).join('\n');

const parseIngredients = (text: string) =>
  text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const i = line.indexOf('|');
    return i >= 0
      ? { amount: line.slice(0, i).trim(), item: line.slice(i + 1).trim() }
      : { amount: '', item: line };
  });

const linesToArray = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean);

export default function AddRecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [scanUrl, setScanUrl] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [legibility, setLegibility] = useState<TranscribedRecipeDraft['legibility'] | null>(null);
  const [unclear, setUnclear] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [serves, setServes] = useState('');
  const [totalTime, setTotalTime] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [wisdom, setWisdom] = useState('');
  const [transcribed, setTranscribed] = useState(false);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const applyDraft = (d: TranscribedRecipeDraft) => {
    setName(d.name || '');
    setCuisine(d.cuisine || '');
    setServes(d.serves != null ? String(d.serves) : '');
    setTotalTime(d.total_time || '');
    setDifficulty(d.difficulty || 'Medium');
    setDescription(d.description || '');
    setIngredients(ingredientsToText(d.ingredients || []));
    setInstructions((d.instructions || []).join('\n'));
    setWisdom((d.nonna_wisdom || []).join('\n'));
    setLegibility(d.legibility);
    setUnclear(d.unclear_notes || []);
    setTranscribed(true);
  };

  const onScan = async (file: File) => {
    setScanning(true);
    setLegibility(null); setUnclear([]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/heritage/scan', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setScanUrl(data.scan_url);
      if (data.draft) {
        applyDraft(data.draft);
        setToast({ msg: 'Recipe read from the card — review and edit below.', type: 'success' });
      } else {
        setToast({ msg: data.transcription_error || 'Saved the photo — please type the recipe in.', type: 'error' });
      }
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const save = async () => {
    if (!name.trim()) { setToast({ msg: 'Please give the recipe a name.', type: 'error' }); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/heritage/profiles/${slug}/recipes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, cuisine, serves: serves ? Number(serves) : undefined,
          total_time: totalTime, difficulty, description,
          ingredients: parseIngredients(ingredients),
          instructions: linesToArray(instructions),
          nonna_wisdom: linesToArray(wisdom),
          original_scan_url: scanUrl || undefined,
          transcription_status: transcribed ? 'done' : 'none',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      router.push(`/family-kitchens/${slug}`);
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' });
      setSaving(false);
    }
  };

  return (
    <>
      <PageBackground src="/backgrounds/Nonna's kitchen-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <Link href={`/family-kitchens/${slug}`} className="inline-block text-xs uppercase tracking-widest mb-6 transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-3)' }}>
        ← <T>Back to profile</T>
      </Link>

      <div className="max-w-2xl mb-8">
        <h1 className="text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em]"
            style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
          <T>Add a recipe</T>
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          <T>Scan the original card to fill this in automatically — or just type it in. The original photo is kept as a keepsake.</T>
        </p>
      </div>

      {/* Scan block */}
      <div className="max-w-2xl rounded-[22px] p-6 ring-1 mb-6 flex items-start gap-5"
           style={{ background: 'var(--green-lt)', border: '1px solid var(--green)' }}>
        <div className="rounded-xl overflow-hidden ring-1 flex items-center justify-center flex-shrink-0"
             style={{ width: 100, height: 130, background: 'var(--cream)', borderColor: 'var(--border)' }}>
          {scanUrl ? <img src={scanUrl} alt="Original recipe" className="w-full h-full object-cover" /> : <span className="text-4xl">📜</span>}
        </div>
        <div className="flex-1">
          <p className="text-base mb-1" style={{ fontFamily: 'var(--font-lora), serif', color: 'var(--text)' }}>
            <T>Scan the original card</T>
          </p>
          <p className="text-xs italic mb-3" style={{ color: 'var(--text-2)' }}>
            <T>A clear, well-lit photo reads best — even handwriting and other languages.</T>
          </p>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onScan(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={scanning}
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-80 disabled:opacity-60"
            style={{ background: 'var(--green)' }}>
            {scanning ? <T>Reading the card…</T> : scanUrl ? <T>Scan another photo</T> : <T>Upload a photo</T>}
          </button>

          {legibility && legibility !== 'clear' && (
            <p className="text-xs mt-3" style={{ color: legibility === 'poor' ? '#a4552b' : 'var(--text-2)' }}>
              {legibility === 'poor'
                ? <T>Parts of the card were hard to read — please check everything below.</T>
                : <T>A few words were unclear — please double-check the highlighted items.</T>}
            </p>
          )}
          {unclear.length > 0 && (
            <p className="text-xs mt-1 italic" style={{ color: 'var(--text-3)' }}>
              <T>Unsure about</T>: {unclear.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Editable form */}
      <div className="max-w-2xl rounded-[22px] p-6 ring-1 space-y-5"
           style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
        <Field label="Recipe name" required>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full input" style={inputStyle}
            placeholder="e.g. Nonna's Sunday Ragù" />
        </Field>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Cuisine">
            <input type="text" value={cuisine} onChange={e => setCuisine(e.target.value)} className="w-full input" style={inputStyle} />
          </Field>
          <Field label="Serves">
            <input type="number" value={serves} onChange={e => setServes(e.target.value)} className="w-full input" style={inputStyle} min={1} />
          </Field>
          <Field label="Total time">
            <input type="text" value={totalTime} onChange={e => setTotalTime(e.target.value)} className="w-full input" style={inputStyle}
              placeholder="e.g. 2 hrs" />
          </Field>
        </div>

        <Field label="Difficulty">
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="w-full input" style={inputStyle}>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        </Field>

        <Field label="Description (optional)">
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full input resize-y" style={inputStyle} />
        </Field>

        <Field label="Ingredients">
          <textarea rows={7} value={ingredients} onChange={e => setIngredients(e.target.value)} className="w-full input resize-y" style={inputStyle}
            placeholder={'One per line. Put the amount before a "|", e.g.\n500 g | pasta\n3 tbsp | olive oil\n2 | garlic cloves'} />
          <p className="text-xs mt-1 italic" style={{ color: 'var(--text-3)' }}>
            <T>One per line. Separate the amount from the item with a “|”.</T>
          </p>
        </Field>

        <Field label="Instructions">
          <textarea rows={8} value={instructions} onChange={e => setInstructions(e.target.value)} className="w-full input resize-y" style={inputStyle}
            placeholder="One step per line." />
        </Field>

        <Field label="Their wisdom / tips (optional)">
          <textarea rows={3} value={wisdom} onChange={e => setWisdom(e.target.value)} className="w-full input resize-y" style={inputStyle}
            placeholder="Secrets, margin notes, what makes it theirs — one per line." />
        </Field>

        <button onClick={save} disabled={saving || !name.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: 'var(--green)' }}>
          {saving ? <T>Saving…</T> : <T>Save recipe</T>}
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
