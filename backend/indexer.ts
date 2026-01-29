import fs from "fs";
import fetch from "node-fetch";
import path from "path";

// ---------- TYPES ----------
interface Ingredient {
  id: number;
  name: string;
  amount?: number;
  unit?: string;
}

interface Recipe {
  id: number;
  title: string;
  readyInMinutes: number;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  extendedIngredients: Ingredient[];
  image?: string;
  imageType?: string;
  instructions?: string;
  summary?: string;
  servings?: number;
  sourceUrl?: string;
}

// ---------- CONFIG ----------
const API_KEY = "6699f0736631455585c44eca8c953bde";
const RECIPES_PER_REQUEST = 100;
const TOTAL_RECIPES = 150; // Safe for free tier (150 points/day)
const DELAY_BETWEEN_REQUESTS = 1200; // 1.2 seconds between requests
const OUTPUT_DIR = path.join(process.cwd(), "indexes");
const RECIPES_FILE = path.join(process.cwd(), "recipes.json");

// ---------- UTILITY FUNCTIONS ----------
function normalizeString(str: string | undefined): string {
  return (str || "").toLowerCase().trim();
}

function bucketTime(minutes: number): string {
  if (minutes <= 15) return "0-15";
  if (minutes <= 30) return "16-30";
  if (minutes <= 60) return "31-60";
  return "60+";
}

function computeDifficulty(recipe: Recipe): string {
  const numIngredients = recipe.extendedIngredients?.length || 0;
  const time = recipe.readyInMinutes || 0;
  if (numIngredients <= 7 && time <= 30) return "easy";
  if (numIngredients <= 12 && time <= 60) return "medium";
  return "hard";
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------- INDEX TYPES ----------
type InvertedIndex = { [key: string]: Set<number> };
type TitleIndex = { [token: string]: { id: number; tf: number }[] };

// ---------- INITIALIZE INDEXES ----------
const ingredientIndex: InvertedIndex = {};
const cuisineIndex: InvertedIndex = {};
const dietIndex: InvertedIndex = {};
const mealTypeIndex: InvertedIndex = {};
const timeBucketIndex: InvertedIndex = {};
const difficultyIndex: InvertedIndex = {};
const titleIndex: TitleIndex = {};

// ---------- HELPERS ----------
function addToIndex(index: InvertedIndex, key: string, recipeId: number) {
  if (!key) return;
  if (!index[key]) index[key] = new Set<number>();
  index[key].add(recipeId);
}

function addToTitleIndex(titleIndex: TitleIndex, recipeId: number, tokens: string[]) {
  tokens.forEach(token => {
    if (!titleIndex[token]) titleIndex[token] = [];
    titleIndex[token].push({ id: recipeId, tf: 1 });
  });
}

// ---------- FETCH RECIPES ----------
async function fetchRecipes(offset = 0, number = RECIPES_PER_REQUEST): Promise<Recipe[]> {
  const url = `https://api.spoonacular.com/recipes/complexSearch?number=${number}&offset=${offset}&addRecipeInformation=true&fillIngredients=true&apiKey=${API_KEY}`;
  
  try {
    console.log(`  API Request: offset=${offset}, number=${number}`);
    const res = await fetch(url);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API Error (${res.status}): ${errorText}`);
      return [];
    }
    
    const data: any = await res.json();
    
    return (data.results || []).map((r: any) => ({
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
      instructions: r.instructions || "",
      summary: r.summary || "",
      servings: r.servings,
      sourceUrl: r.sourceUrl || r.spoonacularSourceUrl
    }));
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}

// ---------- MAIN FUNCTION ----------
async function main() {
  console.log("🍳 Starting recipe indexer...");
  console.log(`📊 Target: ${TOTAL_RECIPES} recipes\n`);

  const allRecipes: Recipe[] = [];
  let fetched = 0;
  let offset = 0;
  let requestCount = 0;

  while (fetched < TOTAL_RECIPES) {
    const remaining = TOTAL_RECIPES - fetched;
    const toFetch = Math.min(RECIPES_PER_REQUEST, remaining);
    
    console.log(`Fetching batch ${requestCount + 1}: recipes ${offset + 1} to ${offset + toFetch}...`);
    const recipes: Recipe[] = await fetchRecipes(offset, toFetch);
    if (!recipes.length) break;

    allRecipes.push(...recipes);

    // Index recipes immediately
    recipes.forEach(recipe => {
      const rid = recipe.id;

      // Ingredients
      (recipe.extendedIngredients || []).forEach(ing => {
        addToIndex(ingredientIndex, normalizeString(ing.name), rid);
      });

      // Cuisine
      (recipe.cuisines || []).map(normalizeString).forEach(c => addToIndex(cuisineIndex, c, rid));

      // Diet
      (recipe.diets || []).map(normalizeString).forEach(d => addToIndex(dietIndex, d, rid));

      // Meal Type
      (recipe.dishTypes || []).map(normalizeString).forEach(m => addToIndex(mealTypeIndex, m, rid));

      // Cooking Time bucket
      const bucket = bucketTime(recipe.readyInMinutes);
      addToIndex(timeBucketIndex, bucket, rid);

      // Difficulty
      const diff = computeDifficulty(recipe);
      addToIndex(difficultyIndex, diff, rid);

      // Title tokens
      const tokens = recipe.title.split(/\s+/).map(normalizeString);
      addToTitleIndex(titleIndex, rid, tokens);
    });

    fetched += recipes.length;
    offset += recipes.length;
    requestCount++;
    
    console.log(`✅ Indexed ${recipes.length} recipes (Total: ${fetched}/${TOTAL_RECIPES})\n`);

    // Rate limiting: wait between requests
    if (fetched < TOTAL_RECIPES) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_REQUESTS}ms before next request...`);
      await sleep(DELAY_BETWEEN_REQUESTS);
    }
  }

  console.log("\n✅ Finished fetching all recipes!");
  console.log(`📈 Total recipes indexed: ${allRecipes.length}`);
  console.log(`📞 Total API requests: ${requestCount}\n`);
  console.log("💾 Saving recipes.json and indexes...");

  // Save all recipes in one master JSON file
  fs.writeFileSync(RECIPES_FILE, JSON.stringify(allRecipes, null, 2));

  // Save all indexes
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  function saveIndex(index: InvertedIndex, filename: string) {
    const obj: { [key: string]: number[] } = {};
    Object.keys(index).forEach(k => (obj[k] = Array.from(index[k])));
    fs.writeFileSync(path.join(OUTPUT_DIR, filename + ".json"), JSON.stringify(obj, null, 2));
  }

  saveIndex(ingredientIndex, "ingredientIndex");
  saveIndex(cuisineIndex, "cuisineIndex");
  saveIndex(dietIndex, "dietIndex");
  saveIndex(mealTypeIndex, "mealTypeIndex");
  saveIndex(timeBucketIndex, "timeBucketIndex");
  saveIndex(difficultyIndex, "difficultyIndex");

  fs.writeFileSync(path.join(OUTPUT_DIR, "titleIndex.json"), JSON.stringify(titleIndex, null, 2));

  console.log("\n🎉 All recipes and indexes saved successfully!");
  console.log(`📁 Recipes: ${RECIPES_FILE}`);
  console.log(`📁 Indexes: ${OUTPUT_DIR}/`);
}

// ---------- RUN ----------
main().catch(err => console.error(err));