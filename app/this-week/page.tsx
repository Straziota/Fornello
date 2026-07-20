'use client';
import { useState, useEffect } from 'react';
import { WeeklyMenu, Meal } from '@/lib/types';
import MealModal from '@/components/MealModal';
import Toast from '@/components/Toast';
import PageBackground from '@/components/PageBackground';
import ReplaceMealModal from '@/components/ReplaceMealModal';
import LoadingMessage from '@/components/LoadingMessage';
import { useLanguage } from '@/components/LanguageProvider';
import { getCachedTranslation } from '@/lib/translation-cache';
import { T } from '@/components/T';

function localizedMealName(meal: Meal, language: string): string {
  if (language === 'English') return meal.name;
  const cached = getCachedTranslation(meal.name, language);
  return cached?.name || meal.name;
}

function mealConflicts(meal: Meal, disliked: string[]): string[] {
  if (!disliked.length || !meal.ingredients?.length) return [];
  return disliked.filter(d =>
    meal.ingredients!.some(ing => ing.item?.toLowerCase().includes(d.toLowerCase()))
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-8">
      <div className="h-px flex-1" style={{ background: 'var(--border-2)' }} />
      <span className="text-sm italic" style={{ color: 'var(--sage)' }}>{label}</span>
      <div className="h-px flex-1" style={{ background: 'var(--border-2)' }} />
    </div>
  );
}

// Curated Unsplash food photo IDs by cuisine — permanent CDN URLs, no API key needed
const FOOD_PHOTOS: Record<string, string[]> = {
  Italian:       ['photo-1555396273-367ea4eb4db5','photo-1621996346565-e3dbc646d9a9','photo-1473093295043-cdd812d0e601'],
  Asian:         ['photo-1569050467447-ce54b3bbc37d','photo-1563245372-f21724e3856d','photo-1547592180-85f173990880'],
  Mexican:       ['photo-1565299585323-38d6b0865b47','photo-1551504734-5ee1c4a1479b','photo-1640467638851-17ee6b42c0e0'],
  Seafood:       ['photo-1519708227418-c8fd9a32b7a2','photo-1534482421-64566f976cfa','photo-1559737558-2f5a35f4523b'],
  meat:          ['photo-1544025162-d76694265947','photo-1558030006-450675393462','photo-1529193591184-b1d58069ecdd'],
  chicken:       ['photo-1598103442097-8b74394b95c2','photo-1432139555190-58524dae6a55','photo-1501200291289-c5a76c232e5f'],
  vegetarian:    ['photo-1512621776951-a57141f2eefd','photo-1498837167922-ddd27525d352','photo-1546069901-ba9599a7e63c'],
  pasta:         ['photo-1540189549336-e6e99c3679fe','photo-1611270629569-8b357cb88da9','photo-1504674900247-0877df9cc836'],
  soup:          ['photo-1547592166-23ac45744acd','photo-1448043552756-e747b7a2b2b8','photo-1476718406336-bb5a9690ee2a'],
  default:       ['photo-1504674900247-0877df9cc836','photo-1546069901-ba9599a7e63c','photo-1567620905732-2d1ec7ab7445','photo-1540189549336-e6e99c3679fe'],
};

function getMealPhoto(cuisine?: string, tags?: string[]): string {
  const key = Object.keys(FOOD_PHOTOS).find(k =>
    cuisine?.toLowerCase().includes(k.toLowerCase()) ||
    tags?.some(t => t.toLowerCase().includes(k.toLowerCase()))
  ) || 'default';
  const photos = FOOD_PHOTOS[key];
  // Pick consistently based on cuisine string so the same meal always gets the same photo
  const idx = (cuisine || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % photos.length;
  return `https://images.unsplash.com/${photos[idx]}?auto=format&fit=crop&w=400&h=300&q=75`;
}

function MealImage({ cuisine, tags, isLeftover, photoUrl }: { cuisine?: string; tags?: string[]; isLeftover?: boolean; photoUrl?: string }) {
  if (isLeftover) return (
    <div className="h-24 w-32 rounded-[18px] flex items-center justify-center shrink-0 text-3xl"
         style={{ background: '#FEF6E4' }}>♻️</div>
  );
  const fallback = getMealPhoto(cuisine, tags);
  const src = photoUrl || fallback;
  return (
    <img src={src} alt=""
         className="h-24 w-32 rounded-[18px] object-cover shrink-0"
         onError={e => {
           const img = e.target as HTMLImageElement;
           if (img.src !== fallback) { img.src = fallback; } else { img.style.display = 'none'; }
         }} />
  );
}

export default function HomePage() {
  const [menu, setMenu] = useState<WeeklyMenu | null>(null);
  const [loading, setLoading] = useState(false);
  const [openMeal, setOpenMeal] = useState<Meal | null>(null);
  const [replacingMeal, setReplacingMeal] = useState<Meal | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [skipIngredients, setSkipIngredients] = useState<string[]>([]);
  const { language: userLanguage } = useLanguage();
  const [isAdmin, setIsAdmin] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [skipDays, setSkipDays] = useState<Set<string>>(new Set());
  const [showVacationPicker, setShowVacationPicker] = useState(false);

  useEffect(() => {
    fetch('/api/menu').then(r => r.json()).then(d => { if (d?.meals) setMenu(d); });
    fetch('/api/settings').then(r => r.json()).then(d => setSkipIngredients(d.skipIngredients || []));
    fetch('/api/admin/check').then(r => r.json()).then(d => setIsAdmin(d.isAdmin)).catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setShowVacationPicker(false);
    try {
      const res = await fetch('/api/menu/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipDays: [...skipDays] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setMenu(data);
      // New week → new grocery list: clear the persisted checkbox + edited-amount state
      localStorage.removeItem('fornello_checked');
      localStorage.removeItem('fornello_amounts');
      setToast({ msg: 'Your new menu is ready! 🎉', type: 'success' });
      setSkipDays(new Set()); // clear after use
      // Re-fetch after 10s to pick up photos + grocery list generated in background
      setTimeout(() => {
        fetch('/api/menu').then(r => r.json()).then(d => { if (d?.meals) setMenu(d); });
      }, 10000);
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const handleSkipDay = async (meal: Meal, index: number) => {
    if (!menu) return;
    if (!confirm(`Skip cooking on ${meal.day}? "${meal.name}" will be removed from this week.`)) return;
    const previous = menu;
    // Optimistic update: remove by index (NOT by day name) so we never accidentally hit duplicates
    setMenu(prev => prev ? { ...prev, meals: prev.meals.filter((_, i) => i !== index) } : prev);
    try {
      const res = await fetch('/api/menu/skip-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId: menu.id, index, day: meal.day, name: meal.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not skip day');
      setToast({ msg: `${meal.day} removed from this week ✓`, type: 'success' });
    } catch (e: any) {
      // Rollback on error
      setMenu(previous);
      setToast({ msg: e.message || 'Could not skip the day — please try again', type: 'error' });
    }
  };

  const handleDrop = async (fromIndex: number, toIndex: number) => {
    if (!menu || fromIndex === toIndex) return;
    const dayA = menu.meals[fromIndex].day;
    const dayB = menu.meals[toIndex].day;
    // Optimistic update
    const updated = menu.meals.map((m, i) => {
      if (i === fromIndex) return { ...menu.meals[toIndex], day: dayA };
      if (i === toIndex)   return { ...menu.meals[fromIndex], day: dayB };
      return m;
    });
    setMenu(prev => prev ? { ...prev, meals: updated } : prev);
    setDragIndex(null);
    setDragOverIndex(null);
    await fetch('/api/menu/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuId: menu.id, dayA, dayB }),
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center px-12 py-10 rounded-[22px] ring-1"
           style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
        <LoadingMessage size="lg" />
        <p className="text-sm italic mt-3" style={{ color: 'var(--text-3)' }}>This takes about 30–60 seconds</p>
      </div>
    </div>
  );

  return (
    <>
      <PageBackground src="/backgrounds/this-week-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {replacingMeal && menu && (
        <ReplaceMealModal
          day={replacingMeal.day}
          menuId={menu.id!}
          currentMeal={replacingMeal}
          onClose={() => setReplacingMeal(null)}
          onReplaced={newMeal => {
            setMenu(prev => prev ? {
              ...prev,
              meals: prev.meals.map(m => m.day === newMeal.day ? newMeal : m)
            } : prev);
            setToast({ msg: `${newMeal.day}'s meal replaced ✓`, type: 'success' });
          }}
        />
      )}
      {openMeal && <MealModal
        meal={openMeal}
        menuId={menu?.id}
        dislikedIngredients={skipIngredients}
        isAdmin={isAdmin}
        onClose={() => setOpenMeal(null)}
        onRecipeLoaded={(day, recipe) => {
          setMenu(prev => prev ? {
            ...prev,
            meals: prev.meals.map(m => m.day === day ? { ...m, ...recipe, recipeLoaded: true } : m)
          } : prev);
          setOpenMeal(prev => prev?.day === day ? { ...prev, ...recipe, recipeLoaded: true } : prev);
        }}
      />}

      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]" style={{ color: 'var(--text)', fontFamily: 'AbramoSerif, serif' }}>
            <T>This week at home</T>
          </h1>
          <p className="mt-2 text-[15px] leading-6 italic" style={{ color: 'var(--text-2)' }}>
            {menu
              ? <><T>Week of</T> {formatDate(menu.week_start)}</>
              : <T>A calm weekly rhythm of meals and simple inspiration.</T>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {menu && (
            <a href="/print/week" target="_blank"
              className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] backdrop-blur-sm transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-2)', boxShadow: '0 2px 8px rgba(47,58,50,0.06)' }}>
              🖨 <T>Print week</T>
            </a>
          )}
          <div className="relative">
            <button onClick={() => setShowVacationPicker(o => !o)}
              className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] backdrop-blur-sm transition-opacity hover:opacity-80"
              style={{
                border: `1px solid ${skipDays.size > 0 ? 'var(--green)' : 'var(--border)'}`,
                background: skipDays.size > 0 ? 'var(--green-lt)' : 'rgba(255,255,255,0.7)',
                color: skipDays.size > 0 ? 'var(--green)' : 'var(--text-2)',
                boxShadow: '0 2px 8px rgba(47,58,50,0.06)'
              }}>
              <img src="/icons/Vacations.png" alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              <T>Days off</T>{skipDays.size > 0 ? ` (${skipDays.size})` : ''}
            </button>
            {showVacationPicker && (
              <div className="absolute right-0 mt-2 rounded-2xl p-4 z-20 w-72"
                   style={{ background: 'var(--white)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
                  <T>Days the family will be away this week</T>
                </p>
                <div className="flex flex-col gap-1.5 mb-3">
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => {
                    const checked = skipDays.has(d);
                    return (
                      <label key={d} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-2)' }}>
                        <input type="checkbox" checked={checked}
                          onChange={() => setSkipDays(prev => {
                            const next = new Set(prev);
                            if (next.has(d)) next.delete(d); else next.add(d);
                            return next;
                          })}
                          style={{ accentColor: 'var(--green)' }} />
                        <T>{d}</T>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs italic mb-3" style={{ color: 'var(--text-3)' }}>
                  <T>Selected days will be excluded from the next menu generation.</T>
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSkipDays(new Set())}
                    className="text-xs px-3 py-1.5 rounded-full flex-1"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                    <T>Clear</T>
                  </button>
                  <button onClick={() => setShowVacationPicker(false)}
                    className="text-xs px-3 py-1.5 rounded-full flex-1 text-white"
                    style={{ background: 'var(--green)' }}>
                    <T>Apply</T>
                  </button>
                </div>
              </div>
            )}
          </div>
          <button onClick={generate} data-tour="tour-generate"
            className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] backdrop-blur-sm transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--green)', boxShadow: '0 2px 8px rgba(47,58,50,0.06)' }}>
            {menu ? <T>Regenerate</T> : <T>Generate</T>}
          </button>
        </div>
      </div>

      {menu ? (
        <>

          {/* Meal cards */}
          <div className="space-y-4">
            {menu.meals.map((meal, i) => {
              const conflicts = mealConflicts(meal, skipIngredients);
              const isDragging = dragIndex === i;
              const isDragOver = dragOverIndex === i && dragIndex !== i;
              return (
                <div key={i}
                  data-tour={i === 0 ? 'tour-meal-card' : undefined}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={e => { e.preventDefault(); setDragOverIndex(i); }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={() => handleDrop(dragIndex!, i)}
                  onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                  className="rounded-[22px] p-4 transition-all hover:shadow-md ring-1"
                  style={{
                    background: meal.isLeftover ? '#FBF8F2' : 'var(--white)',
                    boxShadow: isDragOver ? '0 0 0 2px var(--green)' : '0 6px 24px rgba(47,58,50,0.06)',
                    opacity: isDragging ? 0.45 : 1,
                    cursor: 'grab',
                    transform: isDragOver ? 'scale(1.01)' : 'scale(1)',
                  }}>
                  <div className="flex items-center gap-4" onClick={() => setOpenMeal(meal)} style={{ cursor: 'pointer' }}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[50px] leading-none" style={{ color: 'var(--text)', fontFamily: 'AwesomeWays, serif' }}>
                          {meal.day}
                        </span>
                        {meal.isLeftover && (
                          <span className="text-xs px-2 py-0.5 rounded-full italic"
                                style={{ background: '#FEF6E4', color: '#7A5B10' }}><T>leftovers</T></span>
                        )}
                        {conflicts.length > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: '#FEF6E4', color: '#7A5B10' }}>⚠️</span>
                        )}
                      </div>
                      <p className="text-[18px] leading-[1.35]" style={{ color: 'var(--text)', maxWidth: '220px' }}>
                        {localizedMealName(meal, userLanguage)}
                      </p>
                      <p className="mt-1.5 text-sm italic" style={{ color: 'var(--text-3)' }}>
                        {meal.total_time} · {meal.cuisine}
                      </p>
                      {meal.sides?.length ? (
                        <p className="mt-1 text-xs" style={{ color: 'var(--sage)' }}>
                          + {meal.sides.map(s => s.name).join(' · ')}
                        </p>
                      ) : null}
                    </div>
                    <MealImage cuisine={meal.cuisine} tags={meal.tags} isLeftover={meal.isLeftover} photoUrl={meal.photo_url} />
                  </div>
                  {!meal.isLeftover && (
                    <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
                      <span style={{ color: 'var(--border)', fontSize: '18px', letterSpacing: '2px', lineHeight: 1, userSelect: 'none' }}>⠿</span>
                      <div className="flex gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); handleSkipDay(meal, i); }}
                          className="text-xs px-4 py-1.5 rounded-full transition-opacity hover:opacity-70"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-3)', background: 'transparent' }}>
                          <img src="/icons/Vacations.png" alt="" style={{ width: '14px', height: '14px', objectFit: 'contain', display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                          <T>Day off</T>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setReplacingMeal(meal); }}
                          className="text-xs px-4 py-1.5 rounded-full transition-opacity hover:opacity-70"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-3)', background: 'var(--cream)' }}>
                          ↺ <T>Replace</T>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <img src="/icons/this-week.png" alt="" style={{ width: '140px', height: 'auto', marginBottom: '20px', margin: '0 auto 20px' }} />
          <h2 className="text-2xl mb-3"><T>No menu yet</T></h2>
          <p className="mb-6 max-w-sm mx-auto italic" style={{ color: 'var(--text-2)' }}>
            <T>Set up your preferences in Settings, then generate your first personalized weekly dinner plan.</T>
          </p>
          <a href="/settings"
            className="inline-block rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em]"
            style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--green)' }}>
            <T>Go to Settings</T> →
          </a>
        </div>
      )}
    </>
  );
}
