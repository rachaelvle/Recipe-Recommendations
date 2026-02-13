import type { Recipe } from "./types.ts";

// This code was generated with the assistance of AI. 
// includes helper functions for normalizing text and ranking

// Stop words to exclude from indexing
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with',
  'at', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
  'additional', 'topping', 'flat', 'leaf', 'curly', 'new', 'optional',
  'can', 'use', 'following',
]);

// Cooking modifiers to remove from all text
const COOKING_MODIFIERS = [
  'fresh', 'freshly', 'dried', 'frozen', 'canned', 
  'chopped', 'chop', 'diced', 'dice', 'minced', 'mince',
  'sliced', 'slice', 'ground', 'grated', 'grate', 'shredded', 'shred',
  'crushed', 'crush', 'whole', 'halved', 'halve', 'quartered', 'quarter',
  'cooked', 'cook', 'raw', 'uncooked', 'blanched', 'blanch',
  'roasted', 'roast', 'toasted', 'toast', 'baked', 'bake',
  'grilled', 'grill', 'fried', 'fry', 'sauteed', 'saute',
  'steamed', 'steam', 'boiled', 'boil', 'simmered', 'simmer',
  'unsalted', 'salted', 'salt', 'sweetened', 'sweet', 'unsweetened',
  'organic', 'free-range', 'grass-fed', 'wild-caught',
  'extra virgin', 'extra-virgin', 'virgin', 'light', 'dark', 'heavy',
  'low-fat', 'lowfat', 'fat-free', 'fatfree', 'reduced-fat', 'full-fat',
  'boneless', 'skinless', 'seedless', 'pitted',
  'large', 'small', 'medium', 'baby', 'young', 'mature',
  'ripe', 'firm', 'soft', 'tender', 'tough',
  'thick', 'thin', 'fine', 'finely', 'coarse', 'coarsely',
  'rough', 'roughly', 'smooth', 'smoothly'
];

export function normalizeString(str: string | undefined): string {
  return (str || "").toLowerCase().trim();
}

// normalize text by lowercase, trimming, removing stop words, 
// handling plural, special characters
export function normalizeText(text: string): string {
  let normalized = normalizeString(text);
  
  // Remove cooking modifiers
  for (const modifier of COOKING_MODIFIERS) {
    const pattern = new RegExp(`\\b${modifier}\\b`, 'gi');
    normalized = normalized.replace(pattern, '');
  }

  // plural handling
  normalized = normalized
    .replace(/\b(\w+)ies\b/g, '$1y')     
    .replace(/\b(\w+)oes\b/g, '$1o')    
    .replace(/\b(\w+[^s])s\b/g, '$1');   

  // Remove special characters and punctuation (-, ', *, etc.)
  normalized = normalized.replace(/[-'*]/g, ' ');
  
  // Remove numbers
  normalized = normalized.replace(/\b\d+\b/g, '');
  
  // Remove stop words
  const words = normalized.split(/\s+/).filter(word => {
    // Remove empty strings
    if (!word) return false;
    
    // Remove stop words
    if (STOP_WORDS.has(word)) return false;
    
    // Remove very short words (single letters)
    if (word.length < 2) return false;
    
    return true;
  });
  
  return words.join(' ').trim();
}

// break down cooking time and difficulties
export function bucketTime(minutes: number): string {
  if (minutes <= 15) return "0-15";
  if (minutes <= 30) return "16-30";
  if (minutes <= 60) return "31-60";
  return "60+";
}

export function computeDifficulty(recipe: Recipe): string {
  // First check if the title contains difficulty indicators
  const titleLower = recipe.title.toLowerCase();
  
  // look for the indicators of difficulty in the title
  if (titleLower.includes('easy') || 
      titleLower.includes('simple') || 
      titleLower.includes('quick')) {
    return "easy";
  }
  
  if (titleLower.includes('hard') || 
      titleLower.includes('difficult') || 
      titleLower.includes('complex') || 
      titleLower.includes('advanced')) {
    return "hard";
  }
  
  if (titleLower.includes('medium') || 
      titleLower.includes('intermediate')) {
    return "medium";
  }
  
  // If no difficulty in title, grade them using ingredients and time
  const numIngredients = recipe.extendedIngredients?.length || 0;
  const time = recipe.readyInMinutes || 0;
  if (numIngredients <= 7 && time <= 30) return "easy";
  if (numIngredients <= 12 && time <= 60) return "medium";
  return "hard";
}

// for API requests
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function normalizeDiet(diet: string): string {
  const lower = diet.toLowerCase();
  if (lower === "lacto ovo vegetarian" || lower === "vegetarian") {
    return "vegetarian"; // group both under "vegetarian"
  }
  return lower;
}