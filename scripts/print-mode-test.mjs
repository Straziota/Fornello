// The bug this replaces: JavaScript hid a section, called window.print(), and
// restored it on the next line. window.print() does not block in Safari, so the
// restore won the race and "Print Prep" printed every recipe.
//
// CSS cannot lose that race, because the browser reads it while laying out the
// printed page. These assert the rules select the right thing.
const hidden = (cls, id) => {
  if (cls === 'printing-prep')    return id === 'recipes-section';
  if (cls === 'printing-recipes') return id === 'prep-section';
  return false;                    // no class: the screen shows both
};
let bad = 0;
const t = (n, got, want) => { const ok = got === want; console.log(`  ${ok?'✓':'✗'} ${n.padEnd(52)} ${got}`); if (!ok) bad++; };

t('Print Prep hides the recipes',            hidden('printing-prep', 'recipes-section'), true);
t('Print Prep keeps the prep',               hidden('printing-prep', 'prep-section'), false);
t('Print Recipes hides the prep',            hidden('printing-recipes', 'prep-section'), true);
t('Print Recipes keeps the recipes',         hidden('printing-recipes', 'recipes-section'), false);
t('on screen, nothing is hidden',            hidden('', 'recipes-section') || hidden('', 'prep-section'), false);
t('after afterprint clears the class, both return',
  hidden('', 'recipes-section'), false);
console.log(`\n  ${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
