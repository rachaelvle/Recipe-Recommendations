// This code was generated with the assistance of AI. It serves as a base for 
// recipe searching with IDF-based relevance ranking.

import fs from "fs";
import {
  bucketTime,
  calculateIDFScore,
  intersectSets,
  normalizeText,
  scoreIngredientMatch,
  unionSets,
} from "./helpers.ts";
import type { Filters, IDFStats, SearchParams } from "./types.ts";

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
    const difficultyWords = ['easy', 'medium', 'hard', 'simple', 'quick', 'difficult'];
    const querySpecificWords = new Set([
      'recipe', 'recipes', 'make', 'cooking',
      ...cuisines,
      ...diets.map(d => d.split(' ')).flat(),
      ...mealTypes.map(m => m.split(' ')).flat()
    ]);
    
    const ingredientExcludeWords = new Set([
      ...querySpecificWords,
      ...difficultyWords
    ]);
    
    const remainingWords = words.filter(w => !querySpecificWords.has(w));
    const ingredientWords = words.filter(w => !ingredientExcludeWords.has(w));

    return {
      ingredients: ingredientWords,
      titleKeywords: remainingWords,
      implicitFilters
    };
  }

  private recipeUsesOnlyUserIngredients(recipe: any, userIngredients: string[]): boolean {
    if (!recipe.extendedIngredients || recipe.extendedIngredients.length === 0) return false;

    const normalizedUserIngredients = new Set(userIngredients.map(ing => normalizeText(ing)));

    return recipe.extendedIngredients.every((recipeIng: any) => {
      const normalizedRecipeIng = normalizeText(recipeIng.name);
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

  private applyFilters(recipes: any[], mergedFilters: Filters): any[] {
    let allowedIds = new Set(recipes.map(r => r.id));

    // Cuisine filter using inverted index
    if (mergedFilters.cuisines?.length) {
      const cuisineIds = mergedFilters.cuisines
        .map(c => this.indexes.cuisine[c])
        .filter(Boolean)
        .map(ids => new Set(ids));
      if (cuisineIds.length > 0) {
        const cuisineAllowed = unionSets(...cuisineIds);
        allowedIds = new Set([...allowedIds].filter(id => cuisineAllowed.has(id)));
      }
    }

    // Diet filter using inverted index
    if (mergedFilters.diets?.length) {
      const dietIds = mergedFilters.diets
        .map(d => this.indexes.diet[d])
        .filter(Boolean)
        .map(ids => new Set(ids));
      if (dietIds.length > 0) {
        const dietAllowed = unionSets(...dietIds);
        allowedIds = new Set([...allowedIds].filter(id => dietAllowed.has(id)));
      }
    }

    // Meal type filter using inverted index
    if (mergedFilters.mealTypes?.length) {
      const mealIds = mergedFilters.mealTypes
        .map(m => this.indexes.mealType[m])
        .filter(Boolean)
        .map(ids => new Set(ids));
      if (mealIds.length > 0) {
        const mealAllowed = unionSets(...mealIds);
        allowedIds = new Set([...allowedIds].filter(id => mealAllowed.has(id)));
      }
    }

    // Time bucket filter using inverted index
    if (mergedFilters.timeBuckets?.length) {
      const timeIds = mergedFilters.timeBuckets
        .map(t => this.indexes.timeBucket[t])
        .filter(Boolean)
        .map(ids => new Set(ids));
      if (timeIds.length > 0) {
        const timeAllowed = unionSets(...timeIds);
        allowedIds = new Set([...allowedIds].filter(id => timeAllowed.has(id)));
      }
    }

    // Difficulty filter using inverted index
    if (mergedFilters.difficulties?.length) {
      const diffIds = mergedFilters.difficulties
        .map(d => this.indexes.difficulty[d])
        .filter(Boolean)
        .map(ids => new Set(ids));
      if (diffIds.length > 0) {
        const diffAllowed = unionSets(...diffIds);
        allowedIds = new Set([...allowedIds].filter(id => diffAllowed.has(id)));
      }
    }

    return recipes.filter(r => allowedIds.has(r.id));
  }

  private rankResultsByTitleKeywords(results: any[], titleKeywords: string[], params: SearchParams): any[] {
    const scores = new Map<number, number>();

    results.forEach(r => scores.set(r.id, 0));

    // Normalize title keywords
    const normalizedKeywords = titleKeywords
      .map(kw => normalizeText(kw))
      .flatMap(n => n.split(/\s+/).filter(Boolean));

    if (normalizedKeywords.length > 0) {
      results.forEach(recipe => {
        let score = 0;

        // Title IDF score - boosts recipes with matching keywords in title
        score += calculateIDFScore(normalizedKeywords, recipe.id, this.indexes.title, this.idfStats) * 10;

        // Exact title match bonus
        const normalizedTitle = normalizeText(recipe.title);
        const normalizedQuery = normalizeText(titleKeywords.join(' '));
        if (normalizedTitle.includes(normalizedQuery)) score += 100;

        // Simplicity bonus (fewer ingredients = simpler recipe)
        const ingredientCount = recipe.extendedIngredients?.length || 20;
        score += Math.max(0, (20 - ingredientCount) / 20) * 20;

        scores.set(recipe.id, score);
      });
    }

    // User ingredient match bonus
    if (params.userIngredients?.length) {
      results.forEach(recipe => {
        scores.set(recipe.id, (scores.get(recipe.id) || 0) + scoreIngredientMatch(recipe, params.userIngredients!) * 100);
      });
    }

    return results.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
  }

  search(params: SearchParams): any[] {
  let allRecipes = this.recipes;
  let results: any[] = []; // final results

  let searchIngredients: string[] = [];
  let titleSearchKeywords: string[] = [];
  let implicitFilters: Partial<Filters> = {};

  console.log("🔍 Original search query:", params.searchQuery);

  // --- Parse query ---
  if (params.searchQuery?.trim()) {
    const parsed = this.parseSearchQuery(params.searchQuery);
    searchIngredients = parsed.ingredients;
    titleSearchKeywords = parsed.titleKeywords;
    implicitFilters = parsed.implicitFilters;

    console.log("Parsed ingredients for filtering:", searchIngredients);
    console.log("Parsed title keywords for ranking boost:", titleSearchKeywords);
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

  // --- 1️⃣ Apply standard filters ---
  results = this.applyFilters(allRecipes, mergedFilters);
  console.log("Number of results after applying filters:", results.length);

  // --- 2️⃣ Apply ingredient filter (from search query or params) ---
  const ingredientsToFilter = params.userIngredients || searchIngredients;
  const ingredientLogic = params.ingredientLogic || 'OR';

  if (ingredientsToFilter.length > 0) {
    const beforeIngredientFilter = results.length;
    
    // Get recipe IDs from ingredient index
    const ingredientIdSets = ingredientsToFilter
      .map(ing => {
        const normalized = normalizeText(ing);
        const words = normalized.split(/\s+/).filter(Boolean);
        const wordSets = words
          .map(word => this.indexes.ingredient[word])
          .filter(Boolean)
          .map(ids => new Set(ids));
        return wordSets.length ? unionSets(...wordSets) : new Set<number>();
      })
      .filter(set => set.size > 0);

    if (ingredientIdSets.length > 0) {
      let allowedIngredientIds: Set<number>;
      
      if (ingredientLogic === 'AND') {
        // Must have ALL ingredients
        allowedIngredientIds = intersectSets(...ingredientIdSets);
        console.log(`Ingredient filter (AND logic): Must have ALL of [${ingredientsToFilter.join(', ')}]`);
      } else {
        // Must have ANY ingredient
        allowedIngredientIds = unionSets(...ingredientIdSets);
        console.log(`Ingredient filter (OR logic): Must have ANY of [${ingredientsToFilter.join(', ')}]`);
      }

      results = results.filter(r => allowedIngredientIds.has(r.id));
      console.log(`Filtered by ingredients: ${beforeIngredientFilter} → ${results.length}`);
    }
  }

  // --- 3️⃣ Only user ingredients filter (stricter check) ---
  if (params.onlyUserIngredients && params.userIngredients?.length) {
    const beforeCount = results.length;
    results = results.filter(r => this.recipeUsesOnlyUserIngredients(r, params.userIngredients!));
    console.log(`Filtered by onlyUserIngredients: ${beforeCount} → ${results.length}`);
  }

  // --- 4️⃣ Rank by title keywords (if any) ---
  const hasTitleKeywords = titleSearchKeywords.length > 0;
  
  if (hasTitleKeywords && results.length > 1) {
    console.log("Ranking results by title keyword matches...");
    results = this.rankResultsByTitleKeywords(results, titleSearchKeywords, params);
    console.log("Results ranked.");
  } else {
    console.log("No title keywords to rank by.");
  }

  // --- 5️⃣ Limit to 10 results ---
  results = results.slice(0, 10);

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