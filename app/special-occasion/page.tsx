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
  if (start > end) return [];
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
                {[recipe.totalTime && `${recipe.totalTime}`, recipe.serves && `Serves ${recipe.serves}`, recipe.difficulty].filter(Boolean).join('  ·  ')}
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

function ResultCard({ result, meta, occasionContext, onBack, onPrint, onDishClick }: {
  result: SpecialOccasionResult;
  meta: { guests: string; servingTime: string; eventDate: string };
  occasionContext: { occasion: string; guests: number; cuisineTheme?: string };
  onBack: () => void;
  onPrint: () => void;
  onDishClick: (dish: string, course: string) => void;
}) {
  return (
    <div className="max-w-3xl">
      <div className="no-print flex items-center justify-between mb-6">
        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8B6A42', fontSize: '13px', fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>
          ← All occasions
        </button>
        <button onClick={onPrint}
          className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
          style={{ border: '1px solid #C4A265', color: '#8B6A42', background: 'transparent', fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
          Print
        </button>
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
            Tap any dish to see the full recipe
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '8px' }}>
            {(result.menu ?? []).map((item, i) => (
              <div key={i}
                   className="no-print-cursor transition-all hover:shadow-md hover:-translate-y-0.5"
                   onClick={() => onDishClick(item.dish, item.course)}
                   style={{ padding: '16px 18px', borderRadius: '14px', background: '#FBF5E6', border: '1px solid #E8D5B0', cursor: 'pointer' }}>
                <p style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C4A265', marginBottom: '4px' }}>{item.course}</p>
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
            ))}
          </div>
          {result.servingNotes && (
            <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#6B5040', fontSize: '13px', lineHeight: 1.7, margin: '16px 0 0' }}>
              &ldquo;{result.servingNotes}&rdquo;
            </p>
          )}

          <Divider label="Preparation Timeline" />
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            <div style={{ position: 'absolute', left: '6px', top: '8px', bottom: '8px', width: '1px', background: '#D4B896' }} />
            {(result.timeline ?? []).map((bucket, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: '24px' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: '#C4A265', border: '2px solid #FEFAF0', boxShadow: '0 0 0 1px #C4A265' }} />
                <p style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8B6A42', marginBottom: '8px' }}>{bucket.when}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {bucket.tasks.map((task, j) => (
                    <li key={j} style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '13px', color: '#3D2714', lineHeight: 1.55 }}>
                      <span style={{ color: '#C4A265', flexShrink: 0, fontWeight: 700 }}>—</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
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
  const [guests, setGuests]                 = useState('');
  const [servingTime, setServingTime]       = useState('');
  const [cuisineTheme, setCuisineTheme]     = useState('');
  const [dietaryNotes, setDietaryNotes]     = useState('');
  const [mustHaveDishes, setMustHaveDishes] = useState('');
  const [eventDate, setEventDate]           = useState('');
  const [prepStartDate, setPrepStartDate]   = useState('');
  const [daySchedules, setDaySchedules]     = useState<DaySchedule[]>([]);
  const [generating, setGenerating]         = useState(false);
  const [error, setError]                   = useState('');

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

  const handleDishClick = async (dish: string, course: string) => {
    if (!activeEvent) return;
    setSelectedDish({ dish, course });
    setDishRecipe(null);
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
          cuisineTheme: '',
        }),
      });
      if (res.ok) setDishRecipe(await res.json());
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
        body: JSON.stringify({ occasion, guests: Number(guests) || 0, servingTime, cuisineTheme, dietaryNotes, mustHaveDishes, eventDate, prepStartDate, daySchedules }),
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
      if (saved.length > 0) { setActiveEvent(saved[0]); setView('result'); }
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setGenerating(false);
    }
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
          <button onClick={() => { setView('form'); setError(''); }}
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
                <button onClick={() => setView('form')}
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
                     onClick={() => { setActiveEvent(ev); setView('result'); }}>
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
              <label style={labelStyle}>Describe the occasion *</label>
              <textarea rows={3}
                placeholder="e.g. Christmas Eve dinner for 10, Italian style — festive and traditional"
                value={occasion} onChange={e => setOccasion(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }} />
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
              <button onClick={() => setView('list')}
                className="rounded-full px-5 py-3 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                style={{ border: '1px solid #C4A265', color: '#8B6A42', background: 'transparent', fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={generate} disabled={generating || !occasion.trim()}
                className="flex-1 py-3 rounded-full uppercase tracking-[0.2em] transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: '#8B6A42', color: '#fff', fontSize: '12px', fontFamily: 'Georgia, serif', border: 'none', cursor: 'pointer' }}>
                {generating ? 'Planning your menu…' : 'Plan my menu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generating overlay */}
      {generating && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4"
             style={{ background: 'rgba(254,250,240,0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="spinner w-8 h-8" />
          <p style={{ fontFamily: 'AbramoSerif, serif', fontSize: '17px', color: 'var(--text-2)', fontStyle: 'italic' }}>
            Setting the table…
          </p>
        </div>
      )}

      {/* Result view */}
      {view === 'result' && activeEvent && (
        <div id="occasion-result">
          <ResultCard
            result={activeEvent.result}
            meta={{ guests: activeEvent.guests?.toString() || '', servingTime: activeEvent.serving_time || '', eventDate: activeEvent.event_date || '' }}
            occasionContext={{ occasion: activeEvent.occasion, guests: activeEvent.guests || 4 }}
            onBack={() => { fetchEvents(); setView('list'); }}
            onPrint={() => window.print()}
            onDishClick={handleDishClick}
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
