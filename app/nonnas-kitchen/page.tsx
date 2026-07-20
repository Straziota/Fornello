'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import RecipeCardModal from '@/components/RecipeCardModal';
import Toast from '@/components/Toast';
import PageBackground from '@/components/PageBackground';
import { T } from '@/components/T';

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
}

function toUserRecipe(r: TemplateRecipe) {
  return {
    name: r.name, cuisine: r.cuisine, mealType: r.meal_type,
    serves: r.serves, total_time: r.total_time, prep_time: r.prep_time,
    cook_time: r.cook_time, difficulty: r.difficulty, description: r.description,
    tags: r.tags, ingredients: r.ingredients, instructions: r.instructions,
    prep_ahead: r.prep_ahead, source: r.source, photo_url: r.photo_url,
    background: r.background, nonna_wisdom: r.nonna_wisdom,
  };
}

export default function NonnasKitchenPage() {
  const [recipes, setRecipes] = useState<TemplateRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewRecipe, setViewRecipe] = useState<any | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [inRotation, setInRotation] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/nonnas-kitchen').then(r => r.json()).then(d => { setRecipes(d); setLoading(false); });
  }, []);

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

      <Link href="/heritage-kitchen"
        className="inline-block text-xs uppercase tracking-widest mb-6 transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-3)' }}>
        ← <T>Back to Heritage Kitchen</T>
      </Link>

      <div className="mb-8 text-center">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em] mb-3"
            style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
          <T>Nonna's Kitchen</T>
        </h1>
        <p className="text-[15px] italic mb-8" style={{ color: 'var(--text-2)' }}>
          <T>The recipes, traditions, and wisdom of Nonna Ingrid — where it all began.</T>
        </p>
      </div>

      {/* ── Big photo ── */}
      <div className="flex justify-center mb-10 px-2">
        <img src="/Nonna.png" alt="Nonna Ingrid"
             style={{
               maxWidth: '640px', width: '100%', height: 'auto',
               borderRadius: '12px',
               boxShadow: '0 8px 24px rgba(47,58,50,0.20)',
             }} />
      </div>

      {/* ── Personal tribute ── */}
      <div className="rounded-[28px] overflow-hidden ring-1 mb-12"
           style={{ background: 'var(--white)', boxShadow: '0 8px 32px rgba(47,58,50,0.08)' }}>
        <div className="px-6 md:px-16 py-12" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="space-y-4 text-[15px]" style={{ color: 'var(--text-2)', lineHeight: 1.85 }}>
            <p><T>This is Nonna Ingrid, my mother, at heart, a cosmopolitan woman.</T></p>
            <p><T>Her parents were Italian, and her grandparents were Italian and French, so from early on her life was shaped by a mixture of cultures, traditions, languages, and tables.</T></p>
            <p><T>Though she spent most of her adult life in Venezuela, and many of her recipes reflect the flavors and comforts of the home she built there, much of her youth was spent living throughout different parts of the Western world, where she experienced remarkable adventures and met unforgettable people.</T></p>
            <p><T>One thing, however, always seemed to remain constant:</T></p>
            <p style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '17px', color: 'var(--green)', margin: '12px 0', fontFamily: 'var(--font-lora), serif' }}>
              <T>She was always the designated cook.</T>
            </p>
            <p><T>So within her kitchen, you will find not only the Venezuelan dishes that shaped our home, but also recipes and influences gathered throughout a lifetime of travels, friendships, celebrations, and stories around the world.</T></p>
            <p><T>Nonna, my mother, is the woman who taught me to know no limits, to pursue my many passions, and to savor life, figuratively and literally, in all its forms. She taught me to enjoy the simple things, to stay curious, to laugh often, and above all: to eat well.</T></p>
            <p style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '17px', color: 'var(--green)', margin: '12px 0', fontFamily: 'var(--font-lora), serif' }}>
              <T>She is the reason this platform exists.</T>
            </p>
            <p><T>She taught me to see good food not as a luxury, but as something essential, something worth the effort every single time. Whatever energy was invested in creating a beautiful meal would always come back tenfold around the table.</T></p>
            <p><T>She was a working woman, a present mother, and somehow managed to place extraordinary meals in front of us while making it all feel effortless, natural, almost inevitable.</T></p>
            <p><T>Now I have children of my own, a career of my own, and the same desire she had: to nurture a family through food, tradition, and time spent together around the table.</T></p>
            <p><T>This platform is the result of years of trying to recreate what she gave us so naturally: a home where a shared meal was part of everyday life.</T></p>
            <p><T>A special place dedicated to Nonna Ingrid, with the recipes, traditions, wisdom, and love that inspired the existence of Fornello.</T></p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">👵</div>
          <p className="italic" style={{ color: 'var(--text-2)' }}>No recipes yet — check back soon.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.map(r => (
            <div key={r.id}
                 data-tour={r.id === recipes[0]?.id ? 'tour-nonna-card' : undefined}
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
                {r.source && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>— {r.source}</p>
                )}
              </div>
              <button
                onClick={e => addToRotation(e, r)}
                disabled={inRotation.has(r.id)}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-70"
                style={{ background: inRotation.has(r.id) ? 'rgba(255,255,255,0.85)' : 'var(--green)', color: inRotation.has(r.id) ? 'var(--text-3)' : '#fff', backdropFilter: 'blur(4px)' }}>
                {inRotation.has(r.id) ? '✓ In rotation' : '↻ Add to weekly menu rotation'}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
