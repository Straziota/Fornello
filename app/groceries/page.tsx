'use client';
import { useState, useEffect, useRef } from 'react';
import { WeeklyMenu, GroceryItem } from '@/lib/types';
import PageBackground from '@/components/PageBackground';
import { T } from '@/components/T';
import { SITE_URL } from '@/lib/site';
import { categoryIcon, stapleCategory, BUILTIN_CATEGORIES } from '@/lib/categories';

function CategoryIcon({ src, size = 32 }: { src: string; size?: number }) {
  if (src.startsWith('/')) {
    return <img src={src} alt=""
      onError={e => { const img = e.currentTarget; if (!img.src.endsWith('/icons/Other.png')) img.src = '/icons/Other.png'; }}
      style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }} />;
  }
  return <span style={{ fontSize: `${size * 0.6}px` }}>{src}</span>;
}

export default function GroceriesPage() {
  const [menu, setMenu] = useState<WeeklyMenu | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [pantry, setPantry] = useState<string[]>([]);
  const [staples, setStaples] = useState<string[]>([]);
  const [stapleCats, setStapleCats] = useState<Record<string, string>>({});
  const [editedAmounts, setEditedAmounts] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [printDays, setPrintDays] = useState<Set<string>>(new Set());
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [combineLists, setCombineLists] = useState(false);
  const didTrigger = useRef(false);

  const fetchMenu = async () => {
    const d = await fetch('/api/menu').then(r => r.json());
    if (d?.meals) setMenu(d);
    return d;
  };

  const buildGroceryList = async (force = false) => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/menu/grocery-list', {
        method: 'POST',
        ...(force ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: true }) } : {}),
      });
      if (res.ok) await fetchMenu();
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetch('/api/pantry').then(r => r.json()).then(items => setPantry(items.map((i: any) => i.name.toLowerCase())));
    fetch('/api/settings').then(r => r.json()).then(s => { setStaples(s.staples || []); setStapleCats(s.stapleCategories || {}); });
    try {
      const saved = JSON.parse(localStorage.getItem('fornello_checked') || '[]');
      setChecked(new Set(saved));
      const savedAmounts = JSON.parse(localStorage.getItem('fornello_amounts') || '{}');
      setEditedAmounts(savedAmounts);
      const combined = localStorage.getItem('fornello_combine_lists') === '1';
      setCombineLists(combined);
    } catch {}
  }, []);

  const toggleCombine = () => {
    setCombineLists(v => {
      const next = !v;
      localStorage.setItem('fornello_combine_lists', next ? '1' : '0');
      return next;
    });
  };

  // Auto-trigger grocery list generation once when menu is present but list is empty/missing
  useEffect(() => {
    const hasItems = menu?.grocery_list &&
      Object.values(menu.grocery_list).some(items => items?.length > 0);
    if (menu?.meals && !hasItems && !didTrigger.current) {
      didTrigger.current = true;
      buildGroceryList();
    }
  }, [menu]);

  // Default printDays to all cooking days when menu loads
  useEffect(() => {
    if (menu?.meals) {
      setPrintDays(new Set(menu.meals.filter(m => !m.isLeftover).map(m => m.day)));
    }
  }, [menu?.id]);

  const cookingDays = (menu?.meals || []).filter(m => !m.isLeftover).map(m => ({ day: m.day, name: m.name }));
  const togglePrintDay = (day: string) => {
    setPrintDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  const saveAmount = (key: string, value: string, original: string) => {
    setEditingKey(null);
    const next = { ...editedAmounts };
    if (value === original || !value.trim()) {
      delete next[key];
    } else {
      next[key] = value.trim();
    }
    setEditedAmounts(next);
    localStorage.setItem('fornello_amounts', JSON.stringify(next));
  };

  const isInPantry = (itemName: string) =>
    pantry.some(p => itemName.toLowerCase().includes(p) || p.includes(itemName.toLowerCase()));

  // Items that match a pantry staple are already covered by the "Weekly staples"
  // checklist above — don't duplicate them in the recipe grocery list.
  const stapleNames = staples.map(s => s.toLowerCase().trim()).filter(Boolean);
  const matchesStaple = (itemName: string) => {
    const n = itemName.toLowerCase();
    return stapleNames.some(s => n === s || n.includes(s) || s.includes(n));
  };

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem('fornello_checked', JSON.stringify([...next]));
      return next;
    });
  };

  if (!menu) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🛒</div>
      <h2 className="text-2xl mb-3"><T>No grocery list yet</T></h2>
      <p className="italic" style={{ color: 'var(--text-2)' }}><T>Generate a menu first to see your shopping list.</T></p>
      <a href="/" className="inline-block mt-5 rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em]"
         style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--green)' }}>Go to Menu →</a>
    </div>
  );

  const hasGroceryItems = menu.grocery_list &&
    Object.values(menu.grocery_list).some(items => items?.length > 0);

  if (!hasGroceryItems) return (
    <>
      <PageBackground src="/backgrounds/groceries-page.png" />
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🛒</div>
        <h2 className="text-2xl mb-3" style={{ fontFamily: 'AbramoSerif, serif' }}>
          {generating ? 'Building your grocery list…' : 'Preparing your grocery list…'}
        </h2>
        <p className="italic" style={{ color: 'var(--text-2)' }}>
          {generating
            ? 'Pulling ingredients from this week\'s recipes. This takes about 30 seconds.'
            : 'Your menu is ready but the grocery list hasn\'t been built yet.'}
        </p>
        {!generating && (
          <button onClick={() => buildGroceryList()}
            className="inline-block mt-6 rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.18em]"
            style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--green)' }}>
            Build grocery list
          </button>
        )}
      </div>
    </>
  );

  // Strip out items that already exist in the user's pantry staples — those are tracked
  // in the "Weekly staples" card above. Otherwise salt, olive oil, etc. show up in both.
  const allCategories = Object.entries(menu.grocery_list)
    .map(([cat, items]) => [cat, (items as GroceryItem[]).filter(it => !matchesStaple(it.item))] as [string, GroceryItem[]])
    .filter(([, items]) => items.length > 0);
  const allCookingDays = (menu?.meals || []).filter(m => !m.isLeftover).map(m => m.day);
  const filterActive = printDays.size > 0 && printDays.size < allCookingDays.length;
  const categories = filterActive
    ? allCategories
        .map(([cat, items]) => [
          cat,
          (items as GroceryItem[]).filter(item =>
            !item.meals || item.meals.length === 0 || item.meals.some(d => printDays.has(d))
          ),
        ] as [string, GroceryItem[]])
        .filter(([, items]) => items.length > 0)
    : allCategories;
  const total = categories.reduce((n, [, items]) => n + items.length, 0);

  // Group user staples by store-aisle category using the same icon set as recipe items.
  const groupedStaples = staples.reduce<Record<string, string[]>>((acc, s) => {
    const cat = stapleCategory(s, stapleCats);
    (acc[cat] = acc[cat] || []).push(s);
    return acc;
  }, {});
  // Built-in order first, then any user-created categories currently in use.
  const customStapleCats = Object.keys(groupedStaples).filter(c => !(BUILTIN_CATEGORIES as readonly string[]).includes(c));
  const CATEGORY_ORDER = [...BUILTIN_CATEGORIES, ...customStapleCats];
  const stapleCategories = CATEGORY_ORDER
    .filter(c => groupedStaples[c]?.length > 0)
    .map(c => [c, groupedStaples[c]] as [string, string[]]);

  // When combined mode is on, fold staples into the recipe categories so the user
  // sees a single store-aisle-organized list. Staples render with a small badge.
  const combinedCategories: [string, GroceryItem[]][] = combineLists
    ? (() => {
        const map: Record<string, GroceryItem[]> = {};
        for (const [cat, items] of categories) map[cat] = [...items];
        for (const [cat, items] of stapleCategories) {
          for (const s of items) {
            (map[cat] = map[cat] || []).push({ item: s, amount: '', meals: [], isStaple: true } as any);
          }
        }
        return CATEGORY_ORDER
          .filter(c => map[c]?.length > 0)
          .map(c => [c, map[c]] as [string, GroceryItem[]]);
      })()
    : [];

  return (
    <>
      <PageBackground src="/backgrounds/groceries-page.png" />
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <h1 className="text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em]" style={{ fontFamily: 'AbramoSerif, serif' }}><T>From the market</T></h1>
          <p className="mt-2 text-[15px] italic" style={{ color: 'var(--text-2)' }}>
            {checked.size}/{total} items · {filterActive ? `filtered to ${[...printDays].join(', ')}` : 'based on this week'}
          </p>
        </div>
        <div className="flex gap-2 relative">
          <button onClick={() => buildGroceryList(true)} disabled={generating}
            title="Rebuild the list from this week's current recipes"
            className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--green)', opacity: generating ? 0.6 : 1, cursor: generating ? 'default' : 'pointer' }}>
            {generating ? '↻ …' : '↻'} <T>Refresh</T>
          </button>
          <button onClick={() => {
            const win = window.open('', '_blank');
            if (!win) return;
            const weekLabel = menu.week_start
              ? new Date(menu.week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : '';
            const filterDays = printDays.size > 0 ? printDays : new Set(cookingDays.map(c => c.day));
            const includeAll = filterDays.size === cookingDays.length;
            const filteredCategories = categories
              .map(([cat, items]) => [
                cat,
                (items as GroceryItem[]).filter(item =>
                  !item.meals || item.meals.length === 0 || item.meals.some(d => filterDays.has(d))
                ),
              ] as [string, GroceryItem[]])
              .filter(([, items]) => items.length > 0);
            const iconHtml = (cat: string) =>
              `<img src="${SITE_URL}${categoryIcon(cat)}" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;margin-right:6px;">`;
            const rows = filteredCategories.map(([cat, items]) =>
              `<div class="cat">
                <h2>${iconHtml(cat)} ${cat}</h2>
                ${items.map(item =>
                  `<div class="item">
                    <span class="check">☐</span>
                    <span>${item.amount ? `<span class="amt">${item.amount}</span> ` : ''}${item.item}</span>
                  </div>`
                ).join('')}
              </div>`
            ).join('');
            const filterLabel = includeAll
              ? `Week of ${weekLabel}`
              : `Week of ${weekLabel} · for: ${[...filterDays].join(', ')}`;
            win.document.write(`<!DOCTYPE html><html><head><title>Grocery List</title><style>
              * { margin:0; padding:0; box-sizing:border-box; }
              body { font-family: Georgia, serif; color: #2F3A32; padding: 40px; }
              h1 { font-size: 28px; margin-bottom: 4px; }
              .week { font-size: 13px; color: #7A847B; font-style: italic; margin-bottom: 32px; }
              .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
              .cat { break-inside: avoid; }
              h2 { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.15em; color: #556257; border-bottom: 1px solid #E7E0D6; padding-bottom: 6px; margin-bottom: 10px; }
              .item { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px dotted #D4B896; font-size: 14px; align-items: flex-start; }
              .check { color: #aaa; flex-shrink: 0; }
              .amt { color: #556257; font-weight: bold; }
              @media print { @page { margin: 2cm; } }
            </style></head><body>
              <h1>Grocery List</h1>
              <p class="week">${filterLabel}</p>
              ${staples.length > 0 ? `<div class="cat" style="border:1px solid #E8C97A; background:#FEF6E4; padding:14px 18px; border-radius:8px; margin-bottom:24px;">
                <h2 style="color:#7A5B10;">Weekly staples — check what to reorder</h2>
                ${stapleCategories.map(([cat, items]) => `<div style="margin-top:12px;">
                  <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.12em; color:#9A7B30; font-weight:bold; margin-bottom:4px;">${iconHtml(cat)} ${cat}</div>
                  ${items.map(s => `<div class="item"><span class="check">☐</span><span>${s}</span></div>`).join('')}
                </div>`).join('')}
              </div>` : ''}
              <div class="grid">${rows}</div>
            </body></html>`);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 250);
          }}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em]"
            style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-2)' }}>
            🖨 <T>Print</T> {printDays.size > 0 && printDays.size < cookingDays.length ? `(${printDays.size})` : ''}
          </button>
          <button onClick={() => setShowPrintOptions(o => !o)}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em]"
            style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-2)' }}>
            ⚙ Filter
          </button>
          {showPrintOptions && (
            <div className="absolute right-0 top-full mt-2 rounded-2xl p-4 z-20 w-72"
                 style={{ background: 'var(--white)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Print for which meals?</p>
              <div className="flex flex-col gap-2 mb-3">
                {cookingDays.map(d => {
                  const checked = printDays.has(d.day);
                  return (
                    <label key={d.day} className="flex items-start gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-2)' }}>
                      <input type="checkbox" checked={checked} onChange={() => togglePrintDay(d.day)}
                             style={{ accentColor: 'var(--green)', marginTop: '3px' }} />
                      <span>
                        <strong style={{ color: 'var(--text)' }}>{d.day}</strong>
                        <span className="block text-xs italic" style={{ color: 'var(--text-3)' }}>{d.name}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => setShowPrintOptions(false)}
                  className="w-full py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-80"
                  style={{ background: 'var(--green)', color: '#fff' }}>
                  ✓ Apply Filters
                </button>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setPrintDays(new Set(cookingDays.map(c => c.day)))}
                    className="text-xs px-3 py-1.5 rounded-full" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                    All week
                  </button>
                  <button onClick={() => setPrintDays(new Set())}
                    className="text-xs px-3 py-1.5 rounded-full" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                    None
                  </button>
                </div>
              </div>
            </div>
          )}
          {checked.size > 0 && (
            <button onClick={() => { setChecked(new Set()); localStorage.removeItem('fornello_checked'); setEditedAmounts({}); localStorage.removeItem('fornello_amounts'); }}
              className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em]"
              style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-3)' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full my-6 overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-500"
             style={{ background: 'var(--sage)', width: `${total ? (checked.size / total) * 100 : 0}%` }} />
      </div>

      {/* Combine toggle — lets the user collapse staples + recipes into a single
          store-aisle list when they want one consolidated trip. */}
      {staples.length > 0 && categories.length > 0 && (
        <div className="flex justify-end mb-4">
          <button onClick={toggleCombine}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80 flex items-center gap-2"
            style={combineLists
              ? { background: 'var(--green)', color: '#fff', border: '1px solid var(--green)' }
              : { background: 'var(--white)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            {combineLists ? '✓ Combined into one list' : '⇆ Combine into one list'}
          </button>
        </div>
      )}

      {/* Staples — categorized by store aisle, hidden when combined mode is on
          (in combined mode they're merged into the recipe categories below). */}
      {staples.length > 0 && !combineLists && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <img src="/icons/pantry-v2.png" alt="" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
            <div>
              <h3 className="text-[18px]" style={{ color: 'var(--text)' }}>Weekly staples</h3>
              <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>
                Check what you need to reorder this week.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {stapleCategories.map(([cat, items]) => (
              <div key={`s-${cat}`} className="rounded-[22px] p-5 ring-1 relative"
                   style={{ background: 'var(--white-2)', boxShadow: '0 6px 24px rgba(47,58,50,0.05)' }}>
                <div className="absolute top-4 right-4">
                  <CategoryIcon src={categoryIcon(cat)} size={64} />
                </div>
                <h3 className="text-[20px] mb-4 pr-20 min-h-[52px]" style={{ color: 'var(--text)' }}>{cat}</h3>
                <div className="space-y-3">
                  {items.map((item, i) => {
                    const key = `staple::${cat}::${i}::${item}`;
                    const done = checked.has(key);
                    return (
                      <div key={i} onClick={() => toggle(key)}
                           className="flex items-center justify-between gap-4 cursor-pointer"
                           style={{ color: done ? 'var(--text-3)' : 'var(--text)' }}>
                        <span className={`text-[18px] leading-snug flex-1 ${done ? 'line-through' : ''}`}>
                          {item}
                        </span>
                        <input type="checkbox" checked={done} readOnly tabIndex={-1}
                          className="h-4 w-4 rounded shrink-0 pointer-events-none"
                          style={{ accentColor: 'var(--sage)', borderColor: 'var(--border-2)' }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recipes header — same prominent styling as the Weekly staples header above.
          Hidden in combined mode (everything lives under one list there). */}
      {categories.length > 0 && !combineLists && (
        <div className="flex items-center gap-3 mt-8 mb-3">
          <img src="/icons/this-week.png" alt="" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
          <div>
            <h3 className="text-[18px]" style={{ color: 'var(--text)' }}>This week's recipes</h3>
            <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>
              Ingredients pulled from this week's planned meals.
            </p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(combineLists ? combinedCategories : categories).map(([cat, items]) => (
          <div key={cat} className="rounded-[22px] p-5 ring-1 relative"
               style={{ background: 'var(--white-2)', boxShadow: '0 6px 24px rgba(47,58,50,0.05)' }}>
            <div className="absolute top-4 right-4">
              <CategoryIcon src={categoryIcon(cat)} size={64} />
            </div>
            <h3 className="text-[20px] mb-4 pr-20 min-h-[52px]" style={{ color: 'var(--text)' }}>{cat}</h3>
            <div className="space-y-3">
              {(items as GroceryItem[]).map((item, i) => {
                const key = `${cat}::${i}::${item.item}`;
                const done = checked.has(key);
                const inPantry = !((item as any).isStaple) && isInPantry(item.item);
                return (
                  <div key={i}
                    onClick={() => !inPantry && toggle(key)}
                    className="flex items-center justify-between gap-4 cursor-pointer"
                    style={{ color: done || inPantry ? 'var(--text-3)' : 'var(--text)' }}>
                    <span className={`text-[18px] leading-snug flex-1 ${done || inPantry ? 'line-through' : ''}`}>
                      {item.amount && (
                        editingKey === key ? (
                          <input
                            autoFocus
                            defaultValue={editedAmounts[key] ?? item.amount}
                            onClick={e => e.stopPropagation()}
                            onBlur={e => saveAmount(key, e.target.value, item.amount)}
                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setEditingKey(null); } }}
                            className="outline-none border-b text-sm w-20 mr-1"
                            style={{ borderColor: 'var(--green)', color: 'var(--green)', background: 'transparent', fontFamily: 'Georgia, serif' }}
                          />
                        ) : (
                          <span
                            onClick={e => { if (!done && !inPantry) { e.stopPropagation(); setEditingKey(key); } }}
                            title="Tap to edit quantity"
                            style={{
                              color: editedAmounts[key] ? 'var(--green)' : 'var(--text-3)',
                              fontSize: '14px',
                              cursor: done || inPantry ? 'default' : 'text',
                              borderBottom: !done && !inPantry ? '1px dashed var(--border)' : 'none',
                              marginRight: '4px',
                            }}>
                            {editedAmounts[key] ?? item.amount}
                          </span>
                        )
                      )}
                      {item.item}
                      {(item as any).isStaple && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full no-underline"
                              style={{ background: 'rgba(232,201,122,0.25)', color: '#7A5B10', textDecoration: 'none', verticalAlign: 'middle' }}>
                          🥫 staple
                        </span>
                      )}
                      {inPantry && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full no-underline"
                              style={{ background: 'var(--green-lt)', color: 'var(--green)', textDecoration: 'none', verticalAlign: 'middle' }}>
                          ✓ in pantry
                        </span>
                      )}
                      {item.meals?.length > 0 && (
                        <span className="block text-xs italic mt-0.5" style={{ color: 'var(--text-3)' }}>
                          {item.meals.join(', ')}
                        </span>
                      )}
                    </span>
                    <input type="checkbox" checked={done || inPantry} readOnly tabIndex={-1}
                      className="h-4 w-4 rounded shrink-0 pointer-events-none"
                      style={{ accentColor: 'var(--sage)', borderColor: 'var(--border-2)' }} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
