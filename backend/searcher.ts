// search engine and methods
// written using AI assistance 
import Database from "better-sqlite3";
import path from "path";
import {
  bucketTime,
  normalizeText
} from "./helpers";
import type { Filters, Recipe, SearchParams } from "./types";
import { UserDatabaseManager } from "./user";

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
   * Get IDF (Inverse Document Frequency) score for a term
   * Returns how rare/distinctive a term is across all recipes
   * Higher score = rarer term = more important for search relevance
   */
  private getIDF(term: string, totalDocs: number): number {
    const idfRow = this.db.prepare(`
      SELECT doc_frequency FROM idf_stats WHERE term = ?
    `).get(term) as any;
    
    if (!idfRow) return 0; // Term not in database
    
    const docFrequency = idfRow.doc_frequency;
    return Math.log(totalDocs / docFrequency);
  }

  /**
   * Calculate IDF score for title keywords only
   * Only applies to words that actually appear in the recipe's title
   */
  private calculateTitleIDF(recipeId: number, titleKeywords: string[], totalDocs: number): number {
    let totalScore = 0;
    
    // Get all words in this recipe's title
    const titleRow = this.db.prepare(`
      SELECT word FROM idx_title WHERE recipeId = ?
    `).all(recipeId) as any[];
    
    const recipeWords = new Set(titleRow.map(row => row.word));
    
    // For each keyword, if it's in the title, add its IDF score
    for (const keyword of titleKeywords) {
      if (recipeWords.has(keyword)) {
        totalScore += this.getIDF(keyword, totalDocs);
      }
    }
    
    return totalScore;
  }

  /**
   * Get a single recipe by ID
   */
  public getRecipeById(id: number): Recipe | null {
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
    const normalized = normalizeText(query);

    const patterns = {
      cuisine: /\b(italian|mexican|chinese|indian|french|thai|japanese|greek|american|mediterranean|korean|spanish|vietnamese|asian)\b/g,
      diet: /\b(vegetarian|vegan|glutenfree|dairyfree|paleolithic|keto|pescatarian|primal)\b/g,
      mealType: /\b(breakfast|lunch|dinner|dessert|snack|appetizer|sidedish|maincourse|brunch|soup)\b/g,
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

    // Build sets of words to exclude from search
    const difficultyWords = ['easy', 'medium', 'hard', 'simple', 'quick', 'difficult'];
    const querySpecificWords = new Set([
      'recipe', 'recipes', 'make', 'cooking', 'with',
      ...cuisines,
      ...diets.map(d => d.split(' ')).flat(),
      ...mealTypes.map(m => m.split(' ')).flat(),
      ...difficultyWords
    ]);
    
    // Extract search terms (keep everything that's not a query-specific word)
    const words = normalized.split(/\s+/).filter(w => !querySpecificWords.has(w) && w.length > 0);
    
    // Keep the whole query as one search term for better matching
    const searchTerm = words.join(' ');
    const ingredientWords = searchTerm ? [searchTerm] : [];
    
    // For title keywords, use all relevant words
    const remainingWords = words;

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
    let userPreferences: any = null;

    console.log("🔍 Original search query:", params.searchQuery);

    // Load user profile if userId is provided
    if (params.userId) {
      console.log(`👤 Loading preferences for user ID: ${params.userId}`);
      const profile = this.userDb.getUserProfile(params.userId);
      
      if (profile) {
        // Extract allergies - ALWAYS applied as hard filter
        userAllergies = profile.allergies.map(a => normalizeText(a.allergen));
        if (userAllergies.length > 0) {
          console.log(`🚫 User allergies (ALWAYS filtered): [${userAllergies.join(', ')}]`);
        }

        // Extract user's available ingredients
        userIngredients = profile.ingredients.map(i => normalizeText(i.ingredient));
        if (userIngredients.length > 0) {
          console.log(`🥕 User's pantry: [${userIngredients.join(', ')}]`);
        }

        // Extract preferences - will be used as boosters
        userPreferences = profile.preferences;
        if (userPreferences) {
          // Normalize preference arrays for consistent matching
          if (userPreferences.defaultCuisines) {
            userPreferences.defaultCuisines = userPreferences.defaultCuisines.map((c: string) => normalizeText(c));
          }
          if (userPreferences.defaultDiets) {
            userPreferences.defaultDiets = userPreferences.defaultDiets.map((d: string) => normalizeText(d));
          }
          if (userPreferences.defaultMealTypes) {
            userPreferences.defaultMealTypes = userPreferences.defaultMealTypes.map((m: string) => normalizeText(m));
          }
          if (userPreferences.defaultDifficulties) {
            userPreferences.defaultDifficulties = userPreferences.defaultDifficulties.map((d: string) => normalizeText(d));
          }
        }
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

    // Ingredient/Title filter for SQL 
    if (searchIngredients.length > 0) {
      const allWords: string[] = [];
      
      searchIngredients.forEach(ing => {
        const normalized = normalizeText(ing);
        const words = normalized.split(/\s+/).filter(Boolean);
        allWords.push(...words);
      });
      
      if (allWords.length > 0) {
        const placeholders = allWords.map(() => '?').join(',');
        conditions.push(`(
          id IN (SELECT DISTINCT recipeId FROM idx_title WHERE word IN (${placeholders}))
          OR id IN (SELECT DISTINCT recipeId FROM idx_ingredients WHERE word IN (${placeholders}))
        )`);
        sqlParams.push(...allWords);
        sqlParams.push(...allWords); 
        
        console.log(`Search filter (OR logic - title OR ingredients): [${searchIngredients.join(', ')}]`);
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
    query += ` LIMIT 500`;

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
    
    const totalDocsResult = this.db.prepare(`SELECT COUNT(*) as count FROM recipes`).get() as any;
    const totalDocs = totalDocsResult.count;
    
    const filterEmpty = (arr: string[] | undefined) => (arr ?? []).filter(Boolean).map(s => s.trim()).filter(Boolean);
    const boostPreferences = {
      cuisines: filterEmpty(implicitPreferences.cuisines || userPreferences?.defaultCuisines || []),
      diets: filterEmpty(implicitPreferences.diets || userPreferences?.defaultDiets || []),
      mealTypes: filterEmpty(implicitPreferences.mealTypes || userPreferences?.defaultMealTypes || []),
      timeBuckets: filterEmpty(implicitPreferences.timeBuckets || userPreferences?.defaultTimeBuckets || []),
      difficulties: filterEmpty(implicitPreferences.difficulties || userPreferences?.defaultDifficulties || [])
    };
    
    const normalizedKeywords = titleSearchKeywords.map(kw => normalizeText(kw)).filter(Boolean);
    const shouldApplyTimeBonus = !explicitFilters.mealTypes?.length && !boostPreferences.mealTypes?.length;
    
    const normalizedUserIngredients = ingredientsToUse.length > 0
      ? new Set(ingredientsToUse.map(ing => normalizeText(ing)))
      : new Set<string>();

    if (boostPreferences.cuisines?.length || boostPreferences.diets?.length || 
        boostPreferences.mealTypes?.length || boostPreferences.timeBuckets?.length || 
        boostPreferences.difficulties?.length) {
      console.log("✨ Boosting based on:", boostPreferences);
    }
    
    // NEW VARIABLE HERE: We save the scored objects to scoredResults instead of overwriting results
    const scoredResults = results.map(recipe => {
      let score = 0;
      const normalizedTitle = normalizeText(recipe.title);
      const scoringDetails: string[] = [];
      
      if (normalizedKeywords.length > 0) {
        const titleIDFScore = this.calculateTitleIDF(recipe.id, normalizedKeywords, totalDocs);
        const scaledIDF = titleIDFScore * 25;
        
        if (scaledIDF > 0) {
          score += scaledIDF;
          scoringDetails.push(`title_idf(+${scaledIDF.toFixed(1)})`);
        }
      }
      
      if (shouldApplyTimeBonus) {
        const timeBonus = this.getTimeOfDayBonus(recipe);
        if (timeBonus > 0) {
          score += timeBonus;
          scoringDetails.push(`timeOfDay(+${timeBonus})`);
        }
      }

      if (normalizedUserIngredients.size > 0) {
        const coverage = this.calculateIngredientCoverage(recipe, normalizedUserIngredients);
        const matchCount = Math.round(coverage * recipe.extendedIngredients.length);
        const ingredientMatchScore = matchCount * 4;
        const coverageBonus = Math.min(coverage * 10, 10);
        const totalIngredientScore = ingredientMatchScore + coverageBonus;
        
        if (totalIngredientScore > 0) {
          score += totalIngredientScore;
          scoringDetails.push(`ingredients:${matchCount}/${recipe.extendedIngredients.length}(+${totalIngredientScore.toFixed(1)})`);
        }
      }

      if (boostPreferences.cuisines?.length) {
        const cuisineMatches = recipe.cuisines.filter(c =>
          boostPreferences.cuisines?.some(pref => pref.toLowerCase().trim() === (c ?? '').toLowerCase().trim())
        );
        const cuisineBoost = cuisineMatches.length * 7;
        score += cuisineBoost;
        scoringDetails.push(cuisineMatches.length > 0 ? `cuisine:${cuisineMatches.join(',')}(+${cuisineBoost})` : `cuisine:(+0)`);
      }

      if (boostPreferences.diets?.length) {
        const dietMatches = recipe.diets.filter(d => 
          boostPreferences.diets?.some(pref => pref.toLowerCase() === d.toLowerCase())
        );
        if (dietMatches.length > 0) {
          const dietBoost = dietMatches.length * 25;
          score += dietBoost;
          scoringDetails.push(`diet:${dietMatches.join(',')}(+${dietBoost})`);
        }
      }

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

      if (boostPreferences.timeBuckets?.length) {
        const recipeMinutes = recipe.readyInMinutes;

        for (const prefBucket of boostPreferences.timeBuckets) {
          const [prefMin, prefMax] = prefBucket.split("-").map(Number);

          if (recipeMinutes <= prefMax) {
            score += 20;
            scoringDetails.push(`timeBucket:${prefBucket}(+25)`);
            break; 
          }
        }
      }

      if (boostPreferences.difficulties?.length) {
        // Casting recipe to any to bypass missing 'difficulty' property in type definition
        if (boostPreferences.difficulties.includes((recipe as any).difficulty)) {
          score += 8;
          scoringDetails.push(`difficulty:${(recipe as any).difficulty}(+5)`);
        }
      }
      
      return { 
        recipe, 
        score,
        scoringDetails: scoringDetails.join(', ')
      };
    }).sort((a, b) => b.score - a.score);

    // FIXED: Use scoredResults for iteration and mapping
    scoredResults.slice(0, 5).forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.recipe.title} - Score: ${item.score.toFixed(1)}`);
      if (item.scoringDetails) {
        console.log(`   Scoring: ${item.scoringDetails}`);
      }
    });

    const finalResults = scoredResults.map(item => item.recipe).slice(0, 10);

    console.log("\n✅ Final number of recipes returned:", finalResults.length);
    return finalResults;
  }

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

// ---------- display helpers ----------
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