// This code was created with AI. It requests information from the API and then 
// processes it into inverted indexes that we can use to get results for queries.

import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import {
  bucketTime,
  computeDifficulty,
  normalizeIngredient,
  normalizeString,
  normalizeTitle,
  sleep,
  type IDFStats,
  type Recipe
} from "./helpers.ts";

// configs
const API_KEY = "API KEY";
const RECIPES_PER_REQUEST = 100;
const TOTAL_RECIPES = 150;
const DELAY_BETWEEN_REQUESTS = 1200;

// where to save the data
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

// loading data so we do not save over existing indexes
function loadIndex(filename: string): InvertedIndex {
  const file = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(file)) return {};
  const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
  const idx: InvertedIndex = {};
  Object.entries(raw).forEach(([k, arr]: any) => {
    idx[k] = new Set<number>(arr);
  });
  return idx;
}

function loadRecipes(): Recipe[] {
  if (!fs.existsSync(RECIPES_FILE)) return [];
  return JSON.parse(fs.readFileSync(RECIPES_FILE, "utf-8"));
}

// helpers to add to the indexes
function addToIndex(index: InvertedIndex, key: string, recipeId: number) {
  if (!key) return;
  if (!index[key]) index[key] = new Set<number>();
  index[key].add(recipeId);
}

// after we add to the indexes, we can calculate IDF stats for ranking later
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

// had to get the instructions separately (just for UI)
async function fetchRecipeDetails(recipeId: number): Promise<Partial<Recipe>> {
  const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${API_KEY}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`❌ API Error fetching recipe ${recipeId}: ${res.status}`);
      return {};
    }
    const r: any = await res.json();
    
    return {
      instructions: r.instructions || ""
    };
  } catch (err) {
    console.error(`❌ Error fetching recipe ${recipeId}:`, err);
    return {};
  }
}

async function fetchRecipes(offset = 0, number = RECIPES_PER_REQUEST): Promise<Recipe[]> {
  const url = `https://api.spoonacular.com/recipes/complexSearch?number=${number}&offset=${offset}&addRecipeInformation=true&fillIngredients=true&apiKey=${API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`❌ API Error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data: any = await res.json();
    
    console.log(`API Response: totalResults=${data.totalResults}, returned=${data.results?.length || 0}`);

    const basicRecipes = (data.results || []).map((r: any) => ({
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
      instructions: r.instructions || "",  // Try to get from first call
      summary: r.summary || "",
      servings: r.servings,
      sourceUrl: r.sourceUrl || r.spoonacularSourceUrl
    }));

    return basicRecipes;
  } catch (err) {
    console.error(`Fetch error:`, err);
    return [];
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  let allRecipes: Recipe[] = loadRecipes();
  const seen = new Set(allRecipes.map(r => r.id));

  // Load existing indexes
  Object.assign(ingredientIndex, loadIndex("ingredientIndex.json"));
  Object.assign(cuisineIndex, loadIndex("cuisineIndex.json"));
  Object.assign(dietIndex, loadIndex("dietIndex.json"));
  Object.assign(mealTypeIndex, loadIndex("mealTypeIndex.json"));
  Object.assign(timeBucketIndex, loadIndex("timeBucketIndex.json"));
  Object.assign(difficultyIndex, loadIndex("difficultyIndex.json"));
  Object.assign(titleIndex, loadIndex("titleIndex.json"));

  let offset = allRecipes.length; // Start from where we left off
  
  console.log(`Current recipes: ${allRecipes.length}, Target: ${TOTAL_RECIPES}`);
  
  if (allRecipes.length >= TOTAL_RECIPES) {
    console.log(`Already have ${allRecipes.length} recipes (target: ${TOTAL_RECIPES}). Nothing to fetch.`);
    
    // Recalculate IDF stats even if we didn't fetch new recipes
    console.log("📊 Calculating IDF statistics...");
    const idfStats = calculateIDFStats(allRecipes, titleIndex, ingredientIndex);
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "idfStats.json"),
      JSON.stringify(idfStats, null, 2)
    );
    console.log(`IDF stats calculated: totalDocs=${idfStats.totalDocs}, uniqueTerms=${Object.keys(idfStats.docFrequency).length}`);
    
    console.log("✅ Incremental indexing complete!");
    return;
  }

  while (allRecipes.length < TOTAL_RECIPES) {
    const toFetch = Math.min(RECIPES_PER_REQUEST, TOTAL_RECIPES - allRecipes.length);
    console.log(`🔄 Fetching ${toFetch} recipes from offset ${offset}...`);
    const recipes = await fetchRecipes(offset, toFetch);
    
    if (!recipes.length) {
      console.log(`⚠️ No more recipes available from API`);
      break;
    }
    
    console.log(`✅ Received ${recipes.length} recipes from API`);

    // Index new recipes
    recipes.forEach(recipe => {
      if (seen.has(recipe.id)) return;
      seen.add(recipe.id);
      allRecipes.push(recipe);

      const rid = recipe.id;

      // Index ingredients - index each word separately
      // This allows "chicken" to match "chicken breast", "chicken thigh", etc.
      recipe.extendedIngredients.forEach(ing => {
        const normalized = normalizeIngredient(ing.name);
        const words = normalized.split(/\s+/).filter(w => w.length > 0);
        
        // Index each word separately so partial matches work
        words.forEach(word => {
          addToIndex(ingredientIndex, word, rid);
        });
      });

      // Add other attributes
      recipe.cuisines.map(normalizeString).forEach(c => addToIndex(cuisineIndex, c, rid));
      recipe.diets.map(normalizeString).forEach(d => addToIndex(dietIndex, d, rid));
      recipe.dishTypes.map(normalizeString).forEach(m => addToIndex(mealTypeIndex, m, rid));

      addToIndex(timeBucketIndex, bucketTime(recipe.readyInMinutes), rid);
      addToIndex(difficultyIndex, computeDifficulty(recipe), rid);

      // Add title tokens to index - index each word separately
      const titleNormalized = normalizeTitle(recipe.title);
      const tokens = titleNormalized.split(/\s+/).filter(t => t.length > 0);
      
      // Index each word separately
      tokens.forEach(token => {
        addToIndex(titleIndex, token, rid);
      });
    });

    console.log(`📈 Total recipes now: ${allRecipes.length}/${TOTAL_RECIPES}`);
    offset += recipes.length;
    await sleep(DELAY_BETWEEN_REQUESTS);
  }

  // Save all data
  console.log("💾 Saving indexes...");
  
  fs.writeFileSync(RECIPES_FILE, JSON.stringify(allRecipes, null, 2));

  function saveIndex(index: InvertedIndex, filename: string) {
    const obj: { [key: string]: number[] } = {};
    Object.entries(index).forEach(([k, v]) => (obj[k] = Array.from(v)));
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(obj, null, 2));
  }

  saveIndex(ingredientIndex, "ingredientIndex.json");
  saveIndex(cuisineIndex, "cuisineIndex.json");
  saveIndex(dietIndex, "dietIndex.json");
  saveIndex(mealTypeIndex, "mealTypeIndex.json");
  saveIndex(timeBucketIndex, "timeBucketIndex.json");
  saveIndex(difficultyIndex, "difficultyIndex.json");
  saveIndex(titleIndex, "titleIndex.json");

  // Calculate and save IDF statistics
  console.log("📊 Calculating IDF statistics...");
  const idfStats = calculateIDFStats(allRecipes, titleIndex, ingredientIndex);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "idfStats.json"),
    JSON.stringify(idfStats, null, 2)
  );
  console.log(`IDF stats calculated: totalDocs=${idfStats.totalDocs}, uniqueTerms=${Object.keys(idfStats.docFrequency).length}`);

  console.log("✅ Incremental indexing complete!");
}

main().catch(console.error);