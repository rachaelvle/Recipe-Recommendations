// search engine and methods
// written using AI assistance 
// filters out allergies and boosts recipes according to filters

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

// Internal interface for sorting logic
interface ScoredRecipe {
  recipe: Recipe;
  score: number;
  scoringDetails: string;
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

  private getIDF(term: string, totalDocs: number): number {
    const idfRow = this.db.prepare(`
      SELECT doc_frequency FROM idf_stats WHERE term = ?
    `).get(term) as any;
    
    if (!idfRow) return 0;
    const docFrequency = idfRow.doc_frequency;
    return Math.log(totalDocs / docFrequency);
  }

  private calculateTitleIDF(recipeId: number, titleKeywords: string[], totalDocs: number): number {
    let totalScore = 0;
    const titleRow = this.db.prepare(`
      SELECT word FROM idx_title WHERE recipeId = ?
    `).all(recipeId) as any[];
    
    const recipeWords = new Set(titleRow.map(row => row.word));
    for (const keyword of titleKeywords) {
      if (recipeWords.has(keyword)) {
        totalScore += this.getIDF(keyword, totalDocs);
      }
    }
    return totalScore;
  }

  /**
   * Get a single recipe by ID - MADE PUBLIC FOR API ACCESS
   */
  public getRecipeById(id: number): Recipe | null {
    const row = this.db.prepare(`SELECT * FROM recipes WHERE id = ?`).get(id) as any;
    if (!row) return null;

    const cuisines = this.db.prepare(`SELECT cuisine FROM idx_cuisine WHERE recipeId = ?`).all(id) as any[];
    const diets = this.db.prepare(`SELECT diet FROM idx_diet WHERE recipeId = ?`).all(id) as any[];
    const dishTypes = this.db.prepare(`SELECT dishType FROM idx_dishType WHERE recipeId = ?`).all(id) as any[];
    const difficultyRow = this.db.prepare(`SELECT difficulty FROM idx_difficulty WHERE recipeId = ?`).get(id) as any;
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

  private getRecipesByIds(ids: number[]): Recipe[] {
    if (ids.length === 0) return [];
    const recipes: Recipe[] = [];
    for (const id of ids) {
      const recipe = this.getRecipeById(id);
      if (recipe) recipes.push(recipe);
    }
    return recipes;
  }

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

    const difficultyWords = ['easy', 'medium', 'hard', 'simple', 'quick', 'difficult'];
    const querySpecificWords = new Set([
      'recipe', 'recipes', 'make', 'cooking', 'with',
      ...cuisines,
      ...diets.map(d => d.split(' ')).flat(),
      ...mealTypes.map(m => m.split(' ')).flat(),
      ...difficultyWords
    ]);
    
    const words = normalized.split(/\s+/).filter(w => !querySpecificWords.has(w) && w.length > 0);
    const searchTerm = words.join(' ');
    return {
      ingredients: searchTerm ? [searchTerm] : [],
      titleKeywords: words,
      implicitPreferences
    };
  }

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

  private calculateIngredientCoverage(recipe: Recipe, userIngredients: Set<string>): number {
    if (userIngredients.size === 0 || recipe.extendedIngredients.length === 0) return 0;
    const matchCount = recipe.extendedIngredients.filter(ing => {
      const normalizedIng = normalizeText(ing.name);
      return Array.from(userIngredients).some(userIng => 
        normalizedIng.includes(userIng) || userIng.includes(normalizedIng)
      );
    }).length;
    return matchCount / recipe.extendedIngredients.length;
  }

  /**
   * Main Search Function
   */
  search(params: EnhancedSearchParams): Recipe[] {
    let searchIngredients: string[] = [];
    let titleSearchKeywords: string[] = [];
    let implicitPreferences: Partial<Filters> = {};
    let userAllergies: string[] = [];
    let userIngredients: string[] = [];
    let userPreferences: any = null;

    if (params.userId) {
      const profile = this.userDb.getUserProfile(params.userId);
      if (profile) {
        userAllergies = profile.allergies.map(a => normalizeText(a.allergen));
        userIngredients = profile.ingredients.map(i => normalizeText(i.ingredient));
        userPreferences = profile.preferences;
      }
    }

    const ingredientsToUse = [...(params.userIngredients || []), ...userIngredients].filter((v, i, a) => a.indexOf(v) === i);

    if (params.searchQuery?.trim()) {
      const parsed = this.parseSearchQuery(params.searchQuery);
      searchIngredients = parsed.ingredients;
      titleSearchKeywords = parsed.titleKeywords;
      implicitPreferences = parsed.implicitPreferences;
    }

    const explicitFilters: Filters = params.filters || {};
    const conditions: string[] = [];
    const sqlParams: any[] = [];

    // SQL Filter Construction
    if (searchIngredients.length > 0) {
      const allWords: string[] = [];
      searchIngredients.forEach(ing => allWords.push(...normalizeText(ing).split(/\s+/).filter(Boolean)));
      if (allWords.length > 0) {
        const placeholders = allWords.map(() => '?').join(',');
        conditions.push(`(id IN (SELECT DISTINCT recipeId FROM idx_title WHERE word IN (${placeholders})) OR id IN (SELECT DISTINCT recipeId FROM idx_ingredients WHERE word IN (${placeholders})))`);
        sqlParams.push(...allWords, ...allWords);
      }
    }

    // Hard Filters
    if (explicitFilters.cuisines?.length) {
      conditions.push(`id IN (SELECT recipeId FROM idx_cuisine WHERE cuisine IN (${explicitFilters.cuisines.map(() => '?').join(',')}))`);
      sqlParams.push(...explicitFilters.cuisines.map(c => c.toLowerCase()));
    }
    if (explicitFilters.diets?.length) {
      conditions.push(`id IN (SELECT recipeId FROM idx_diet WHERE diet IN (${explicitFilters.diets.map(() => '?').join(',')}))`);
      sqlParams.push(...explicitFilters.diets.map(d => d.toLowerCase()));
    }

    let query = `SELECT DISTINCT id FROM recipes`;
    if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ` LIMIT 500`;

    const rows = this.db.prepare(query).all(...sqlParams) as any[];
    let recipes = this.getRecipesByIds(rows.map(r => r.id));

    // Safety Filter
    if (userAllergies.length > 0) {
      recipes = recipes.filter(r => !this.containsAllergens(r, userAllergies));
    }

    // Ranking Logic
    const totalDocs = (this.db.prepare(`SELECT COUNT(*) as count FROM recipes`).get() as any).count;
    const filterEmpty = (arr: string[] | undefined) => (arr ?? []).filter(Boolean).map(s => s.trim()).filter(Boolean);
    
    const boostPreferences = {
      cuisines: filterEmpty(implicitPreferences.cuisines || userPreferences?.defaultCuisines),
      diets: filterEmpty(implicitPreferences.diets || userPreferences?.defaultDiets),
      mealTypes: filterEmpty(implicitPreferences.mealTypes || userPreferences?.defaultMealTypes),
      timeBuckets: filterEmpty(implicitPreferences.timeBuckets || userPreferences?.defaultTimeBuckets),
      difficulties: filterEmpty(implicitPreferences.difficulties || userPreferences?.defaultDifficulties)
    };

    const normalizedKeywords = titleSearchKeywords.map(kw => normalizeText(kw)).filter(Boolean);
    const normalizedUserIngredients = new Set(ingredientsToUse.map(ing => normalizeText(ing)));

    const scoredResults: ScoredRecipe[] = recipes.map(recipe => {
      let score = 0;
      const details: string[] = [];

      if (normalizedKeywords.length > 0) {
        const idf = this.calculateTitleIDF(recipe.id, normalizedKeywords, totalDocs) * 25;
        score += idf;
        if (idf > 0) details.push(`title_idf(+${idf.toFixed(1)})`);
      }

      if (normalizedUserIngredients.size > 0) {
        const coverage = this.calculateIngredientCoverage(recipe, normalizedUserIngredients);
        const coverageScore = (Math.round(coverage * recipe.extendedIngredients.length) * 4) + Math.min(coverage * 10, 10);
        score += coverageScore;
        if (coverageScore > 0) details.push(`pantry(+${coverageScore.toFixed(1)})`);
      }

      // Diet Boost (High priority)
      const dietMatches = recipe.diets.filter(d => boostPreferences.diets.some(pref => pref.toLowerCase() === d.toLowerCase()));
      if (dietMatches.length > 0) {
        score += (dietMatches.length * 25);
        details.push(`diet(+${dietMatches.length * 25})`);
      }

      return { recipe, score, scoringDetails: details.join(', ') };
    });

    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.map(item => ({
      ...item.recipe,
      score: item.score,
      scoringDetails: item.scoringDetails
    })).slice(0, 10);
  }

  private getTimeOfDayBonus(recipe: Recipe): number {
    const hour = new Date().getHours();
    let timeRange = hour < 12 ? 'morning' : (hour >= 17 ? 'evening' : 'afternoon');
    let bonus = 0;
    const mealTypeScores: any = {
        breakfast: { morning: 10, afternoon: 0, evening: 0 },
        lunch: { morning: 2, afternoon: 10, evening: 2 },
        dinner: { morning: 0, afternoon: 3, evening: 10 }
    };
    recipe.dishTypes.forEach(type => {
      const score = mealTypeScores[type.toLowerCase()]?.[timeRange];
      if (score) bonus += score;
    });
    return bonus;
  }

  close() {
    this.db.close();
    this.userDb.close();
  }
}

export { EnhancedRecipeSearchEngine };