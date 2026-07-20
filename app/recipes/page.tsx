'use client';
import { useState, useEffect } from 'react';
import { UserRecipe } from '@/lib/types';
import Toast from '@/components/Toast';
import Link from 'next/link';
import ShareButton from '@/components/ShareButton';
import RecipeCardModal from '@/components/RecipeCardModal';
import PageBackground from '@/components/PageBackground';

const MEAL_TYPES = ['Any','🥩 Meat','🍗 Chicken','🦞 Seafood','🍝 Pasta','🥗 Vegetarian','🍜 Soup / Stew','🌮 Mexican','🍣 Asian','🫘 Legumes'];

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="h-px flex-1" style={{ background: 'var(--border-2)' }} />
      <span className="text-sm italic" style={{ color: 'var(--sage)' }}>{label}</span>
      <div className="h-px flex-1" style={{ background: 'var(--border-2)' }} />
    </div>
  );
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<UserRecipe[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewRecipe, setViewRecipe] = useState<UserRecipe | null>(null);
  const [nextWeekPicks, setNextWeekPicks] = useState<Set<string>>(new Set());

  const toggleNextWeek = async (r: UserRecipe) => {
    const isPicked = nextWeekPicks.has(r.name);
    // Optimistic update
    setNextWeekPicks(prev => {
      const next = new Set(prev);
      if (isPicked) next.delete(r.name); else next.add(r.name);
      return next;
    });
    setToast({
      msg: isPicked ? `${r.name} removed from next week` : `${r.name} added to next week's menu ✓`,
      type: 'success',
    });
    await fetch('/api/menu/next-week-pick', {
      method: isPicked ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealName: r.name }),
    });
  };

  const load = () => Promise.all([
    fetch('/api/recipes').then(r => r.json()),
    fetch('/api/menu/next-week-pick').then(r => r.json()).catch(() => ({ picks: [] })),
  ]).then(([recipes, pickRes]) => {
    setRecipes(recipes);
    setNextWeekPicks(new Set(pickRes.picks || []));
    setLoading(false);
  });
  useEffect(() => { load(); }, []);

  const del = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    setToast({ msg: `${name} deleted`, type: 'success' });
    load();
  };

  return (
    <>
      <PageBackground src="/backgrounds/My recipes-page.png" />
      {viewRecipe && <RecipeCardModal recipe={viewRecipe} onClose={() => setViewRecipe(null)} />}
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]" style={{ fontFamily: 'AbramoSerif, serif' }}>Recipes</h1>
          <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
            Your family recipes — Fornello will prioritize these when building the weekly menu.
          </p>
        </div>
        <Link href="/recipes/new"
          className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--green)', whiteSpace: 'nowrap' }}>
          + Add Recipe
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20">
          <img src="/icons/my-recipes.png" alt="" style={{ width: "140px", height: "auto", margin: "0 auto 16px" }} />
          <h2 className="text-2xl mb-3">No recipes yet</h2>
          <p className="italic mb-6" style={{ color: 'var(--text-2)' }}>
            Add your family's favourite recipes and Fornello will include them in your weekly menus.
          </p>
          <Link href="/recipes/new"
            className="inline-block rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-white"
            style={{ background: 'var(--green)' }}>
            Add First Recipe
          </Link>
        </div>
      ) : (
        <>
          <Divider label={`${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} saved`} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map(r => (
              <div key={r.id} className="rounded-[22px] p-5 flex flex-col gap-3 ring-1"
                   style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.06)' }}>
                {r.photo_url && (<img src={r.photo_url} alt={r.name} onClick={() => setViewRecipe(r)} className="w-full rounded-xl object-cover mb-3 cursor-pointer" style={{ height: "140px", filter: 'saturate(1.5) sepia(0.15) brightness(0.92)' }} />)}<button onClick={() => setViewRecipe(r)} className="text-left hover:opacity-80 transition-opacity">
                  <h3 className="text-[19px] leading-tight mb-1" style={{ fontFamily: 'var(--font-lora), serif' }}>
                    {r.name}
                  </h3>
                  <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>
                    {r.cuisine}{r.mealType && r.mealType !== 'Any' ? ` · ${r.mealType}` : ''}
                  </p>
                </button>
                <p className="text-sm flex-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {r.description || 'No description.'}
                </p>
                <div className="flex gap-4 text-xs" style={{ color: 'var(--text-3)' }}>
                  <span>🕐 {r.total_time || '—'}</span>
                  <span>🍴 {r.serves}</span>
                  <span>📊 {r.difficulty}</span>
                </div>
                <button
                  onClick={() => toggleNextWeek(r)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85 flex items-center justify-center gap-2"
                  style={
                    nextWeekPicks.has(r.name)
                      ? { background: 'var(--green-lt)', color: 'var(--green)', border: '1px solid var(--green)' }
                      : { background: 'var(--green)', color: '#fff', border: '1px solid var(--green)', boxShadow: '0 2px 6px rgba(74,120,89,0.18)' }
                  }>
                  <img src="/icons/this-week.png" alt=""
                       style={{ width: '18px', height: '18px', objectFit: 'contain',
                                filter: nextWeekPicks.has(r.name) ? 'none' : 'brightness(0) invert(1)' }} />
                  {nextWeekPicks.has(r.name) ? '✓ On next week — tap to remove' : 'Add to next week'}
                </button>
                <div className="flex gap-2 pt-2 border-t flex-wrap" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={() => setViewRecipe(r)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>
                    View
                  </button>
                  <Link href={`/recipes/${r.id}`}
                    className="flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'var(--cream)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                    Edit
                  </Link>
                  <ShareButton recipe={r} size="sm" />
                  <button onClick={() => del(r.id!, r.name)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: '#FDEDEB', color: '#C0392B' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
