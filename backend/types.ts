// definition for the structures used in the backend and 
// lists to take out stopwords and other modifiers

// recipe structure to store complete recipe information 
export interface Recipe {
  id: number;
  title: string;
  readyInMinutes: number;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  extendedIngredients: Ingredient[];

  // these are optional and mainly used for display on the frontend
  image?: string;
  imageType?: string;
  summary?: string;
  servings?: number;
  sourceUrl?: string;
}

// ingredient structure to store information about each ingredient in a recipe
export interface Ingredient {
  id: number;
  name: string;
  amount?: number;
  unit?: string;
}

// IDF statistics 
export interface IDFStats {
  totalDocs: number;
  docFrequency: { [term: string]: number }; // How many docs contain each term
}

// object to store the filters input from the frontend
export interface Filters {
  cuisines?: string[];
  diets?: string[];
  mealTypes?: string[];
  timeBuckets?: string[];
  difficulties?: string[];
}

// input for all the search
export interface SearchParams {
  searchQuery?: string;
  filters?: Filters;
  userIngredients?: string[];  
}

// Type definitions
export interface User {
  id: number;
  username: string;
}

export interface UserPreferences {
  userId: number;
  // Preference categories
  defaultCuisines?: string[];      // e.g., ['italian', 'mexican']
  defaultDiets?: string[];          // e.g., ['vegetarian']
  defaultMealTypes?: string[];      // e.g., ['dinner', 'lunch']
  defaultTimeBuckets?: string[];    // e.g., ['0-15', '15-30']
  defaultDifficulties?: string[];   // e.g., ['easy']
}

export interface UserAllergy {
  userId: number;
  allergen: string;  // e.g., 'peanuts', 'shellfish', 'dairy'
}

export interface UserIngredient {
  userId: number;
  ingredient: string;  // e.g., 'tomato', 'chicken', 'rice'
}
