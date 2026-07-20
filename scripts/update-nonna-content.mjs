import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jqlvtbsuaodeyfglxkub.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbHZ0YnN1YW9kZXlmZ2x4a3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg5NTUxNCwiZXhwIjoyMDkyNDcxNTE0fQ.Omd-IZRd-4q90f9zuHgpgqggKeVlBwr9yGJNgjAupo8'
);

const updates = [
  {
    name: 'Sugo di Pomodoro',
    description: 'The quintessential tomato sauce for pasta — slow-cooked to a deep, rich, silky perfection.',
    background: 'This is a simplified version of my own grandmother\'s recipe, which was based on the typical Italian soffritto trio: onions, carrots, and celery. Slow cooking imparts a deep, rich flavor which can be enhanced by the optional use of tomato paste, according to your taste.',
    nonna_wisdom: [
      'Use crushed tomatoes — not diced, not whole. The texture is everything.',
      'Keep the right proportion of oil to tomato to obtain a smooth, thick silky sauce rather than a soup. If necessary, add more olive oil throughout the process; experience will be your best guide.',
      'Slow cooking time is what makes this sauce. Do not rush it.',
      'Add the basil only at the very end — just a few minutes — so it imparts its aroma without losing its fragrance.',
    ],
    prep_ahead: [
      'The sauce keeps refrigerated for up to 5 days, or frozen for up to 3 months.',
      'Chop onions and mince garlic up to a day ahead.',
    ],
  },
  {
    name: 'Panallets',
    description: 'Traditional Catalan marzipan sweets coated in pine nuts — fragrant with lemon and almond, irresistible for any marzipan lover.',
    background: 'Typical Catalonian sweets similar to marzipan, traditionally baked around November 1st for All Saints Day. Based on my friend Torcuata\'s recipe. They are my very favorite sweets because of the marzipan content.',
    nonna_wisdom: [
      'The dough is usually rolled in pine nuts before baking, but coconut or cocoa powder can be used as a variation.',
      'The longer the dough rests in the refrigerator, the more homogenous it will be — overnight is better than 12 hours.',
      'Roll each dough ball in the pine nuts with a swirling motion so the nuts cover the entire surface evenly.',
    ],
    prep_ahead: [
      'The dough must rest in the refrigerator for at least 12 hours — make it the day before.',
      'Baked panallets keep well in an airtight tin for up to a week.',
    ],
  },
  {
    name: 'Pasta e Ceci (Pasta and Chickpeas)',
    description: 'A Friday tradition from childhood — simple, nourishing, and deeply comforting. A timeless example of cucina povera at its best.',
    background: 'At my Nonna Titina\'s home, pasta e ceci was often served on Fridays as a nutritious alternative to meat, following traditional religious fasting days. Nowadays I still associate it with a Friday meal.\n\nThis is a classic example of cucina povera — peasant cooking from Central and Southern Italy. My preferred pasta for this dish is cannolicchi, a short, tubular pasta, often ridged and slightly twisted, originally from Sicily. Its shape recalls the Adriatic razor clams also called cannolicchi. It is the pasta recommended in Il Talismano della Felicità, the traditional Italian cookbook by Ada Boni (1929), which marks the transition from oral to written transmission of recipes. Modern cookbooks suggest ditalini or tubetti as alternatives — ultimately, the choice is yours.',
    nonna_wisdom: [
      'Chickpeas differ in cooking time depending on how long they have been stored. Here lies the importance of using good quality ones.',
      'Water is not a fixed amount — adjust gradually to achieve a stew-like consistency.',
      'Some chickpeas can be lightly crushed to thicken the broth naturally.',
      'The dish should feel rustic, dense, and comforting — never watery.',
      'What is essential is the rosemary. Its aroma transforms the chickpeas in a way that feels almost alchemical — an example of how the combination of simple ingredients can produce a new and unexpected flavor.',
    ],
    prep_ahead: [
      'Soak the chickpeas for 12 hours or overnight before cooking.',
      'The flavor deepens if made a few hours ahead — reheat gently, adding a splash of hot water if needed.',
    ],
  },
];

for (const u of updates) {
  const { error } = await supabase.from('template_recipes').update({
    description: u.description,
    background: u.background,
    nonna_wisdom: u.nonna_wisdom,
    prep_ahead: u.prep_ahead,
  }).eq('name', u.name);
  if (error) console.error('Error updating', u.name, ':', error.message);
  else console.log('Updated:', u.name);
}
