// Run once: node scripts/add-nonna-recipe.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jqlvtbsuaodeyfglxkub.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbHZ0YnN1YW9kZXlmZ2x4a3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg5NTUxNCwiZXhwIjoyMDkyNDcxNTE0fQ.Omd-IZRd-4q90f9zuHgpgqggKeVlBwr9yGJNgjAupo8'
);

const recipes = [
  {
    name: "Nonna's Tomato Sauce",
    cuisine: "Italian",
    meal_type: "Sauces and Salsas",
    serves: 4,
    total_time: "1 hr",
    prep_time: "10 min",
    cook_time: "50 min",
    difficulty: "Easy",
    description: "The quintessential tomato sauce for any kind of pasta — a simplified version of a traditional Italian recipe. Slow cooking imparts a deep, rich flavor and a smooth, silky texture.",
    tags: ["Italian", "sauce", "pasta", "vegetarian", "tomato", "classic"],
    ingredients: [
      { amount: "4 Tbsp", item: "olive oil" },
      { amount: "2", item: "whole onions, chopped" },
      { amount: "2", item: "garlic cloves, minced" },
      { amount: "2 lb", item: "canned crushed tomatoes" },
      { amount: "1 Tbsp", item: "tomato paste (optional)" },
      { amount: "1 cup", item: "fresh basil leaves, torn or cut in strips" },
      { amount: "3 tsp", item: "sea salt" },
    ],
    instructions: [
      "Add olive oil to a wok and stir-fry the onions over medium heat until translucent, about 10 minutes. Add the minced garlic and tomato paste (if using) and cook for a few more minutes.",
      "Add the crushed tomatoes and bring to a boil. Cook partially covered over medium-low heat for about 50 minutes, stirring frequently.",
      "Season with salt, add the basil leaves, and cook for just a few more minutes so the basil imparts its aroma to the sauce. Taste and correct seasoning if needed.",
    ],
    prep_ahead: [
      "The sauce keeps refrigerated for up to 5 days, or frozen for up to 3 months.",
      "Chop onions and mince garlic up to a day ahead.",
    ],
    source: "Nonna Claudia",
  },
];

const { data, error } = await supabase.from('template_recipes').insert(recipes).select();

if (error) {
  console.error('Error:', error.message);
} else {
  console.log('Added:', data.map(r => r.name).join(', '));
}
