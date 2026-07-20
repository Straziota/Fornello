'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import Toast from '@/components/Toast';
import { T } from '@/components/T';

export default function HeritageSubmitPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [background, setBackground] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [wisdom, setWisdom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/heritage-submit/can-submit')
      .then(r => r.json())
      .then(d => {
        if (!d.allowed) { router.replace('/heritage-kitchen'); return; }
        setAllowed(true);
        setDisplayName(d.displayName || null);
      })
      .catch(() => router.replace('/heritage-kitchen'));
  }, [router]);

  const submit = async () => {
    if (!recipeName.trim() || !ingredients.trim() || !instructions.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/heritage-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_name: recipeName, cuisine,
          cultural_background: background, ingredients, instructions, wisdom,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit');
      setSubmitted(true);
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!allowed) return <PageBackground src="/backgrounds/Nonna's kitchen-page.png" />;

  return (
    <>
      <PageBackground src="/backgrounds/Nonna's kitchen-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <Link href="/heritage-kitchen"
        className="inline-block text-xs uppercase tracking-widest mb-6 transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-3)' }}>
        ← <T>Back to Heritage Kitchen</T>
      </Link>

      <div className="max-w-2xl mb-8">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
            style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
          <T>Share a recipe</T>
        </h1>
        <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
          <T>Tell us about a recipe from your family heritage. Claudia will review it personally before adding it to Heritage Kitchen.</T>
        </p>
      </div>

      {submitted ? (
        <div className="max-w-2xl rounded-[22px] p-8 ring-1 text-center"
             style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
          <div className="text-5xl mb-4">💌</div>
          <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}><T>Thank you!</T></h2>
          <p className="italic mb-6" style={{ color: 'var(--text-2)' }}>
            <T>Your recipe has been sent for review. Claudia will reach out if she has questions.</T>
          </p>
          <button onClick={() => {
              setSubmitted(false);
              setRecipeName(''); setCuisine('');
              setBackground(''); setIngredients(''); setInstructions(''); setWisdom('');
            }}
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            <T>Submit another</T>
          </button>
        </div>
      ) : (
        <div className="max-w-2xl rounded-[22px] p-6 ring-1 space-y-5"
             style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
          {displayName && (
            <div className="rounded-xl px-4 py-3" style={{ background: 'var(--green-lt)', border: '1px solid var(--green)' }}>
              <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--green)' }}>
                <T>Submitting as</T>
              </p>
              <p className="text-base" style={{ fontFamily: 'var(--font-lora), serif', color: 'var(--text)' }}>
                {displayName}
              </p>
            </div>
          )}

          <Field label="Recipe name" required>
            <input type="text" value={recipeName} onChange={e => setRecipeName(e.target.value)}
              placeholder="e.g. Tagliatelle al Ragù" className="w-full input" style={inputStyle} />
          </Field>

          <Field label="Cuisine / culture (optional)">
            <input type="text" value={cuisine} onChange={e => setCuisine(e.target.value)}
              placeholder="e.g. Italian, Russian, Mexican…" className="w-full input" style={inputStyle} />
          </Field>

          <Field label="Story / cultural background (optional)">
            <textarea rows={4} value={background} onChange={e => setBackground(e.target.value)}
              placeholder="Where this recipe comes from, what it means in the family, when it was made…"
              className="w-full input resize-y" style={inputStyle} />
          </Field>

          <Field label="Ingredients" required>
            <textarea rows={6} value={ingredients} onChange={e => setIngredients(e.target.value)}
              placeholder="One per line, with amounts. e.g.&#10;500g pasta&#10;3 tbsp olive oil&#10;2 cloves garlic"
              className="w-full input resize-y" style={inputStyle} />
          </Field>

          <Field label="Instructions" required>
            <textarea rows={8} value={instructions} onChange={e => setInstructions(e.target.value)}
              placeholder="Step-by-step. Write it however your grandmother would tell you."
              className="w-full input resize-y" style={inputStyle} />
          </Field>

          <Field label="Grandmother's wisdom / tips (optional)">
            <textarea rows={3} value={wisdom} onChange={e => setWisdom(e.target.value)}
              placeholder="Tricks, secrets, what makes it special…"
              className="w-full input resize-y" style={inputStyle} />
          </Field>

          <button onClick={submit}
            disabled={submitting || !recipeName.trim() || !ingredients.trim() || !instructions.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--green)' }}>
            {submitting ? <T>Sending…</T> : <T>Send recipe to Claudia</T>}
          </button>
        </div>
      )}

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
