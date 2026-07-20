'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import RecipeCardModal from '@/components/RecipeCardModal';
import Toast from '@/components/Toast';
import PageBackground from '@/components/PageBackground';
import { T } from '@/components/T';
import type { HeritageProfile, HeritageProfileRecipe } from '@/lib/types';

function toUserRecipe(r: HeritageProfileRecipe) {
  return {
    name: r.name, cuisine: r.cuisine || '', mealType: r.meal_type || '',
    serves: r.serves || undefined, total_time: r.total_time || '', prep_time: r.prep_time || '',
    cook_time: r.cook_time || '', difficulty: r.difficulty || 'Medium', description: r.description || '',
    tags: r.tags, ingredients: r.ingredients, instructions: r.instructions,
    prep_ahead: r.prep_ahead, nonna_wisdom: r.nonna_wisdom, photo_url: r.photo_url || undefined,
    source: '',
  };
}

export default function ProfileDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<HeritageProfile | null>(null);
  const [recipes, setRecipes] = useState<HeritageProfileRecipe[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [viewRecipe, setViewRecipe] = useState<any | null>(null);
  const [inRotation, setInRotation] = useState<Set<string>>(new Set());
  const [busyVisibility, setBusyVisibility] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch(`/api/heritage/profiles/${slug}`)
      .then(async r => {
        if (r.status === 404) { setNotFoundFlag(true); return null; }
        return r.json();
      })
      .then(d => {
        if (d) { setProfile(d.profile); setRecipes(d.recipes || []); setIsOwner(!!d.is_owner); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (notFoundFlag) notFound();
  if (loading) return <><PageBackground src="/backgrounds/Nonna's kitchen-page.png" /><div className="flex justify-center py-24"><div className="spinner w-8 h-8" /></div></>;
  if (!profile) return null;

  const addToRotation = async (e: React.MouseEvent, r: HeritageProfileRecipe) => {
    e.stopPropagation();
    const res = await fetch('/api/recipes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toUserRecipe(r)),
    });
    if (res.ok) {
      setInRotation(prev => new Set([...prev, r.id]));
      setToast({ msg: `${r.name} added to your weekly rotation ✓`, type: 'success' });
    } else {
      setToast({ msg: 'Could not add to rotation', type: 'error' });
    }
  };

  const toggleVisibility = async () => {
    setBusyVisibility(true);
    const next = profile.visibility === 'public' ? 'private' : 'public';
    try {
      const res = await fetch(`/api/heritage/profiles/${slug}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(p => p ? { ...p, visibility: next } : p);
      setToast({ msg: next === 'public' ? 'Profile is now shared — anyone with the link can view it.' : 'Profile is private again.', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e.message || 'Could not update sharing', type: 'error' });
    } finally {
      setBusyVisibility(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setToast({ msg: 'Link copied to clipboard ✓', type: 'success' });
  };

  const removeProfile = async () => {
    if (!confirm(`Delete ${profile.person_name}'s kitchen and all its recipes? This can't be undone.`)) return;
    const res = await fetch(`/api/heritage/profiles/${slug}`, { method: 'DELETE' });
    if (res.ok) router.push('/family-kitchens');
    else setToast({ msg: 'Could not delete', type: 'error' });
  };

  return (
    <>
      <PageBackground src="/backgrounds/Nonna's kitchen-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {viewRecipe && <RecipeCardModal recipe={viewRecipe} onClose={() => setViewRecipe(null)} readOnly />}

      <Link href={isOwner ? '/family-kitchens' : '/heritage-kitchen'}
        className="inline-block text-xs uppercase tracking-widest mb-6 transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-3)' }}>
        ← <T>{isOwner ? 'Family Kitchens' : 'Heritage Kitchen'}</T>
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start gap-6 flex-wrap">
        <div className="rounded-2xl overflow-hidden ring-1 flex items-center justify-center flex-shrink-0"
             style={{ width: 160, height: 160, background: 'var(--cream)', boxShadow: '0 6px 24px rgba(47,58,50,0.08)' }}>
          {profile.portrait_url ? <img src={profile.portrait_url} alt={profile.person_name} className="w-full h-full object-cover" /> : <img src="/icons/Heritage kitchen.png" alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-[240px]">
          {[profile.relationship, profile.origin_country].filter(Boolean).length > 0 && (
            <p className="text-xs uppercase tracking-[0.22em] mb-1" style={{ color: 'var(--text-3)' }}>
              {[profile.relationship, profile.origin_country].filter(Boolean).join(' · ')}
            </p>
          )}
          <h1 className="text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em]"
              style={{ fontFamily: 'AbramoSerif, serif', fontStyle: 'italic', color: 'var(--text)' }}>
            {profile.person_name}
          </h1>
          {profile.bio && <p className="mt-3 text-[15px] leading-relaxed max-w-xl" style={{ color: 'var(--text-2)' }}>{profile.bio}</p>}

          {isOwner && (
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <Link href={`/family-kitchens/${slug}/add`}
                className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
                style={{ background: 'var(--green)', color: '#fff' }}>
                🥄 <T>Add a recipe</T>
              </Link>
              <button onClick={toggleVisibility} disabled={busyVisibility}
                className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                {profile.visibility === 'public' ? <T>Make private</T> : <T>Share publicly</T>}
              </button>
              {profile.visibility === 'public' && (
                <button onClick={copyLink}
                  className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  🔗 <T>Copy link</T>
                </button>
              )}
              <button onClick={removeProfile}
                className="text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70 ml-auto"
                style={{ color: 'var(--text-3)' }}>
                <T>Delete</T>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recipes */}
      {recipes.length === 0 ? (
        <div className="text-center py-12 rounded-[22px] ring-1"
             style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
          <div className="text-5xl mb-3">🍲</div>
          <p className="italic" style={{ color: 'var(--text-2)' }}>
            {isOwner ? <T>No recipes yet. Add one — scan an original card or type it in.</T> : <T>No recipes here yet.</T>}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.map(r => {
            const image = r.photo_url || r.original_scan_url;
            return (
              <div key={r.id}
                   className="rounded-[22px] overflow-hidden ring-1 group relative cursor-pointer"
                   style={{ boxShadow: '0 4px 16px rgba(47,58,50,0.06)' }}
                   onClick={() => setViewRecipe(toUserRecipe(r))}>
                {image ? (
                  <img src={image} alt={r.name} className="w-full object-cover block"
                       style={{ height: 170, filter: r.original_scan_url && !r.photo_url ? 'sepia(0.2) saturate(1.1)' : 'saturate(1.4) sepia(0.1)' }} />
                ) : (
                  <div className="w-full flex items-center justify-center" style={{ height: 170, background: 'var(--cream)' }}>
                    <span className="text-5xl">👵</span>
                  </div>
                )}
                {r.original_scan_url && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.15em]"
                        style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--text-3)' }}>
                    📜 <T>Original</T>
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}>
                  <p className="text-white text-[17px] leading-tight" style={{ fontFamily: 'var(--font-lora), serif' }}>{r.name}</p>
                </div>
                <button onClick={e => addToRotation(e, r)} disabled={inRotation.has(r.id)}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity disabled:opacity-70"
                  style={{ background: inRotation.has(r.id) ? 'rgba(255,255,255,0.85)' : 'var(--green)', color: inRotation.has(r.id) ? 'var(--text-3)' : '#fff', backdropFilter: 'blur(4px)' }}>
                  {inRotation.has(r.id) ? <>✓ <T>In rotation</T></> : <>↻ <T>Add to menu</T></>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
