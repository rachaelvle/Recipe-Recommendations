// This code was generated with the assistance of AI. It serves as a base for 
// recipe searching with IDF-based relevance ranking.
// searcher.ts
import fs from "fs";
import {
  bucketTime,
  calculateIDFScore,
  normalizeIngredient,
  normalizeTitle,
  scoreIngredientMatch,
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
  userIngredients?: string[];  
  onlyUserIngredients?: boolean;  
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

  private parseSearchQuery(query: string) {
    const normalized = query.toLowerCase().trim();

    const patterns = {
      cuisine: /\b(italian|mexican|chinese|indian|french|thai|japanese|greek|american|mediterranean|korean|spanish|vietnamese)\b/g,
      diet: /\b(vegetarian|vegan|gluten free|dairy free|paleo|keto|pescatarian)\b/g,
      mealType: /\b(breakfast|lunch|dinner|dessert|snack|appetizer|side dish|main course|brunch)\b/g,
      difficulty: /\b(easy|medium|hard|simple|quick|difficult)\b/,
      time: /\b(quick|fast|under (\d+) min(?:ute)?s?|in (\d+) min(?:ute)?s?)\b/
    };

    const implicitFilters: Partial<Filters> = {};

    const cuisines = Array.from(normalized.matchAll(patterns.cuisine) || []).map(m => m[0]);
    if (cuisines.length > 0) implicitFilters.cuisines = cuisines;

    const diets = Array.from(normalized.matchAll(patterns.diet) || []).map(m => m[0].replace(/\s+/g, ' '));
    if (diets.length > 0) implicitFilters.diets = diets;

    const mealTypes = Array.from(normalized.matchAll(patterns.mealType) || []).map(m => m[0]);
    if (mealTypes.length > 0) implicitFilters.mealTypes = mealTypes;

    const diffMatch = normalized.match(patterns.difficulty);
    if (diffMatch) {
      let difficulty = diffMatch[0];
      if (difficulty === 'simple' || difficulty === 'quick') difficulty = 'easy';
      if (difficulty === 'difficult') difficulty = 'hard';
      implicitFilters.difficulties = [difficulty];
    }

    const timeMatch = normalized.match(patterns.time);
    if (timeMatch) {
      let bucket: string | null = null;
      if (timeMatch[0].includes('quick') || timeMatch[0].includes('fast')) {
        bucket = '0-15';
      } else if (timeMatch[1] || timeMatch[2]) {
        const minutes = parseInt(timeMatch[1] || timeMatch[2] || '0');
        bucket = bucketTime(minutes);
      }
      if (bucket) implicitFilters.timeBuckets = [bucket];
    }

    const words = normalized.split(/\s+/);
    const querySpecificWords = new Set([
      'recipe', 'recipes', 'make', 'cooking',
      ...cuisines,
      ...diets.map(d => d.split(' ')).flat(),
      ...mealTypes.map(m => m.split(' ')).flat()
    ]);
    
    const remainingWords = words.filter(w => !querySpecificWords.has(w));

    return {
      ingredients: remainingWords,
      titleKeywords: remainingWords,
      implicitFilters
    };
  }

  private recipeUsesOnlyUserIngredients(recipe: any, userIngredients: string[]): boolean {
    if (!recipe.extendedIngredients || recipe.extendedIngredients.length === 0) return false;

    const normalizedUserIngredients = new Set(userIngredients.map(ing => normalizeIngredient(ing)));

    return recipe.extendedIngredients.every((recipeIng: any) => {
      const normalizedRecipeIng = normalizeIngredient(recipeIng.name);
      return Array.from(normalizedUserIngredients).some(userIng => 
        normalizedRecipeIng.includes(userIng) || userIng.includes(normalizedRecipeIng)
      );
    });
  }

  private getRecipeIdsFromIndex(terms: string[], index: any, normalizer: (s: string) => string): Set<number> {
    const sets = terms
      .map(term => normalizer(term))
      .flatMap(n => n.split(/\s+/).filter(w => w.length > 0))
      .map(word => index[word])
      .filter(Boolean)
      .map((ids: number[]) => new Set(ids));
    
    return sets.length ? unionSets(...sets) : new Set();
  }

  private rankResultsByIDF(results: any[], params: SearchParams): any[] {
    const scores = new Map<number, number>();
    const coverageMap = new Map<number, number>();

    results.forEach(r => scores.set(r.id, 0));

    if (params.searchQuery?.trim()) {
      const parsed = this.parseSearchQuery(params.searchQuery);

      const titleKeywords = parsed.titleKeywords
        .map(kw => normalizeTitle(kw))
        .flatMap(n => n.split(/\s+/).filter(Boolean));
      
      const ingredientTerms = parsed.ingredients
        .map(ing => normalizeIngredient(ing))
        .flatMap(n => n.split(/\s+/).filter(Boolean));

      const allQueryTerms = [...new Set([...titleKeywords, ...ingredientTerms])];

      results.forEach(recipe => {
        let score = 0;
        let matched = 0;

        allQueryTerms.forEach(term => {
          if (this.indexes.title[term]?.includes(recipe.id) || 
              this.indexes.ingredient[term]?.includes(recipe.id)) {
            matched++;
          }
        });

        const coverage = allQueryTerms.length ? matched / allQueryTerms.length : 0;
        coverageMap.set(recipe.id, coverage);
        score += Math.pow(coverage, 2) * 100;

        score += calculateIDFScore(titleKeywords, recipe.id, this.indexes.title, this.idfStats) * 5;
        score += calculateIDFScore(ingredientTerms, recipe.id, this.indexes.ingredient, this.idfStats) * 5;

        const normalizedTitle = normalizeTitle(recipe.title);
        const normalizedQuery = normalizeTitle(params.searchQuery!);
        if (normalizedTitle.includes(normalizedQuery)) score += 50;

        const ingredientCount = recipe.extendedIngredients?.length || 20;
        score += Math.max(0, (20 - ingredientCount) / 20) * 10;

        scores.set(recipe.id, score);
      });

      results = results.filter(r => (coverageMap.get(r.id) || 0) >= 1.0);
    }

    if (params.userIngredients?.length) {
      results.forEach(recipe => {
        scores.set(recipe.id, (scores.get(recipe.id) || 0) + scoreIngredientMatch(recipe, params.userIngredients!) * 50);
      });
    }

    return results.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
  }

  search(params: SearchParams): any[] {
  let allRecipes = this.recipes;
  let results: any[] = []; // final results

  let searchIngredients: string[] = [];
  let searchTitleKeywords: string[] = [];
  let implicitFilters: Partial<Filters> = {};

  console.log("🔍 Original search query:", params.searchQuery);

  // --- Parse query ---
  if (params.searchQuery?.trim()) {
    const parsed = this.parseSearchQuery(params.searchQuery);
    searchIngredients = parsed.ingredients;
    searchTitleKeywords = parsed.titleKeywords;
    implicitFilters = parsed.implicitFilters;

    console.log("Parsed ingredients for text search:", searchIngredients);
    console.log("Parsed title keywords for text search:", searchTitleKeywords);
    console.log("Implicit filters from query:", implicitFilters);
  }

  // --- Merge filters ---
  const mergedFilters: Filters = {
    cuisines: params.filters?.cuisines || implicitFilters.cuisines,
    diets: params.filters?.diets || implicitFilters.diets,
    mealTypes: params.filters?.mealTypes || implicitFilters.mealTypes,
    timeBuckets: params.filters?.timeBuckets || implicitFilters.timeBuckets,
    difficulties: params.filters?.difficulties || implicitFilters.difficulties
  };

  console.log("Merged filters applied:", mergedFilters);

  // --- 1️⃣ Text search ---
  let textSearchResults: any[] = [];

  if (searchIngredients.length || searchTitleKeywords.length) {
    const ingredientIds = this.getRecipeIdsFromIndex(searchIngredients, this.indexes.ingredient, normalizeIngredient);
    const titleIds = this.getRecipeIdsFromIndex(searchTitleKeywords, this.indexes.title, normalizeTitle);
    const textIds = unionSets(ingredientIds, titleIds);

    console.log("Text search IDs (ingredient OR title):", Array.from(textIds));

    if (textIds.size) {
      textSearchResults = allRecipes.filter(r => textIds.has(r.id));
      console.log("Number of results after text search:", textSearchResults.length);
    } else {
      console.log("No text search matches found.");
      textSearchResults = []; // fallback to filters later
    }
  } else {
    console.log("No keywords for text search, skipping text search step.");
  }

  // --- 2️⃣ Apply filters ---
  const applyFilters = (recipes: any[]) => {
    let filtered = recipes;

    if (mergedFilters.cuisines?.length) {
      filtered = filtered.filter(r => r.cuisines?.some(c => mergedFilters.cuisines!.includes(c.toLowerCase())));
    }
    if (mergedFilters.diets?.length) {
      filtered = filtered.filter(r => r.diets?.some(d => mergedFilters.diets!.includes(d.toLowerCase())));
    }
    if (mergedFilters.mealTypes?.length) {
      filtered = filtered.filter(r => r.dishTypes?.some(m => mergedFilters.mealTypes!.includes(m.toLowerCase())));
    }
    if (mergedFilters.timeBuckets?.length) {
      filtered = filtered.filter(r => mergedFilters.timeBuckets!.includes(bucketTime(r.readyInMinutes)));
    }
    if (mergedFilters.difficulties?.length) {
    filtered = filtered.filter(
      r => r.difficulty && mergedFilters.difficulties!.includes(r.difficulty.toLowerCase())
    );
  }

    return filtered;
  };

  if (textSearchResults.length > 0) {
    results = applyFilters(textSearchResults);
    console.log("Number of results after applying filters on text search results:", results.length);
  } else {
    // No text matches → apply filters on full corpus
    results = applyFilters(allRecipes);
    console.log("Text search empty → applied filters on full corpus. Number of results:", results.length);
  }

  // --- 3️⃣ Only user ingredients ---
  if (params.onlyUserIngredients && params.userIngredients?.length) {
    const beforeCount = results.length;
    results = results.filter(r => this.recipeUsesOnlyUserIngredients(r, params.userIngredients!));
    console.log(`Filtered by onlyUserIngredients: ${beforeCount} → ${results.length}`);
  }

  // --- 4️⃣ Rank by IDF only if there are actual search keywords ---
  const hasKeywords = searchIngredients.length + searchTitleKeywords.length > 0;
  if (hasKeywords && results.length > 1) {
    console.log("Ranking results by IDF...");
    results = this.rankResultsByIDF(results, params);
    console.log("Results ranked by IDF.");
  } else {
    console.log("No keywords to rank, skipping IDF ranking.");
  }

  console.log("✅ Final number of recipes returned:", results.length);
  return results;
}
}

// ---------- INITIALIZE SEARCH ENGINE ----------
const searchEngine = new RecipeSearchEngine();

// ---------- DISPLAY HELPERS ----------
function displayResults(results: any[], limit = 10) {
  console.log(`\n📊 Found ${results.length} recipes\n`);
  if (!results.length) return;

  results.slice(0, limit).forEach((recipe, idx) => {
    console.log(`${idx + 1}. ${recipe.title}`);
    console.log(`   ⏱️  ${recipe.readyInMinutes} minutes`);
    console.log(`   🍽️  ${recipe.cuisines.join(', ') || 'N/A'}`);
    console.log(`   🥗 ${recipe.diets.join(', ') || 'N/A'}`);
    console.log(`   📋 ${recipe.dishTypes.join(', ') || 'N/A'}`);
    console.log(`   🔗 ${recipe.sourceUrl || 'N/A'}\n`);
  });
}

// ---------- CLI ----------
function main() {
  const args = process.argv.slice(2);
  const params: SearchParams = { filters: {} };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--search') params.searchQuery = args[++i];
  }

  const results = searchEngine.search(params);
  displayResults(results);
}

main();
