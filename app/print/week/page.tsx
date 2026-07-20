'use client';
import { useState, useEffect } from 'react';
import { WeeklyMenu, Meal } from '@/lib/types';

interface LoadedMeal extends Meal {
  ingredients: NonNullable<Meal['ingredients']>;
  instructions: NonNullable<Meal['instructions']>;
  prep_ahead: NonNullable<Meal['prep_ahead']>;
}

const PRINT_LANGUAGES = [
  'English','Spanish','French','Italian','Portuguese','German',
  'Polish','Romanian','Russian','Ukrainian','Arabic','Hindi',
  'Tagalog','Vietnamese','Chinese (Simplified)','Korean','Japanese',
];

export default function PrintWeekPage() {
  const [meals, setMeals] = useState<LoadedMeal[]>([]);
  const [weekStart, setWeekStart] = useState('');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [printLanguage, setPrintLanguage] = useState('English');
  const [translating, setTranslating] = useState(false);
  const [translatedMeals, setTranslatedMeals] = useState<LoadedMeal[] | null>(null);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      const lang = s.language || 'English';
      setDefaultLanguage(lang);
      setPrintLanguage(lang);
    }).catch(() => {});
  }, []);

  const translateAll = async (target: string) => {
    if (target === defaultLanguage) { setTranslatedMeals(null); return; }
    setTranslating(true);
    try {
      const out = await Promise.all(meals.map(async m => {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetLanguage: target,
            ingredients: m.ingredients,
            instructions: m.instructions,
            prep_ahead: m.prep_ahead,
          }),
        });
        const data = await res.json();
        return {
          ...m,
          ingredients: data.ingredients || m.ingredients,
          instructions: data.instructions || m.instructions,
          prep_ahead: data.prep_ahead || m.prep_ahead,
        } as LoadedMeal;
      }));
      setTranslatedMeals(out);
    } finally {
      setTranslating(false);
    }
  };

  const sourceMeals = translatedMeals ?? meals;
  const displayedMeals = sourceMeals.filter(m => selectedDays.has(m.day));
  const toggleDay = (day: string) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  useEffect(() => {
    async function loadAll() {
      try {
        const menu: WeeklyMenu & { id: number } = await fetch('/api/menu').then(r => r.json());
        if (!menu?.meals) { setError('No menu found. Generate a menu first.'); return; }

        const cookingMeals = menu.meals.filter(m => !m.isLeftover);
        setTotal(cookingMeals.length);
        setWeekStart(new Date(menu.week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));

        const loaded: LoadedMeal[] = [];
        for (const meal of cookingMeals) {
          let fullMeal = meal;
          if (!meal.recipeLoaded) {
            const recipe = await fetch('/api/menu/recipe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ menuId: menu.id, meal }),
            }).then(r => r.json());
            fullMeal = { ...meal, ...recipe };
          }
          loaded.push(fullMeal as LoadedMeal);
          setProgress(p => p + 1);
        }

        setMeals(loaded);
        setSelectedDays(new Set(loaded.map(m => m.day)));
        setReady(true);
      } catch (e: any) {
        setError(e.message || 'Something went wrong.');
      }
    }
    loadAll();
  }, []);

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
        .no-print { display: flex; justify-content: flex-end; margin-bottom: 32px; gap: 12px; }
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
        <div className="no-print" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '14px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#7A847B', letterSpacing: '0.05em', marginRight: '4px' }}>Include:</span>
            {meals.map(m => {
              const checked = selectedDays.has(m.day);
              return (
                <button key={m.day} type="button" onClick={() => toggleDay(m.day)}
                  style={{
                    padding: '5px 12px', borderRadius: '999px', fontFamily: 'Georgia, serif',
                    fontSize: '12px', border: `1px solid ${checked ? '#556257' : '#D4B896'}`,
                    background: checked ? '#556257' : 'white',
                    color: checked ? 'white' : '#7A847B', cursor: 'pointer',
                  }}>
                  {checked ? '✓ ' : ''}{m.day}
                </button>
              );
            })}
            <button type="button" onClick={() => setSelectedDays(new Set(meals.map(m => m.day)))}
              style={{
                padding: '5px 10px', borderRadius: '999px', fontFamily: 'Georgia, serif',
                fontSize: '11px', border: '1px dashed #D4B896', background: 'transparent',
                color: '#7A847B', cursor: 'pointer', marginLeft: '4px',
              }}>
              All
            </button>
            <button type="button" onClick={() => setSelectedDays(new Set())}
              style={{
                padding: '5px 10px', borderRadius: '999px', fontFamily: 'Georgia, serif',
                fontSize: '11px', border: '1px dashed #D4B896', background: 'transparent',
                color: '#7A847B', cursor: 'pointer',
              }}>
              None
            </button>
          </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
            <label style={{ fontSize: '12px', color: '#7A847B', letterSpacing: '0.05em' }}>Print in:</label>
            <select
              value={printLanguage}
              onChange={e => { setPrintLanguage(e.target.value); translateAll(e.target.value); }}
              disabled={translating}
              style={{
                padding: '8px 12px', borderRadius: '999px', fontFamily: 'Georgia, serif',
                fontSize: '13px', border: '1px solid #556257', background: 'white',
                color: '#556257', cursor: translating ? 'wait' : 'pointer',
              }}>
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
          }}>🖨 Print Prep</button>
        </div>
        </div>

        {/* ── Section 1: Recipes ── */}
        <div id="recipes-section">
          <h1>This Week's Recipes</h1>
          <p className="week-label">Week of {weekStart}</p>

          {displayedMeals.map((meal, idx) => (
            <div key={idx}>
              {idx > 0 && <hr className="divider" />}
              <div className="meal">
                <div className="meal-header">
                  <div className="meal-day">{meal.day}</div>
                  <div className="meal-name">{meal.name}</div>
                  <div className="meal-meta">
                    {[meal.cuisine, meal.total_time, `Serves ${meal.serves}`, meal.difficulty].filter(Boolean).join('  ·  ')}
                  </div>
                </div>
                <div className="two-col">
                  <div>
                    <div className="section-title">Ingredients</div>
                    {meal.ingredients.map((ing, i) => (
                      <div key={i} className="ing">
                        <span className="amt">{ing.amount}</span>
                        <span>{ing.item}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="section-title">Instructions</div>
                    {meal.instructions.map((step, i) => (
                      <div key={i} className="step">
                        <span className="num">{i + 1}.</span>
                        <span>{step.replace(/^Step \d+:\s*/i, '')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {meal.sides?.filter(s => s.instructions?.length).map((side, si) => (
                  <div key={si} style={{ marginTop: '24px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#8FA78E', marginBottom: '8px' }}>
                      Side — cooks while the main is on
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#2F3A32' }}>{side.name}</div>
                    <div className="two-col">
                      <div>
                        <div className="section-title">Ingredients</div>
                        {(side.ingredients || []).map((ing, i) => (
                          <div key={i} className="ing">
                            <span className="amt">{ing.amount}</span>
                            <span>{ing.item}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="section-title">Steps</div>
                        {(side.instructions || []).map((step, i) => (
                          <div key={i} className="step">
                            <span className="num">{i + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 2: All Prep Instructions ── */}
        <div id="prep-section" style={{ pageBreakBefore: 'always', paddingTop: '48px' }}>
          <h1>This Week's Prep Instructions</h1>
          <p className="week-label">Week of {weekStart}</p>

          {displayedMeals.filter(m => m.prep_ahead?.some(t => t.trim())).map((meal, idx) => (
            <div key={idx}>
              {idx > 0 && <hr className="divider" />}
              <div className="meal">
                <div className="meal-header">
                  <div className="meal-day">{meal.day}</div>
                  <div className="meal-name">{meal.name}</div>
                </div>
                {meal.prep_ahead.filter(t => t.trim()).map((tip, i) => (
                  <div key={i} className="tip">
                    <span className="check">✓</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
