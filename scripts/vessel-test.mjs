import { vesselFor } from '../lib/vessel.ts';

// Food colour, separately: it is fed to the prompt as "the sauce reads X", so a
// wrong value paints a sauce the dish does not have.
const COLOUR = {
  'Roasted Lemon Herb Chicken with Root Vegetables': 'pale gold',
  'Trofie al Pesto Genovese': 'fresh green',
  'Grilled Steak with Chimichurri and Potatoes': 'fresh green',
  'Herb Butter Roast Chicken': 'fresh green',
  'Pasta alla Amatriciana': 'warm brick-red',
};
let colourBad = 0;
for (const [name, want] of Object.entries(COLOUR)) {
  const got = vesselFor({ name }).foodColour;
  const ok = got === want;
  if (!ok) colourBad++;
  console.log(`  ${ok ? '✓' : '✗'} sauce reads ${String(got).padEnd(18)} ${name}${ok ? '' : `   (want ${want})`}`);
}
console.log('');
const names = [
  'Bistecca alla Fiorentina with Roasted Potatoes and Arugula',
  'Honey Harissa Sheet Pan Chicken Thighs with Chickpeas and Roasted Carrots',
  'Chicken Tikka Masala with Basmati Rice',
  'Crevettes à la Provençale sur Lit de Couscous',
  'Smash Burgers with Special Sauce and Brioche Buns',
  'Torta Llanera',
  // Must NOT become plates — these are served in their vessel.
  'Boeuf Bourguignon (Classic French Beef Stew with Red Wine)',
  'Pasta alla Amatriciana',
  'Paella Valenciana with Chicken and Seafood',
  'Chicken Tortilla Soup with Avocado and Lime',
  'Baked Ziti with Sausage and Ricotta',
  'Madeleines',
  // Regressions the composed-plate rule introduced on its first pass: both name
  // an accompaniment, and both are served in the thing they were cooked in.
  'Shakshuka with Feta and Warm Flatbread',
  'Chicken Souvlaki Bowls with Tzatziki and Orzo',
  'Roasted Lemon Herb Chicken with Root Vegetables',
  'Pan-Seared Salmon with Lemon Butter and Asparagus',
];
const EXPECTED = {
  'Shakshuka with Feta and Warm Flatbread': 'small round cast-iron pan',
  'Chicken Souvlaki Bowls with Tzatziki and Orzo': 'wide shallow serving bowl',
  'Pan-Seared Salmon with Lemon Butter and Asparagus': 'long oval fish platter',
  'Bistecca alla Fiorentina with Roasted Potatoes and Arugula': 'wide rimmed dinner plate',
  'Boeuf Bourguignon (Classic French Beef Stew with Red Wine)': 'deep round casserole',
  'Paella Valenciana with Chicken and Seafood': 'wide flat two-handled paella pan',
  'Madeleines': 'pale ceramic serving platter',
};
let bad = 0;
for (const n of names) {
  const v = vesselFor({ name: n }).vessel;
  const want = EXPECTED[n];
  const ok = !want || v === want;
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${(v || '?').padEnd(34)} ${n}${ok || !want ? '' : `   (want ${want})`}`);
}
console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad + colourBad ? 1 : 0);
