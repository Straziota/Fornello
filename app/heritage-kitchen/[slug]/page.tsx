'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import RecipeCardModal from '@/components/RecipeCardModal';
import Toast from '@/components/Toast';
import PageBackground from '@/components/PageBackground';
import { T } from '@/components/T';
interface KitchenInfo {
  slug: string;
  contributor: string;
  name: string;
  country: string;
  image_url: string;
  href: string | null;
}

interface TemplateRecipe {
  id: number;
  name: string;
  cuisine: string;
  meal_type: string;
  serves: number;
  total_time: string;
  prep_time: string;
  cook_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  tags: string[];
  ingredients: { amount: string; item: string }[];
  instructions: string[];
  prep_ahead: string[];
  source: string;
  photo_url?: string;
  background?: string;
  nonna_wisdom?: string[];
  contributor?: string;
  variants?: any[];
}

function toUserRecipe(r: TemplateRecipe) {
  return {
    name: r.name, cuisine: r.cuisine, mealType: r.meal_type,
    serves: r.serves, total_time: r.total_time, prep_time: r.prep_time,
    cook_time: r.cook_time, difficulty: r.difficulty, description: r.description,
    tags: r.tags, ingredients: r.ingredients, instructions: r.instructions,
    prep_ahead: r.prep_ahead, source: r.source, photo_url: r.photo_url,
    background: r.background, nonna_wisdom: r.nonna_wisdom,
    variants: r.variants,
  };
}

export default function HeritageKitchenSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [kitchen, setKitchen] = useState<KitchenInfo | null>(null);
  const [resolvingKitchen, setResolvingKitchen] = useState(true);

  const [recipes, setRecipes] = useState<TemplateRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewRecipe, setViewRecipe] = useState<any | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [inRotation, setInRotation] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/heritage-kitchens').then(r => r.json()).then(d => {
      const found = (d.kitchens || []).find((k: any) => k.slug === slug);
      setKitchen(found || null);
      setResolvingKitchen(false);
    }).catch(() => setResolvingKitchen(false));
  }, [slug]);

  useEffect(() => {
    if (!kitchen?.slug) return;
    fetch(`/api/heritage-kitchen?kitchen=${encodeURIComponent(kitchen.slug)}`)
      .then(r => r.json())
      .then(d => { setRecipes(Array.isArray(d) ? d : []); setLoading(false); });
  }, [kitchen?.slug]);

  if (resolvingKitchen) return <div className="flex justify-center py-24"><div className="spinner w-8 h-8" /></div>;
  if (!kitchen) notFound();

  const addToRotation = async (e: React.MouseEvent, r: TemplateRecipe) => {
    e.stopPropagation();
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toUserRecipe(r)),
    });
    if (res.ok) {
      setInRotation(prev => new Set([...prev, r.id]));
      setToast({ msg: `${r.name} added to your weekly rotation ✓`, type: 'success' });
    } else {
      setToast({ msg: 'Could not add to rotation', type: 'error' });
    }
  };

  return (
    <>
      <PageBackground src="/backgrounds/Nonna's kitchen-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {viewRecipe && <RecipeCardModal recipe={viewRecipe} onClose={() => setViewRecipe(null)} readOnly />}

      <Link href="/heritage-kitchen" className="inline-block text-xs uppercase tracking-widest mb-6 transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-3)' }}>
        ← <T>All kitchens</T>
      </Link>

      <div className="mb-10 flex items-start gap-6 flex-wrap">
        <img src={kitchen!.image_url} alt={kitchen!.name}
             className="rounded-2xl ring-1"
             style={{ width: '160px', height: '160px', objectFit: 'cover', boxShadow: '0 6px 24px rgba(47,58,50,0.08)' }} />
        <div>
          <p className="text-xs uppercase tracking-[0.22em] mb-1" style={{ color: 'var(--text-3)' }}>
            <T>{kitchen!.country}</T>
          </p>
          <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]"
              style={{ fontFamily: 'AbramoSerif, serif', fontStyle: 'italic', color: 'var(--text)' }}>
            <T>{kitchen!.name}</T>
          </h1>
          <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
            <T>{`Recipes from ${kitchen!.contributor}.`}</T>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner w-8 h-8" /></div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 rounded-[22px] ring-1"
             style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
          <div className="text-5xl mb-3">👵</div>
          <p className="italic" style={{ color: 'var(--text-2)' }}>
            <T>No recipes in this kitchen yet — coming soon.</T>
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.map(r => (
            <div key={r.id}
                 className="rounded-[22px] overflow-hidden ring-1 group relative cursor-pointer"
                 style={{ boxShadow: '0 4px 16px rgba(47,58,50,0.06)' }}
                 onClick={() => setViewRecipe(toUserRecipe(r))}>
              {r.photo_url ? (
                <img src={r.photo_url} alt={r.name}
                     className="w-full object-cover block"
                     style={{ height: '170px', filter: 'saturate(1.5) sepia(0.15) brightness(0.92)' }} />
              ) : (
                <div className="w-full flex items-center justify-center"
                     style={{ height: '200px', background: 'var(--cream)' }}>
                  <span className="text-5xl">👵</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3"
                   style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}>
                <p className="text-white text-[17px] leading-tight"
                   style={{ fontFamily: 'var(--font-lora), serif' }}>{r.name}</p>
                {r.contributor && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>— {r.contributor}</p>
                )}
                {r.cuisine && !r.contributor && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{r.cuisine}</p>
                )}
              </div>
              <button
                onClick={e => addToRotation(e, r)}
                disabled={inRotation.has(r.id)}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-70"
                style={{ background: inRotation.has(r.id) ? 'rgba(255,255,255,0.85)' : 'var(--green)', color: inRotation.has(r.id) ? 'var(--text-3)' : '#fff', backdropFilter: 'blur(4px)' }}>
                {inRotation.has(r.id) ? <>✓ <T>In rotation</T></> : <>↻ <T>Add to weekly menu rotation</T></>}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
