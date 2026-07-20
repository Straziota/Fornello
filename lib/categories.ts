// Canonical grocery / pantry-staple categories — shared by the grocery list and
// the Pantry Staples settings so the two never drift apart.

export const BUILTIN_CATEGORIES = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bread & Bakery',
  'Frozen',
  'Cereals',
  'Canned & Dry Goods',
  'Spices & Condiments',
  'Beverages',
  'Snacks',
  'Household',
  'Other',
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  'Produce': '/icons/Produce.png',
  'Meat & Seafood': '/icons/Meats.png',
  'Dairy & Eggs': '/icons/Eggs.png',
  'Canned & Dry Goods': '/icons/Canned and Dry Goods.png',
  'Spices & Condiments': '/icons/Spices and Condiments.png',
  'Bread & Bakery': '/icons/Bread and Bakery.png',
  'Frozen': '/icons/Frozen.png',
  'Cereals': '/icons/Cereals.png',
  'Beverages': '/icons/Beverages.png',
  'Snacks': '/icons/Snacks.png',
  'Household': '/icons/Household.png',
  'Other': '/icons/Other.png',
};

// Every user-created ("personalized") category shares this one icon.
export const CUSTOM_CATEGORY_ICON = '/icons/Custom.png';

export function isBuiltinCategory(cat: string): boolean {
  return (BUILTIN_CATEGORIES as readonly string[]).includes(cat);
}

export function categoryIcon(cat: string): string {
  return CATEGORY_ICONS[cat] || CUSTOM_CATEGORY_ICON;
}

// Heuristic categorization for free-text pantry staples. Most-specific patterns first;
// first match wins. Anything unmatched falls into Other. Used as the DEFAULT category —
// a user's explicit override always takes precedence over this.
export function categorizeStaple(name: string): string {
  const n = name.toLowerCase();
  const patterns: [string, RegExp][] = [
    // Non-food household goods first — distinctive, never food.
    ['Household',          /\b(paper towels?|toilet(te)? paper|napkins?|tissues?|tissue box(es)?|dishwasher|dish soap|dish detergent|laundry|detergent|trash bags?|garbage bags?|bin bags?|paper plates?|paper cups?|alumin(i|)um foil|tin foil|plastic wrap|cling (film|wrap)|saran|ziploc|sandwich bags?|sponges?|cleaner|bleach|disinfectant|fabric softener|dryer sheets?|hand soap|toilet bowl)\b/i],
    ['Frozen',             /\b(frozen|ice cream|sorbet|gelato|popsicle|french fries|fries|tater tots)\b/i],
    ['Cereals',            /\b(cereals?|special k|cheerios|corn ?flakes|frosted flakes|raisin bran|rice krispies|wheaties|shredded wheat|mu(e|)sli|granola(?! bars?)|bran flakes|weetabix)\b/i],
    ['Beverages',          /\b(juices?|lemonades?|sodas?|colas?|seltzers?|tonic water|sparkling water|kombucha|iced tea|sports drinks?|energy drinks?|smoothies?)\b/i],
    ['Snacks',             /\b(madel[ae]ines?|chocolates?|cand(y|ies)|chips|crisps|pretzels?|popcorn|granola bars?|snack bars?|trail mix|dried (mango|fruit|apricots?|cranberr(y|ies)|pineapple)|dry mango|fruit snacks?|gumm(y|ies)|biscotti|wafers?|cookies?|crackers?|ritz|blueberry almonds?|snacks?)\b/i],
    ['Canned & Dry Goods', /\b(broth|stock|bouillon|consommé|consomme|olives?|(canned|peeled|crushed|stewed|diced) tomato(es)?)\b/i],
    ['Meat & Seafood',     /\b(chicken|beef|pork|lamb|turkey|bacon|ham|sausage|fish|salmon|tuna|shrimp|prawn|cod|crab|lobster|veal|duck|anchovy|sardine|deli meat|deli|cold cuts?|lunch ?meat|prosciutto|salami|pepperoni)\b/i],
    ['Dairy & Eggs',       /\b(milk|butter|cream cheese|cream|cheese|yogurt|yoghurt|eggs?|sour cream|crème|kefir|ricotta|mozzarella|parmesan|feta|gouda|cheddar|brie)\b/i],
    ['Bread & Bakery',     /\b(bread|bagel|tortilla|wrap|pita|naan|cake|muffin|baguette|brioche|focaccia|sourdough|croissant)(e?s)?\b/i],
    ['Spices & Condiments',/\b(salt|pepper|spice|paprika|cumin|cinnamon|nutmeg|oregano|thyme|rosemary|bay leaf|mustard|ketchup|mayo|mayonnaise|sriracha|soy sauce|hot sauce|honey|maple syrup|vanilla|baking powder|baking soda|yeast|saffron|turmeric|cayenne|garam masala|miso|tahini|harissa|chili powder|chile powder|herbs?|basil|parsley|cilantro|mint|coriander)\b/i],
    ['Produce',            /\b(tomato|onion|garlic|lemon|lime|potato|carrot|celery|cucumber|lettuce|spinach|kale|broccoli|cabbage|apple|banana|berr(y|ies)|ginger|avocado|mushroom|chili|chile|fruit|vegetable|shallot|leek|scallion|radish|beet|squash|zucchini|eggplant|orange|peach|pear)(e?s)?\b/i],
    ['Canned & Dry Goods', /\b(pasta|rice|flour|sugar|oil|vinegar|sauce|beans?|lentils?|chickpeas?|broth|stock|noodle|oats?|cereal|paste|coconut milk|quinoa|couscous|farro|barley|breadcrumb|nuts?|almond|walnut|pecan|peanut|cashew|seeds?)(e?s)?\b/i],
  ];
  for (const [cat, re] of patterns) if (re.test(n)) return cat;
  return 'Other';
}

// The category to show/use for a staple: explicit override wins, else heuristic.
export function stapleCategory(name: string, overrides?: Record<string, string>): string {
  return (overrides && overrides[name]) || categorizeStaple(name);
}
