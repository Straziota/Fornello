'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRecipe, Ingredient } from '@/lib/types';
import Toast from '@/components/Toast';

interface KitchenOption {
  slug: string;
  contributor: string;
  name: string;
  country: string;
}

const MEAL_TYPES = ['Any','meat','chicken','seafood','pasta','vegetarian','soup or stew','Mexican','Asian','legumes'];
const DIFFICULTIES = ['Easy','Medium','Hard'];

interface HeritageFields {
  contributor?: string;
  kitchen_slug?: string;
  background?: string;
  nonna_wisdom?: string[];
}

interface Props {
  initial?: Partial<UserRecipe> & HeritageFields;
  onSave: (recipe: Omit<UserRecipe, 'id' | 'createdAt'> & HeritageFields) => Promise<void>;
  title: string;
  heritage?: boolean;
  redirectTo?: string;
}

export default function RecipeForm({ initial, onSave, title, heritage, redirectTo }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [name, setName] = useState(initial?.name || '');
  const [cuisine, setCuisine] = useState(initial?.cuisine || '');
  const [mealType, setMealType] = useState(initial?.mealType || 'Any');
  const [serves, setServes] = useState(initial?.serves || 4);
  const [totalTime, setTotalTime] = useState(initial?.total_time || '');
  const [prepTime, setPrepTime] = useState(initial?.prep_time || '');
  const [cookTime, setCookTime] = useState(initial?.cook_time || '');
  const [difficulty, setDifficulty] = useState<'Easy'|'Medium'|'Hard'>(initial?.difficulty || 'Easy');
  const [description, setDescription] = useState(initial?.description || '');
  const [source, setSource] = useState(initial?.source || '');
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients?.length ? initial.ingredients : [{ amount: '', item: '' }]
  );
  const [instructions, setInstructions] = useState<string[]>(
    initial?.instructions?.length ? initial.instructions : ['']
  );
  const [prepAhead, setPrepAhead] = useState<string[]>(
    initial?.prep_ahead?.length ? initial.prep_ahead : ['']
  );
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(initial?.photo_url || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Heritage-only fields
  const [contributor, setContributor] = useState(initial?.contributor || '');
  const [kitchenSlug, setKitchenSlug] = useState(initial?.kitchen_slug || '');
  const [kitchenOptions, setKitchenOptions] = useState<KitchenOption[]>([]);
  useEffect(() => {
    if (!heritage) return;
    fetch('/api/heritage-kitchens').then(r => r.json())
      .then(d => setKitchenOptions(d.kitchens || []))
      .catch(() => {});
  }, [heritage]);
  const [background, setBackground] = useState(initial?.background || '');
  const [wisdom, setWisdom] = useState<string[]>(initial?.nonna_wisdom?.length ? initial.nonna_wisdom : ['']);
  // Paste-and-parse state
  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing] = useState(false);

  const parsePaste = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parse failed');
      if (data.name) setName(data.name);
      if (data.cuisine) setCuisine(data.cuisine);
      if (data.mealType) setMealType(data.mealType);
      if (data.serves) setServes(data.serves);
      if (data.total_time) setTotalTime(data.total_time);
      if (data.prep_time) setPrepTime(data.prep_time);
      if (data.cook_time) setCookTime(data.cook_time);
      if (data.difficulty) setDifficulty(data.difficulty);
      if (data.description) setDescription(data.description);
      if (Array.isArray(data.tags)) setTags(data.tags);
      if (Array.isArray(data.ingredients) && data.ingredients.length) setIngredients(data.ingredients);
      if (Array.isArray(data.instructions) && data.instructions.length) setInstructions(data.instructions);
      if (Array.isArray(data.prep_ahead) && data.prep_ahead.length) setPrepAhead(data.prep_ahead);
      setToast({ msg: 'Recipe parsed — review and adjust the fields below ✓', type: 'success' });
      setPasteText('');
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' });
    } finally {
      setParsing(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setToast({ msg: 'Only JPG, PNG or WebP images are allowed.', type: 'error' }); return; }
    if (file.size > 5 * 1024 * 1024) { setToast({ msg: 'Image must be under 5MB.', type: 'error' }); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!name.trim()) { setToast({ msg: 'Recipe name is required', type: 'error' }); return; }
    setSaving(true);
    let finalPhotoUrl = photoUrl;
    if (photoFile) {
      setUploadingPhoto(true);
      try {
        const fd = new FormData();
        fd.append('file', photoFile);
        const res = await fetch('/api/recipes/upload-photo', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        finalPhotoUrl = data.url;
      } catch (e: any) {
        setToast({ msg: `Photo upload failed: ${e.message}`, type: 'error' });
        setSaving(false); setUploadingPhoto(false); return;
      }
      setUploadingPhoto(false);
    }
    try {
      await onSave({
        name, cuisine, mealType, serves, total_time: totalTime,
        prep_time: prepTime, cook_time: cookTime, difficulty, description, source,
        tags, photo_url: finalPhotoUrl,
        ingredients: ingredients.filter(i => i.item?.trim()),
        instructions: instructions.filter(s => s.trim()),
        prep_ahead: prepAhead.filter(s => s.trim()),
        ...(heritage ? {
          contributor: contributor.trim(),
          kitchen_slug: kitchenSlug || undefined,
          background: background.trim(),
          nonna_wisdom: wisdom.filter(w => w.trim()),
        } : {}),
      });
      router.push(redirectTo || '/recipes');
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' });
      setSaving(false);
    }
  };

  const inputStyle = { background: 'var(--cream)', borderColor: 'var(--border)', fontFamily: 'Georgia, serif' };

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push(redirectTo || '/recipes')} style={{ color: 'var(--text-3)' }} className="text-sm">← Back</button>
        <h1 className="text-[32px] leading-tight" style={{ fontFamily: 'var(--font-lora), serif' }}>{title}</h1>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* Paste-and-parse */}
        <Section title="📋 Paste a recipe (optional)">
          <p className="text-xs italic mb-3" style={{ color: 'var(--text-3)' }}>
            Paste a recipe from anywhere — a blog, a cookbook photo, a friend's email. Click Parse and the fields below will fill in automatically. You can edit anything after.
          </p>
          <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
            rows={8} placeholder="Paste the full recipe here — title, ingredients, instructions, whatever you have…"
            className="w-full input resize-y" style={{ ...inputStyle, fontFamily: 'Georgia, serif' }} />
          <button onClick={parsePaste} disabled={parsing || !pasteText.trim()}
            className="mt-3 px-5 py-2 rounded-full text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
            style={{ background: 'var(--green)', color: '#fff' }}>
            {parsing ? '✨ Parsing…' : '✨ Parse recipe'}
          </button>
        </Section>

        {/* Basic info */}
        <Section title="📖 Basic Info">
          <div className="space-y-3">
            <div>
              <label className="label">Recipe Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grandma's Lasagna"
                className="w-full input" style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Cuisine</label>
                <input value={cuisine} onChange={e => setCuisine(e.target.value)} placeholder="e.g. Italian"
                  className="w-full input" style={inputStyle} />
              </div>
              <div>
                <label className="label">Meal Type</label>
                <select value={mealType} onChange={e => setMealType(e.target.value)} className="w-full input" style={inputStyle}>
                  {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="A brief appetizing description…"
                className="w-full input resize-none" style={inputStyle} />
            </div>
            <div>
              <label className="label">Source / Origin</label>
              <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Family recipe, NYT Cooking, etc."
                className="w-full input" style={inputStyle} />
            </div>
          </div>
        </Section>

        {/* Time & difficulty */}
        {/* Photo */}
        <Section title="📷 Recipe Photo">
          <div className="rounded-xl p-3 mb-3 text-xs" style={{ background: '#FEF6E4', color: '#7A5B10', border: '1px solid #E8C97A' }}>
            ⚠️ Photos you upload will be publicly accessible. Please don't upload personal or sensitive images.
          </div>
          {photoPreview && (
            <div className="mb-3 relative">
              <img src={photoPreview} alt="" className="w-full rounded-xl object-cover" style={{ maxHeight: '200px' }} />
              <button onClick={() => { setPhotoPreview(''); setPhotoFile(null); setPhotoUrl(''); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>✕</button>
            </div>
          )}
          <label className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: 'var(--cream)', border: '1px dashed var(--border)' }}>
            <span style={{ color: 'var(--green)' }}>📁</span>
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>
              {photoPreview ? 'Choose a different photo' : 'Upload a photo'} — JPG, PNG or WebP, max 5MB
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
          </label>
        </Section>

        <Section title="⏱ Time & Difficulty">
          <div className="grid grid-cols-2 gap-3">
            {[['Total Time', totalTime, setTotalTime, 'e.g. 1 hour'],
              ['Prep Time', prepTime, setPrepTime, 'e.g. 20 min'],
              ['Cook Time', cookTime, setCookTime, 'e.g. 40 min'],
              ['Serves', String(serves), (v: string) => setServes(parseInt(v)||4), 'people'],
            ].map(([label, val, set, ph]) => (
              <div key={label as string}>
                <label className="label">{label as string}</label>
                <input value={val as string} onChange={e => (set as Function)(e.target.value)}
                  placeholder={ph as string} className="w-full input" style={inputStyle} />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="label">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <button key={d} type="button" onClick={() => setDifficulty(d as any)}
                  className="px-4 py-1.5 rounded-full text-sm transition-all"
                  style={difficulty === d
                    ? { background: 'var(--green)', color: '#fff' }
                    : { background: 'var(--cream)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Tags */}
        <Section title="🏷 Tags">
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
                    style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
                {t}
                <button onClick={() => setTags(tags.filter((_,j) => j !== i))} className="opacity-60 hover:opacity-100">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newTag} onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && newTag.trim()) { setTags([...tags, newTag.trim()]); setNewTag(''); }}}
              placeholder="Add tag and press Enter" className="flex-1 input" style={inputStyle} />
          </div>
        </Section>

        {/* Ingredients */}
        <Section title="🥬 Ingredients">
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2">
                <input value={ing.amount} onChange={e => { const n=[...ingredients]; n[i]={...n[i],amount:e.target.value}; setIngredients(n); }}
                  placeholder="Amount" className="input" style={{ ...inputStyle, width: '7rem', flexShrink: 0 }} />
                <input value={ing.item} onChange={e => { const n=[...ingredients]; n[i]={...n[i],item:e.target.value}; setIngredients(n); }}
                  placeholder="Ingredient" className="input" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
                <button onClick={() => setIngredients(ingredients.filter((_,j)=>j!==i))}
                  className="text-lg px-2" style={{ color: 'var(--text-3)' }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={() => setIngredients([...ingredients, { amount: '', item: '' }])}
            className="mt-3 text-sm px-4 py-1.5 rounded-full" style={{ color: 'var(--green)', border: '1px solid var(--green)' }}>
            + Add ingredient
          </button>
        </Section>

        {/* Instructions */}
        <Section title="👨‍🍳 Instructions">
          <div className="space-y-2">
            {instructions.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-2"
                      style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>{i+1}</span>
                <textarea value={step} onChange={e => { const n=[...instructions]; n[i]=e.target.value; setInstructions(n); }}
                  rows={2} placeholder={`Step ${i+1}…`} className="flex-1 input resize-none" style={inputStyle} />
                <button onClick={() => setInstructions(instructions.filter((_,j)=>j!==i))}
                  className="text-lg px-2 mt-1" style={{ color: 'var(--text-3)' }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={() => setInstructions([...instructions, ''])}
            className="mt-3 text-sm px-4 py-1.5 rounded-full" style={{ color: 'var(--green)', border: '1px solid var(--green)' }}>
            + Add step
          </button>
        </Section>

        {/* Prep Ahead */}
        <Section title="⏰ Prep Ahead Tips">
          <div className="space-y-2">
            {prepAhead.map((tip, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="mt-2 shrink-0" style={{ color: 'var(--sage)' }}>✓</span>
                <input value={tip} onChange={e => { const n=[...prepAhead]; n[i]=e.target.value; setPrepAhead(n); }}
                  placeholder="e.g. The night before: marinate the chicken…"
                  className="flex-1 input" style={inputStyle} />
                <button onClick={() => setPrepAhead(prepAhead.filter((_,j)=>j!==i))}
                  className="text-lg px-2" style={{ color: 'var(--text-3)' }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={() => setPrepAhead([...prepAhead, ''])}
            className="mt-3 text-sm px-4 py-1.5 rounded-full" style={{ color: 'var(--green)', border: '1px solid var(--green)' }}>
            + Add tip
          </button>
        </Section>

        {heritage && (
          <Section title="👵 Heritage Kitchen — contributor & story">
            <div className="space-y-3">
              <div>
                <label className="label">Kitchen *</label>
                <select value={kitchenSlug} onChange={e => setKitchenSlug(e.target.value)}
                  className="w-full input" style={inputStyle}>
                  <option value="">— Choose a kitchen —</option>
                  {kitchenOptions.map(k => (
                    <option key={k.slug} value={k.slug}>
                      {k.name} ({k.country})
                    </option>
                  ))}
                </select>
                <p className="text-xs italic mt-1" style={{ color: 'var(--text-3)' }}>
                  Add or remove kitchens at <Link href="/admin/heritage/kitchens" className="underline">/admin/heritage/kitchens</Link>.
                </p>
              </div>
              <div className="mt-3">
                <label className="label">Contributor name *</label>
                <input value={contributor} onChange={e => setContributor(e.target.value)}
                  placeholder="The individual grandmother (e.g. Nonna Ingrid, Abuela María, Babushka Sasha)"
                  className="w-full input" style={inputStyle} />
                <p className="text-xs italic mt-1" style={{ color: 'var(--text-3)' }}>
                  This name appears under the recipe's title on the kitchen page.
                </p>
              </div>
              <div>
                <label className="label">Cultural background / family story</label>
                <textarea value={background} onChange={e => setBackground(e.target.value)} rows={5}
                  placeholder="Where this recipe comes from, who passed it down, what makes it special…"
                  className="w-full input resize-y" style={inputStyle} />
              </div>
              <div>
                <label className="label">Wisdom & tips</label>
                <div className="space-y-2">
                  {wisdom.map((w, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="mt-2 shrink-0" style={{ color: '#C4A265' }}>✦</span>
                      <input value={w} onChange={e => { const n = [...wisdom]; n[i] = e.target.value; setWisdom(n); }}
                        placeholder="e.g. The secret is to slow-cook the soffritto for the full 15 minutes…"
                        className="flex-1 input" style={inputStyle} />
                      <button onClick={() => setWisdom(wisdom.filter((_, j) => j !== i))}
                        className="text-lg px-2" style={{ color: 'var(--text-3)' }}>×</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setWisdom([...wisdom, ''])}
                  className="mt-3 text-sm px-4 py-1.5 rounded-full" style={{ color: 'var(--green)', border: '1px solid var(--green)' }}>
                  + Add a wisdom tip
                </button>
              </div>
            </div>
          </Section>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3.5 rounded-xl font-semibold text-white text-base transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)' }}>
          {uploadingPhoto ? 'Uploading photo…' : saving ? 'Saving…' : 'Save Recipe'}
        </button>
      </div>

      <style>{`
        .label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-3); margin-bottom: 5px; }
        .input { padding: 9px 13px; border: 1px solid; border-radius: 10px; font-size: 14px; outline: none; width: 100%; }
        .input:focus { border-color: var(--green); background: white; }
      `}</style>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] p-6 ring-1" style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.05)' }}>
      <h2 className="font-bold text-base mb-4">{title}</h2>
      {children}
    </div>
  );
}
