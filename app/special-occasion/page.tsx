'use client';
import { useState, useEffect, useCallback } from 'react';
import PageBackground from '@/components/PageBackground';
import LoadingMessage from '@/components/LoadingMessage';
import { SpecialOccasionResult, DaySchedule } from '@/lib/claude';

function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-6" style={{ color: '#C4A265' }}>
      <div style={{ flex: 1, height: '1px', background: '#C4A265' }} />
      {label
        ? <span style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C4A265', whiteSpace: 'nowrap' }}>{label}</span>
        : <span style={{ fontSize: '14px' }}>✦</span>
      }
      <div style={{ flex: 1, height: '1px', background: '#C4A265' }} />
    </div>
  );
}

const TIME_OPTIONS = [
  { value: 0,   label: 'No time available' },
  { value: 20,  label: '20 min' },
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1½ hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: 'Half day' },
];

function buildDaySchedules(eventDate: string, prepStartDate: string, defaultMinutes = 60): DaySchedule[] {
  if (!eventDate || !prepStartDate) return [];
  const start = new Date(prepStartDate + 'T12:00:00');
  const end   = new Date(eventDate   + 'T12:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
  if (start > end) return [];
  // Guard against absurd spans (e.g. a half-typed year like 0002 while entering a
  // date) — without this the day-by-day loop below runs hundreds of thousands of
  // times on a single keystroke and freezes the browser. No real prep window is
  // longer than a year.
  const span = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (span > 366) return [];
  const days: DaySchedule[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const diff = Math.round((end.getTime() - cur.getTime()) / 86400000);
    days.push({
      date: cur.toISOString().slice(0, 10),
      label: cur.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      daysUntilEvent: diff,
      minutes: defaultMinutes,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function fmtMins(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h} hour${h > 1 ? 's' : ''}`;
}

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

interface SavedEvent {
  id: number;
  occasion: string;
  guests: number | null;
  serving_time: string | null;
  event_date: string | null;
  created_at: string;
  result: SpecialOccasionResult;
}

type View = 'list' | 'form' | 'result';

interface DishRecipe {
  name: string; description: string; serves: number;
  prepTime: string; cookTime: string; totalTime: string; difficulty: string;
  ingredients: { amount: string; item: string }[];
  instructions: string[];
  makeAheadNote?: string;
}

function DishRecipeModal({ dish, recipe, loading, onClose }: {
  dish: string; recipe: DishRecipe | null; loading: boolean; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-8"
         style={{ background: 'rgba(30,24,16,0.65)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-xl"
           style={{ background: '#FEFAF0', border: '2px solid #C4A265', padding: '5px', fontFamily: 'Georgia, ui-serif, serif', boxShadow: '0 24px 64px rgba(30,20,10,0.35)' }}>
        <div style={{ border: '1px solid #C4A265', padding: '28px 32px' }}>
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-60"
            style={{ color: '#C4A265', fontSize: '16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>

          {loading ? (
            <div className="flex flex-col items-center py-12">
              <LoadingMessage size="md" />
            </div>
          ) : recipe ? (
            <>
              <div className="flex items-center gap-3 mb-5" style={{ color: '#C4A265' }}>
                <div style={{ flex: 1, height: '1px', background: '#C4A265' }} />
                <span style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Recipe</span>
                <div style={{ flex: 1, height: '1px', background: '#C4A265' }} />
              </div>
              <h2 style={{ fontFamily: 'AbramoSerif, Georgia, serif', fontSize: '26px', textAlign: 'center', color: '#2B1810', lineHeight: 1.2, marginBottom: '8px' }}>
                {recipe.name}
              </h2>
              {recipe.description && (
                <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#6B5040', fontSize: '13px', lineHeight: 1.6, marginBottom: '12px' }}>
                  &ldquo;{recipe.description}&rdquo;
                </p>
              )}
              <p style={{ textAlign: 'center', color: '#8B6A42', fontSize: '12px', letterSpacing: '0.05em', marginBottom: '20px' }}>
                {[recipe.totalTime && `${recipe.totalTime}`, (recipe as any).yield || (recipe.serves && `Serves ${recipe.serves}`), recipe.difficulty].filter(Boolean).join('  ·  ')}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.28em', color: '#8B6A42', marginBottom: '10px' }}>Ingredients</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(recipe.ingredients ?? []).map((ing, i) => (
                      <li key={i} style={{ display: 'flex', gap: '8px', padding: '4px 0', borderBottom: '1px dotted #D4B896', fontSize: '12px', color: '#3D2714' }}>
                        <span style={{ color: '#8B6A42', minWidth: '60px', fontWeight: 700, flexShrink: 0 }}>{ing.amount}</span>
                        <span>{ing.item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.28em', color: '#8B6A42', marginBottom: '10px' }}>Directions</h3>
                  <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(recipe.instructions ?? []).map((step, i) => (
                      <li key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '12px', color: '#3D2714', lineHeight: 1.5 }}>
                        <span style={{ color: '#C4A265', fontWeight: 700, minWidth: '16px', flexShrink: 0 }}>{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {recipe.makeAheadNote && (
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: '#FBF5E6', border: '1px solid #E8D5B0' }}>
                  <p style={{ fontSize: '12px', color: '#8B6A42', fontStyle: 'italic' }}>✓ {recipe.makeAheadNote}</p>
                </div>
              )}
            </>
          ) : (
            <p style={{ textAlign: 'center', color: '#8B6A42', padding: '40px 0' }}>Could not load recipe — please try again.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result, meta, occasionContext, recipesStale, onBack, onEdit, onPrint, onDishClick, onToggleSelect, onSwap, onFinalize, finalizing, swappingIndex, onAddToGroceries, onRemoveFromGroceries, addingGroceries, groceriesAdded, missedDays, onToggleMissed, onClearMissed, onReschedule, rescheduling }: {
  result: SpecialOccasionResult;
  meta: { guests: string; servingTime: string; eventDate: string };
  occasionContext: { occasion: string; guests: number; cuisineTheme?: string };
  recipesStale: boolean;
  onBack: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onDishClick: (dish: string, course: string) => void;
  onToggleSelect: (index: number) => void;
  onSwap: (index: number) => void;
  onFinalize: () => void;
  finalizing: boolean;
  swappingIndex: number | null;
  onAddToGroceries: () => void;
  onRemoveFromGroceries: () => void;
  addingGroceries: boolean;
  groceriesAdded: number | null;
  missedDays: Set<number>;
  onToggleMissed: (index: number) => void;
  onClearMissed: () => void;
  onReschedule: () => void;
  rescheduling: boolean;
}) {
  const onGroceryList = (groceriesAdded ?? 0) > 0;
  const selectedCount = (result.menu ?? []).filter(m => m.selected !== false).length;
  return (
    <div className="max-w-3xl">
      <div className="no-print flex items-center justify-between mb-6">
        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8B6A42', fontSize: '13px', fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>
          ← All occasions
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onEdit}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
            style={{ border: '1px solid #C4A265', color: '#8B6A42', background: 'transparent', fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
            Adjust details
          </button>
          <button onClick={onPrint}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
            style={{ border: '1px solid #C4A265', color: '#8B6A42', background: 'transparent', fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
            Print
          </button>
        </div>
      </div>

      <div className="rounded-[22px]"
           style={{ background: '#FEFAF0', border: '2px solid #C4A265', padding: '5px', boxShadow: '0 8px 40px rgba(47,30,10,0.12)' }}>
        <div style={{ border: '1px solid #C4A265', padding: '36px 40px', fontFamily: 'Georgia, ui-serif, serif' }}>
          <Divider label="Special Occasion" />
          <h2 style={{ fontFamily: 'AbramoSerif, Georgia, serif', fontSize: '32px', textAlign: 'center', color: '#2B1810', lineHeight: 1.2, marginBottom: '8px' }}>
            {result.occasionTitle}
          </h2>
          <p style={{ textAlign: 'center', color: '#8B6A42', fontSize: '13px', letterSpacing: '0.05em', marginBottom: '4px' }}>
            {[meta.guests && `${meta.guests} guests`, meta.eventDate && fmtDate(meta.eventDate), meta.servingTime && `at ${meta.servingTime}`].filter(Boolean).join('  ·  ')}
          </p>

          <Divider label="The Menu" />
          <p className="no-print" style={{ textAlign: 'center', fontSize: '11px', color: '#B09070', fontStyle: 'italic', marginBottom: '16px', marginTop: '-8px' }}>
            Tap a dish for its recipe · use the checkbox to include it · ⇄ to swap it
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '8px' }}>
            {(result.menu ?? []).map((item, i) => {
              const included = item.selected !== false;
              return (
              <div key={i}
                   className={`transition-all ${included ? 'hover:shadow-md hover:-translate-y-0.5' : 'no-print'}`}
                   style={{ padding: '16px 18px', borderRadius: '14px', background: '#FBF5E6', border: included ? '1px solid #E8D5B0' : '1px dashed #D4B896', position: 'relative', opacity: included ? 1 : 0.5 }}>
                <label className="no-print" onClick={e => e.stopPropagation()}
                  style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B6A42' }}>
                  <input type="checkbox" checked={included} onChange={() => onToggleSelect(i)} style={{ accentColor: '#8B6A42', cursor: 'pointer' }} />
                  {included ? 'In menu' : 'Skipped'}
                </label>
                <div onClick={() => included && onDishClick(item.dish, item.course)} style={{ cursor: included ? 'pointer' : 'default' }}>
                  <p style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C4A265', marginBottom: '4px', paddingRight: '64px' }}>{item.course}</p>
                  <p style={{ fontSize: '17px', color: '#2B1810', fontFamily: 'AbramoSerif, Georgia, serif', marginBottom: '6px', lineHeight: 1.2 }}>{item.dish}</p>
                  <p style={{ fontSize: '13px', color: '#5C3D1E', fontStyle: 'italic', lineHeight: 1.55, marginBottom: '8px' }}>{item.description}</p>
                  <p style={{ fontSize: '11px', color: '#8B6A42' }}>
                    {[item.prepTime && `Prep ${item.prepTime}`, item.cookTime && `Cook ${item.cookTime}`].filter(Boolean).join('  ·  ')}
                  </p>
                  {item.makeAheadNote && (
                    <p style={{ fontSize: '11px', color: '#8B6A42', marginTop: '6px', paddingTop: '6px', borderTop: '1px dotted #D4B896', fontStyle: 'italic' }}>
                      ✓ {item.makeAheadNote}
                    </p>
                  )}
                </div>
                <button className="no-print" onClick={e => { e.stopPropagation(); onSwap(i); }} disabled={swappingIndex === i}
                  style={{ marginTop: '10px', background: 'transparent', border: '1px solid #D4B896', borderRadius: '999px', padding: '4px 12px', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B6A42', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  {swappingIndex === i ? 'Swapping…' : '⇄ Swap dish'}
                </button>
              </div>
              );
            })}
          </div>

          {/* Finalize */}
          <div className="no-print" style={{ marginTop: '18px', textAlign: 'center' }}>
            {result.finalized && (
              <p style={{ fontSize: '12px', color: '#8B6A42', fontStyle: 'italic', marginBottom: '10px' }}>
                ✓ Menu finalized — the recipes and prep plan are below. Change a dish and finalize again to update them.
              </p>
            )}
            {recipesStale && (
              <p style={{ fontSize: '12px', color: '#8B4A20', fontStyle: 'italic', marginBottom: '10px' }}>
                The guest count changed since these recipes were written (they serve {result.recipesServeGuests}).
                Re-finalize to rescale them for {meta.guests || 'the new count'}.
              </p>
            )}
            {/* Only offered once the menu is finalized — the ingredients live on
                the generated recipes, so there's nothing to add before then. */}
            {result.finalized && selectedCount > 0 && (
              <div style={{ marginBottom: '14px' }}>
                {onGroceryList ? (
                  <>
                    <p style={{ fontSize: '12px', color: '#5C7A4A', fontStyle: 'italic', marginBottom: '8px' }}>
                      {`✓ ${groceriesAdded} ${groceriesAdded === 1 ? 'ingredient is' : 'ingredients are'} on this week's grocery list.`}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={onAddToGroceries} disabled={addingGroceries}
                        className="transition-opacity hover:opacity-80"
                        style={{ background: 'transparent', border: '1px solid #C4A265', borderRadius: '999px', padding: '9px 20px', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8B6A42', cursor: addingGroceries ? 'default' : 'pointer', fontFamily: 'Georgia, serif', opacity: addingGroceries ? 0.6 : 1 }}>
                        {addingGroceries ? 'Working…' : '↻ Update the list'}
                      </button>
                      <button onClick={onRemoveFromGroceries} disabled={addingGroceries}
                        className="transition-opacity hover:opacity-80"
                        style={{ background: 'transparent', border: '1px solid #D8BFAF', borderRadius: '999px', padding: '9px 20px', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#A5451E', cursor: addingGroceries ? 'default' : 'pointer', fontFamily: 'Georgia, serif', opacity: addingGroceries ? 0.6 : 1 }}>
                        Remove from list
                      </button>
                    </div>
                  </>
                ) : (
                  <button onClick={onAddToGroceries} disabled={addingGroceries}
                    className="transition-opacity hover:opacity-80"
                    style={{ background: 'transparent', border: '1px solid #C4A265', borderRadius: '999px', padding: '11px 24px', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8B6A42', cursor: addingGroceries ? 'default' : 'pointer', fontFamily: 'Georgia, serif', opacity: addingGroceries ? 0.6 : 1 }}>
                    {addingGroceries ? 'Adding to your grocery list…' : '🛒 Add ingredients to grocery list'}
                  </button>
                )}
              </div>
            )}
            <button onClick={onFinalize} disabled={finalizing || selectedCount === 0}
              style={{ background: '#8B6A42', color: '#fff', border: 'none', borderRadius: '999px', padding: '13px 30px', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: (finalizing || selectedCount === 0) ? 'default' : 'pointer', fontFamily: 'Georgia, serif', opacity: (finalizing || selectedCount === 0) ? 0.5 : 1 }}>
              {finalizing ? 'Building your recipes & prep plan…' : result.finalized ? 'Re-finalize menu' : `Finalize menu & build prep plan (${selectedCount})`}
            </button>
          </div>
          {result.servingNotes && (
            <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#6B5040', fontSize: '13px', lineHeight: 1.7, margin: '16px 0 0' }}>
              &ldquo;{result.servingNotes}&rdquo;
            </p>
          )}

          {result.finalized && (result.menu ?? []).some(m => m.selected !== false && m.fullRecipe) && (
            <>
              <Divider label="The Recipes" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {(result.menu ?? []).map((m, i) => (m.selected !== false && m.fullRecipe) ? (
                  <div key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid #E8D5B0', paddingTop: i === 0 ? 0 : '18px' }}>
                    <p style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C4A265', marginBottom: '2px' }}>{m.course}</p>
                    <h3 style={{ fontFamily: 'AbramoSerif, Georgia, serif', fontSize: '21px', color: '#2B1810', lineHeight: 1.2, marginBottom: '4px' }}>{m.fullRecipe!.name}</h3>
                    <p style={{ fontSize: '12px', color: '#8B6A42', letterSpacing: '0.04em', marginBottom: '14px' }}>
                      {[m.fullRecipe!.totalTime, m.fullRecipe!.yield || (m.fullRecipe!.serves && `Serves ${m.fullRecipe!.serves}`), m.fullRecipe!.difficulty].filter(Boolean).join('  ·  ')}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px' }}>
                      <div>
                        <h4 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.28em', color: '#8B6A42', marginBottom: '8px' }}>Ingredients</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {(m.fullRecipe!.ingredients ?? []).map((ing, j) => (
                            <li key={j} style={{ display: 'flex', gap: '8px', padding: '3px 0', borderBottom: '1px dotted #E8D5B0', fontSize: '12px', color: '#3D2714' }}>
                              <span style={{ color: '#8B6A42', minWidth: '58px', fontWeight: 700, flexShrink: 0 }}>{ing.amount}</span>
                              <span>{ing.item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.28em', color: '#8B6A42', marginBottom: '8px' }}>Directions</h4>
                        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {(m.fullRecipe!.instructions ?? []).map((step, j) => (
                            <li key={j} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '12px', color: '#3D2714', lineHeight: 1.5 }}>
                              <span style={{ color: '#C4A265', fontWeight: 700, minWidth: '16px', flexShrink: 0 }}>{j + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                    {m.fullRecipe!.makeAheadNote && (
                      <p style={{ fontSize: '11px', color: '#8B6A42', fontStyle: 'italic', marginTop: '10px', padding: '8px 12px', background: '#FBF5E6', border: '1px solid #E8D5B0', borderRadius: '8px' }}>
                        ✓ Make ahead: {m.fullRecipe!.makeAheadNote}
                      </p>
                    )}
                  </div>
                ) : null)}
              </div>
            </>
          )}

          <Divider label="Preparation Timeline" />

          {/* Life happens: mark the days that didn't, and the rest of the plan is
              rebuilt around the time actually left. */}
          {(result.timeline?.length ?? 0) > 0 && (
            <div className="no-print" style={{ marginBottom: '18px' }}>
              {missedDays.size === 0 ? (
                <p style={{ fontSize: '11px', color: '#B09070', fontStyle: 'italic', textAlign: 'center' }}>
                  Fell behind? Tick any day you didn&apos;t get to and we&apos;ll roll that work into the days you have left.
                </p>
              ) : (
                <div style={{ background: '#FBF0E6', border: '1px solid #E0B48C', borderRadius: '12px', padding: '14px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12.5px', color: '#8B4A20', lineHeight: 1.6, marginBottom: '10px' }}>
                    {missedDays.size === 1 ? '1 day' : `${missedDays.size} days`} marked as missed. Rebuilding rewrites the
                    plan from the earliest missed day onwards, fitting it into the days you have left.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={onClearMissed} disabled={rescheduling}
                      className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                      style={{ border: '1px solid #C4A265', color: '#8B6A42', background: 'transparent', fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button onClick={onReschedule} disabled={rescheduling}
                      className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
                      style={{ background: '#8B6A42', color: '#fff', border: 'none', fontFamily: 'Georgia, serif', cursor: rescheduling ? 'default' : 'pointer', opacity: rescheduling ? 0.6 : 1 }}>
                      {rescheduling ? 'Rebuilding your plan…' : 'Rebuild the remaining days'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {result.timelineWarning && (
            <p className="no-print" style={{ fontSize: '12.5px', color: '#8B4A20', lineHeight: 1.6, marginBottom: '16px', padding: '10px 14px', background: '#FBF0E6', border: '1px solid #E0B48C', borderRadius: '10px' }}>
              ⚠ {result.timelineWarning}
            </p>
          )}

          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            <div style={{ position: 'absolute', left: '6px', top: '8px', bottom: '8px', width: '1px', background: '#D4B896' }} />
            {(result.timeline ?? []).map((bucket, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: '28px' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: '#C4A265', border: '2px solid #FEFAF0', boxShadow: '0 0 0 1px #C4A265' }} />
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <p style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8B6A42', marginBottom: '2px' }}>{bucket.when}</p>
                  <label className="no-print" onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: missedDays.has(i) ? '#A5451E' : '#C4A265' }}>
                    <input type="checkbox" checked={missedDays.has(i)} onChange={() => onToggleMissed(i)}
                           style={{ accentColor: '#A5451E', cursor: 'pointer' }} />
                    Didn&apos;t get to this
                  </label>
                </div>
                {bucket.activeMinutes ? (
                  <p style={{ fontSize: '11px', color: '#B09070', fontStyle: 'italic', marginBottom: '10px' }}>
                    about {fmtMins(bucket.activeMinutes)} hands-on
                  </p>
                ) : <div style={{ height: '6px' }} />}

                {bucket.steps?.length ? (
                  /* Follow-along script: elapsed-time gutter, so waits are visible
                     and the cook can see what to start next while something rests. */
                  <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {bucket.steps.map((step, j) => (
                      <li key={j} style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '13px', color: '#3D2714', lineHeight: 1.6 }}>
                        <span style={{
                          flexShrink: 0, minWidth: '42px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                          color: '#8B6A42', fontSize: '11px', fontWeight: 700, paddingTop: '2px', letterSpacing: '0.04em',
                        }}>{step.at}</span>
                        <span style={{ flexShrink: 0, color: '#E0CDA9' }}>│</span>
                        <span>{step.text}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  /* Occasions planned before the step-by-step script existed. */
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {bucket.tasks.map((task, j) => (
                      <li key={j} style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '13px', color: '#3D2714', lineHeight: 1.55 }}>
                        <span style={{ color: '#C4A265', flexShrink: 0, fontWeight: 700 }}>—</span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {bucket.endsWith && (
                  <p style={{ fontSize: '12px', color: '#8B6A42', fontStyle: 'italic', marginTop: '10px', padding: '8px 12px', background: '#FBF5E6', border: '1px solid #E8D5B0', borderRadius: '8px' }}>
                    Ends with: {bucket.endsWith}
                  </p>
                )}
              </div>
            ))}
          </div>

          {result.hostingTips?.length > 0 && (
            <>
              <Divider label="Hosting Notes" />
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {result.hostingTips.map((tip, i) => (
                  <li key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '13px', color: '#3D2714', lineHeight: 1.6 }}>
                    <span style={{ color: '#C4A265', flexShrink: 0 }}>✦</span>
                    <span style={{ fontStyle: 'italic' }}>{tip}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Divider />
        </div>
      </div>
    </div>
  );
}

export default function SpecialOccasionPage() {
  const [view, setView]               = useState<View>('list');
  const [events, setEvents]           = useState<SavedEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeEvent, setActiveEvent] = useState<SavedEvent | null>(null);

  // Form state
  const [occasion, setOccasion]             = useState('');
  const [title, setTitle]                   = useState('');
  const [guests, setGuests]                 = useState('');
  const [servingTime, setServingTime]       = useState('');
  const [cuisineTheme, setCuisineTheme]     = useState('');
  const [dietaryNotes, setDietaryNotes]     = useState('');
  const [mustHaveDishes, setMustHaveDishes] = useState('');
  const [eventDate, setEventDate]           = useState('');
  const [prepStartDate, setPrepStartDate]   = useState('');
  const [daySchedules, setDaySchedules]     = useState<DaySchedule[]>([]);
  const [eventType, setEventType]           = useState<'served-dinner' | 'hors-doeuvres'>('served-dinner');
  const [generating, setGenerating]         = useState(false);
  const [error, setError]                   = useState('');
  const [finalizing, setFinalizing]         = useState(false);
  const [swappingIndex, setSwappingIndex]   = useState<number | null>(null);
  const [missedDays, setMissedDays]           = useState<Set<number>>(new Set());
  const [rescheduling, setRescheduling]       = useState(false);
  const [addingGroceries, setAddingGroceries] = useState(false);
  const [groceriesAdded, setGroceriesAdded]   = useState<number | null>(null);
  const [editingId, setEditingId]           = useState<number | null>(null); // occasion being edited in place
  const [savingDetails, setSavingDetails]   = useState(false);
  const [confirmRegen, setConfirmRegen]     = useState(false); // guard on the destructive "regenerate whole menu"

  // Dish recipe modal
  const [selectedDish, setSelectedDish]     = useState<{ dish: string; course: string } | null>(null);
  const [dishRecipe, setDishRecipe]         = useState<DishRecipe | null>(null);
  const [loadingRecipe, setLoadingRecipe]   = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    const res = await fetch('/api/special-occasion');
    if (res.ok) setEvents(await res.json());
    setLoadingEvents(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    const fresh = buildDaySchedules(eventDate, prepStartDate);
    setDaySchedules(prev => fresh.map(d => {
      const existing = prev.find(p => p.date === d.date);
      return existing ? { ...d, minutes: existing.minutes } : d;
    }));
  }, [eventDate, prepStartDate]);

  const setAllDays = (minutes: number) => setDaySchedules(prev => prev.map(d => ({ ...d, minutes })));
  const setDayMinutes = (date: string, minutes: number) => setDaySchedules(prev => prev.map(d => d.date === date ? { ...d, minutes } : d));

  const deleteEvent = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/special-occasion/${id}`, { method: 'DELETE' });
    setEvents(prev => prev.filter(ev => ev.id !== id));
  };

  // The saved fullRecipe is the one truth for a dish — it's what the printout,
  // the grocery list and the prep plan are all built from. Generating a fresh one
  // here (as this used to) produced a different recipe every tap, so the screen
  // and the printout disagreed. Only generate when nothing is saved yet, and
  // persist it immediately so everything downstream matches.
  const handleDishClick = async (dish: string, course: string) => {
    if (!activeEvent) return;
    setSelectedDish({ dish, course });
    setDishRecipe(null);

    const idx = activeEvent.result.menu.findIndex(m => m.dish === dish && m.course === course);
    const saved = idx >= 0 ? activeEvent.result.menu[idx]?.fullRecipe : undefined;
    if (saved?.ingredients?.length) {
      setDishRecipe(saved as DishRecipe);
      return;
    }

    setLoadingRecipe(true);
    try {
      const res = await fetch('/api/special-occasion/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dish,
          course,
          occasion: activeEvent.occasion,
          guests: activeEvent.guests || 4,
          cuisineTheme: activeEvent.result.planning?.cuisineTheme || '',
        }),
      });
      if (!res.ok) return;
      const recipe = await res.json();
      setDishRecipe(recipe);
      if (idx >= 0 && recipe?.ingredients?.length) {
        setActiveEvent(prev => {
          if (!prev) return prev;
          const menu = prev.result.menu.map((m, i) => i === idx ? { ...m, fullRecipe: recipe } : m);
          const result = { ...prev.result, menu };
          persistResult(prev.id, result);
          return { ...prev, result };
        });
      }
    } finally {
      setLoadingRecipe(false);
    }
  };

  const generate = async () => {
    if (!occasion.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/special-occasion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion, title, guests: Number(guests) || 0, servingTime, cuisineTheme, dietaryNotes, mustHaveDishes, eventDate, prepStartDate, daySchedules, eventType, editId: editingId }),
      });
      if (!res.ok) throw new Error('Failed');
      // Drain stream — generation + DB save happen server-side
      const reader = res.body!.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
      // Re-fetch from DB so we always display the saved canonical data
      const updated = await fetch('/api/special-occasion');
      if (!updated.ok) throw new Error('Could not load saved event');
      const saved: SavedEvent[] = await updated.json();
      setEvents(saved);
      // When regenerating in place, keep showing that same occasion; otherwise the newest.
      const target = editingId ? saved.find(e => e.id === editingId) : saved[0];
      if (target) { setActiveEvent(target); setView('result'); }
      setEditingId(null);
      setConfirmRegen(false);
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Save edited details WITHOUT touching the menu. This is the primary action
  // when adjusting an existing occasion — regenerating would throw away the
  // chosen dishes and their finalized recipes.
  const saveDetails = async () => {
    if (!editingId || !occasion.trim()) return;
    setSavingDetails(true);
    setError('');
    try {
      const res = await fetch(`/api/special-occasion/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          details: { occasion, title, guests: Number(guests) || 0, servingTime, cuisineTheme,
                     dietaryNotes, mustHaveDishes, eventDate, prepStartDate, daySchedules, eventType },
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated = await fetch('/api/special-occasion');
      if (!updated.ok) throw new Error('Could not load saved event');
      const saved: SavedEvent[] = await updated.json();
      setEvents(saved);
      const target = saved.find(e => e.id === editingId);
      if (target) { setActiveEvent(target); setView('result'); }
      setEditingId(null);
      setConfirmRegen(false);
    } catch {
      setError('Could not save your changes — please try again.');
    } finally {
      setSavingDetails(false);
    }
  };

  // Persist the current result (selection toggles / swapped dishes).
  const persistResult = (id: number, result: SpecialOccasionResult) => {
    fetch(`/api/special-occasion/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    }).catch(() => {});
  };

  const toggleSelect = (index: number) => {
    setActiveEvent(prev => {
      if (!prev) return prev;
      const menu = prev.result.menu.map((m, i) => i === index ? { ...m, selected: m.selected === false } : m);
      const result = { ...prev.result, menu };
      persistResult(prev.id, result);
      return { ...prev, result };
    });
  };

  const swapDish = async (index: number) => {
    if (!activeEvent) return;
    setSwappingIndex(index);
    setError('');
    try {
      const item = activeEvent.result.menu[index];
      const res = await fetch('/api/special-occasion/swap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: activeEvent.occasion,
          eventType: activeEvent.result.eventType,
          course: item.course,
          guests: activeEvent.guests || 4,
          cuisineTheme: activeEvent.result.planning?.cuisineTheme || '',
          dietaryNotes: activeEvent.result.planning?.dietaryNotes || '',
          avoid: activeEvent.result.menu.map(m => m.dish),
        }),
      });
      if (!res.ok) throw new Error();
      const newItem = await res.json();
      setActiveEvent(prev => {
        if (!prev) return prev;
        const menu = prev.result.menu.map((m, i) => i === index ? { ...newItem, selected: m.selected !== false } : m);
        const result = { ...prev.result, menu };
        persistResult(prev.id, result);
        return { ...prev, result };
      });
    } catch {
      setError('Could not swap that dish — please try again.');
    } finally {
      setSwappingIndex(null);
    }
  };

  const addToGroceries = async () => {
    if (!activeEvent) return;
    setAddingGroceries(true);
    setError('');
    try {
      const res = await fetch(`/api/special-occasion/${activeEvent.id}/groceries`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setGroceriesAdded(data.added ?? 0);
    } catch (e: any) {
      setError(e.message || 'Could not add these to the grocery list.');
    } finally {
      setAddingGroceries(false);
    }
  };

  const removeFromGroceries = async () => {
    if (!activeEvent) return;
    setAddingGroceries(true);
    setError('');
    try {
      const res = await fetch(`/api/special-occasion/${activeEvent.id}/groceries`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setGroceriesAdded(0);
    } catch (e: any) {
      setError(e.message || 'Could not remove these from the grocery list.');
    } finally {
      setAddingGroceries(false);
    }
  };

  // Reflect what this occasion has already contributed to the weekly list, so a
  // revisit offers "Remove" rather than silently re-adding.
  useEffect(() => {
    if (view !== 'result' || !activeEvent) return;
    let cancelled = false;
    fetch(`/api/special-occasion/${activeEvent.id}/groceries`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d) setGroceriesAdded(d.count ?? 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [view, activeEvent?.id]);

  const toggleMissedDay = (index: number) => {
    setMissedDays(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  // Roll the missed days' work into whatever days are left before the event.
  const rescheduleTimeline = async () => {
    if (!activeEvent || missedDays.size === 0) return;
    setRescheduling(true);
    setError('');
    try {
      const res = await fetch(`/api/special-occasion/${activeEvent.id}/reschedule`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missedIndexes: [...missedDays] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setActiveEvent(prev => prev ? { ...prev, result: data } : prev);
      setMissedDays(new Set());
      fetchEvents();
    } catch (e: any) {
      setError(e.message || 'Could not rebuild the plan — please try again.');
    } finally {
      setRescheduling(false);
    }
  };

  const finalize = async () => {
    if (!activeEvent) return;
    setFinalizing(true);
    setError('');
    try {
      const res = await fetch(`/api/special-occasion/${activeEvent.id}/finalize`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setActiveEvent(prev => prev ? { ...prev, result: data } : prev);
      fetchEvents();
    } catch (e: any) {
      setError(e.message || 'Could not finalize — please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  // Return to the form pre-filled with this occasion's inputs, so the user can
  // add/change details and regenerate.
  const editDetails = () => {
    if (!activeEvent) return;
    const p = activeEvent.result.planning || {};
    setOccasion(activeEvent.occasion || '');
    setTitle(activeEvent.result.occasionTitle || '');
    setGuests(activeEvent.guests?.toString() || '');
    setServingTime(activeEvent.serving_time || p.servingTime || '');
    setCuisineTheme(p.cuisineTheme || '');
    setDietaryNotes(p.dietaryNotes || '');
    setMustHaveDishes(p.mustHaveDishes || '');
    setEventDate(activeEvent.event_date || p.eventDate || '');
    setPrepStartDate(p.prepStartDate || '');
    setEventType(activeEvent.result.eventType || 'served-dinner');
    if (p.daySchedules?.length) setDaySchedules(p.daySchedules); // keep saved per-day minutes
    setEditingId(activeEvent.id); // saving updates this occasion in place
    setConfirmRegen(false);
    setError('');
    setView('form');
  };

  // Start a fresh occasion (blank form, no in-place editing).
  const startNewOccasion = () => {
    setEditingId(null);
    setConfirmRegen(false);
    setOccasion(''); setTitle(''); setGuests(''); setServingTime(''); setCuisineTheme('');
    setDietaryNotes(''); setMustHaveDishes(''); setEventDate(''); setPrepStartDate('');
    setEventType('served-dinner'); setDaySchedules([]); setError('');
    setView('form');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid #D4B896', background: '#FEFAF0',
    fontFamily: 'Georgia, serif', fontSize: '14px', color: '#2B1810', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '10px', letterSpacing: '0.25em',
    textTransform: 'uppercase', color: '#8B6A42', marginBottom: '6px',
  };

  return (
    <>
      <PageBackground src="/backgrounds/Special occasion.png" />
      <style>{`@media print {
        body * { visibility: hidden; }
        #occasion-result, #occasion-result * { visibility: visible; }
        #occasion-result { position: fixed; top: 0; left: 0; width: 100%; padding: 32px; background: #FEFAF0; }
        .no-print { display: none !important; }
      }`}</style>

      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em]"
              style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
            Special Occasion
          </h1>
          <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
            Plan a memorable menu and get a personalised day-by-day preparation timeline…
          </p>
        </div>
        {view !== 'form' && (
          <button onClick={startNewOccasion}
            className="no-print rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70 shrink-0"
            style={{ background: '#8B6A42', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
            + New occasion
          </button>
        )}
      </div>

      {/* Event list */}
      {view === 'list' && (
        <>
          {loadingEvents ? (
            <div className="flex justify-center py-16"><div className="spinner w-7 h-7" /></div>
          ) : events.length === 0 ? (
            <div className="max-w-2xl" style={{ fontFamily: 'Georgia, serif' }}>
              <div className="rounded-[22px] p-10 text-center"
                   style={{ background: '#FEFAF0', border: '1px solid #D4B896' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>🥂</p>
                <p style={{ fontFamily: 'AbramoSerif, serif', fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>No occasions planned yet</p>
                <p style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--text-2)', marginBottom: '24px' }}>Plan your first special occasion and it will be saved here.</p>
                <button onClick={startNewOccasion}
                  className="rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                  style={{ background: '#8B6A42', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  Plan an occasion
                </button>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
              {events.map(ev => (
                <div key={ev.id}
                     className="rounded-[18px] cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 group relative"
                     style={{ background: '#FEFAF0', border: '1px solid #D4B896', padding: '20px 22px', boxShadow: '0 2px 12px rgba(47,30,10,0.07)' }}
                     onClick={() => { setActiveEvent(ev); setGroceriesAdded(null); setMissedDays(new Set()); setView('result'); }}>
                  {/* Delete button */}
                  <button
                    onClick={e => deleteEvent(ev.id, e)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50"
                    style={{ color: '#C4A265', fontSize: '14px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    ✕
                  </button>

                  <p style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C4A265', marginBottom: '6px' }}>
                    {ev.event_date ? fmtDate(ev.event_date) : new Date(ev.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p style={{ fontFamily: 'AbramoSerif, Georgia, serif', fontSize: '18px', color: '#2B1810', lineHeight: 1.25, marginBottom: '6px' }}>
                    {ev.result.occasionTitle}
                  </p>
                  <p style={{ fontSize: '12px', color: '#8B6A42', fontStyle: 'italic', marginBottom: '10px', lineHeight: 1.4 }}>
                    {ev.occasion}
                  </p>
                  {ev.guests && (
                    <p style={{ fontSize: '11px', color: '#B09070', letterSpacing: '0.05em' }}>{ev.guests} guests</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Form */}
      {view === 'form' && (
        <div className="max-w-2xl" style={{ fontFamily: 'Georgia, serif' }}>
          <div className="rounded-[22px] p-8"
               style={{ background: '#FEFAF0', border: '1px solid #D4B896', boxShadow: '0 4px 24px rgba(47,30,10,0.08)' }}>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Name this occasion</label>
              <input type="text"
                placeholder="e.g. Christmas Eve Dinner"
                value={title} onChange={e => setTitle(e.target.value)}
                style={inputStyle} />
              <p style={{ fontSize: '11px', color: '#B09070', fontStyle: 'italic', marginTop: '5px' }}>
                This is the title on your menu and printouts. Leave it blank and we&apos;ll use your own
                first line below — we won&apos;t invent one.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Describe the occasion *</label>
              <textarea rows={3}
                placeholder="e.g. Christmas Eve dinner for 10, Italian style — festive and traditional"
                value={occasion} onChange={e => setOccasion(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Type of event</label>
              <select value={eventType} onChange={e => setEventType(e.target.value as 'served-dinner' | 'hors-doeuvres')} style={inputStyle}>
                <option value="served-dinner">Served dinner — plated courses</option>
                <option value="hors-doeuvres">Hors d&apos;oeuvres — passed small bites</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Number of guests</label>
                <input type="number" min={1} placeholder="8"
                       value={guests} onChange={e => setGuests(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Serving time</label>
                <input type="text" placeholder="e.g. 8:00 pm"
                       value={servingTime} onChange={e => setServingTime(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Cuisine or theme</label>
              <input type="text" placeholder="e.g. Southern Italian, Provençal, Asian fusion…"
                     value={cuisineTheme} onChange={e => setCuisineTheme(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Dishes you'd like to include</label>
              <input type="text" placeholder="e.g. a pasta course, lamb as the main, a chocolate dessert"
                     value={mustHaveDishes} onChange={e => setMustHaveDishes(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Dietary notes</label>
              <input type="text" placeholder="e.g. one guest is gluten-free, no shellfish"
                     value={dietaryNotes} onChange={e => setDietaryNotes(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ borderTop: '1px solid #E8D5B0', paddingTop: '20px', marginBottom: '20px' }}>
              <p style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C4A265', marginBottom: '16px' }}>
                Preparation Schedule
              </p>
              <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Event date</label>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Start preparing from</label>
                  <input type="date" value={prepStartDate} onChange={e => setPrepStartDate(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {daySchedules.length > 0 && (
                <div style={{ background: '#FBF5E6', borderRadius: '14px', border: '1px solid #E8D5B0', padding: '16px' }}>
                  <div className="flex items-center gap-3" style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B6A42', whiteSpace: 'nowrap' }}>Set all to</span>
                    <select onChange={e => setAllDays(Number(e.target.value))} defaultValue=""
                      style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '12px' }}>
                      <option value="" disabled>choose…</option>
                      {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {daySchedules.map(d => (
                      <div key={d.date} className="flex items-center justify-between gap-3">
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '13px', color: '#2B1810' }}>{d.label}</span>
                          {d.daysUntilEvent === 0 && (
                            <span style={{ marginLeft: '8px', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C4A265' }}>event day</span>
                          )}
                        </div>
                        <select value={d.minutes} onChange={e => setDayMinutes(d.date, Number(e.target.value))}
                          style={{ ...inputStyle, width: '130px', padding: '6px 10px', fontSize: '13px', flexShrink: 0 }}>
                          {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setEditingId(null); setConfirmRegen(false); setView(editingId && activeEvent ? 'result' : 'list'); }}
                className="rounded-full px-5 py-3 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                style={{ border: '1px solid #C4A265', color: '#8B6A42', background: 'transparent', fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={editingId ? saveDetails : generate} disabled={generating || savingDetails || !occasion.trim()}
                className="flex-1 py-3 rounded-full uppercase tracking-[0.2em] transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: '#8B6A42', color: '#fff', fontSize: '12px', fontFamily: 'Georgia, serif', border: 'none', cursor: 'pointer' }}>
                {savingDetails ? 'Saving…' : generating ? 'Planning your menu…' : editingId ? 'Save changes' : 'Plan my menu'}
              </button>
            </div>

            {/* Regenerating is destructive — it replaces every dish and any recipes
                already written — so it lives behind its own confirmation. */}
            {editingId && (
              <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #E8D5B0', textAlign: 'center' }}>
                {confirmRegen ? (
                  <div style={{ background: '#FBF0E6', border: '1px solid #E0B48C', borderRadius: '12px', padding: '14px 16px' }}>
                    <p style={{ fontSize: '12.5px', color: '#8B4A20', lineHeight: 1.6, marginBottom: '12px', fontStyle: 'italic' }}>
                      This throws away the current menu — every dish, every swap, and any recipes
                      already written — and plans a brand-new one. It cannot be undone.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => setConfirmRegen(false)}
                        className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                        style={{ border: '1px solid #C4A265', color: '#8B6A42', background: 'transparent', fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
                        Keep my menu
                      </button>
                      <button onClick={generate} disabled={generating}
                        className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
                        style={{ background: '#A5451E', color: '#fff', border: 'none', fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
                        Yes, replace the menu
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmRegen(true)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#B09070', fontSize: '12px', fontFamily: 'Georgia, serif', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                    Or plan a completely new menu for this occasion…
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generating / finalizing overlay */}
      {(generating || finalizing) && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4"
             style={{ background: 'rgba(254,250,240,0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="spinner w-8 h-8" />
          <p style={{ fontFamily: 'AbramoSerif, serif', fontSize: '17px', color: 'var(--text-2)', fontStyle: 'italic' }}>
            {finalizing ? 'Writing your recipes and prep plan…' : 'Setting the table…'}
          </p>
        </div>
      )}

      {/* Result view */}
      {view === 'result' && activeEvent && (
        <div id="occasion-result">
          {error && <p className="no-print" style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{error}</p>}
          <ResultCard
            result={activeEvent.result}
            meta={{ guests: activeEvent.guests?.toString() || '', servingTime: activeEvent.serving_time || '', eventDate: activeEvent.event_date || '' }}
            occasionContext={{ occasion: activeEvent.occasion, guests: activeEvent.guests || 4 }}
            recipesStale={!!activeEvent.result.finalized
              && typeof activeEvent.result.recipesServeGuests === 'number'
              && activeEvent.result.recipesServeGuests !== (activeEvent.guests || 0)}
            onBack={() => { fetchEvents(); setView('list'); }}
            onEdit={editDetails}
            onPrint={() => window.open(`/print/occasion/${activeEvent.id}`, '_blank')}
            onDishClick={handleDishClick}
            onToggleSelect={toggleSelect}
            onSwap={swapDish}
            onFinalize={finalize}
            finalizing={finalizing}
            swappingIndex={swappingIndex}
            onAddToGroceries={addToGroceries}
            onRemoveFromGroceries={removeFromGroceries}
            missedDays={missedDays}
            onToggleMissed={toggleMissedDay}
            onClearMissed={() => setMissedDays(new Set())}
            onReschedule={rescheduleTimeline}
            rescheduling={rescheduling}
            addingGroceries={addingGroceries}
            groceriesAdded={groceriesAdded}
          />
        </div>
      )}

      {selectedDish && (
        <DishRecipeModal
          dish={selectedDish.dish}
          recipe={dishRecipe}
          loading={loadingRecipe}
          onClose={() => { setSelectedDish(null); setDishRecipe(null); }}
        />
      )}
    </>
  );
}
