// Pins the photo matcher's behaviour, so a stopword or threshold edit fails a
// test rather than quietly changing which dishes share a picture.
import { sameDishForPhoto } from '../lib/photo-match.ts';

const CASES = [
  ['Lemon Bars with Candied Lemon Zest', 'Lemon Bars with Candied Lemon Peel', true,  'same dish, different wording'],
  // Blocked, and correctly so: only "chicken" and "piccata" are shared, and the
  // visible ingredients genuinely differ. Erring toward blocking is deliberate —
  // a false negative costs one extra generation, a false positive shows the
  // wrong food.
  ['Chicken Piccata with Capers', 'Chicken Piccata with Mushrooms', false, 'same base, different visible ingredients'],
  ['Roasted Lemon Herb Chicken', 'Roasted Lemon Herb Salmon', false, 'different protein'],
  ['Roasted Lemon Herb Chicken', 'Roasted Lemon Herb Vegetables', false, 'protein vs none — the hole in presence-testing'],
  ['Sole Meunière with Haricots Verts', 'Steamed Haricots Verts', false, 'main vs its side'],
  ['Shakshuka with Feta and Warm Flatbread', 'Warm Flatbread', false, 'main vs its bread'],
  ['Cacio e Pepe with Roasted Vegetables', 'Roasted Lemon Herb Chicken with Root Vegetables', false, 'unrelated'],
  ['Pasta alla Amatriciana', 'Pasta alla Amatriciana', true, 'identical'],
];

let failed = 0;
for (const [a, b, want, note] of CASES) {
  const got = sameDishForPhoto(a, b);
  const ok = got === want;
  if (!ok) failed++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${got ? 'share ' : 'block '} ${note}`);
}
console.log(`\n${failed ? `${failed} FAILED` : 'all passed'}`);
process.exit(failed ? 1 : 0);
