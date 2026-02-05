// Simplified indexer that reads from existing recipes.json
// and creates inverted indexes

import fs from "fs";
import path from "path";
import {
  bucketTime,
  computeDifficulty,
  normalizeIngredient,
  normalizeString,
  normalizeTitle,
  type IDFStats,
  type Recipe
} from "./helpers.ts";

// where to save the indexes
const OUTPUT_DIR = path.join(process.cwd(), "indexes");
const RECIPES_FILE = path.join(process.cwd(), "recipes.json");

type InvertedIndex = { [key: string]: Set<number> };

const ingredientIndex: InvertedIndex = {};
const cuisineIndex: InvertedIndex = {};
const dietIndex: InvertedIndex = {};
const mealTypeIndex: InvertedIndex = {};
const timeBucketIndex: InvertedIndex = {};
const difficultyIndex: InvertedIndex = {};
const titleIndex: InvertedIndex = {};

// helper to add to the indexes
function addToIndex(index: InvertedIndex, key: string, recipeId: number) {
  if (!key) return;
  if (!index[key]) index[key] = new Set<number>();
  index[key].add(recipeId);
}

// calculate IDF stats for ranking
function calculateIDFStats(recipes: Recipe[], titleIndex: InvertedIndex, ingredientIndex: InvertedIndex): IDFStats {
  const stats: IDFStats = {
    totalDocs: recipes.length,
    docFrequency: {}
  };

  // for titles
  Object.entries(titleIndex).forEach(([term, recipeIds]) => {
    stats.docFrequency[term] = recipeIds.size;
  });

  // for ingredients
  Object.entries(ingredientIndex).forEach(([ingredient, recipeIds]) => {
    stats.docFrequency[ingredient] = recipeIds.size;
  });

  return stats;
}

function main() {
  console.log("🔄 Reading recipes from recipes.json...");
  
  // Check if recipes.json exists
  if (!fs.existsSync(RECIPES_FILE)) {
    console.error(`❌ Error: ${RECIPES_FILE} not found!`);
    console.error("Please make sure recipes.json is in the current directory.");
    process.exit(1);
  }

  // Read and parse recipes
  let allRecipes: Recipe[];
  try {
    const rawData = fs.readFileSync(RECIPES_FILE, "utf-8");
    allRecipes = JSON.parse(rawData);
    console.log(`✅ Loaded ${allRecipes.length} recipes from file`);
  } catch (error) {
    console.error("❌ Error reading or parsing recipes.json:", error);
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }

  console.log("🔨 Building inverted indexes...");

  // Index all recipes
  allRecipes.forEach((recipe, idx) => {
    const rid = recipe.id;

    // Progress indicator
    if ((idx + 1) % 10 === 0) {
      process.stdout.write(`\r   Indexing recipe ${idx + 1}/${allRecipes.length}...`);
    }

    // Index ingredients - each word separately
    // This allows "chicken" to match "chicken breast"
    if (recipe.extendedIngredients && Array.isArray(recipe.extendedIngredients)) {
      recipe.extendedIngredients.forEach(ing => {
        const normalized = normalizeIngredient(ing.name);
        const words = normalized.split(/\s+/).filter(w => w.length > 0);
        
        // Index each word separately so partial matches work
        words.forEach(word => {
          addToIndex(ingredientIndex, word, rid);
        });
      });
    }

    // Add cuisines
    if (recipe.cuisines && Array.isArray(recipe.cuisines)) {
      recipe.cuisines.map(normalizeString).forEach(c => addToIndex(cuisineIndex, c, rid));
    }

    // Add diets
    if (recipe.diets && Array.isArray(recipe.diets)) {
      recipe.diets.map(normalizeString).forEach(d => addToIndex(dietIndex, d, rid));
    }

    // Add dish types (meal types)
    if (recipe.dishTypes && Array.isArray(recipe.dishTypes)) {
      recipe.dishTypes.map(normalizeString).forEach(m => addToIndex(mealTypeIndex, m, rid));
    }

    // Add time bucket
    addToIndex(timeBucketIndex, bucketTime(recipe.readyInMinutes), rid);

    // Add difficulty
    addToIndex(difficultyIndex, computeDifficulty(recipe), rid);

    // Add title tokens - each word separately
    const titleNormalized = normalizeTitle(recipe.title);
    const tokens = titleNormalized.split(/\s+/).filter(t => t.length > 0);
    
    // Index each word separately
    tokens.forEach(token => {
      addToIndex(titleIndex, token, rid);
    });
  });

  console.log(`\n✅ Indexed all ${allRecipes.length} recipes`);

  // Save all indexes
  console.log("💾 Saving indexes...");
  
  function saveIndex(index: InvertedIndex, filename: string) {
    const obj: { [key: string]: number[] } = {};
    Object.entries(index).forEach(([k, v]) => (obj[k] = Array.from(v)));
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(obj, null, 2));
  }

  saveIndex(ingredientIndex, "ingredientIndex.json");
  console.log(`   ✓ ingredientIndex.json (${Object.keys(ingredientIndex).length} unique ingredients)`);
  
  saveIndex(cuisineIndex, "cuisineIndex.json");
  console.log(`   ✓ cuisineIndex.json (${Object.keys(cuisineIndex).length} cuisines)`);
  
  saveIndex(dietIndex, "dietIndex.json");
  console.log(`   ✓ dietIndex.json (${Object.keys(dietIndex).length} diets)`);
  
  saveIndex(mealTypeIndex, "mealTypeIndex.json");
  console.log(`   ✓ mealTypeIndex.json (${Object.keys(mealTypeIndex).length} meal types)`);
  
  saveIndex(timeBucketIndex, "timeBucketIndex.json");
  console.log(`   ✓ timeBucketIndex.json (${Object.keys(timeBucketIndex).length} time buckets)`);
  
  saveIndex(difficultyIndex, "difficultyIndex.json");
  console.log(`   ✓ difficultyIndex.json (${Object.keys(difficultyIndex).length} difficulty levels)`);
  
  saveIndex(titleIndex, "titleIndex.json");
  console.log(`   ✓ titleIndex.json (${Object.keys(titleIndex).length} unique title words)`);

  // Calculate and save IDF statistics
  console.log("📊 Calculating IDF statistics...");
  const idfStats = calculateIDFStats(allRecipes, titleIndex, ingredientIndex);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "idfStats.json"),
    JSON.stringify(idfStats, null, 2)
  );
  console.log(`   ✓ idfStats.json (totalDocs=${idfStats.totalDocs}, uniqueTerms=${Object.keys(idfStats.docFrequency).length})`);

  // Print summary statistics
  console.log("\n📈 Index Statistics:");
  console.log(`   Total Recipes: ${allRecipes.length}`);
  console.log(`   Unique Ingredients: ${Object.keys(ingredientIndex).length}`);
  console.log(`   Unique Title Words: ${Object.keys(titleIndex).length}`);
  console.log(`   Cuisines: ${Object.keys(cuisineIndex).length}`);
  console.log(`   Diets: ${Object.keys(dietIndex).length}`);
  console.log(`   Meal Types: ${Object.keys(mealTypeIndex).length}`);

  console.log("\n✅ Indexing complete! Indexes saved to:", OUTPUT_DIR);
  console.log("\n💡 You can now run the searcher to query your recipes!");
}

// Run the indexer
main();
