import { translateRecipeDraft } from '../lib/translate-recipe.ts';
const k = process.env.ANTHROPIC_API_KEY;
let failed = 0;
const check = (name, ok, extra='') => { console.log(`  ${ok ? '✓' : '✗'} ${name}${extra && !ok ? ` — ${extra}` : ''}`); if (!ok) failed++; };

const card = {
  name: 'Sugo della Nonna',
  description: 'Il sugo della domenica, come lo faceva mia nonna a Bari.',
  ingredients: [
    { amount: 'q.b.', item: 'olio extravergine' },
    { amount: '1 tazza', item: 'passata di pomodoro' },
    { amount: 'un pizzico', item: 'sale' },
    { amount: '', item: 'soffritto di cipolla, carota e sedano' },
  ],
  instructions: [
    'Prepara il soffritto e lascialo appassire dolcemente.',
    'Aggiungi la passata, un goccio di vino, e lascia cantare per due ore.',
  ],
  nonna_wisdom: ['Non avere fretta. Il sugo si offende.'],
  prep_ahead: [],
};

const t = await translateRecipeDraft(card, 'Italian', 'English', k);
const all = JSON.stringify(t).toLowerCase();

check('translates the instructions', /soffritto|gently|slow/i.test(t.instructions.join(' ')) && t.instructions.length === 2);
check('keeps soffritto rather than "sauteed vegetables"', /soffritto/i.test(all));
check('glosses the kept term', t.kept_terms.some(x => /soffritto/i.test(x.term) && x.meaning.length > 10),
      JSON.stringify(t.kept_terms));
check('does NOT invent a number for q.b.', !t.ingredients.some(i => /q\.?b\.?/i.test(String(i.amount)) === false && /^\d+\s*(tsp|tbsp|ml|g)\b/i.test(String(i.amount)) && /oil/i.test(String(i.item))),
      JSON.stringify(t.ingredients));
check('keeps "1 tazza" as one cup, not converted to ml', /\b(1|one)\s*cup/i.test(JSON.stringify(t.ingredients)) && !/\b\d{2,}\s*ml/i.test(JSON.stringify(t.ingredients)),
      JSON.stringify(t.ingredients));
check('keeps the dish name Italian', /sugo/i.test(t.name), t.name);
check('carries the nonna wisdom across', t.nonna_wisdom.length === 1 && /sauce|offend|hurry|rush/i.test(t.nonna_wisdom[0]), JSON.stringify(t.nonna_wisdom));
check('adds no ingredients', t.ingredients.length === card.ingredients.length, `${t.ingredients.length} vs ${card.ingredients.length}`);

console.log('\n  --- English ---');
console.log(`  ${t.name}\n  ${t.description}`);
for (const i of t.ingredients) console.log(`    ${i.amount}  ${i.item}`);
for (const s of t.instructions) console.log(`    · ${s}`);
if (t.translator_notes.length) console.log('  notes: ' + t.translator_notes.join(' | '));
console.log(`\n  ${failed ? `${failed} FAILED` : 'all passed'}`);
process.exit(failed ? 1 : 0);
