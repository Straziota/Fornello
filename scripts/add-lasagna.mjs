// Run once: node scripts/add-lasagna.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://jqlvtbsuaodeyfglxkub.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbHZ0YnN1YW9kZXlmZ2x4a3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg5NTUxNCwiZXhwIjoyMDkyNDcxNTE0fQ.Omd-IZRd-4q90f9zuHgpgqggKeVlBwr9yGJNgjAupo8'
);

// Upload photo
const photoPath = "/Users/claudia/Desktop/Nonna's Kitchen/Recipes/Lasagna.png";
const photoBytes = readFileSync(photoPath);
const storagePath = 'nonnas-kitchen/lasagna-della-nonna-ingrid.png';

const { error: uploadError } = await supabase.storage
  .from('recipe-photos')
  .upload(storagePath, photoBytes, { contentType: 'image/png', upsert: true });

if (uploadError) {
  console.error('Photo upload failed:', uploadError.message);
  process.exit(1);
}

const { data: urlData } = supabase.storage.from('recipe-photos').getPublicUrl(storagePath);
const photo_url = urlData.publicUrl;
console.log('Photo uploaded:', photo_url);

// Insert recipe
const recipe = {
  name: "Lasagna della Nonna Ingrid",
  cuisine: "Italian",
  meal_type: "Pasta",
  serves: 6,
  total_time: "3 hrs 30 min",
  prep_time: "1 hr",
  cook_time: "2 hrs 30 min",
  difficulty: "Medium",
  photo_url,
  source: "Nonna Ingrid",
  description: "A proper Bolognese-style lasagna with rich meat ragù, silky béchamel, melted mozzarella, and Parmigiano Reggiano — the quintessential Italian comfort dish, passed down through generations.",
  background: "Every Italian family has its own version of this popular comforting dish — and this one is no exception. Even King Ferdinand II was said to like it so much that he earned the nickname 'the Lasagna King!'\n\nThe origins of lasagna go back to ancient Rome, where a dish called laganum consisted of a thin layer of wheat dough baked with a meat topping. Its evolution into a tomato-based dish developed much later in 19th-century Naples.\n\nIn the 20th century, the version known as lasagne Verdi alla bolognese was formalized by the Accademia Italiana della Cucina and registered in the Chamber of Commerce of Bologna. Neapolitan lasagna uses white pasta, meatballs, ricotta, Provola and Pecorino, while Bolognese lasagna uses green pasta, bolognese ragù, béchamel and Parmigiano Reggiano.\n\nAlthough my family comes from Puglia, my favorite version is the Bolognese one. I use oven-ready pasta for practicality, but homemade pasta instructions are included for special occasions.",
  tags: ["Italian", "pasta", "meat", "comfort food", "baked", "lasagna", "bolognese", "family"],
  ingredients: [
    { amount: "", item: "— Meat Sauce —" },
    { amount: "1/4 cup", item: "extra-virgin olive oil" },
    { amount: "1 large", item: "onion, chopped" },
    { amount: "2", item: "garlic cloves, peeled and finely chopped" },
    { amount: "1/4 cup", item: "bacon, finely chopped" },
    { amount: "1", item: "carrot, chopped" },
    { amount: "1 stick", item: "celery, chopped" },
    { amount: "500 g", item: "ground meat, half pork/veal and half beef" },
    { amount: "1 cup", item: "strong red wine" },
    { amount: "1200 g", item: "canned crushed tomatoes" },
    { amount: "1 tsp", item: "dried oregano" },
    { amount: "", item: "— Béchamel —" },
    { amount: "6 Tbsp", item: "butter (80 g)" },
    { amount: "6 Tbsp", item: "all-purpose flour (60 g)" },
    { amount: "3 cups", item: "whole milk" },
    { amount: "3 cups", item: "beef broth" },
    { amount: "1/2 cup", item: "Parmigiano Reggiano, grated" },
    { amount: "1/2 tsp", item: "nutmeg, preferably freshly grated" },
    { amount: "", item: "salt and pepper to taste" },
    { amount: "", item: "— Assembly —" },
    { amount: "255 g / 9 oz", item: "oven-ready lasagna sheets" },
    { amount: "700 g", item: "mozzarella" },
    { amount: "1 cup", item: "Parmigiano Reggiano, grated" },
    { amount: "3 Tbsp", item: "olive oil" },
    { amount: "", item: "fresh basil leaves, cut into strips" },
    { amount: "1 cup", item: "frozen peas (optional)" },
  ],
  instructions: [
    "PREPARE THE MEAT SAUCE: Cook onion, garlic, carrot, celery and chopped bacon in olive oil over medium heat until soft and translucent, about 15 minutes.",
    "Add ground meat and cook on medium-high heat for 5–10 minutes until slightly browned. Add wine and allow it to evaporate for about 3 minutes. Add 2 tsp salt.",
    "Add crushed tomatoes and stir well. Cook over medium-low heat, half covered, for 1 hour, stirring frequently.",
    "Add peas (optional) and oregano 10 minutes before the end. Correct seasoning and set aside.",
    "PREPARE THE BÉCHAMEL: Melt butter over medium heat, add flour and cook for about 5 minutes stirring constantly until lightly golden.",
    "Remove from heat and gradually whisk in milk and broth until slightly thickened.",
    "Return to heat and cook gently for about 10 minutes, stirring continuously until slightly thickened. If too thick, add more milk — the béchamel must be fairly loose.",
    "Add nutmeg, ½ cup Parmesan, salt and pepper. Set aside.",
    "ASSEMBLE: Preheat oven to 350°F (175°C). Spread 1 Tbsp olive oil on bottom and sides of a 30×20 cm lasagna pan.",
    "Spread a thin layer of béchamel on the bottom. Build layers in the following sequence: pasta sheets, meat sauce, béchamel, mozzarella and basil strips, Parmesan, and a drizzle of olive oil. Repeat until ingredients are used up.",
    "Finish with béchamel over the last pasta layer and a generous sprinkle of Parmesan.",
    "BAKE: Bake in the middle of the preheated oven for 40 minutes. Remove from oven and allow to rest for 10 minutes before serving. Serve with a good glass of Chianti. Buon appetito!",
  ],
  prep_ahead: [
    "The meat sauce can be made 1–2 days ahead and refrigerated, or frozen for up to 2 months.",
    "The béchamel can be made up to 2 days ahead and kept refrigerated.",
    "Assemble the lasagna the same day you plan to bake it.",
    "If making homemade pasta, strongly recommended to prepare the meat sauce and béchamel the day before.",
  ],
  nonna_wisdom: [
    "The béchamel: Cook the butter and flour roux for the full 5 minutes to develop a nutty flavor. Stir continuously with a wire whisk while slowly adding the milk-broth mixture to prevent lumps. The result should be smooth, generous, and loose enough to allow the pasta to cook through.",
    "The meat sauce: Make sure to properly brown the meat before adding wine and tomatoes — this step is what gives the ragù its depth of flavor.",
    "Timeline: Prepare the meat sauce and béchamel the day before; assemble and bake the day you serve. The meat sauce freezes beautifully.",
    "Fresh pasta ratio: For every 100 g flour and 1 egg you get 150–160 g pasta dough — the standard single-serving dose. The golden rule for boiling: 100 g pasta / 1 L water / 10 g salt.",
  ],
};

const { data, error } = await supabase.from('template_recipes').insert(recipe).select();

if (error) {
  console.error('Insert failed:', error.message);
} else {
  console.log('Added:', data.map(r => r.name).join(', '));
}
