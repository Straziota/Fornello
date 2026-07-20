import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jqlvtbsuaodeyfglxkub.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbHZ0YnN1YW9kZXlmZ2x4a3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg5NTUxNCwiZXhwIjoyMDkyNDcxNTE0fQ.Omd-IZRd-4q90f9zuHgpgqggKeVlBwr9yGJNgjAupo8'
);

const { data: { publicUrl } } = supabase.storage.from('recipe-photos').getPublicUrl('nonnas/pasta-e-ceci.png');

const recipe = {
  name: 'Pasta e Ceci (Pasta and Chickpeas)',
  cuisine: 'Italian',
  meal_type: 'Pasta',
  serves: 6,
  total_time: '3 hrs (+ 12 hrs soaking)',
  prep_time: '12 hrs (soaking)',
  cook_time: '2½–3 hrs',
  difficulty: 'Medium',
  description: "A Friday tradition from childhood — simple, nourishing, and deeply comforting. At Nonna Titina's home, pasta e ceci was served on Fridays as a nutritious alternative to meat. A timeless example of cucina povera at its best.",
  tags: ['Italian', 'pasta', 'chickpeas', 'cucina povera', 'soup', 'vegetarian-friendly', 'Friday tradition'],
  ingredients: [
    { amount: '300 g', item: 'dried chickpeas (about 1½ cups)' },
    { amount: '1.4–1.6 liters', item: 'water (6–7 cups), plus extra hot water as needed' },
    { amount: '200 g', item: 'cannolicchi pasta (or ditalini / tubetti)' },
    { amount: '⅓ cup', item: 'olive oil' },
    { amount: '2', item: 'garlic cloves, chopped' },
    { amount: '1–2', item: 'rosemary sprigs' },
    { amount: '2', item: 'whole anchovies' },
    { amount: '1 Tbsp', item: 'tomato paste' },
    { amount: '', item: 'salt and pepper, to taste' },
    { amount: '', item: 'olive oil and grated Parmesan, to finish' },
  ],
  instructions: [
    'Soak the chickpeas in plenty of water for 12 hours or overnight. Drain.',
    'Place chickpeas in a pot with the rosemary and 1.4–1.6 liters of water. Bring to a gentle boil, then simmer until tender, about 2–2½ hours. The chickpeas should be soft and creamy inside, not chalky, while still holding their shape.',
    'In a frying pan, warm the olive oil. Add the garlic and anchovies and cook gently until the anchovies dissolve. Be careful not to brown the garlic. Stir in the tomato paste and cook for 1–2 minutes.',
    'Add this mixture to the chickpeas and stir well. Simmer together for 10–15 minutes to blend the flavors. Remove the rosemary sprigs.',
    'Adjust the liquid — the consistency should be thick and soupy (a hearty stew). Add enough hot water to obtain about 4½–5 cups of liquid for the pasta to cook.',
    'Add the pasta directly to the pot. Cook according to package instructions for al dente, stirring occasionally. The final dish should be creamy and cohesive — not dry, not brothy.',
    'Adjust salt and pepper. Serve with a drizzle of olive oil and grated Parmesan.',
  ],
  prep_ahead: [
    "Chickpeas vary in cooking time depending on how long they have been stored — use good quality, recently dried ones.",
    "Water is not a fixed amount — adjust gradually to achieve a stew-like consistency.",
    "Some chickpeas can be lightly crushed to thicken the broth naturally.",
    "The dish should feel rustic, dense, and comforting — never watery.",
    "Cannolicchi is the traditional pasta for this dish, as recommended in Il Talismano della Felicità by Ada Boni (1929). Ditalini or tubetti are good modern alternatives.",
    "What is essential is the rosemary — its aroma transforms the chickpeas in a way that feels almost alchemical.",
  ],
  source: 'Nonna Ingrid',
  photo_url: publicUrl,
};

const { data, error } = await supabase.from('template_recipes').insert(recipe).select('name');
if (error) console.error(error.message);
else console.log('Added:', data[0].name);
