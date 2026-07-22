'use client';
import { useState, useEffect, use } from 'react';
import type { SpecialOccasionResult, OccasionDishRecipe } from '@/lib/claude';

interface LoadedDish { course: string; dish: string; recipe: OccasionDishRecipe }

const PRINT_LANGUAGES = [
  'English','Spanish','French','Italian','Portuguese','German',
  'Polish','Romanian','Russian','Ukrainian','Arabic','Hindi',
  'Tagalog','Vietnamese','Chinese (Simplified)','Korean','Japanese',
];

export default function PrintOccasionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [title, setTitle] = useState('');
  const [metaLine, setMetaLine] = useState('');
  const [dishes, setDishes] = useState<LoadedDish[]>([]);
  const [timeline, setTimeline] = useState<{ when: string; tasks: string[] }[]>([]);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [printLanguage, setPrintLanguage] = useState('English');
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<LoadedDish[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      const lang = s.language || 'English';
      setDefaultLanguage(lang);
      setPrintLanguage(lang);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    async function loadAll() {
      try {
        const all = await fetch('/api/special-occasion').then(r => r.json());
        const ev = Array.isArray(all) ? all.find((e: any) => String(e.id) === String(id)) : null;
        if (!ev) { setError('Occasion not found. Plan one first.'); return; }
        const result = ev.result as SpecialOccasionResult;
        setTitle(result.occasionTitle || 'Special Occasion');
        setMetaLine([
          ev.guests && `${ev.guests} guests`,
          ev.event_date && new Date(ev.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          ev.serving_time && `at ${ev.serving_time}`,
        ].filter(Boolean).join('  ·  '));
        setTimeline(result.timeline || []);

        const chosen = (result.menu ?? []).filter(m => m.selected !== false);
        setTotal(chosen.length);
        const loaded: LoadedDish[] = [];
        for (const m of chosen) {
          let recipe = m.fullRecipe;
          if (!recipe?.ingredients?.length) {
            recipe = await fetch('/api/special-occasion/recipe', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dish: m.dish, course: m.course, occasion: ev.occasion, guests: ev.guests || 4, cuisineTheme: result.planning?.cuisineTheme || '' }),
            }).then(r => r.json());
          }
          loaded.push({ course: m.course, dish: m.dish, recipe: recipe as OccasionDishRecipe });
          setProgress(p => p + 1);
        }
        setDishes(loaded);
        setSelected(new Set(loaded.map(d => d.dish)));
        setReady(true);
      } catch (e: any) {
        setError(e.message || 'Something went wrong.');
      }
    }
    loadAll();
  }, [id]);

  const translateAll = async (target: string) => {
    if (target === defaultLanguage) { setTranslated(null); return; }
    setTranslating(true);
    try {
      const out = await Promise.all(dishes.map(async d => {
        const res = await fetch('/api/translate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetLanguage: target,
            ingredients: d.recipe.ingredients,
            instructions: d.recipe.instructions,
            prep_ahead: d.recipe.makeAheadNote ? [d.recipe.makeAheadNote] : [],
          }),
        });
        const data = await res.json();
        return {
          ...d,
          recipe: {
            ...d.recipe,
            ingredients: data.ingredients || d.recipe.ingredients,
            instructions: data.instructions || d.recipe.instructions,
            makeAheadNote: data.prep_ahead?.[0] ?? d.recipe.makeAheadNote,
          },
        } as LoadedDish;
      }));
      setTranslated(out);
    } finally {
      setTranslating(false);
    }
  };

  const source = translated ?? dishes;
  const displayed = source.filter(d => selected.has(d.dish));
  const toggle = (dish: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(dish)) next.delete(dish); else next.add(dish);
      return next;
    });
  };

  if (error) return (
    <div style={{ fontFamily: 'Georgia, serif', textAlign: 'center', padding: '80px 24px', color: '#556257' }}>
      <p style={{ fontSize: '18px' }}>{error}</p>
    </div>
  );

  if (!ready) return (
    <div style={{ fontFamily: 'Georgia, serif', textAlign: 'center', padding: '80px 24px', color: '#556257' }}>
      <p style={{ fontSize: '20px', marginBottom: '16px' }}>Loading recipes…</p>
      <p style={{ fontSize: '15px', color: '#7A847B' }}>{progress} of {total || '?'} ready</p>
      <div style={{ width: '200px', height: '4px', background: '#E7E0D6', borderRadius: '2px', margin: '16px auto 0' }}>
        <div style={{ width: total ? `${(progress / total) * 100}%` : '0%', height: '100%', background: '#556257', borderRadius: '2px', transition: 'width 0.3s' }} />
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Georgia, ui-serif, serif; color: #2F3A32; background: white; }
        .page { max-width: 780px; margin: 0 auto; padding: 48px 40px; }
        .print-btn {
          padding: 10px 24px; border-radius: 999px; font-size: 13px;
          font-family: Georgia, serif; cursor: pointer;
          border: 1px solid #556257; background: #556257; color: white; letter-spacing: 0.05em;
        }
        h1 { font-size: 32px; margin-bottom: 4px; }
        .week-label { font-size: 14px; color: #7A847B; font-style: italic; margin-bottom: 40px; }
        .meal { margin-bottom: 48px; }
        .meal-header { border-bottom: 2px solid #556257; padding-bottom: 8px; margin-bottom: 20px; page-break-inside: avoid; page-break-after: avoid; }
        .meal-day { font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #8FA78E; margin-bottom: 4px; }
        .meal-name { font-size: 24px; }
        .meal-meta { font-size: 13px; color: #7A847B; margin-top: 4px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #556257; margin: 20px 0 10px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .ing { display: flex; gap: 12px; padding: 5px 0; border-bottom: 1px dotted #D4B896; font-size: 13px; }
        .amt { color: #556257; font-weight: 700; min-width: 72px; flex-shrink: 0; }
        .step { display: flex; gap: 10px; margin-bottom: 8px; font-size: 13px; line-height: 1.55; }
        .num { color: #556257; font-weight: 700; min-width: 20px; flex-shrink: 0; }
        .tip { display: flex; gap: 10px; padding: 8px 12px; background: #EEF2EE; border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
        .check { color: #556257; font-weight: 700; flex-shrink: 0; }
        .divider { border: none; border-top: 1px solid #E7E0D6; margin: 40px 0; }
        @media print {
          .no-print { display: none !important; margin: 0 !important; }
          .page { padding: 0; max-width: 100%; }
          @page { margin: 2cm; }
        }
      `}</style>

      <div className="page">
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '14px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#7A847B', letterSpacing: '0.05em', marginRight: '4px' }}>Include:</span>
            {dishes.map(d => {
              const checked = selected.has(d.dish);
              return (
                <button key={d.dish} type="button" onClick={() => toggle(d.dish)}
                  style={{ padding: '5px 12px', borderRadius: '999px', fontFamily: 'Georgia, serif', fontSize: '12px', border: `1px solid ${checked ? '#556257' : '#D4B896'}`, background: checked ? '#556257' : 'white', color: checked ? 'white' : '#7A847B', cursor: 'pointer' }}>
                  {checked ? '✓ ' : ''}{d.dish}
                </button>
              );
            })}
            <button type="button" onClick={() => setSelected(new Set(dishes.map(d => d.dish)))}
              style={{ padding: '5px 10px', borderRadius: '999px', fontFamily: 'Georgia, serif', fontSize: '11px', border: '1px dashed #D4B896', background: 'transparent', color: '#7A847B', cursor: 'pointer', marginLeft: '4px' }}>All</button>
            <button type="button" onClick={() => setSelected(new Set())}
              style={{ padding: '5px 10px', borderRadius: '999px', fontFamily: 'Georgia, serif', fontSize: '11px', border: '1px dashed #D4B896', background: 'transparent', color: '#7A847B', cursor: 'pointer' }}>None</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
              <label style={{ fontSize: '12px', color: '#7A847B', letterSpacing: '0.05em' }}>Print in:</label>
              <select value={printLanguage} disabled={translating}
                onChange={e => { setPrintLanguage(e.target.value); translateAll(e.target.value); }}
                style={{ padding: '8px 12px', borderRadius: '999px', fontFamily: 'Georgia, serif', fontSize: '13px', border: '1px solid #556257', background: 'white', color: '#556257', cursor: translating ? 'wait' : 'pointer' }}>
                {PRINT_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {translating && <span style={{ fontSize: '12px', color: '#7A847B', fontStyle: 'italic' }}>Translating…</span>}
            </div>
            <button className="print-btn" disabled={translating} onClick={() => {
              document.getElementById('prep-section')!.style.display = 'none';
              window.print();
              document.getElementById('prep-section')!.style.display = '';
            }}>🖨 Print Recipes</button>
            <button className="print-btn" disabled={translating} onClick={() => {
              const recipes = document.getElementById('recipes-section')!;
              const prep = document.getElementById('prep-section')!;
              recipes.style.display = 'none';
              prep.style.pageBreakBefore = 'auto';
              prep.style.paddingTop = '0';
              window.print();
              recipes.style.display = '';
              prep.style.pageBreakBefore = 'always';
              prep.style.paddingTop = '48px';
            }}>🖨 Print Prep Plan</button>
          </div>
        </div>

        {/* ── Section 1: Menu & Recipes ── */}
        <div id="recipes-section">
          <h1>{title}</h1>
          <p className="week-label">{metaLine || 'Menu & recipes'}</p>

          {displayed.map((d, idx) => (
            <div key={idx}>
              {idx > 0 && <hr className="divider" />}
              <div className="meal">
                <div className="meal-header">
                  <div className="meal-day">{d.course}</div>
                  <div className="meal-name">{d.recipe.name}</div>
                  <div className="meal-meta">
                    {[d.recipe.totalTime, d.recipe.serves && `Serves ${d.recipe.serves}`, d.recipe.difficulty].filter(Boolean).join('  ·  ')}
                  </div>
                </div>
                <div className="two-col">
                  <div>
                    <div className="section-title">Ingredients</div>
                    {(d.recipe.ingredients ?? []).map((ing, i) => (
                      <div key={i} className="ing"><span className="amt">{ing.amount}</span><span>{ing.item}</span></div>
                    ))}
                  </div>
                  <div>
                    <div className="section-title">Instructions</div>
                    {(d.recipe.instructions ?? []).map((step, i) => (
                      <div key={i} className="step"><span className="num">{i + 1}.</span><span>{step.replace(/^Step \d+:\s*/i, '')}</span></div>
                    ))}
                  </div>
                </div>
                {d.recipe.makeAheadNote && (
                  <div className="tip" style={{ marginTop: '18px' }}>
                    <span className="check">✓</span><span>Make ahead: {d.recipe.makeAheadNote}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 2: Preparation Plan ── */}
        {timeline.length > 0 && (
          <div id="prep-section" style={{ pageBreakBefore: 'always', paddingTop: '48px' }}>
            <h1>Preparation Plan</h1>
            <p className="week-label">{title}</p>
            {timeline.map((bucket, idx) => (
              <div key={idx}>
                {idx > 0 && <hr className="divider" />}
                <div className="meal">
                  <div className="meal-header">
                    <div className="meal-name" style={{ fontSize: '19px' }}>{bucket.when}</div>
                  </div>
                  {bucket.tasks.map((task, i) => (
                    <div key={i} className="tip"><span className="check">—</span><span>{task}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
