import { formatList, toLineItem } from '../lib/share-list.ts';
let bad = 0;
const t = (n, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? '✓' : '✗'} ${n}`);
  if (!ok) { bad++; console.log(`      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`); }
};

// Amounts as they actually appear in generated grocery lists.
t('plain number',        toLineItem('eggs', '2'),              { name:'eggs', quantity:2 });
t('number and unit',     toLineItem('passata', '2 cups'),      { name:'passata', quantity:2, unit:'cup' });
t('abbreviated unit',    toLineItem('olive oil', '3 tbsp'),    { name:'olive oil', quantity:3, unit:'tablespoon' });
t('mixed fraction',      toLineItem('flour', '1 1/2 cups'),    { name:'flour', quantity:1.5, unit:'cup' });
t('bare fraction',       toLineItem('salt', '1/2 tsp'),        { name:'salt', quantity:0.5, unit:'teaspoon' });
t('vulgar fraction',     toLineItem('butter', '½ cup'),        { name:'butter', quantity:0.5, unit:'cup' });
t('one and a half as a glyph', toLineItem('flour', '1½ cups'), { name:'flour', quantity:1.5, unit:'cup' });
t('decimal',             toLineItem('beef', '1.5 lb'),         { name:'beef', quantity:1.5, unit:'pound' });
t('range takes the low end', toLineItem('chicken', '2-3 lbs'), { name:'chicken', quantity:2, unit:'pound' });
t('cloves become each',  toLineItem('garlic', '3 cloves'),     { name:'garlic', quantity:3, unit:'each' });
t('unknown unit is dropped, not guessed', toLineItem('thyme', '1 sprig'), { name:'thyme', quantity:1 });
t('empty amount',        toLineItem('bay leaves', ''),         { name:'bay leaves', quantity:1 });
t('unparseable amount falls back to one', toLineItem('salt', 'to taste'), { name:'salt', quantity:1 });
t('zero never becomes the quantity', toLineItem('water', '0 cups'), { name:'water', quantity:1, unit:'cup' });

// The text list
const rows = [
  { label:'passata', amount:'2 cups', cat:'Canned & Dry Goods' },
  { label:'garlic',  amount:'3 cloves', cat:'Produce' },
  { label:'basil',   amount:'', cat:'Produce' },
];
const text = formatList(rows, 'Week of 31 Aug');
t('groups by aisle, in the order given', text,
`Week of 31 Aug

Canned & Dry Goods
• 2 cups passata

Produce
• 3 cloves garlic
• basil`);
t('an empty list produces nothing to share', formatList([], 'x'), '');

console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
