import { vesselFor } from '../lib/vessel.ts';
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
];
for (const n of names) {
  const v = vesselFor({ name: n });
  console.log(`  ${(v.vessel || '?').padEnd(34)} ${n}`);
}
