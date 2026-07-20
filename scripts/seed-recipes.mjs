import { createClient } from '@supabase/supabase-js';

const client = createClient(
  'https://jqlvtbsuaodeyfglxkub.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbHZ0YnN1YW9kZXlmZ2x4a3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg5NTUxNCwiZXhwIjoyMDkyNDcxNTE0fQ.Omd-IZRd-4q90f9zuHgpgqggKeVlBwr9yGJNgjAupo8'
);

const recipes = [
  {
    name: 'Apple and Red Fruit Crumble',
    cuisine: 'French',
    meal_type: 'dessert',
    serves: 6,
    total_time: '55 min',
    prep_time: '20 min',
    cook_time: '35 min',
    difficulty: 'Easy',
    description: "Nonna Ingrid's classic crumble with tender apples, cherries and red fruit jam under a buttery hazelnut topping. Serve warm with cream or vanilla ice cream.",
    tags: ['dessert', 'fruit', 'baked'],
    ingredients: [
      { amount: '900g', item: 'apples, peeled, cored and cut in 8 wedges' },
      { amount: '1 tbsp', item: 'water' },
      { amount: '120g', item: 'red fruits jam' },
      { amount: '30', item: 'whole cherries, pitted' },
      { amount: '120g', item: 'cold butter, cut in cubes' },
      { amount: '75g', item: 'brown sugar' },
      { amount: '80g', item: 'white flour' },
      { amount: '80g', item: 'whole wheat flour' },
      { amount: '1/2 tsp', item: 'cinnamon powder' },
      { amount: '4 tbsp', item: 'toasted hazelnuts' },
    ],
    instructions: [
      'Preheat oven to 350F (180C).',
      'Place apples and water in a saucepan over medium heat. Cover and cook for about 10 minutes until cooked but still firm, stirring once or twice.',
      'Remove from heat. Add cherries and red fruit jam and stir gently to combine.',
      'Butter a 5-cup baking dish. Pour in the fruit mixture. Reserve any excess liquid to serve alongside.',
      'For the crumble: combine both flours, brown sugar, cinnamon and hazelnuts in a food processor and pulse until finely mixed.',
      'Add cold butter cubes and pulse until the mixture resembles breadcrumbs. Without a processor, use two knives crossing each other.',
      'Spread crumble evenly over the fruit and bake in the middle of the oven for 35 minutes.',
      'Cool and serve at room temperature, optionally with cream or vanilla ice cream.',
    ],
    prep_ahead: [
      'Peel, core and slice the apples in advance and store in cold water with a squeeze of lemon',
      'Make the crumble mixture ahead and refrigerate - it keeps well for 2 days',
    ],
    source: 'Nonna Ingrid',
  },
];

const { error } = await client.from('template_recipes').insert(recipes);

if (error) {
  console.error('Error:', error.message);
} else {
  console.log(`✓ Inserted ${recipes.length} template recipe(s)`);
}
