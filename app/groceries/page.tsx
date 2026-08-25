'use client';
import { useState, useEffect, useRef } from 'react';
import { WeeklyMenu, GroceryItem } from '@/lib/types';
import PageBackground from '@/components/PageBackground';
import StaplesPrompt from '@/components/StaplesPrompt';
import { T } from '@/components/T';
import { SITE_URL } from '@/lib/site';
import { categoryIcon, stapleCategory, BUILTIN_CATEGORIES } from '@/lib/categories';

function CategoryIcon({ src, size = 32 }: { src: string; size?: number }) {
  if (src.startsWith('/')) {
    return <img src={src} alt=""
      onError={e => { const img = e.currentTarget; if (!img.src.endsWith('/icons/Basket.png')) img.src = '/icons/Basket.png'; }}
      style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }} />;
  }
  return <span style={{ fontSize: `${size * 0.6}px` }}>{src}</span>;
}

type Row = {
  key: string;
  label: string;
  amount: string;
  cat: string;
  meals?: string[];
  editable?: boolean;                                    // quantity is tap-to-edit
  inPantry?: boolean;
  badge?: { text: string; bg: string; fg: string; icon?: string };
};
type Section = { cat: string; rows: Row[] };
type Source = { key: string; label: string; hint: string; icon: string; sections: Section[] };

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
  // Which of the page's lists (staples, this week's recipes, each special
  // occasion) are folded together into one store-aisle list. Anything not in
  // here keeps its own section.
  const [combinedSources, setCombinedSources] = useState<Set<string>>(new Set());
  const [showCombineOptions, setShowCombineOptions] = useState(false);
  // Checked items are tucked away by default so the list reads as "what's left".
  const [hideChecked, setHideChecked] = useState(true);
  const didTrigger = useRef(false);

  const fetchMenu = async () => {
    const d = await fetch('/api/menu').then(r => r.json());
    // Recorded so the check-in can tell "never found the shopping list" from
    // "found it and didn't like it". Deliberately not awaited.
    if (d?.id) {
      fetch('/api/menu/groceries-opened', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId: d.id }),
      }).catch(() => {});
    }
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
      const savedSources = localStorage.getItem('fornello_combined_sources');
      if (savedSources) {
        setCombinedSources(new Set(JSON.parse(savedSources)));
      } else if (localStorage.getItem('fornello_combine_lists') === '1') {
        // Migrate the old all-or-nothing toggle: it merged staples into recipes.
        setCombinedSources(new Set(['staples', 'recipes']));
      }
      setHideChecked(localStorage.getItem('fornello_hide_checked') !== '0');
    } catch {}
  }, []);

  const toggleSourceCombined = (key: string) => {
    setCombinedSources(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem('fornello_combined_sources', JSON.stringify([...next]));
      return next;
    });
  };

  const toggleHideChecked = () => {
    setHideChecked(v => {
      const next = !v;
      localStorage.setItem('fornello_hide_checked', next ? '1' : '0');
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

  // ── Sources ───────────────────────────────────────────────────────────────
  // Three kinds of list feed this page: the weekly staples, this week's recipe
  // ingredients, and one per Special Occasion whose ingredients were added. Each
  // is a "source" the user can keep separate or fold into a single combined list.
  // Row keys are name-based (not index-based) so they stay stable as the list is
  // regrouped, and carry their source so the same item in two lists stays distinct.
  const sortCats = (cats: string[]) => {
    const custom = cats.filter(c => !(BUILTIN_CATEGORIES as readonly string[]).includes(c));
    return [...BUILTIN_CATEGORIES, ...custom].filter(c => cats.includes(c));
  };
  const groupRows = (rows: Row[]): Section[] => {
    const map: Record<string, Row[]> = {};
    for (const r of rows) (map[r.cat] = map[r.cat] || []).push(r);
    return sortCats(Object.keys(map)).map(cat => ({ cat, rows: map[cat] }));
  };

  const stapleRows: Row[] = stapleCategories.flatMap(([cat, items]) =>
    items.map(item => ({
      key: `staple::${cat}::${item}`, label: item, amount: '', cat,
      // The mortar, matching Pantry in the nav — the same idea in both places.
      badge: { text: 'staple', icon: '/icons/pantry-v2.png', bg: 'rgba(232,201,122,0.25)', fg: '#7A5B10' },
    }))
  );

  const toRow = (it: GroceryItem, cat: string, sourceKey: string): Row => ({
    key: `${sourceKey}::${cat}::${it.item}`,
    label: it.item,
    amount: it.amount || '',
    cat,
    meals: it.meals,
    editable: true,
    inPantry: isInPantry(it.item),
    badge: it.occasion
      ? { text: `🥂 ${it.occasion}`, bg: 'rgba(196,162,101,0.22)', fg: '#8B6A42' }
      : undefined,
  });

  const recipeRows: Row[] = categories.flatMap(([cat, items]) =>
    items.filter(it => !it.occasion).map(it => toRow(it, cat, 'recipes'))
  );

  // One source per occasion on the list, identified by id where present so a
  // renamed occasion stays one group rather than splitting in two.
  const occasionKeyOf = (it: GroceryItem) => `occasion:${it.occasionId ?? it.occasion}`;
  const occasionGroups = new Map<string, { label: string; items: [GroceryItem, string][] }>();
  for (const [cat, items] of categories) {
    for (const it of items) {
      if (!it.occasion) continue;
      const k = occasionKeyOf(it);
      if (!occasionGroups.has(k)) occasionGroups.set(k, { label: it.occasion, items: [] });
      occasionGroups.get(k)!.items.push([it, cat]);
    }
  }
  const occasionSources: Source[] = [...occasionGroups.entries()].map(([key, g]) => ({
    key,
    label: g.label,
    hint: 'Ingredients from this occasion’s menu.',
    icon: '/icons/special-occasion.png',
    sections: groupRows(g.items.map(([it, cat]) => toRow(it, cat, key))),
  }));

  const sources: Source[] = [
    ...(stapleRows.length ? [{
      key: 'staples', label: 'Weekly staples',
      hint: 'Check what you need to reorder this week.',
      icon: '/icons/pantry-v2.png', sections: groupRows(stapleRows),
    }] : []),
    ...(recipeRows.length ? [{
      key: 'recipes', label: 'This week’s recipes',
      hint: 'Ingredients pulled from this week’s planned meals.',
      icon: '/icons/this-week.png', sections: groupRows(recipeRows),
    }] : []),
    ...occasionSources,
  ];

  // Combining only means something with two or more lists selected.
  const mergedKeys = sources.filter(s => combinedSources.has(s.key)).map(s => s.key);
  const isMerged = mergedKeys.length >= 2;
  const combinedSection: Source | null = isMerged
    ? {
        key: '__combined', label: 'Your combined list',
        hint: `${mergedKeys.length} lists merged by store aisle.`,
        icon: '/icons/groceries.png',
        sections: groupRows(sources.filter(s => mergedKeys.includes(s.key)).flatMap(s => s.sections.flatMap(sec => sec.rows))),
      }
    : null;
  const separateSources = isMerged ? sources.filter(s => !mergedKeys.includes(s.key)) : sources;
  const shownSources = combinedSection ? [combinedSection, ...separateSources] : separateSources;

  const allRows = sources.flatMap(s => s.sections.flatMap(sec => sec.rows));
  const total = allRows.length;

  // Checked items leave their aisle card and collect in one "In the cart" list,
  // keeping their key so tapping one puts it straight back where it came from.
  const cart = allRows
    .filter(r => checked.has(r.key))
    .map(r => ({ key: r.key, label: r.label, amount: editedAmounts[r.key] ?? r.amount, cat: r.cat }));

  // Only still-to-get rows stay in the aisle cards; a card — and its section
  // heading — disappears once everything in it has been picked up.
  const toGet = (src: Source) => ({
    ...src,
    sections: src.sections
      .map(sec => ({ ...sec, rows: sec.rows.filter(r => !checked.has(r.key)) }))
      .filter(sec => sec.rows.length > 0),
  });
  const visibleSources = shownSources.map(toGet).filter(s => s.sections.length > 0);

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
        <div className="flex gap-2 relative flex-wrap items-center">
          <StaplesPrompt />
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
            const iconHtml = (cat: string) =>
              `<img src="${SITE_URL}${categoryIcon(cat)}" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;margin-right:6px;">`;
            // Print mirrors the screen: whatever is combined prints as one list,
            // and each separate list gets its own heading.
            const sourcesHtml = shownSources.map(src => {
              const secs = src.sections
                .map(sec => ({
                  cat: sec.cat,
                  rows: sec.rows.filter(r =>
                    !r.meals || r.meals.length === 0 || r.meals.some(d => filterDays.has(d))
                  ),
                }))
                .filter(sec => sec.rows.length > 0);
              if (!secs.length) return '';
              const cats = secs.map(sec =>
                `<div class="cat">
                  <h2>${iconHtml(sec.cat)} ${sec.cat}</h2>
                  ${sec.rows.map(r =>
                    `<div class="item">
                      <span class="check">☐</span>
                      <span>${r.amount ? `<span class="amt">${editedAmounts[r.key] ?? r.amount}</span> ` : ''}${r.label}</span>
                    </div>`
                  ).join('')}
                </div>`
              ).join('');
              return `<h3 class="src">${src.label}</h3><div class="grid">${cats}</div>`;
            }).join('');
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
              .src { font-size: 18px; margin: 28px 0 12px; padding-bottom: 4px; border-bottom: 2px solid #C4A265; }
              .src:first-of-type { margin-top: 0; }
              .item { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px dotted #D4B896; font-size: 14px; align-items: flex-start; }
              .check { color: #aaa; flex-shrink: 0; }
              .amt { color: #556257; font-weight: bold; }
              @media print { @page { margin: 2cm; } }
            </style></head><body>
              <h1>Grocery List</h1>
              <p class="week">${filterLabel}</p>
              ${sourcesHtml}
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
          {cart.length > 0 && (
            <button onClick={toggleHideChecked}
              title={hideChecked ? 'Show the items already in your cart' : 'Hide checked items so only what\'s left shows'}
              className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
              style={hideChecked
                ? { border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-2)' }
                : { border: '1px solid var(--green)', background: 'var(--green)', color: '#fff' }}>
              {hideChecked ? `Show checked (${cart.length})` : 'Hide checked'}
            </button>
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

      {/* Combine picker — tick the lists that should share one store-aisle list.
          Anything left unticked keeps its own section, which is how a Special
          Occasion stays separate from the weekly shop. */}
      {sources.length > 1 && (
        <div className="flex justify-end mb-4 relative">
          <button onClick={() => setShowCombineOptions(o => !o)}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80 flex items-center gap-2"
            style={isMerged
              ? { background: 'var(--green)', color: '#fff', border: '1px solid var(--green)' }
              : { background: 'var(--white)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            {isMerged ? `✓ ${mergedKeys.length} lists combined` : '⇆ Combine lists'}
          </button>
          {showCombineOptions && (
            <div className="absolute right-0 top-full mt-2 rounded-2xl p-4 z-20 w-80"
                 style={{ background: 'var(--white)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Combine which lists?</p>
              <p className="text-xs italic mb-3" style={{ color: 'var(--text-3)' }}>
                Ticked lists merge into one list sorted by store aisle. Unticked ones stay on their own.
              </p>
              <div className="flex flex-col gap-2 mb-3">
                {sources.map(s => (
                  <label key={s.key} className="flex items-start gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-2)' }}>
                    <input type="checkbox" checked={combinedSources.has(s.key)} onChange={() => toggleSourceCombined(s.key)}
                           style={{ accentColor: 'var(--green)', marginTop: '3px' }} />
                    <span>
                      <strong style={{ color: 'var(--text)' }}>{s.label}</strong>
                      <span className="block text-xs italic" style={{ color: 'var(--text-3)' }}>
                        {s.sections.reduce((n, sec) => n + sec.rows.length, 0)} items
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {mergedKeys.length === 1 && (
                <p className="text-xs italic mb-3" style={{ color: '#8B6A42' }}>
                  Tick at least two lists to merge them.
                </p>
              )}
              <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => setShowCombineOptions(false)}
                  className="w-full py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-80"
                  style={{ background: 'var(--green)', color: '#fff' }}>
                  ✓ Done
                </button>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => { const all = new Set(sources.map(s => s.key)); setCombinedSources(all); localStorage.setItem('fornello_combined_sources', JSON.stringify([...all])); }}
                    className="text-xs px-3 py-1.5 rounded-full" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                    Combine all
                  </button>
                  <button onClick={() => { setCombinedSources(new Set()); localStorage.setItem('fornello_combined_sources', '[]'); }}
                    className="text-xs px-3 py-1.5 rounded-full" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                    Keep all separate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* In the cart — everything ticked off, collected out of the way. It sits
          directly under its toolbar toggle so opening it is visible without
          scrolling. Tap an item to put it back on the shelves. */}
      {cart.length > 0 && !hideChecked && (
        <div className="mb-8">
          <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-3">
              <img src="/icons/Basket.png" alt="" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
              <div>
                <h3 className="text-[18px]" style={{ color: 'var(--text)' }}>In the cart</h3>
                <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>
                  {cart.length} {cart.length === 1 ? 'item' : 'items'} picked up · tap one to put it back
                </p>
              </div>
            </div>
            <button onClick={toggleHideChecked}
              className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
              style={{ background: 'var(--green)', color: '#fff', border: '1px solid var(--green)' }}>
              Hide checked
            </button>
          </div>

          <div className="rounded-[22px] p-5 ring-1"
               style={{ background: 'var(--white-2)', boxShadow: '0 6px 24px rgba(47,58,50,0.05)' }}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
              {cart.map(row => (
                <div key={row.key} onClick={() => toggle(row.key)}
                     className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="flex items-center gap-2 flex-1 min-w-0">
                    <CategoryIcon src={categoryIcon(row.cat)} size={24} />
                    <span className="text-[16px] leading-snug line-through" style={{ color: 'var(--text-3)' }}>
                      {row.amount && <span style={{ fontSize: '13px', marginRight: '4px' }}>{row.amount}</span>}
                      {row.label}
                    </span>
                  </span>
                  <input type="checkbox" checked readOnly tabIndex={-1}
                    className="h-4 w-4 rounded shrink-0 pointer-events-none"
                    style={{ accentColor: 'var(--sage)', borderColor: 'var(--border-2)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* One block per list still to shop — the combined list first when lists
          are merged, then whatever the user chose to keep separate. */}
      {visibleSources.map((src, si) => (
        <div key={src.key} className={si === 0 ? '' : 'mt-8'}>
          <div className="flex items-center gap-3 mb-3">
            <img src={src.icon} alt=""
                 onError={e => { e.currentTarget.style.visibility = 'hidden'; }}
                 style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
            <div>
              <h3 className="text-[18px]" style={{ color: 'var(--text)' }}>{src.label}</h3>
              <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>{src.hint}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {src.sections.map(({ cat, rows }) => (
              <div key={`${src.key}-${cat}`} className="rounded-[22px] p-5 ring-1 relative"
                   style={{ background: 'var(--white-2)', boxShadow: '0 6px 24px rgba(47,58,50,0.05)' }}>
                <div className="absolute top-4 right-4">
                  <CategoryIcon src={categoryIcon(cat)} size={64} />
                </div>
                <h3 className="text-[20px] mb-4 pr-20 min-h-[52px]" style={{ color: 'var(--text)' }}>{cat}</h3>
                <div className="space-y-3">
                  {rows.map(row => {
                    const { key, inPantry } = row;
                    return (
                      <div key={key}
                        onClick={() => !inPantry && toggle(key)}
                        className="flex items-center justify-between gap-4 cursor-pointer"
                        style={{ color: inPantry ? 'var(--text-3)' : 'var(--text)' }}>
                        <span className={`text-[18px] leading-snug flex-1 ${inPantry ? 'line-through' : ''}`}>
                          {row.editable && row.amount && (
                            editingKey === key ? (
                              <input
                                autoFocus
                                defaultValue={editedAmounts[key] ?? row.amount}
                                onClick={e => e.stopPropagation()}
                                onBlur={e => saveAmount(key, e.target.value, row.amount)}
                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setEditingKey(null); } }}
                                className="outline-none border-b text-sm w-20 mr-1"
                                style={{ borderColor: 'var(--green)', color: 'var(--green)', background: 'transparent', fontFamily: 'Georgia, serif' }}
                              />
                            ) : (
                              <span
                                onClick={e => { if (!inPantry) { e.stopPropagation(); setEditingKey(key); } }}
                                title="Tap to edit quantity"
                                style={{
                                  color: editedAmounts[key] ? 'var(--green)' : 'var(--text-3)',
                                  fontSize: '14px',
                                  cursor: inPantry ? 'default' : 'text',
                                  borderBottom: !inPantry ? '1px dashed var(--border)' : 'none',
                                  marginRight: '4px',
                                }}>
                                {editedAmounts[key] ?? row.amount}
                              </span>
                            )
                          )}
                          {row.label}
                          {/* Source badges only earn their space in the combined
                              list — in a separate section the heading says it. */}
                          {row.badge && src.key === '__combined' && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full no-underline inline-flex items-center gap-1"
                                  style={{ background: row.badge.bg, color: row.badge.fg, textDecoration: 'none', verticalAlign: 'middle' }}>
                              {row.badge.icon && (
                                <img src={row.badge.icon} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                              )}
                              {row.badge.text}
                            </span>
                          )}
                          {inPantry && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full no-underline"
                                  style={{ background: 'var(--green-lt)', color: 'var(--green)', textDecoration: 'none', verticalAlign: 'middle' }}>
                              ✓ in pantry
                            </span>
                          )}
                          {(row.meals?.length ?? 0) > 0 && (
                            <span className="block text-xs italic mt-0.5" style={{ color: 'var(--text-3)' }}>
                              {row.meals!.join(', ')}
                            </span>
                          )}
                        </span>
                        <input type="checkbox" checked={!!inPantry} readOnly tabIndex={-1}
                          className="h-4 w-4 rounded shrink-0 pointer-events-none"
                          style={{ accentColor: 'var(--sage)', borderColor: 'var(--border-2)' }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {visibleSources.length === 0 && cart.length > 0 && (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-[22px]" style={{ fontFamily: 'AbramoSerif, serif', color: 'var(--text)' }}>
            That&apos;s everything on the list
          </h3>
          <p className="text-xs italic mt-1" style={{ color: 'var(--text-3)' }}>
            {hideChecked
              ? `All ${cart.length} items are in your cart — use “Show checked” above to see them.`
              : 'Every item is in the cart above.'}
          </p>
        </div>
      )}

      {/* In the cart — everything ticked off, collected in one place and out of
          the way. Tap an item to put it back on the shelves. */}
    </>
  );
}
