'use client';
import { useState, useEffect } from 'react';
import { WeeklyMenu, Meal } from '@/lib/types';
import Toast from '@/components/Toast';
import PageBackground from '@/components/PageBackground';
import MealModal from '@/components/MealModal';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

interface FlatMeal extends Meal {
  menuId: number;
  weekStart: string;
}

export default function HistoryPage() {
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [dayPicker, setDayPicker] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<FlatMeal | null>(null);
  const [skipIngredients, setSkipIngredients] = useState<string[]>([]);

  const load = () =>
    fetch('/api/menu/history').then(r => r.json()).then(d => { setMenus(d); setLoading(false); });

  useEffect(() => {
    load();
    fetch('/api/settings').then(r => r.json()).then(s => setSkipIngredients(s.skipIngredients || [])).catch(() => {});
  }, []);

  const addToWeek = async (meal: FlatMeal, targetDay: string) => {
    setAdding(true);
    setDayPicker(null);
    try {
      const res = await fetch('/api/menu/add-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal, targetDay }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `${meal.name} added to ${targetDay} ✓`, type: 'success' });
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Flatten + sort A-Z
  const allMeals: FlatMeal[] = menus
    .flatMap(menu =>
      (menu.meals || []).map(meal => ({
        ...meal,
        menuId: menu.id!,
        weekStart: menu.week_start,
      }))
    )
    .filter(m => !m.isLeftover)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Group by first letter
  const grouped = allMeals.reduce<Record<string, FlatMeal[]>>((acc, meal) => {
    const letter = meal.name[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(meal);
    return acc;
  }, {});

  const letters = Object.keys(grouped).sort();

  return (
    <>
      <PageBackground src="/backgrounds/Archive-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {selectedMeal && (
        <MealModal
          meal={selectedMeal}
          menuId={selectedMeal.menuId}
          dislikedIngredients={skipIngredients}
          onClose={() => setSelectedMeal(null)}
        />
      )}

      <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]" style={{ fontFamily: 'AbramoSerif, serif' }}>Archive</h1>
      <p className="mt-2 text-[15px] italic mb-8" style={{ color: 'var(--text-2)' }}>
        Every meal you've cooked, A to Z.
      </p>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner w-8 h-8" /></div>
      ) : allMeals.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-2xl mb-3">No archive yet</h2>
          <p className="italic" style={{ color: 'var(--text-2)' }}>Generated menus will appear here.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {letters.map(letter => (
            <div key={letter}>
              {/* Letter heading */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-[32px] leading-none font-bold"
                      style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--sage)' }}>
                  {letter}
                </span>
                <div className="h-px flex-1" style={{ background: 'var(--border-2)' }} />
              </div>

              <div className="space-y-3">
                {grouped[letter].map((meal, idx) => {
                  const isOpen = dayPicker === `${meal.menuId}-${meal.day}-${meal.name}`;
                  const key = `${meal.menuId}-${meal.day}-${idx}`;
                  return (
                    <div key={key}
                      className="rounded-[22px] p-4 ring-1 flex items-center justify-between gap-4 flex-wrap"
                      style={{ background: 'var(--white)', boxShadow: '0 4px 16px rgba(47,58,50,0.05)' }}>

                      {/* Meal info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[17px] leading-tight mb-1 cursor-pointer hover:underline"
                           style={{ color: 'var(--text)' }}
                           onClick={() => setSelectedMeal(meal)}>
                          {meal.name}
                        </p>
                        <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>
                          Week of {fmt(meal.weekStart)} · {meal.day}
                          {meal.cuisine ? ` · ${meal.cuisine}` : ''}
                          {meal.total_time ? ` · ${meal.total_time}` : ''}
                        </p>
                      </div>

                      {/* Add to week */}
                      <div className="relative shrink-0">
                        {isOpen ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs" style={{ color: 'var(--text-2)' }}>Add to:</span>
                            {DAYS.map(day => (
                              <button key={day} onClick={() => addToWeek(meal, day)} disabled={adding}
                                className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                                style={{ background: 'var(--green)', color: '#fff' }}>
                                {day.slice(0, 3)}
                              </button>
                            ))}
                            <button onClick={() => setDayPicker(null)}
                              className="text-xs px-2 py-1.5 rounded-full"
                              style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDayPicker(`${meal.menuId}-${meal.day}-${meal.name}`)}
                            className="text-xs px-4 py-2 rounded-full transition-all hover:opacity-80"
                            style={{ border: '1px solid var(--green)', color: 'var(--green)', background: 'var(--green-lt)' }}>
                            ＋ Add to this week
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
