// Which of last week's meals get asked about. The rule that matters: never ask
// twice — a question someone already answered is how a useful email becomes one
// they stop opening.
const pick = (prevMeals, alreadyRated) => {
  const answered = new Set(alreadyRated.map(n => n.toLowerCase()));
  return prevMeals
    .filter(m => m && !m.isLeftover && m.name)
    .map(m => m.name)
    .filter(n => !answered.has(n.toLowerCase()))
    .slice(0, 7);
};
let bad = 0;
const t = (n, got, want) => { const ok = JSON.stringify(got)===JSON.stringify(want); console.log(`  ${ok?'✓':'✗'} ${n}`); if(!ok){bad++;console.log(`      got ${JSON.stringify(got)}`);} };
const M = n => ({ name: n });

t('asks about last week’s meals', pick([M('Ragu'), M('Paella')], []), ['Ragu','Paella']);
t('skips ones already rated', pick([M('Ragu'), M('Paella')], ['Ragu']), ['Paella']);
t('rating match ignores case', pick([M('Ragù Bianco')], ['ragù bianco']), []);
t('leftovers are not a meal to rate', pick([M('Ragu'), { name:'Ragu again', isLeftover:true }], []), ['Ragu']);
t('all rated → nothing to ask, section hidden', pick([M('Ragu')], ['Ragu']), []);
t('caps at seven so the email cannot balloon',
  pick(Array.from({length:10},(_,i)=>M('Dish '+i)), []).length, 7);
console.log(`\n  ${bad?`${bad} FAILED`:'all passed'}`);
process.exit(bad?1:0);
