// create the inverted index using SQLite
// this code was written with the assistance of AI

import Database from "better-sqlite3";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import {
  bucketTime,
  computeDifficulty,
  normalizeDiet,
  normalizeText,
  sleep
} from "./helpers.ts";
import type { Recipe } from "./types.ts";

// configs
const API_KEY = "769b508368724a7c8195f705fca8261c";
const RECIPES_PER_REQUEST = 100;
const ADDITIONAL_RECIPES = 500; // How many NEW recipes to fetch
const DELAY_BETWEEN_REQUESTS = 1200;

// Tags to rotate through to maximize unique recipes from /recipes/random
const TAGS = [
  "gluten free", "ketogenic", "lacto-vegetarian", "ovo-vegetarian", "pescetarian", "paleo", "primal", "whole30"
];

// where to save the data
const DB_FILE = path.join(process.cwd(), "recipes.db");
const RECIPES_JSON_FILE = path.join(process.cwd(), "recipes.json");

// Initialize SQLite database with inverted index tables
function initializeDatabase(): Database.Database {
  const db = new Database(DB_FILE);
  
  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');
  
  // Create entire recipe table
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      readyInMinutes INTEGER,
      image TEXT,
      imageType TEXT,
      summary TEXT,
      servings INTEGER,
      sourceUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create ingredients table (stores full ingredient details)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId INTEGER,
      ingredientId INTEGER,
      name TEXT NOT NULL,
      amount REAL,
      unit TEXT,
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  // INVERTED INDEX TABLES
  // Cuisine index: cuisine -> recipe IDs
  db.exec(`
    CREATE TABLE IF NOT EXISTS idx_cuisine (
      cuisine TEXT NOT NULL,
      recipeId INTEGER NOT NULL,
      PRIMARY KEY (cuisine, recipeId),
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  // Diet index: diet -> recipe IDs
  db.exec(`
    CREATE TABLE IF NOT EXISTS idx_diet (
      diet TEXT NOT NULL,
      recipeId INTEGER NOT NULL,
      PRIMARY KEY (diet, recipeId),
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  // Dish type index: dishType -> recipe IDs
  db.exec(`
    CREATE TABLE IF NOT EXISTS idx_dishType (
      dishType TEXT NOT NULL,
      recipeId INTEGER NOT NULL,
      PRIMARY KEY (dishType, recipeId),
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);
  
  // Ingredient index: word -> recipe IDs
  db.exec(`
    CREATE TABLE IF NOT EXISTS idx_ingredients (
      word TEXT NOT NULL,
      recipeId INTEGER NOT NULL,
      PRIMARY KEY (word, recipeId),
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  // Title index: word -> recipe IDs
  db.exec(`
    CREATE TABLE IF NOT EXISTS idx_title (
      word TEXT NOT NULL,
      recipeId INTEGER NOT NULL,
      PRIMARY KEY (word, recipeId),
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  // Time bucket index
  db.exec(`
    CREATE TABLE IF NOT EXISTS idx_time_bucket (
      bucket TEXT NOT NULL,
      recipeId INTEGER NOT NULL,
      PRIMARY KEY (bucket, recipeId),
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  // Difficulty index
  db.exec(`
    CREATE TABLE IF NOT EXISTS idx_difficulty (
      difficulty TEXT NOT NULL,
      recipeId INTEGER NOT NULL,
      PRIMARY KEY (difficulty, recipeId),
      FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  // IDF statistics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS idf_stats (
      term TEXT PRIMARY KEY,
      doc_frequency INTEGER NOT NULL
    )
  `);

  // Create indexes for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ingredients_recipeId ON ingredients(recipeId);
    
    -- Inverted index lookups (optimized for search)
    CREATE INDEX IF NOT EXISTS idx_cuisine_lookup ON idx_cuisine(cuisine);
    CREATE INDEX IF NOT EXISTS idx_diet_lookup ON idx_diet(diet);
    CREATE INDEX IF NOT EXISTS idx_dishType_lookup ON idx_dishType(dishType);
    CREATE INDEX IF NOT EXISTS idx_ingredients_word ON idx_ingredients(word);
    CREATE INDEX IF NOT EXISTS idx_title_word ON idx_title(word);
    CREATE INDEX IF NOT EXISTS idx_time_bucket_bucket ON idx_time_bucket(bucket);
    CREATE INDEX IF NOT EXISTS idx_difficulty_difficulty ON idx_difficulty(difficulty);
  `);

  return db;
}

// Save recipe to SQLite
function saveRecipeToDB(db: Database.Database, recipe: Recipe) {
  // Insert main recipe data
  const insertRecipe = db.prepare(`
    INSERT OR REPLACE INTO recipes (id, title, readyInMinutes, image, imageType, summary, servings, sourceUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertRecipe.run(
    recipe.id,
    recipe.title,
    recipe.readyInMinutes,
    recipe.image,
    recipe.imageType,
    recipe.summary,
    recipe.servings,
    recipe.sourceUrl
  );

  // Clear and insert ingredients (full details for display)
  db.prepare(`DELETE FROM ingredients WHERE recipeId = ?`).run(recipe.id);
  const insertIngredient = db.prepare(`
    INSERT INTO ingredients (recipeId, ingredientId, name, amount, unit)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  for (const ing of recipe.extendedIngredients) {
    insertIngredient.run(recipe.id, ing.id, ing.name, ing.amount, ing.unit);
  }
}

// Build inverted indexes in SQLite
function buildInvertedIndexes(db: Database.Database, recipe: Recipe) {
  const rid = recipe.id;

  // Clear existing indexes for this recipe
  db.prepare(`DELETE FROM idx_cuisine WHERE recipeId = ?`).run(rid);
  db.prepare(`DELETE FROM idx_diet WHERE recipeId = ?`).run(rid);
  db.prepare(`DELETE FROM idx_dishType WHERE recipeId = ?`).run(rid);
  db.prepare(`DELETE FROM idx_ingredients WHERE recipeId = ?`).run(rid);
  db.prepare(`DELETE FROM idx_title WHERE recipeId = ?`).run(rid);
  db.prepare(`DELETE FROM idx_time_bucket WHERE recipeId = ?`).run(rid);
  db.prepare(`DELETE FROM idx_difficulty WHERE recipeId = ?`).run(rid);

  // Index cuisines
  const insertCuisineIdx = db.prepare(`
    INSERT OR IGNORE INTO idx_cuisine (cuisine, recipeId) VALUES (?, ?)
  `);
  recipe.cuisines.forEach(cuisine => {
    insertCuisineIdx.run(cuisine.toLowerCase(), rid);
  });

  // Index diets
  const insertDietIdx = db.prepare(`
    INSERT OR IGNORE INTO idx_diet (diet, recipeId) VALUES (?, ?)
  `);
  recipe.diets.forEach(diet => {
    insertDietIdx.run(normalizeDiet(diet).toLowerCase(), rid);
  });

  // Index dish types
  const insertDishTypeIdx = db.prepare(`
    INSERT OR IGNORE INTO idx_dishType (dishType, recipeId) VALUES (?, ?)
  `);
  recipe.dishTypes.forEach(dishType => {
    insertDishTypeIdx.run(dishType.toLowerCase(), rid);
  });

  // Index ingredients - each word separately
  const insertIngredientIdx = db.prepare(`
    INSERT OR IGNORE INTO idx_ingredients (word, recipeId) VALUES (?, ?)
  `);
  
  recipe.extendedIngredients.forEach(ing => {
    const normalized = normalizeText(ing.name);
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    
    words.forEach(word => {
      insertIngredientIdx.run(word, rid);
    });
  });

  // Index title - each word separately
  const insertTitleIdx = db.prepare(`
    INSERT OR IGNORE INTO idx_title (word, recipeId) VALUES (?, ?)
  `);
  
  const titleNormalized = normalizeText(recipe.title);
  const tokens = titleNormalized.split(/\s+/).filter(t => t.length > 0);
  
  tokens.forEach(token => {
    insertTitleIdx.run(token, rid);
  });

  // Index time bucket
  const insertTimeBucket = db.prepare(`
    INSERT OR IGNORE INTO idx_time_bucket (bucket, recipeId) VALUES (?, ?)
  `);
  insertTimeBucket.run(bucketTime(recipe.readyInMinutes), rid);

  // Index difficulty
  const insertDifficulty = db.prepare(`
    INSERT OR IGNORE INTO idx_difficulty (difficulty, recipeId) VALUES (?, ?)
  `);
  insertDifficulty.run(computeDifficulty(recipe), rid);
}

// Append new recipes to recipes.json (merge by id, then write)
function saveRecipesToJSON(newRecipes: Recipe[]) {
  if (newRecipes.length === 0) return;
  let existing: Recipe[] = [];
  if (fs.existsSync(RECIPES_JSON_FILE)) {
    const raw = fs.readFileSync(RECIPES_JSON_FILE, "utf-8");
    try {
      existing = JSON.parse(raw);
    } catch {
      console.warn("⚠️ recipes.json parse failed, starting fresh");
    }
  }
  const byId = new Map<number, Recipe>();
  existing.forEach((r) => byId.set(r.id, r));
  newRecipes.forEach((r) => byId.set(r.id, r));
  const merged = Array.from(byId.values()).sort((a, b) => a.id - b.id);
  fs.writeFileSync(RECIPES_JSON_FILE, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`📄 Wrote ${merged.length} recipes to ${RECIPES_JSON_FILE} (+${newRecipes.length} new)`);
}

// Calculate and save IDF statistics
function calculateAndSaveIDFStats(db: Database.Database) {
  const totalDocs = db.prepare(`SELECT COUNT(*) as count FROM recipes`).get() as any;
  
  console.log("📊 Calculating IDF statistics...");
  
  // Clear existing IDF stats
  db.prepare(`DELETE FROM idf_stats`).run();
  
  // Use a transaction to combine both ingredient and title stats
  const insertIDF = db.transaction((stats: Array<{ term: string; freq: number }>) => {
    const stmt = db.prepare(`INSERT OR IGNORE INTO idf_stats (term, doc_frequency) VALUES (?, ?)`);
    
    for (const stat of stats) {
      stmt.run(stat.term, stat.freq);
    }
  });
  
  // Get all unique terms with their frequencies
  const allStats = db.prepare(`
    SELECT word as term, COUNT(DISTINCT recipeId) as freq 
    FROM (
      SELECT word, recipeId FROM idx_ingredients
      UNION
      SELECT word, recipeId FROM idx_title
    ) combined
    GROUP BY term
  `).all() as Array<{ term: string; freq: number }>;
  
  insertIDF(allStats);
  
  console.log(`   ✅ IDF stats: totalDocs=${totalDocs.count}, uniqueTerms=${allStats.length}`);
}

// Fetch random recipes from API (bypasses the offset=1000 limit)
async function fetchRecipes(number = RECIPES_PER_REQUEST, tag?: string): Promise<Recipe[]> {
  // /recipes/random max is 100 per call
  const batchSize = Math.min(number, 100);
  const tagParam = tag ? `&tags=${encodeURIComponent(tag)}` : "";
  const url = `https://api.spoonacular.com/recipes/random?number=${batchSize}&addRecipeInformation=true&fillIngredients=true${tagParam}&apiKey=${API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`❌ API Error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data: any = await res.json();

    // /recipes/random returns { recipes: [...] } not { results: [...] }
    const results = data.recipes || [];
    console.log(`API Response: returned=${results.length}`);

    return results.map((r: any) => ({
      id: r.id,
      title: r.title,
      readyInMinutes: r.readyInMinutes,
      cuisines: r.cuisines || [],
      dishTypes: r.dishTypes || [],
      diets: r.diets || [],
      extendedIngredients: (r.extendedIngredients || []).map((ing: any) => ({
        id: ing.id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit
      })),
      image: r.image,
      imageType: r.imageType,
      summary: r.summary || "",
      servings: r.servings,
      sourceUrl: r.sourceUrl || r.spoonacularSourceUrl
    }));
  } catch (err) {
    console.error(`Fetch error:`, err);
    return [];
  }
}

async function main() {
  // Initialize SQLite database
  const db = initializeDatabase();
  
  // Check existing recipe count
  const countResult = db.prepare(`SELECT COUNT(*) as count FROM recipes`).get() as any;
  const initialCount = countResult.count;
  
  console.log(`📊 Current recipes in database: ${initialCount}`);
  console.log(`🎯 Target: Add ${ADDITIONAL_RECIPES} new recipes`);
  
  let newRecipesAdded = 0;
  const allNewRecipes: Recipe[] = []; // collect for recipes.json
  let apiCallsWithoutNewRecipes = 0;
  const MAX_ATTEMPTS_WITHOUT_NEW = 20; // Stop if we make 20 calls without finding new recipes
  let tagIndex = 0;

  while (newRecipesAdded < ADDITIONAL_RECIPES) {
    const toFetch = Math.min(RECIPES_PER_REQUEST, ADDITIONAL_RECIPES - newRecipesAdded);
    const currentTag = TAGS[tagIndex % TAGS.length];
    tagIndex++;
    console.log(`\n🔄 Fetching ${toFetch} random recipes (tag: "${currentTag}")...`);
    const recipes = await fetchRecipes(toFetch, currentTag);
    
    if (!recipes.length) {
      console.log(`⚠️ No more recipes available from API`);
      break;
    }
    
    console.log(`✅ Received ${recipes.length} recipes from API`);

    // Track how many are actually new
    let batchNewCount = 0;

    // Use transaction for batch operations (MUCH faster)
    const insertBatch = db.transaction((recipeBatch: Recipe[]) => {
      for (const recipe of recipeBatch) {
        // Check if recipe already exists
        const exists = db.prepare(`SELECT id FROM recipes WHERE id = ?`).get(recipe.id);
        if (exists) {
          console.log(`   ⏭️  Recipe ${recipe.id} already exists, skipping...`);
          continue;
        }
        
        // Save recipe to SQLite
        saveRecipeToDB(db, recipe);
        
        // Build inverted indexes
        buildInvertedIndexes(db, recipe);
        
        allNewRecipes.push(recipe);
        batchNewCount++;
      }
    });

    insertBatch(recipes);

    newRecipesAdded += batchNewCount;
    
    console.log(`📈 New recipes added this batch: ${batchNewCount}`);
    console.log(`📊 Total new recipes added: ${newRecipesAdded}/${ADDITIONAL_RECIPES}`);
    
    // Track attempts without new recipes
    if (batchNewCount === 0) {
      apiCallsWithoutNewRecipes++;
      console.log(`⚠️  No new recipes in this batch (attempt ${apiCallsWithoutNewRecipes}/${MAX_ATTEMPTS_WITHOUT_NEW})`);
      
      if (apiCallsWithoutNewRecipes >= MAX_ATTEMPTS_WITHOUT_NEW) {
        console.log(`❌ Made ${MAX_ATTEMPTS_WITHOUT_NEW} API calls without finding new recipes. Stopping.`);
        break;
      }
    } else {
      // Reset counter if we found new recipes
      apiCallsWithoutNewRecipes = 0;
    }
    
    await sleep(DELAY_BETWEEN_REQUESTS);
  }

  // Get final count
  const finalCountResult = db.prepare(`SELECT COUNT(*) as count FROM recipes`).get() as any;
  const finalCount = finalCountResult.count;
  
  console.log(`\n✅ Indexing complete!`);
  console.log(`   Initial recipes: ${initialCount}`);
  console.log(`   New recipes added: ${newRecipesAdded}`);
  console.log(`   Final total: ${finalCount}`);

  // Write new recipes to recipes.json so migration/backup stays in sync
  saveRecipesToJSON(allNewRecipes);

  // Calculate and save IDF statistics
  console.log("\n📊 Recalculating IDF statistics for all recipes...");
  calculateAndSaveIDFStats(db);

  db.close();
  console.log("✅ Done!");
}

main().catch(console.error);