'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserRecipe } from '@/lib/types';
import { scaleIngredients } from '@/lib/scaling';
import { useLanguage } from './LanguageProvider';
import { translateRecipeContent, getCachedTranslation } from '@/lib/translation-cache';
import { convertText, convertIngredient } from '@/lib/unit-convert';
import ShareButton from './ShareButton';

interface Props {
  recipe: UserRecipe;
  onClose: () => void;
  readOnly?: boolean;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
}

function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-5" style={{ color: '#C4A265' }}>
      <div style={{ flex: 1, height: '1px', background: '#C4A265' }} />
      {label
        ? <span style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C4A265' }}>{label}</span>
        : <span style={{ fontSize: '14px' }}>✦</span>
      }
      <div style={{ flex: 1, height: '1px', background: '#C4A265' }} />
    </div>
  );
}

type Tab = 'recipe' | 'background' | 'wisdom';

export default function RecipeCardModal({ recipe, onClose, readOnly, onSave, saving, saved }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('recipe');
  const [printBackground, setPrintBackground] = useState(true);
  const [printWisdom, setPrintWisdom] = useState(true);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [scaledServes, setScaledServes] = useState(recipe.serves || 4);
  const [unitMode, setUnitMode] = useState<'original' | 'metric'>('original');
  const { language: userLanguage } = useLanguage();
  const [translated, setTranslated] = useState<{
    description?: string;
    ingredients?: { amount: string; item: string }[];
    instructions?: string[];
    prep_ahead?: string[];
  } | null>(null);
  const [translating, setTranslating] = useState(false);
  // Variant tabs — only relevant when the recipe ships multiple cooking methods.
  const hasVariants = Array.isArray(recipe.variants) && recipe.variants.length > 1;
  const [activeVariant, setActiveVariant] = useState(0);

  // Admin-only: add this recipe to the shared global library
  const [isAdmin, setIsAdmin] = useState(false);
  const [addingGlobal, setAddingGlobal] = useState(false);
  const [addedGlobal, setAddedGlobal] = useState(false);
  useEffect(() => {
    fetch('/api/admin/check').then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => {});
  }, []);
  const addToGlobal = async () => {
    if (addingGlobal || addedGlobal) return;
    setAddingGlobal(true);
    try {
      const res = await fetch('/api/admin/global-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });
      if (!res.ok) throw new Error('failed');
      setAddedGlobal(true);
    } catch {
      /* leave button active to retry */
    } finally {
      setAddingGlobal(false);
    }
  };

  useEffect(() => {
    if (userLanguage === 'English') { setTranslated(null); return; }
    const cached = getCachedTranslation(recipe.name, userLanguage);
    if (cached) { setTranslated(cached); return; }
    setTranslating(true);
    translateRecipeContent({
      name: recipe.name,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prep_ahead: recipe.prep_ahead,
    }, userLanguage)
      .then(data => { if (data) setTranslated(data); })
      .finally(() => setTranslating(false));
  }, [recipe.name, userLanguage]);

  // When variants exist, the active variant overrides the recipe's default instructions
  // (and time fields if the variant carries them). Ingredients and prep-ahead stay shared.
  const activeVariantData = hasVariants ? recipe.variants![activeVariant] : null;
  const display = {
    description: translated?.description ?? recipe.description,
    ingredients: translated?.ingredients ?? recipe.ingredients,
    instructions: activeVariantData?.instructions ?? translated?.instructions ?? recipe.instructions,
    prep_ahead: translated?.prep_ahead ?? recipe.prep_ahead,
  };

  const hasBackground = !!recipe.background?.trim();
  const hasWisdom = !!recipe.nonna_wisdom?.filter(w => w.trim()).length;
  const hasTabs = hasBackground || hasWisdom;

  const meta = [
    recipe.cuisine,
    recipe.total_time,
    recipe.difficulty,
  ].filter(Boolean).join('  ·  ');

  const handlePrint = () => {
    setShowPrintOptions(false);
    setTimeout(() => window.print(), 100);
  };

  const tabBtn = (tab: Tab, label: string, isHandwritten?: boolean) => {
    const active = activeTab === tab;
    return (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        style={{
          padding: isHandwritten ? '4px 18px 8px' : '8px 16px',
          fontSize: isHandwritten ? '26px' : '10px',
          fontFamily: isHandwritten ? 'AwesomeWays, serif' : 'inherit',
          letterSpacing: isHandwritten ? '0' : '0.25em',
          textTransform: isHandwritten ? 'none' : 'uppercase',
          color: active ? '#2B1810' : '#C4A265',
          background: 'transparent',
          border: 'none',
          borderBottom: active ? '2px solid #8B6A42' : '2px solid transparent',
          cursor: 'pointer',
          marginBottom: '-1px',
          transition: 'color 0.15s',
          lineHeight: 1,
        }}>
        {label}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-8"
         style={{ background: 'rgba(30,24,16,0.65)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #recipe-card-content, #recipe-card-content * { visibility: visible; }
          #recipe-card-content {
            position: fixed; top: 0; left: 0;
            width: 100%; padding: 32px;
            background: #FEFAF0;
          }
          .no-print { display: none !important; }
          .tab-recipe { display: block !important; }
          .tab-background { display: ${printBackground ? 'block' : 'none'} !important; }
          .tab-wisdom { display: ${printWisdom ? 'block' : 'none'} !important; }
        }
      `}</style>

      {/* Card */}
      <div id="recipe-card-content"
           className="relative w-full max-w-2xl"
           style={{
             background: '#FEFAF0',
             border: '2px solid #C4A265',
             padding: '5px',
             fontFamily: 'Georgia, ui-serif, serif',
             boxShadow: '0 24px 64px rgba(30,20,10,0.35)',
           }}>

        {/* Inner border */}
        <div style={{ border: '1px solid #C4A265', padding: '32px 36px' }}>

          {/* Close */}
          <button onClick={onClose}
            className="no-print absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-60"
            style={{ color: '#C4A265', fontSize: '16px', background: 'transparent' }}>
            ✕
          </button>

          <Divider label="Recipe" />

          {/* Title */}
          <h2 style={{ fontFamily: 'AbramoSerif, Georgia, serif', fontSize: '30px', textAlign: 'center', color: '#2B1810', lineHeight: 1.2, marginBottom: '10px' }}>
            {recipe.name}
          </h2>

          {/* Meta */}
          {meta && (
            <p style={{ textAlign: 'center', color: '#8B6A42', fontSize: '13px', letterSpacing: '0.04em', marginBottom: '8px' }}>
              {meta}
            </p>
          )}
          {/* Serves stepper + unit toggle */}
          <div className="no-print flex items-center justify-center gap-4 mb-12 flex-wrap">
            {recipe.serves > 0 && (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '12px', color: '#8B6A42', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Serves</span>
                <button onClick={() => setScaledServes(s => Math.max(1, s - 1))}
                  style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#EDE3D4', color: '#8B6A42', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontWeight: 700, lineHeight: 1 }}>−</button>
                <strong style={{ fontSize: '14px', color: '#2B1810', minWidth: '20px', textAlign: 'center' }}>{scaledServes}</strong>
                <button onClick={() => setScaledServes(s => s + 1)}
                  style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#EDE3D4', color: '#8B6A42', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontWeight: 700, lineHeight: 1 }}>+</button>
              </div>
            )}
            <button onClick={() => setUnitMode(m => m === 'original' ? 'metric' : 'original')}
              style={{
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '4px 12px', borderRadius: '999px', cursor: 'pointer',
                background: unitMode === 'metric' ? '#C4A265' : 'transparent',
                color: unitMode === 'metric' ? '#fff' : '#8B6A42',
                border: '1px solid #C4A265',
              }}>
              🔄 {unitMode === 'metric' ? 'Metric' : 'Imperial'}
            </button>
          </div>

          {/* Description */}
          {display.description && (
            <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#6B5040', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
              &ldquo;{display.description}&rdquo;
            </p>
          )}
          {translating && (
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#8B6A42', fontStyle: 'italic', marginBottom: '12px' }}>
              Translating to {userLanguage}…
            </p>
          )}

          {/* Tab bar */}
          {hasTabs && (
            <div className="no-print" style={{ display: 'flex', borderBottom: '1px solid #C4A265', marginBottom: '24px', gap: '4px' }}>
              {tabBtn('recipe', 'Recipe')}
              {hasBackground && tabBtn('background', 'Background')}
              {hasWisdom && tabBtn('wisdom', "Nonna's Wisdom")}
            </div>
          )}

          {/* Recipe panel */}
          <div className="tab-recipe" style={{ display: hasTabs && activeTab !== 'recipe' ? 'none' : 'block' }}>
            {!hasTabs && <Divider />}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {hasVariants && (
                <div style={{ gridColumn: '1 / -1', marginBottom: '4px' }}>
                  <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.28em', color: '#8B6A42', marginBottom: '8px' }}>Cooking method</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {recipe.variants!.map((v, i) => {
                      const active = i === activeVariant;
                      return (
                        <button key={i} onClick={() => setActiveVariant(i)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '999px',
                            fontFamily: 'Georgia, serif',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: active ? '#8B6A42' : 'transparent',
                            color: active ? '#FBF7F0' : '#8B6A42',
                            border: '1px solid #8B6A42',
                          }}>
                          {v.emoji ? `${v.emoji} ` : ''}{v.method}
                          {v.total_time ? ` · ${v.total_time}` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {display.ingredients && display.ingredients.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.28em', color: '#8B6A42', marginBottom: '12px' }}>Ingredients</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {scaleIngredients(display.ingredients, recipe.serves || 4, scaledServes).map((rawIng, i) => {
                      const ing = convertIngredient(rawIng, unitMode);
                      return (
                      <li key={i} style={{ display: 'flex', gap: '8px', padding: '5px 0', borderBottom: '1px dotted #D4B896', fontSize: '13px', color: '#3D2714' }}>
                        <span style={{ color: '#8B6A42', minWidth: '64px', fontWeight: 700, flexShrink: 0 }}>{ing.amount}</span>
                        <span>{ing.item}</span>
                      </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {display.instructions && display.instructions.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.28em', color: '#8B6A42', marginBottom: '12px' }}>Directions</h3>
                  <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {display.instructions.map((step, i) => (
                      <li key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '13px', color: '#3D2714', lineHeight: 1.55 }}>
                        <span style={{ color: '#C4A265', fontWeight: 700, minWidth: '18px', flexShrink: 0 }}>{i + 1}.</span>
                        <span>{convertText(step.replace(/^Step \d+:\s*/i, ''), unitMode)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {display.prep_ahead && display.prep_ahead.filter(t => t.trim()).length > 0 && (
              <>
                <Divider label="Prepare Ahead" />
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {display.prep_ahead.filter(t => t.trim()).map((tip, i) => (
                    <li key={i} style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '13px', color: '#3D2714', lineHeight: 1.5 }}>
                      <span style={{ color: '#C4A265', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Background panel */}
          {hasBackground && (
            <div className="tab-background" style={{ display: activeTab !== 'background' ? 'none' : 'block' }}>
              <p style={{ fontSize: '14px', color: '#3D2714', lineHeight: 1.85, fontStyle: 'italic', whiteSpace: 'pre-line' }}>
                {recipe.background}
              </p>
            </div>
          )}

          {/* Nonna's Wisdom panel */}
          {hasWisdom && (
            <div className="tab-wisdom" style={{ display: activeTab !== 'wisdom' ? 'none' : 'block' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {recipe.nonna_wisdom!.filter(w => w.trim()).map((tip, i) => (
                  <li key={i} style={{ display: 'flex', gap: '12px', marginBottom: '14px', fontSize: '13px', color: '#3D2714', lineHeight: 1.7 }}>
                    <span style={{ color: '#C4A265', flexShrink: 0, marginTop: '2px' }}>✦</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Divider />

          {/* Source */}
          {recipe.source && (
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#8B6A42', fontStyle: 'italic', marginBottom: '16px' }}>
              {recipe.source}
            </p>
          )}

          {/* Tags */}
          {recipe.tags?.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {recipe.tags.map((tag, i) => (
                <span key={i} style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', border: '1px solid #C4A265', color: '#8B6A42', letterSpacing: '0.05em' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="no-print flex justify-center gap-3 flex-wrap">
            {onSave && (
              <button onClick={onSave} disabled={saving || saved}
                className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70 disabled:opacity-60"
                style={{
                  background: saved ? 'transparent' : '#C4A265',
                  color: saved ? '#8B6A42' : '#fff',
                  border: '1px solid #C4A265',
                }}>
                {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save to My Recipes'}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => (hasBackground || hasWisdom) ? setShowPrintOptions(o => !o) : handlePrint()}
                className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                style={{ border: '1px solid #C4A265', color: '#8B6A42', background: 'transparent' }}>
                Print
              </button>
              {showPrintOptions && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-xl p-4 z-10 w-56"
                     style={{ background: '#FEFAF0', border: '1px solid #C4A265', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B6A42', marginBottom: '10px' }}>Include in print</p>
                  {hasBackground && (
                    <label className="flex items-center gap-2 mb-2 cursor-pointer" style={{ fontSize: '13px', color: '#3D2714' }}>
                      <input type="checkbox" checked={printBackground} onChange={e => setPrintBackground(e.target.checked)}
                             style={{ accentColor: '#C4A265' }} />
                      Background
                    </label>
                  )}
                  {hasWisdom && (
                    <label className="flex items-center gap-2 mb-3 cursor-pointer" style={{ fontSize: '13px', color: '#3D2714' }}>
                      <input type="checkbox" checked={printWisdom} onChange={e => setPrintWisdom(e.target.checked)}
                             style={{ accentColor: '#C4A265' }} />
                      Nonna's Wisdom
                    </label>
                  )}
                  <button onClick={handlePrint}
                    className="w-full py-1.5 rounded-lg text-xs uppercase tracking-wider transition-opacity hover:opacity-70"
                    style={{ background: '#C4A265', color: '#fff' }}>
                    Print now
                  </button>
                </div>
              )}
            </div>
            {!readOnly && <ShareButton recipe={recipe} size="sm" />}
            {!readOnly && (
              <Link href={`/recipes/${recipe.id}`}
                className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                style={{ border: '1px solid #C4A265', color: '#8B6A42', background: 'transparent' }}>
                Edit
              </Link>
            )}
            {!readOnly && isAdmin && (
              <button onClick={addToGlobal} disabled={addingGlobal || addedGlobal}
                className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-70 disabled:opacity-50"
                style={{ border: '1px solid #4A7859', color: '#4A7859', background: addedGlobal ? 'var(--green-lt)' : 'transparent' }}>
                {addedGlobal ? '✓ In global' : addingGlobal ? 'Adding…' : '🌍 Add to global'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
