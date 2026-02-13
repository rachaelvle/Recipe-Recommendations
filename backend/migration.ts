// create the inverted index using SQLite
// this code was written with the assistance of AI
// same code as indexer.ts but it takes from the json with data the API already populated

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import {
  bucketTime,
  computeDifficulty,
  normalizeDiet,
  normalizeText,
} from "./helpers.ts";
import type { Recipe } from "./types.ts";

// configs
const RECIPES_JSON_FILE = path.join(process.cwd(), "recipes.json");
const DB_FILE = path.join(process.cwd(), "recipes.db");

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

  // ============================================
  // INVERTED INDEX TABLES
  // ============================================
  
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

// Load recipes from JSON file
function loadRecipesFromJSON(): Recipe[] {
  console.log(`📖 Reading recipes from ${RECIPES_JSON_FILE}...`);
  
  if (!fs.existsSync(RECIPES_JSON_FILE)) {
    throw new Error(`recipes.json file not found at ${RECIPES_JSON_FILE}`);
  }
  
  const fileContent = fs.readFileSync(RECIPES_JSON_FILE, 'utf-8');
  const recipes: Recipe[] = JSON.parse(fileContent);
  
  console.log(`✅ Loaded ${recipes.length} recipes from JSON file`);
  
  return recipes;
}

async function main() {
  // Initialize SQLite database
  const db = initializeDatabase();
  
  // Load recipes from JSON file
  const recipes = loadRecipesFromJSON();
  
  console.log(`🔄 Starting to index ${recipes.length} recipes...`);
  
  // Use transaction for batch operations (MUCH faster)
  const insertBatch = db.transaction((recipeBatch: Recipe[]) => {
    for (let i = 0; i < recipeBatch.length; i++) {
      const recipe = recipeBatch[i];
      
      // Save recipe to SQLite
      saveRecipeToDB(db, recipe);
      
      // Build inverted indexes
      buildInvertedIndexes(db, recipe);
      
      // Progress indicator every 100 recipes
      if ((i + 1) % 100 === 0) {
        console.log(`   📈 Indexed ${i + 1}/${recipeBatch.length} recipes...`);
      }
    }
  });

  insertBatch(recipes);

  // Get final count
  const finalCount = db.prepare(`SELECT COUNT(*) as count FROM recipes`).get() as any;
  console.log(`✅ Successfully indexed ${finalCount.count} recipes`);

  // Calculate and save IDF statistics
  calculateAndSaveIDFStats(db);

  db.close();
  console.log("✅ Full SQLite indexing complete!");
}

main().catch(console.error);