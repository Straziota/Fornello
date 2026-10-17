import { usesOven, ovenTemperature, needsPreheatFirst, withPreheatFirst } from '../lib/oven.ts';
let bad = 0;
const t = (n, got, want) => { const ok = JSON.stringify(got)===JSON.stringify(want); console.log(`  ${ok?'✓':'✗'} ${n.padEnd(62)} ${JSON.stringify(got)}`); if(!ok){bad++;console.log(`      want ${JSON.stringify(want)}`);} };

// The false friends that made a naive version useless.
t('a Dutch oven is a pot, not the oven',
  usesOven(['Heat oil in a large Dutch oven over medium heat.', 'Simmer 2 hours.']), false);
t('baking powder is an ingredient',
  usesOven(['Whisk 2 cups flour with 1 tbsp baking powder.', 'Fry in a pan.']), false);
t('an oven-safe skillet used on the hob',
  usesOven(['Sear the steak in an oven-safe skillet.', 'Rest 10 minutes.']), false);

// Real oven use.
t('bake', usesOven(['Mix.', 'Bake at 350°F for 25 minutes.']), true);
t('roast', usesOven(['Toss the vegetables.', 'Roast 40 minutes at 425°F.']), true);
t('into the oven', usesOven(['Assemble.', 'Place into the oven for 1 hour.']), true);

// The two false positives found in the real library — both would have put a
// wrong instruction at the top of a recipe.
t('"roasted red peppers" is an ingredient, not an instruction',
  usesOven(['Heat oil in a Dutch oven.', 'Stir in the roasted red pepper strips and warm through.']), false);
t('a doneness temperature is never an oven temperature',
  ovenTemperature(['Simmer until the chicken registers 165°F on a thermometer.']), null);
t('doneness temp present AND a real oven temp → takes the oven one',
  ovenTemperature(['Preheat the oven to 400°F.', 'Roast until it registers 165°F.']), '400°F');

t('"roasted peppers ... for 2 minutes" is still an ingredient',
  usesOven(['Stir in the roasted red pepper strips and warm through for 2–3 minutes.']), false);
t('"place in the 425°F oven" — temperature before the word oven',
  ovenTemperature(['Place in the 425°F oven and bake 20 minutes.']), '425°F');
t('broiling has no oven setting, so no temperature is invented',
  ovenTemperature(['Broil 4 inches from the heat for 2–3 minutes until golden.']), null);

// Temperature parsing, in the forms recipes actually use.
t('°F', ovenTemperature(['Bake at 425°F for 20 minutes.']), '425°F');
t('F with a space', ovenTemperature(['Bake at 425 F for 20 min.']), '425°F');
t('Celsius', ovenTemperature(['Bake at 220°C for 30 minutes.']), '220°C');
t('the word degrees', ovenTemperature(['Bake at 350 degrees until golden.']), '350°F');
t('preheat phrasing', ovenTemperature(['Preheat oven to 190°C (375°F).']), '190°C');
t('no temperature stated', ovenTemperature(['Bake until golden.']), null);
t('a Dutch oven temperature is not an oven temperature',
  ovenTemperature(['Heat a Dutch oven. Simmer 350 ml of stock.']), null);

// The repair.
t('preheat already first → untouched',
  withPreheatFirst(['Preheat the oven to 400°F.', 'Bake 30 minutes.']),
  ['Preheat the oven to 400°F.', 'Bake 30 minutes.']);
t('preheat buried at step 3 → lifted to the top',
  withPreheatFirst(['Chop the onion.', 'Mix everything.', 'Preheat the oven to 400°F and bake 30 min.']),
  ['Preheat the oven to 400°F.', 'Chop the onion.', 'Mix everything.', 'Preheat the oven to 400°F and bake 30 min.']);
t('no temperature anywhere → left exactly as written, never invented',
  withPreheatFirst(['Chop the onion.', 'Bake until golden.']),
  ['Chop the onion.', 'Bake until golden.']);
t('no oven → untouched',
  withPreheatFirst(['Boil the pasta.', 'Toss with sauce.']),
  ['Boil the pasta.', 'Toss with sauce.']);
t('empty recipe does not crash', withPreheatFirst([]), []);

console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
