export interface Ingredient {
  amount: string;
  item: string;
}

export interface GroceryItem {
  item: string;
  amount: string;
  meals: string[];
}

export interface Side {
  name: string;
  ingredients: Ingredient[];
  instructions?: string[];
}

export interface Meal {
  day: string;
  name: string;
  cuisine: string;
  source_site: string;
  serves: number;
  total_time: string;
  prep_time: string;
  cook_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  tags: string[];
  ingredients?: Ingredient[];
  instructions?: string[];
  prep_ahead?: string[];
  recipeLoaded?: boolean;
  isLeftover?: boolean;
  leftoverFrom?: string[];
  imageKeyword?: string;
  source_url?: string;
  photo_url?: string;
  sides?: Side[];
  cooking_notes?: string;
  technique?: string;   // cooking technique required for this day (e.g. 'Slow Cooker')
}

export interface GroceryList {
  'Produce': GroceryItem[];
  'Meat & Seafood': GroceryItem[];
  'Dairy & Eggs': GroceryItem[];
  'Canned & Dry Goods': GroceryItem[];
  'Spices & Condiments': GroceryItem[];
  'Bread & Bakery': GroceryItem[];
  'Frozen': GroceryItem[];
  'Other': GroceryItem[];
  [key: string]: GroceryItem[];
}

export interface WeeklyMenu {
  id?: number;
  week_start: string;
  created_at?: string;
  meals: Meal[];
  grocery_list: GroceryList;
  next_week_picks?: string[];
}

export interface DaySchedule {
  enabled: boolean;
  minutes: number;
  mealType?: string;
  leftoverIdeas?: boolean;
  technique?: string;      // e.g. 'slow cooker', 'air fryer', 'grill'
}

export type WeekSchedule = Record<string, DaySchedule>;

export type PrepScheduleType = 'daily' | 'batch' | 'custom';

export interface PrepSchedule {
  type: PrepScheduleType;
  batchDay?: string;
  customDays?: string[];
}

export interface Settings {
  familySize: number;
  cookingTechniques?: string[];
  preferredSides?: string[];
  avoidedSides?: string[];
  skipIngredients?: string[];
  websites: string[];
  preferences: string[];
  restrictions: string[];
  schedule: WeekSchedule;
  randomizeMealTypes: boolean;
  randomizePool: string[];
  prepSchedule: PrepSchedule;
  prioritizeMyRecipes: boolean;
  weekStartDay?: number;
  language?: string;
  vacations?: { start: string; end: string; note?: string }[];
  staples?: string[];
  stapleCategories?: Record<string, string>;
}

export interface RecipeVariant {
  method: string;           // "Oven", "Slow cooker", "Air fryer", etc.
  emoji?: string;           // optional small icon shown on the tab
  instructions: string[];
  total_time?: string;
  prep_time?: string;
  cook_time?: string;
}

export interface UserRecipe {
  id?: number;
  name: string;
  cuisine: string;
  mealType: string;       // meat, seafood, pasta, vegetarian, etc.
  serves: number;
  total_time: string;
  prep_time: string;
  cook_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  tags: string[];
  ingredients: Ingredient[];
  instructions: string[];
  prep_ahead: string[];
  source: string;
  photo_url?: string;
  background?: string;
  nonna_wisdom?: string[];
  variants?: RecipeVariant[];
  createdAt?: string;
}

export interface PantryItem {
  id?: number;
  name: string;
  quantity?: string;
  addedAt?: string;
}

export type FeedbackRating = 'liked' | 'liked_adjusted' | 'disliked';

export interface MealFeedback {
  id?: number;
  mealName: string;
  rating: FeedbackRating;
  adjustments: string;
  createdAt?: string;
}

export interface SubstituteResult {
  isEssential: boolean;
  essentialReason?: string;
  substitutes?: string[];
  adjustedInstructions?: string;
}

// ── Family Kitchens: user-created dedicated profiles ───────────────────────

export type ProfileVisibility = 'private' | 'public';

export interface HeritageProfile {
  id: string;
  owner_id: string;
  slug: string;
  person_name: string;
  relationship?: string | null;
  origin_country?: string | null;
  portrait_url?: string | null;
  bio?: string | null;
  visibility: ProfileVisibility;
  created_at?: string;
  updated_at?: string;
  recipe_count?: number; // hydrated for list/gallery views
}

export type TranscriptionStatus = 'none' | 'pending' | 'done' | 'failed';

export interface HeritageProfileRecipe {
  id: string;
  profile_id: string;
  owner_id: string;
  name: string;
  cuisine?: string | null;
  meal_type?: string | null;
  serves?: number | null;
  total_time?: string | null;
  prep_time?: string | null;
  cook_time?: string | null;
  difficulty?: string | null;
  description?: string | null;
  tags: string[];
  ingredients: Ingredient[];
  instructions: string[];
  prep_ahead: string[];
  nonna_wisdom: string[];
  original_scan_url?: string | null;
  photo_url?: string | null;
  transcription_status: TranscriptionStatus;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

// The subset a client posts when creating/updating a profile recipe.
export interface HeritageProfileRecipeInput {
  name: string;
  cuisine?: string;
  meal_type?: string;
  serves?: number;
  total_time?: string;
  prep_time?: string;
  cook_time?: string;
  difficulty?: string;
  description?: string;
  tags?: string[];
  ingredients?: Ingredient[];
  instructions?: string[];
  prep_ahead?: string[];
  nonna_wisdom?: string[];
  original_scan_url?: string;
  photo_url?: string;
  transcription_status?: TranscriptionStatus;
}
