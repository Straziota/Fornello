'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { PantryItem } from '@/lib/types';
import Toast from '@/components/Toast';
import PageBackground from '@/components/PageBackground';
import { T } from '@/components/T';

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="h-px flex-1" style={{ background: 'var(--border-2)' }} />
      <span className="text-sm italic" style={{ color: 'var(--sage)' }}>{label}</span>
      <div className="h-px flex-1" style={{ background: 'var(--border-2)' }} />
    </div>
  );
}

const PANTRY_STAPLES = [
  // Proteins
  'chicken breast', 'chicken thighs', 'ground beef', 'beef steak', 'pork chops', 'pork belly',
  'lamb chops', 'salmon fillet', 'tuna (canned)', 'sardines', 'anchovies', 'eggs', 'tofu',
  // Dairy
  'butter', 'whole milk', 'heavy cream', 'sour cream', 'Greek yogurt', 'parmesan', 'mozzarella',
  'cheddar', 'ricotta', 'feta', 'cream cheese',
  // Vegetables (fresh)
  'onions', 'garlic', 'potatoes', 'sweet potatoes', 'carrots', 'celery', 'tomatoes',
  'cherry tomatoes', 'spinach', 'kale', 'zucchini', 'eggplant', 'bell peppers', 'mushrooms',
  'leeks', 'shallots', 'broccoli', 'cauliflower', 'asparagus', 'green beans', 'peas',
  'corn', 'cucumber', 'lettuce', 'arugula', 'fennel', 'artichokes',
  // Canned & jarred
  'canned tomatoes', 'tomato paste', 'tomato sauce', 'canned chickpeas', 'canned black beans',
  'canned lentils', 'canned white beans', 'canned kidney beans', 'canned corn',
  'coconut milk', 'chicken stock', 'beef stock', 'vegetable stock',
  'olives', 'capers', 'roasted peppers', 'sun-dried tomatoes',
  // Grains & pasta
  'pasta (spaghetti)', 'pasta (penne)', 'pasta (rigatoni)', 'pasta (tagliatelle)',
  'rice (long grain)', 'risotto rice', 'basmati rice', 'brown rice', 'couscous', 'quinoa',
  'flour (all-purpose)', 'flour (00)', 'breadcrumbs', 'panko', 'oats', 'polenta',
  // Oils, vinegars & sauces
  'olive oil', 'extra virgin olive oil', 'vegetable oil', 'sesame oil',
  'balsamic vinegar', 'red wine vinegar', 'white wine vinegar', 'apple cider vinegar',
  'soy sauce', 'fish sauce', 'Worcestershire sauce', 'hot sauce', 'Dijon mustard',
  'tahini', 'miso paste', 'oyster sauce', 'hoisin sauce',
  // Spices & herbs
  'salt', 'black pepper', 'cumin', 'smoked paprika', 'sweet paprika', 'cinnamon',
  'turmeric', 'coriander', 'chili flakes', 'cayenne pepper', 'oregano', 'thyme',
  'rosemary', 'bay leaves', 'nutmeg', 'cardamom', 'cloves', 'saffron', 'sumac',
  'za\'atar', 'curry powder', 'garam masala', 'ras el hanout',
  // Baking
  'sugar', 'brown sugar', 'icing sugar', 'honey', 'maple syrup', 'vanilla extract',
  'baking powder', 'baking soda', 'cocoa powder', 'dark chocolate', 'yeast',
  // Nuts, seeds & dried fruit
  'almonds', 'walnuts', 'pine nuts', 'pistachios', 'cashews', 'hazelnuts',
  'sesame seeds', 'chia seeds', 'raisins', 'dried apricots', 'dried cranberries',
  // Acids & wine
  'lemon', 'lime', 'white wine', 'red wine',
];

export default function PantryPage() {
  const [items, setItems]     = useState<PantryItem[]>([]);
  const [name, setName]       = useState('');
  const [quantity, setQuantity] = useState('');
  const [toast, setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const [showDrop, setShowDrop]       = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef    = useRef<HTMLInputElement>(null);

  const load = () => fetch('/api/pantry').then(r => r.json()).then(setItems);
  useEffect(() => { load(); }, []);

  const updateSuggestions = useCallback((val: string, currentItems: PantryItem[]) => {
    if (!val.trim()) { setSuggestions([]); setShowDrop(false); return; }
    const lower = val.toLowerCase();
    const inPantry = new Set(currentItems.map(i => i.name.toLowerCase()));
    const matched = PANTRY_STAPLES
      .filter(s => s.toLowerCase().includes(lower) && !inPantry.has(s.toLowerCase()))
      .slice(0, 8);
    setSuggestions(matched);
    setShowDrop(matched.length > 0);
    setHighlighted(-1);
  }, []);

  const pickSuggestion = (ingredient: string) => {
    setName(ingredient);
    setShowDrop(false);
    setTimeout(() => document.getElementById('qty-input')?.focus(), 50);
  };

  const add = async () => {
    if (!name.trim()) return;
    setShowDrop(false);
    await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), quantity: quantity.trim() }),
    });
    setName('');
    setQuantity('');
    const updated = await fetch('/api/pantry').then(r => r.json());
    setItems(updated);
    setToast({ msg: `${name} added to pantry`, type: 'success' });
  };

  const remove = async (id: number, itemName: string) => {
    await fetch('/api/pantry', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
    setToast({ msg: `${itemName} removed`, type: 'success' });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDrop) {
      if (e.key === 'Enter') { e.preventDefault(); add(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0) pickSuggestion(suggestions[highlighted]);
      else { setShowDrop(false); add(); }
    } else if (e.key === 'Escape') {
      setShowDrop(false);
    }
  };

  return (
    <>
      <PageBackground src="/backgrounds/pantry-page.png" />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="max-w-2xl">
        <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]" style={{ fontFamily: 'AbramoSerif, serif' }}><T>Your Pantry</T></h1>
        <p className="mt-2 text-[15px] italic mb-2" style={{ color: 'var(--text-2)' }}>
          <T>Ingredients you already have. Fornello will build recipes around them.</T>
        </p>

        <Divider label="add to pantry" />

        {/* Add form */}
        <div className="rounded-[22px] p-6 ring-1 mb-8"
             style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
          <div className="flex gap-3 flex-wrap">

            {/* Ingredient name with autocomplete */}
            <div style={{ flex: 1, minWidth: '160px', position: 'relative' }}>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); updateSuggestions(e.target.value, items); }}
                onKeyDown={onKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowDrop(true); }}
                onBlur={() => { closeTimer.current = setTimeout(() => setShowDrop(false), 150); }}
                placeholder="Ingredient (e.g. canned tomatoes)"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                style={{ background: 'var(--cream)', borderColor: 'var(--border)', fontFamily: 'Georgia, serif' }}
                autoComplete="off"
              />

              {showDrop && (
                <ul style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  background: '#fff', border: '1.5px solid var(--border)',
                  borderRadius: '14px', zIndex: 100,
                  boxShadow: '0 8px 32px rgba(47,58,50,0.12)',
                  overflow: 'hidden', margin: 0, padding: '4px 0', listStyle: 'none',
                }}>
                  {suggestions.map((s, i) => (
                    <li key={s}
                      onMouseDown={() => { if (closeTimer.current) clearTimeout(closeTimer.current); pickSuggestion(s); }}
                      onMouseEnter={() => setHighlighted(i)}
                      style={{
                        padding: '8px 16px',
                        fontFamily: 'Georgia, serif',
                        fontSize: '14px',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        background: i === highlighted ? 'var(--cream)' : 'transparent',
                        transition: 'background 0.1s',
                      }}>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input
              id="qty-input"
              type="text"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="Quantity (optional)"
              className="w-40 px-4 py-2.5 rounded-xl border text-sm outline-none"
              style={{ background: 'var(--cream)', borderColor: 'var(--border)', fontFamily: 'Georgia, serif' }}
            />
            <button onClick={add}
              className="rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-80"
              style={{ background: 'var(--green)', whiteSpace: 'nowrap' }}>
              <T>Add</T>
            </button>
          </div>
          <p className="text-xs mt-3 italic" style={{ color: 'var(--text-3)' }}>
            <T>Tip: add pantry staples like olive oil, pasta, canned beans, spices, etc.</T>
          </p>
        </div>

        {/* Pantry list */}
        {items.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>
            <img src="/icons/pantry-v2.png" alt="" style={{ width: '140px', height: 'auto', margin: '0 auto 16px' }} />
            <p className="italic"><T>Your pantry is empty. Add ingredients above.</T></p>
          </div>
        ) : (
          <>
            <Divider label={`${items.length} item${items.length !== 1 ? 's' : ''} in stock`} />
            <div className="rounded-[22px] overflow-hidden ring-1"
                 style={{ background: 'var(--white)', boxShadow: '0 6px 24px rgba(47,58,50,0.06)' }}>
              {items.map((item, i) => (
                <div key={item.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                  style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg" style={{ color: 'var(--sage)' }}>✓</span>
                    <div>
                      <span className="text-[17px]" style={{ color: 'var(--text)' }}>{item.name}</span>
                      {item.quantity && (
                        <span className="ml-2 text-sm italic" style={{ color: 'var(--text-3)' }}>{item.quantity}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => remove(item.id!, item.name)}
                    className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
