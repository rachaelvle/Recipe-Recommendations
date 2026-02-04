// This code was generated with the assistance of AI. It serves as a base for 
// recipe searching with IDF-based relevance ranking.
// searcher.ts
import fs from "fs";
import {
  bucketTime,
  calculateIDFScore,
  intersectSets,
  normalizeIngredient,
  normalizeString,
  scoreIngredientMatch,
  toSet,
  unionSets,
  type IDFStats
} from "./helpers.ts";

interface Filters {
  cuisines?: string[];
  diets?: string[];
  mealTypes?: string[];
  timeBuckets?: string[];
  difficulties?: string[];
}

interface SearchParams {
  searchQuery?: string;
  filters?: Filters;
  ingredientLogic?: 'AND' | 'OR';
  userIngredients?: string[];  // List of ingredients the user has
  onlyUserIngredients?: boolean;  // Checkbox: only show recipes with user's ingredients
}

// load all of our indexes when the program starts 
class RecipeSearchEngine {
  private recipes: any[];
  private indexes: {
    ingredient: any;  
    cuisine: any;
    diet: any;
    mealType: any;
    timeBucket: any;
    difficulty: any;
    title: any; 
  };
  private idfStats: IDFStats;

  constructor() {    
    console.log("🔄 Loading recipe data...");
    try {
      this.recipes = JSON.parse(fs.readFileSync("recipes.json", "utf-8"));
      this.indexes = {
        ingredient: JSON.parse(fs.readFileSync("indexes/ingredientIndex.json", "utf-8")),
        cuisine: JSON.parse(fs.readFileSync("indexes/cuisineIndex.json", "utf-8")),
        diet: JSON.parse(fs.readFileSync("indexes/dietIndex.json", "utf-8")),
        mealType: JSON.parse(fs.readFileSync("indexes/mealTypeIndex.json", "utf-8")),
        timeBucket: JSON.parse(fs.readFileSync("indexes/timeBucketIndex.json", "utf-8")),
        difficulty: JSON.parse(fs.readFileSync("indexes/difficultyIndex.json", "utf-8")),
        title: JSON.parse(fs.readFileSync("indexes/titleIndex.json", "utf-8"))
      };
      this.idfStats = JSON.parse(fs.readFileSync("indexes/idfStats.json", "utf-8"));
      console.log(`Loaded ${this.recipes.length} recipes`);
      console.log(`IDF stats: ${Object.keys(this.idfStats.docFrequency).length} unique terms, ${this.idfStats.totalDocs} documents`);
    } catch (error) {
      console.error("Error loading data:", error);
      throw error;
    }
  }

  // breaking down the search query into ingredients, title keywords, and implicit filters
  private parseSearchQuery(query: string): {
    ingredients: string[];
    titleKeywords: string[];
    implicitFilters: Partial<Filters>;
  } {
    const normalized = query.toLowerCase().trim();

    // will need to adjust these patterns based on the indexes
    const patterns = {
      cuisine: /\b(italian|mexican|chinese|indian|french|thai|japanese|greek|american|mediterranean|korean|spanish|vietnamese)\b/g,
      diet: /\b(vegetarian|vegan|gluten free|dairy free|paleo|keto|pescatarian)\b/g,
      mealType: /\b(breakfast|lunch|dinner|dessert|snack|appetizer|side dish|main course|brunch)\b/g,
      difficulty: /\b(easy|medium|hard|simple|quick|difficult)\b/,
      time: /\b(quick|fast|under (\d+) min(?:ute)?s?|in (\d+) min(?:ute)?s?)\b/
    };

    const implicitFilters: Partial<Filters> = {};

    // from the queries, if it can be mapped to a filter, extract it and put it in array
    // Extract cuisines
    const cuisines = Array.from(normalized.matchAll(patterns.cuisine) || []).map(m => m[0]);
    if (cuisines.length > 0) {
      implicitFilters.cuisines = cuisines;
    }

    // Extract diets
    const diets = Array.from(normalized.matchAll(patterns.diet) || []).map(m => m[0].replace(/\s+/g, ' '));
    if (diets.length > 0) {
      implicitFilters.diets = diets;
    }

    // Extract meal types
    const mealTypes = Array.from(normalized.matchAll(patterns.mealType) || []).map(m => m[0]);
    if (mealTypes.length > 0) {
      implicitFilters.mealTypes = mealTypes;
    }

    // Extract difficulty
    const diffMatch = normalized.match(patterns.difficulty);
    if (diffMatch) {
      const word = diffMatch[0];
      let difficulty = word;
      if (word === 'simple' || word === 'quick') difficulty = 'easy';
      if (word === 'difficult') difficulty = 'hard';
      implicitFilters.difficulties = [difficulty];
    }

    // Extract time constraints
    const timeMatch = normalized.match(patterns.time);
    if (timeMatch) {
      let bucket: string | null = null;
      if (timeMatch[0].includes('quick') || timeMatch[0].includes('fast')) {
        bucket = '0-15';
      } else if (timeMatch[1] || timeMatch[2]) {
        const minutes = parseInt(timeMatch[1] || timeMatch[2] || '0');
        bucket = bucketTime(minutes);
      }
      if (bucket) {
        implicitFilters.timeBuckets = [bucket];
      }
    }

    // Extract ingredients/keywords
    const wordsToRemove = new Set([
      'with', 'and', 'or', 'recipe', 'recipes', 'for', 'make', 'cooking', 'the', 'a', 'an',
      'easy', 'medium', 'hard', 'quick', 'fast', 'slow', 'simple', 'under', 'in', 'minutes',
      ...cuisines,
      ...diets.map(d => d.split(' ')).flat(),
      ...mealTypes.map(m => m.split(' ')).flat()
    ]);

    const words = normalized
      .split(/\s+/)
      .filter(w => w.length > 2 && !wordsToRemove.has(w) && !/^\d+$/.test(w));

    return {
      ingredients: words,
      titleKeywords: words,
      implicitFilters
    };
  }

  // ---------- CHECK IF RECIPE USES ONLY USER'S INGREDIENTS ----------
  private recipeUsesOnlyUserIngredients(recipe: any, userIngredients: string[]): boolean {
    if (!recipe.extendedIngredients || recipe.extendedIngredients.length === 0) {
      return false;
    }

    // Normalize user's ingredients
    const normalizedUserIngredients = new Set(
      userIngredients.map(ing => normalizeIngredient(ing))
    );

    // Check if ALL recipe ingredients are in user's list
    return recipe.extendedIngredients.every((recipeIng: any) => {
      const normalizedRecipeIng = normalizeIngredient(recipeIng.name);
      
      // Check for exact match or partial match
      return Array.from(normalizedUserIngredients).some(userIng => 
        normalizedRecipeIng.includes(userIng) || userIng.includes(normalizedRecipeIng)
      );
    });
  }

  // ---------- HELPER TO GET RECIPE IDS FROM INDEX ----------
  private getRecipeIdsFromIndex(terms: string[], index: any, normalizer: (s: string) => string): Set<number> {
    const sets = terms
      .map(term => normalizer(term))
      .map(normalized => index[normalized])
      .filter(recipeIds => recipeIds !== undefined)
      .map(recipeIds => new Set(recipeIds));
    
    return sets.length > 0 ? unionSets(...sets) : new Set();
  }

  // ---------- IDF RANKING ----------
  private rankResultsByIDF(
    results: any[],
    params: SearchParams
  ): any[] {
    const scores = new Map<number, number>();
    
    // Initialize all scores to 0
    results.forEach(r => scores.set(r.id, 0));

    // Score based on search query (title + ingredients)
    if (params.searchQuery && params.searchQuery.trim()) {
      const parsed = this.parseSearchQuery(params.searchQuery);
      
      // Score title matches (2x weight)
      const titleKeywords = parsed.titleKeywords.map(kw => normalizeString(kw));
      results.forEach(recipe => {
        const titleScore = calculateIDFScore(
          titleKeywords,
          recipe.id,
          this.indexes.title,
          this.idfStats
        );
        
        const currentScore = scores.get(recipe.id) || 0;
        scores.set(recipe.id, currentScore + titleScore * 2);  // 2x boost for title
      });

      // Score ingredient matches (1.5x weight)
      const ingredientTerms = parsed.ingredients.map(ing => normalizeIngredient(ing));
      results.forEach(recipe => {
        const ingredientScore = calculateIDFScore(
          ingredientTerms,
          recipe.id,
          this.indexes.ingredient,
          this.idfStats
        );

        const currentScore = scores.get(recipe.id) || 0;
        scores.set(recipe.id, currentScore + ingredientScore * 1.5);  // 1.5x boost for ingredients
      });
    }

    // Score based on user's ingredients (how many they can use)
    if (params.userIngredients && params.userIngredients.length > 0) {
      results.forEach(recipe => {
        const matchScore = scoreIngredientMatch(recipe, params.userIngredients!);
        const currentScore = scores.get(recipe.id) || 0;
        // Weight ingredient match heavily (multiplied by 10 to make it significant)
        scores.set(recipe.id, currentScore + matchScore * 10);
      });
    }

    // Sort by score descending
    return results.sort((a, b) => {
      const scoreA = scores.get(a.id) || 0;
      const scoreB = scores.get(b.id) || 0;
      return scoreB - scoreA;
    });
  }

  // ---------- MAIN SEARCH METHOD ----------
  search(params: SearchParams): any[] {
    const sets: Set<number>[] = [];

    // Parse search query if provided
    let searchIngredients: string[] = [];
    let searchTitleKeywords: string[] = [];
    let implicitFilters: Partial<Filters> = {};

    if (params.searchQuery && params.searchQuery.trim()) {
      const parsed = this.parseSearchQuery(params.searchQuery);
      searchIngredients = parsed.ingredients;
      searchTitleKeywords = parsed.titleKeywords;
      implicitFilters = parsed.implicitFilters;
    }

    // Merge implicit filters from search with explicit filters
    // Explicit filters take precedence
    const mergedFilters: Filters = {
      cuisines: params.filters?.cuisines || implicitFilters.cuisines,
      diets: params.filters?.diets || implicitFilters.diets,
      mealTypes: params.filters?.mealTypes || implicitFilters.mealTypes,
      timeBuckets: params.filters?.timeBuckets || implicitFilters.timeBuckets,
      difficulties: params.filters?.difficulties || implicitFilters.difficulties
    };

    // Handle search ingredients (from query)
    if (searchIngredients.length > 0) {
      const ingredientIds = this.getRecipeIdsFromIndex(
        searchIngredients,
        this.indexes.ingredient,
        normalizeIngredient
      );
      if (ingredientIds.size > 0) {
        sets.push(ingredientIds);
      }
    }

    // Handle title keywords from search query (OR logic)
    if (searchTitleKeywords.length > 0) {
      const titleIds = this.getRecipeIdsFromIndex(
        searchTitleKeywords,
        this.indexes.title,
        normalizeString
      );
      if (titleIds.size > 0) {
        sets.push(titleIds);
      }
    }

    // Handle user's ingredients (what they have at home)
    if (params.userIngredients && params.userIngredients.length > 0 && !params.onlyUserIngredients) {
      const userIngredientIds = this.getRecipeIdsFromIndex(
        params.userIngredients,
        this.indexes.ingredient,
        normalizeIngredient
      );
      if (userIngredientIds.size > 0) {
        sets.push(userIngredientIds);
      }
    }

    // Cuisines (OR within category)
    if (mergedFilters.cuisines && mergedFilters.cuisines.length > 0) {
      const cuisineSets = mergedFilters.cuisines
        .map(c => this.indexes.cuisine[c.toLowerCase()])
        .filter(arr => arr !== undefined)
        .map(arr => toSet(arr));
      if (cuisineSets.length > 0) {
        sets.push(unionSets(...cuisineSets));
      }
    }

    // Diets (OR within category)
    if (mergedFilters.diets && mergedFilters.diets.length > 0) {
      const dietSets = mergedFilters.diets
        .map(d => this.indexes.diet[d.toLowerCase()])
        .filter(arr => arr !== undefined)
        .map(arr => toSet(arr));
      if (dietSets.length > 0) {
        sets.push(unionSets(...dietSets));
      }
    }

    // Meal Types (OR within category)
    if (mergedFilters.mealTypes && mergedFilters.mealTypes.length > 0) {
      const mealSets = mergedFilters.mealTypes
        .map(m => this.indexes.mealType[m.toLowerCase()])
        .filter(arr => arr !== undefined)
        .map(arr => toSet(arr));
      if (mealSets.length > 0) {
        sets.push(unionSets(...mealSets));
      }
    }

    // Time Buckets (OR within category)
    if (mergedFilters.timeBuckets && mergedFilters.timeBuckets.length > 0) {
      const timeSets = mergedFilters.timeBuckets
        .map(t => this.indexes.timeBucket[t])
        .filter(arr => arr !== undefined)
        .map(arr => toSet(arr));
      if (timeSets.length > 0) {
        sets.push(unionSets(...timeSets));
      }
    }

    // Difficulties (OR within category)
    if (mergedFilters.difficulties && mergedFilters.difficulties.length > 0) {
      const diffSets = mergedFilters.difficulties
        .map(d => this.indexes.difficulty[d.toLowerCase()])
        .filter(arr => arr !== undefined)
        .map(arr => toSet(arr));
      if (diffSets.length > 0) {
        sets.push(unionSets(...diffSets));
      }
    }

    // Get initial results (boolean filtering)
    let results: any[];
    
    if (sets.length === 0) {
      // No criteria, return all recipes
      results = this.recipes;
    } else {
      // Intersect all sets (AND between different categories)
      const resultIds = intersectSets(...sets);
      results = this.recipes.filter((r: any) => resultIds.has(r.id));
    }

    // Apply "only user ingredients" filter if checkbox is checked
    if (params.onlyUserIngredients && params.userIngredients && params.userIngredients.length > 0) {
      results = results.filter(recipe => 
        this.recipeUsesOnlyUserIngredients(recipe, params.userIngredients!)
      );
    }

    // Rank results by IDF relevance if we have ranking criteria
    const shouldRank = params.searchQuery || params.userIngredients;
    if (shouldRank && results.length > 1) {
      results = this.rankResultsByIDF(results, params);
    }

    return results;
  }

  // ---------- GET FILTER OPTIONS ----------
  getFilterOptions() {
    const ingredientsList = Object.keys(this.indexes.ingredient).sort();
    
    return {
      cuisines: Object.keys(this.indexes.cuisine).sort(),
      diets: Object.keys(this.indexes.diet).sort(),
      mealTypes: Object.keys(this.indexes.mealType).sort(),
      timeBuckets: ['0-15', '16-30', '31-60', '60+'],
      difficulties: ['easy', 'medium', 'hard'],
      ingredients: ingredientsList
    };
  }

  // ---------- GET STATS ----------
  getStats() {
    return {
      totalRecipes: this.recipes.length,
      totalIngredients: Object.keys(this.indexes.ingredient).length,
      totalCuisines: Object.keys(this.indexes.cuisine).length,
      totalDiets: Object.keys(this.indexes.diet).length,
      totalMealTypes: Object.keys(this.indexes.mealType).length,
      idfStats: {
        uniqueTerms: Object.keys(this.idfStats.docFrequency).length,
        totalDocs: this.idfStats.totalDocs
      }
    };
  }
}

// ---------- INITIALIZE SEARCH ENGINE (loaded once) ----------
const searchEngine = new RecipeSearchEngine();

// ---------- DISPLAY HELPERS ----------
// can remove this section once we have the UI set up
function displayResults(results: any[], limit = 10) {
  console.log(`\n📊 Found ${results.length} recipes\n`);
  
  if (results.length === 0) {
    console.log("No recipes match your criteria. Try different filters or search terms.\n");
    return;
  }

  results.slice(0, limit).forEach((recipe, idx) => {
    console.log(`${idx + 1}. ${recipe.title}`);
    console.log(`   ⏱️  ${recipe.readyInMinutes} minutes`);
    console.log(`   🍽️  ${recipe.cuisines.join(', ') || 'N/A'}`);
    console.log(`   🥗 ${recipe.diets.join(', ') || 'N/A'}`);
    console.log(`   📋 ${recipe.dishTypes.join(', ') || 'N/A'}`);
    
    // Show ingredients
    const ingredients = recipe.extendedIngredients
      ?.slice(0, 5)
      .map((ing: any) => ing.name)
      .join(', ') || 'N/A';
    console.log(`   🥘 Ingredients: ${ingredients}${recipe.extendedIngredients?.length > 5 ? '...' : ''}`);
    console.log(`   🔗 ${recipe.sourceUrl || 'N/A'}`);
    console.log('');
  });

  if (results.length > limit) {
    console.log(`... and ${results.length - limit} more recipes\n`);
  }
}

function displayFilterOptions() {
  const options = searchEngine.getFilterOptions();
  console.log("\n📋 Available Filter Options:\n");
  console.log("Cuisines:", options.cuisines.join(', '));
  console.log("Diets:", options.diets.join(', '));
  console.log("Meal Types:", options.mealTypes.join(', '));
  console.log("Time Buckets:", options.timeBuckets.join(', '));
  console.log("Difficulties:", options.difficulties.join(', '));
  console.log(`Ingredients: ${options.ingredients.length} total (showing first 20)`);
  console.log("  ", options.ingredients.slice(0, 20).join(', '), '...');
  console.log('');
}

function displayStats() {
  const stats = searchEngine.getStats();
  console.log("\n📈 Database Statistics:\n");
  console.log(`Total Recipes: ${stats.totalRecipes}`);
  console.log(`Total Ingredients: ${stats.totalIngredients}`);
  console.log(`Total Cuisines: ${stats.totalCuisines}`);
  console.log(`Total Diets: ${stats.totalDiets}`);
  console.log(`Total Meal Types: ${stats.totalMealTypes}`);
  console.log(`IDF Unique Terms: ${stats.idfStats.uniqueTerms}`);
  console.log('');
}

// ---------- COMMAND LINE INTERFACE ----------
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🍳 Recipe Search CLI (with IDF Ranking)

USAGE:
  node searcher.js [options]

OPTIONS:
  --search "query"              Free-text search query (ranked by IDF relevance)
  --my-ingredients "chicken,tomato,garlic"  Ingredients you have at home
  --only-my-ingredients         Checkbox: only show recipes using your ingredients
  --cuisines "italian,mexican"  Filter by cuisines (comma-separated)
  --diets "vegetarian,vegan"    Filter by diets (comma-separated)
  --meal "dinner,lunch"         Filter by meal types (comma-separated)
  --time "0-15,16-30"          Filter by time buckets (comma-separated)
  --difficulty "easy,medium"    Filter by difficulty (comma-separated)
  --ingredient-logic "AND|OR"   How to combine search ingredients (default: OR)
  --limit N                     Max results to display (default: 10)
  --options                     Show available filter options
  --stats                       Show database statistics
  --help, -h                    Show this help message

RANKING WEIGHTS:
  - Title matches: 2x weight (most important)
  - Ingredient matches: 1.5x weight
  - User ingredient match: 10x weight (recipes you can make)
  - Rare terms score higher than common terms (IDF)

EXAMPLES:
  # Search with IDF ranking - best matches first!
  npx ts-node searcher.ts --search "creamy pasta chicken"
  
  # Show recipes that use ANY of your ingredients (ranked by how many)
  npx ts-node searcher.ts --my-ingredients "chicken,tomato,garlic"
  
  # Show ONLY recipes you can make with your ingredients (strict mode)
  npx ts-node searcher.ts --my-ingredients "chicken,tomato,garlic,onion,rice" --only-my-ingredients
  
  # Combine with other filters
  npx ts-node searcher.ts --my-ingredients "chicken,pasta" --cuisines "italian" --difficulty "easy"
  
  # Search + my ingredients (ranked by relevance + ingredient match)
  npx ts-node searcher.ts --search "creamy" --my-ingredients "chicken,cream,mushroom"
  
  # Only show easy recipes I can make right now
  npx ts-node searcher.ts --my-ingredients "eggs,flour,milk,sugar" --only-my-ingredients --difficulty "easy"
  
  # Show available filter options
  npx ts-node searcher.ts --options
  
  # Show database stats
  npx ts-node searcher.ts --stats
    `);
    return;
  }

  if (args.includes('--options')) {
    displayFilterOptions();
    return;
  }

  if (args.includes('--stats')) {
    displayStats();
    return;
  }

  // Parse arguments
  const params: SearchParams = {
    filters: {}
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--search':
        params.searchQuery = args[++i];
        break;
      case '--my-ingredients':
        params.userIngredients = args[++i].split(',').map(s => s.trim());
        break;
      case '--only-my-ingredients':
        params.onlyUserIngredients = true;
        break;
      case '--cuisines':
        params.filters!.cuisines = args[++i].split(',').map(s => s.trim());
        break;
      case '--diets':
        params.filters!.diets = args[++i].split(',').map(s => s.trim());
        break;
      case '--meal':
        params.filters!.mealTypes = args[++i].split(',').map(s => s.trim());
        break;
      case '--time':
        params.filters!.timeBuckets = args[++i].split(',').map(s => s.trim());
        break;
      case '--difficulty':
        params.filters!.difficulties = args[++i].split(',').map(s => s.trim());
        break;
      case '--ingredient-logic':
        params.ingredientLogic = args[++i] as 'AND' | 'OR';
        break;
    }
  }

  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 10;

  // Display search parameters
  console.log("\n🔍 Search Parameters:");
  if (params.searchQuery) console.log(`   Query: "${params.searchQuery}" (IDF ranked)`);
  if (params.userIngredients?.length) {
    console.log(`   My Ingredients: ${params.userIngredients.join(', ')}`);
    if (params.onlyUserIngredients) {
      console.log(`   ✅ STRICT MODE: Only recipes using my ingredients`);
    } else {
      console.log(`   📊 Ranked by ingredient match score`);
    }
  }
  if (params.filters?.cuisines?.length) console.log(`   Cuisines: ${params.filters.cuisines.join(', ')}`);
  if (params.filters?.diets?.length) console.log(`   Diets: ${params.filters.diets.join(', ')}`);
  if (params.filters?.mealTypes?.length) console.log(`   Meal Types: ${params.filters.mealTypes.join(', ')}`);
  if (params.filters?.timeBuckets?.length) console.log(`   Time: ${params.filters.timeBuckets.join(', ')} minutes`);
  if (params.filters?.difficulties?.length) console.log(`   Difficulty: ${params.filters.difficulties.join(', ')}`);
  if (params.ingredientLogic) console.log(`   Ingredient Logic: ${params.ingredientLogic}`);

  // Execute search (data already loaded)
  const startTime = Date.now();
  const results = searchEngine.search(params);
  const searchTime = Date.now() - startTime;
  
  displayResults(results, limit);
  console.log(`⚡ Search completed in ${searchTime}ms (with IDF ranking)\n`);
}

// ---------- RUN ----------
main();