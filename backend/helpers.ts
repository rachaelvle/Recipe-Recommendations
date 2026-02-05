// Utility functions for recipe indexing and searching
// Simplified IDF-based ranking (no TF needed)

// types definitions
export interface Recipe {
  id: number;
  title: string;
  readyInMinutes: number;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  extendedIngredients: Ingredient[];

  // These are for frontend display purposes. 
  image?: string;
  imageType?: string;
  instructions?: string;
  summary?: string;
  servings?: number;
  sourceUrl?: string;
}

export interface Ingredient {
  id: number;
  name: string;
  amount?: number;
  unit?: string;
}

// IDF statistics (no TF needed)
export interface IDFStats {
  totalDocs: number;
  docFrequency: { [term: string]: number }; // How many docs contain each term
}

// Stop words to exclude from indexing
const STOP_WORDS = new Set([
  // Common articles and prepositions
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with',
  'at', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
  
  // Common modifiers/descriptors (from your list)
  'additional', 'topping', 'flat', 'leaf', 'curly', 'new', 'optional',
  
  // Common verbs
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

// string normalization and processing common words 
export function normalizeString(str: string | undefined): string {
  return (str || "").toLowerCase().trim();
}

// UNIFIED normalization for both ingredients and titles
// Returns the full normalized string (for matching like "chicken breast")
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

// For backward compatibility - both use the same normalization
export function normalizeIngredient(ingredientName: string): string {
  return normalizeText(ingredientName);
}

export function normalizeTitle(title: string): string {
  return normalizeText(title);
}

// break down cooking time and difficulties
export function bucketTime(minutes: number): string {
  if (minutes <= 15) return "0-15";
  if (minutes <= 30) return "16-30";
  if (minutes <= 60) return "31-60";
  return "60+";
}

export function computeDifficulty(recipe: Recipe): string {
  const numIngredients = recipe.extendedIngredients?.length || 0;
  const time = recipe.readyInMinutes || 0;
  if (numIngredients <= 7 && time <= 30) return "easy";
  if (numIngredients <= 12 && time <= 60) return "medium";
  return "hard";
}

// set operations for getting results 
export function toSet(arr: number[]): Set<number> {
  return new Set(arr);
}

// for AND
export function intersectSets(...sets: Set<number>[]): Set<number> {
  if (sets.length === 0) return new Set();
  if (sets.length === 1) return sets[0]!;
  return sets.reduce((acc, set) => {
    return new Set([...acc].filter(id => set.has(id)));
  });
}

// for OR
export function unionSets(...sets: Set<number>[]): Set<number> {
  const result = new Set<number>();
  sets.forEach(set => set.forEach(id => result.add(id)));
  return result;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function calculateIDF(term: string, stats: IDFStats): number {
  const docFreq = stats.docFrequency[term] || 0;
  
  // If term doesn't exist in corpus, return 0
  if (docFreq === 0) return 0;
  
  // Standard IDF formula with smoothing
  // log((N - df + 0.5) / (df + 0.5) + 1)
  const idf = Math.log((stats.totalDocs - docFreq + 0.5) / (docFreq + 0.5) + 1);
  
  return idf;
}

export function calculateIDFScore(
  queryTerms: string[],
  docId: number,
  termIndex: { [term: string]: number[] },
  stats: IDFStats
): number {
  let totalScore = 0;
  
  for (const term of queryTerms) {
    const recipeIds = termIndex[term];
    
    // Skip if term not in index or document doesn't contain term
    if (!recipeIds || !recipeIds.includes(docId)) continue;
    
    // Add IDF score for this term
    const idf = calculateIDF(term, stats);
    totalScore += idf;
  }
  
  return totalScore;
}

export function scoreIngredientMatch(
  recipe: Recipe,
  userIngredients: string[]
): number {
  if (!recipe.extendedIngredients || recipe.extendedIngredients.length === 0) {
    return 0;
  }
  
  const normalizedUserIngredients = new Set(
    userIngredients.map(ing => normalizeText(ing))
  );
  
  let matchCount = 0;
  
  for (const recipeIng of recipe.extendedIngredients) {
    const normalizedRecipeIng = normalizeText(recipeIng.name);
    
    // Check for exact match or partial match
    const matches = Array.from(normalizedUserIngredients).some(userIng => 
      normalizedRecipeIng.includes(userIng) || userIng.includes(normalizedRecipeIng)
    );
    
    if (matches) {
      matchCount++;
    }
  }
  
  // Score is the ratio of matched ingredients to total recipe ingredients
  // This prioritizes recipes that use MORE of what the user has
  return matchCount / recipe.extendedIngredients.length;
}
