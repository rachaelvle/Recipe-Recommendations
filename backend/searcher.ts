// search engine and methods
// written using AI assistance 
// filters out allergies and boosts recipes according to filters

import Database from "better-sqlite3";
import path from "path";
import {
  bucketTime,
  normalizeText
} from "./helpers.ts";
import type { Filters, Recipe, SearchParams } from "./types.ts";
import { UserDatabaseManager } from "./user.ts";

const DB_FILE = path.join(process.cwd(), "recipes.db");

interface EnhancedSearchParams extends SearchParams {
  userId?: number;  // If provided, apply user preferences and allergies
}

class EnhancedRecipeSearchEngine {
  private db: Database.Database;
  private userDb: UserDatabaseManager;

  constructor(dbPath: string = DB_FILE) {
    console.log("📄 Loading search engine from SQLite...");
    this.db = new Database(dbPath, { readonly: true });
    this.userDb = new UserDatabaseManager();
    
    const count = this.db.prepare(`SELECT COUNT(*) as count FROM recipes`).get() as any;
    console.log(`✅ Loaded ${count.count} recipes from database\n`);
  }

  /**
   * Get a single recipe by ID
   */
  private getRecipeById(id: number): Recipe | null {
    const row = this.db.prepare(`SELECT * FROM recipes WHERE id = ?`).get(id) as any;
    
    if (!row) return null;

    // Get cuisines from inverted index
    const cuisines = this.db.prepare(`SELECT cuisine FROM idx_cuisine WHERE recipeId = ?`).all(id) as any[];
    
    // Get diets from inverted index
    const diets = this.db.prepare(`SELECT diet FROM idx_diet WHERE recipeId = ?`).all(id) as any[];
    
    // Get dish types from inverted index
    const dishTypes = this.db.prepare(`SELECT dishType FROM idx_dishType WHERE recipeId = ?`).all(id) as any[];
    
    // Get difficulty from inverted index
    const difficultyRow = this.db.prepare(`SELECT difficulty FROM idx_difficulty WHERE recipeId = ?`).get(id) as any;
    
    // Get full ingredient details
    const ingredients = this.db.prepare(`SELECT ingredientId, name, amount, unit FROM ingredients WHERE recipeId = ?`).all(id) as any[];
    
    return {
      id: row.id,
      title: row.title,
      readyInMinutes: row.readyInMinutes,
      cuisines: cuisines.map(c => c.cuisine),
      dishTypes: dishTypes.map(d => d.dishType),
      diets: diets.map(d => d.diet),
      difficulty: difficultyRow?.difficulty || 'medium',
      extendedIngredients: ingredients.map(ing => ({
        id: ing.ingredientId,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit
      })),
      image: row.image,
      imageType: row.imageType,
      summary: row.summary,
      servings: row.servings,
      sourceUrl: row.sourceUrl
    };
  }

  /**
   * Get multiple recipes by IDs
   */
  private getRecipesByIds(ids: number[]): Recipe[] {
    if (ids.length === 0) return [];
    
    const recipes: Recipe[] = [];
    for (const id of ids) {
      const recipe = this.getRecipeById(id);
      if (recipe) recipes.push(recipe);
    }
    
    return recipes;
  }

  /**
   * Parse natural language query and extract implicit preferences
   */
  private parseSearchQuery(query: string) {
    const normalized = query.toLowerCase().trim();

    const patterns = {
      cuisine: /\b(italian|mexican|chinese|indian|french|thai|japanese|greek|american|mediterranean|korean|spanish|vietnamese)\b/g,
      diet: /\b(vegetarian|vegan|gluten free|dairy free|paleolithic|keto|pescatarian|primal)\b/g,
      mealType: /\b(breakfast|lunch|dinner|dessert|snack|appetizer|side dish|main course|brunch|soup)\b/g,
      difficulty: /\b(easy|medium|hard|simple|quick|difficult)\b/,
      time: /\b(quick|fast|under (\d+) min(?:ute)?s?|in (\d+) min(?:ute)?s?)\b/
    };

    const implicitPreferences: Partial<Filters> = {};

    const cuisines = Array.from(normalized.matchAll(patterns.cuisine) || []).map(m => m[0]);
    if (cuisines.length > 0) implicitPreferences.cuisines = cuisines;

    const diets = Array.from(normalized.matchAll(patterns.diet) || []).map(m => m[0].replace(/\s+/g, ' '));
    if (diets.length > 0) implicitPreferences.diets = diets;

    const mealTypes = Array.from(normalized.matchAll(patterns.mealType) || []).map(m => m[0]);
    if (mealTypes.length > 0) implicitPreferences.mealTypes = mealTypes;

    const diffMatch = normalized.match(patterns.difficulty);
    if (diffMatch) {
      let difficulty = diffMatch[0];
      if (difficulty === 'simple' || difficulty === 'quick') difficulty = 'easy';
      if (difficulty === 'difficult') difficulty = 'hard';
      implicitPreferences.difficulties = [difficulty];
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
      if (bucket) implicitPreferences.timeBuckets = [bucket];
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
      implicitPreferences
    };
  }

  /**
   * Check if recipe contains any allergens
   */
  private containsAllergens(recipe: Recipe, allergens: string[]): boolean {
    if (allergens.length === 0) return false;

    const normalizedAllergens = allergens.map(a => normalizeText(a));
    
    return recipe.extendedIngredients.some(ingredient => {
      const normalizedIngredient = normalizeText(ingredient.name);
      return normalizedAllergens.some(allergen => 
        normalizedIngredient.includes(allergen) || allergen.includes(normalizedIngredient)
      );
    });
  }

  /**
   * Calculate ingredient coverage score
   * Returns percentage of recipe ingredients that user has
   */
  private calculateIngredientCoverage(recipe: Recipe, userIngredients: Set<string>): number {
    if (userIngredients.size === 0 || recipe.extendedIngredients.length === 0) {
      return 0;
    }

    const matchCount = recipe.extendedIngredients.filter(ing => {
      const normalizedIng = normalizeText(ing.name);
      return Array.from(userIngredients).some(userIng => 
        normalizedIng.includes(userIng) || userIng.includes(normalizedIng)
      );
    }).length;

    return matchCount / recipe.extendedIngredients.length;
  }

  /**
   * Enhanced search with implicit preferences as boosters
   */
  search(params: EnhancedSearchParams): Recipe[] {
    let searchIngredients: string[] = [];
    let titleSearchKeywords: string[] = [];
    let implicitPreferences: Partial<Filters> = {};
    let userAllergies: string[] = [];
    let userIngredients: string[] = [];
    let userPreferences = null;

    console.log("🔍 Original search query:", params.searchQuery);

    // Load user profile if userId is provided
    if (params.userId) {
      console.log(`👤 Loading preferences for user ID: ${params.userId}`);
      const profile = this.userDb.getUserProfile(params.userId);
      
      if (profile) {
        // Extract allergies - ALWAYS applied as hard filter
        userAllergies = profile.allergies.map(a => a.allergen);
        if (userAllergies.length > 0) {
          console.log(`🚫 User allergies (ALWAYS filtered): [${userAllergies.join(', ')}]`);
        }

        // Extract user's available ingredients
        userIngredients = profile.ingredients.map(i => i.ingredient);
        if (userIngredients.length > 0) {
          console.log(`🥕 User's pantry: [${userIngredients.join(', ')}]`);
        }

        // Extract preferences - will be used as boosters
        userPreferences = profile.preferences;
      }
    }

    // Combine search-time ingredients with pantry ingredients
    const ingredientsToUse = [
      ...(params.userIngredients || []),
      ...userIngredients
    ].filter((v, i, a) => a.indexOf(v) === i);

    // Parse query to extract implicit preferences
    if (params.searchQuery?.trim()) {
      const parsed = this.parseSearchQuery(params.searchQuery);
      searchIngredients = parsed.ingredients;
      titleSearchKeywords = parsed.titleKeywords;
      implicitPreferences = parsed.implicitPreferences;

      console.log("Parsed ingredients:", searchIngredients);
      console.log("Parsed title keywords:", titleSearchKeywords);
      console.log("Implicit preferences from query (will boost, not filter):", implicitPreferences);
    }

    // Separate EXPLICIT filters (hard filters) from implicit preferences (boosters)
    const explicitFilters: Filters = params.filters || {};
    
    console.log("📌 Explicit filters (hard filters):", explicitFilters);
    console.log("✨ Implicit preferences (boosters):", implicitPreferences);
    if (userPreferences) {
      console.log("👤 User preferences (boosters):", userPreferences);
    }

    // Build SQL query - ONLY use explicit filters for WHERE clause
    const conditions: string[] = [];
    const sqlParams: any[] = [];

    // Ingredient filter for SQL (when searching by ingredients or user has ingredients)
    const ingredientsToFilter = ingredientsToUse.length > 0 ? ingredientsToUse : searchIngredients;
    const ingredientLogic = params.ingredientLogic || 'OR';

    if (ingredientsToFilter.length > 0) {
      const normalizedIngredients = ingredientsToFilter.map(ing => {
        const normalized = normalizeText(ing);
        return normalized.split(/\s+/).filter(Boolean);
      }).flat();

      if (normalizedIngredients.length > 0) {
        if (ingredientLogic === 'AND') {
          const placeholders = normalizedIngredients.map(() => '?').join(',');
          conditions.push(`
            id IN (
              SELECT recipeId 
              FROM idx_ingredients 
              WHERE word IN (${placeholders})
              GROUP BY recipeId
              HAVING COUNT(DISTINCT word) = ${normalizedIngredients.length}
            )
          `);
          sqlParams.push(...normalizedIngredients);
          console.log(`Ingredient filter (AND): Must have ALL of [${ingredientsToFilter.join(', ')}]`);
        } else {
          const placeholders = normalizedIngredients.map(() => '?').join(',');
          conditions.push(`id IN (SELECT DISTINCT recipeId FROM idx_ingredients WHERE word IN (${placeholders}))`);
          sqlParams.push(...normalizedIngredients);
          console.log(`Ingredient filter (OR): Must have ANY of [${ingredientsToFilter.join(', ')}]`);
        }
      }
    }

    // EXPLICIT FILTERS ONLY (hard filters from params.filters)
    if (explicitFilters.cuisines?.length) {
      const placeholders = explicitFilters.cuisines.map(() => '?').join(',');
      const normalizedCuisines = explicitFilters.cuisines.map(c => c.toLowerCase());
      conditions.push(`id IN (SELECT recipeId FROM idx_cuisine WHERE cuisine IN (${placeholders}))`);
      sqlParams.push(...normalizedCuisines);
      console.log(`🔒 Hard filter: cuisines = [${explicitFilters.cuisines.join(', ')}]`);
    }

    if (explicitFilters.diets?.length) {
      const placeholders = explicitFilters.diets.map(() => '?').join(',');
      const normalizedDiets = explicitFilters.diets.map(d => d.toLowerCase());
      conditions.push(`id IN (SELECT recipeId FROM idx_diet WHERE diet IN (${placeholders}))`);
      sqlParams.push(...normalizedDiets);
      console.log(`🔒 Hard filter: diets = [${explicitFilters.diets.join(', ')}]`);
    }

    if (explicitFilters.mealTypes?.length) {
      const placeholders = explicitFilters.mealTypes.map(() => '?').join(',');
      const normalizedMealTypes = explicitFilters.mealTypes.map(m => m.toLowerCase());
      conditions.push(`id IN (SELECT recipeId FROM idx_dishType WHERE dishType IN (${placeholders}))`);
      sqlParams.push(...normalizedMealTypes);
      console.log(`🔒 Hard filter: mealTypes = [${explicitFilters.mealTypes.join(', ')}]`);
    }

    if (explicitFilters.timeBuckets?.length) {
      const placeholders = explicitFilters.timeBuckets.map(() => '?').join(',');
      conditions.push(`id IN (SELECT recipeId FROM idx_time_bucket WHERE bucket IN (${placeholders}))`);
      sqlParams.push(...explicitFilters.timeBuckets);
      console.log(`🔒 Hard filter: timeBuckets = [${explicitFilters.timeBuckets.join(', ')}]`);
    }

    if (explicitFilters.difficulties?.length) {
      const placeholders = explicitFilters.difficulties.map(() => '?').join(',');
      conditions.push(`id IN (SELECT recipeId FROM idx_difficulty WHERE difficulty IN (${placeholders}))`);
      sqlParams.push(...explicitFilters.difficulties);
      console.log(`🔒 Hard filter: difficulties = [${explicitFilters.difficulties.join(', ')}]`);
    }

    // Execute query
    let query = `SELECT DISTINCT id FROM recipes`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ` LIMIT 500`; // Get more candidates since we're doing relevance ranking

    console.log("Executing SQL query...");
    const rows = this.db.prepare(query).all(...sqlParams) as any[];
    const candidateIds = rows.map(r => r.id);
    
    console.log(`Found ${candidateIds.length} candidate recipes`);

    // Fetch full recipes
    let results = this.getRecipesByIds(candidateIds);

    // ALWAYS filter out allergies (critical safety filter)
    if (userAllergies.length > 0) {
      const beforeCount = results.length;
      results = results.filter(recipe => !this.containsAllergens(recipe, userAllergies));
      console.log(`🚫 Allergy filter: ${beforeCount} → ${results.length} recipes (removed ${beforeCount - results.length})`);
    }

    // RELEVANCE RANKING with boosters
    console.log("\n🎯 Applying relevance scoring...");
    
    // Collect all preferences that should boost (implicit + user defaults)
    const boostPreferences = {
      cuisines: implicitPreferences.cuisines || userPreferences?.defaultCuisines || [],
      diets: implicitPreferences.diets || userPreferences?.defaultDiets || [],
      mealTypes: implicitPreferences.mealTypes || userPreferences?.defaultMealTypes || [],
      timeBuckets: implicitPreferences.timeBuckets || userPreferences?.defaultTimeBuckets || [],
      difficulties: implicitPreferences.difficulties || userPreferences?.defaultDifficulties || []
    };
    
    const normalizedKeywords = titleSearchKeywords.map(kw => normalizeText(kw)).filter(Boolean);
    // Don't apply time-of-day bonus if user specified a meal type (either explicitly or implicitly)
    const shouldApplyTimeBonus = !explicitFilters.mealTypes?.length && !boostPreferences.mealTypes?.length;
    
    // Normalize user's available ingredients
    const normalizedUserIngredients = ingredientsToUse.length > 0
      ? new Set(ingredientsToUse.map(ing => normalizeText(ing)))
      : new Set<string>();

    if (boostPreferences.cuisines?.length || boostPreferences.diets?.length || 
        boostPreferences.mealTypes?.length || boostPreferences.timeBuckets?.length || 
        boostPreferences.difficulties?.length) {
      console.log("✨ Boosting based on:", boostPreferences);
    }
    
    results = results.map(recipe => {
      let score = 0;
      const normalizedTitle = normalizeText(recipe.title);
      const scoringDetails: string[] = [];
      
      // Title keyword matches (+25 per keyword - high priority for explicit search terms)
      normalizedKeywords.forEach(keyword => {
        if (normalizedTitle.includes(keyword)) {
          score += 25;
          scoringDetails.push(`title:${keyword}(+25)`);
        }
      });
      
      // Time of day contextual bonus
      if (shouldApplyTimeBonus) {
        const timeBonus = this.getTimeOfDayBonus(recipe);
        if (timeBonus > 0) {
          score += timeBonus;
          scoringDetails.push(`timeOfDay(+${timeBonus})`);
        }
      }

      // INGREDIENT COVERAGE BOOST - recipes using user's ingredients
      if (normalizedUserIngredients.size > 0) {
        const coverage = this.calculateIngredientCoverage(recipe, normalizedUserIngredients);
        const matchCount = Math.round(coverage * recipe.extendedIngredients.length);
        
        // Base score: +4 per matching ingredient
        const ingredientMatchScore = matchCount * 4;
        
        // Coverage bonus: recipes that use a higher % of user's ingredients get extra boost
        // 100% coverage = +10 bonus (capped), 50% = +5, etc.
        const coverageBonus = Math.min(coverage * 10, 10);
        
        const totalIngredientScore = ingredientMatchScore + coverageBonus;
        
        if (totalIngredientScore > 0) {
          score += totalIngredientScore;
          scoringDetails.push(`ingredients:${matchCount}/${recipe.extendedIngredients.length}(+${totalIngredientScore.toFixed(1)})`);
        }
      }

      // IMPLICIT PREFERENCE BOOSTERS
      // Cuisine boost (+5 per match - lowest priority)
      if (boostPreferences.cuisines?.length) {
        const cuisineMatches = recipe.cuisines.filter(c => 
          boostPreferences.cuisines?.some(pref => pref.toLowerCase() === c.toLowerCase())
        );
        if (cuisineMatches.length > 0) {
          const cuisineBoost = cuisineMatches.length * 5;
          score += cuisineBoost;
          scoringDetails.push(`cuisine:${cuisineMatches.join(',')}(+${cuisineBoost})`);
        }
      }

      // Diet boost (+20 per match - highest priority)
      if (boostPreferences.diets?.length) {
        const dietMatches = recipe.diets.filter(d => 
          boostPreferences.diets?.some(pref => pref.toLowerCase() === d.toLowerCase())
        );
        if (dietMatches.length > 0) {
          const dietBoost = dietMatches.length * 20;
          score += dietBoost;
          scoringDetails.push(`diet:${dietMatches.join(',')}(+${dietBoost})`);
        }
      }

      // Meal type boost (+10 per match)
      if (boostPreferences.mealTypes?.length) {
        const mealMatches = recipe.dishTypes.filter(m => 
          boostPreferences.mealTypes?.some(pref => pref.toLowerCase() === m.toLowerCase())
        );
        if (mealMatches.length > 0) {
          const mealBoost = mealMatches.length * 10;
          score += mealBoost;
          scoringDetails.push(`mealType:${mealMatches.join(',')}(+${mealBoost})`);
        }
      }

      // Time bucket boost (+25 if matches - high priority for duration)
      if (boostPreferences.timeBuckets?.length) {
        const recipeBucket = bucketTime(recipe.readyInMinutes);
        if (boostPreferences.timeBuckets.includes(recipeBucket)) {
          score += 25;
          scoringDetails.push(`timeBucket:${recipeBucket}(+8)`);
        }
      }

      // Difficulty boost (+8 if matches)
      if (boostPreferences.difficulties?.length) {
        if (boostPreferences.difficulties.includes(recipe.difficulty)) {
          score += 8;
          scoringDetails.push(`difficulty:${recipe.difficulty}(+5)`);
        }
      }
      
      return { 
        recipe, 
        score,
        scoringDetails: scoringDetails.join(', ')
      };
    }).sort((a, b) => b.score - a.score);

    // Log top scoring recipes
    console.log("\n📊 Top scored recipes:");
    results.slice(0, 5).forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.recipe.title} - Score: ${item.score.toFixed(1)}`);
      if (item.scoringDetails) {
        console.log(`   Scoring: ${item.scoringDetails}`);
      }
    });

    // Return just the recipes
    const finalResults = results.map(item => item.recipe).slice(0, 10);

    console.log("\n✅ Final number of recipes returned:", finalResults.length);
    return finalResults;
  }

  /**
   * Get time of day score bonus for ranking
   */
  private getTimeOfDayBonus(recipe: Recipe): number {
    const now = new Date();
    const hour = now.getHours();
    
    const mealTypeScores: { [key: string]: { [timeRange: string]: number } } = {
      breakfast: { morning: 10, afternoon: 0, evening: 0 },
      brunch: { morning: 8, afternoon: 5, evening: 0 },
      lunch: { morning: 2, afternoon: 10, evening: 2 },
      dinner: { morning: 0, afternoon: 3, evening: 10 },
      dessert: { morning: 2, afternoon: 5, evening: 8 },
      snack: { morning: 5, afternoon: 8, evening: 5 },
      appetizer: { morning: 0, afternoon: 5, evening: 10 },
      'side dish': { morning: 2, afternoon: 8, evening: 8 },
      'main course': { morning: 3, afternoon: 8, evening: 10 },
      soup: { morning: 2, afternoon: 5, evening: 8 }
    };

    let timeRange = 'afternoon';
    if (hour < 12) timeRange = 'morning';
    else if (hour >= 17) timeRange = 'evening';

    let bonus = 0;
    recipe.dishTypes.forEach(mealType => {
      const lowerMealType = mealType.toLowerCase();
      if (mealTypeScores[lowerMealType]?.[timeRange]) {
        bonus += mealTypeScores[lowerMealType][timeRange];
      }
    });

    return bonus;
  }

  close() {
    this.db.close();
    this.userDb.close();
  }
}

// ---------- DISPLAY HELPERS ----------
function displayResults(results: Recipe[], limit = 10) {
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

export { EnhancedRecipeSearchEngine };
