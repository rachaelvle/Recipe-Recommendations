// Test Script for Recipe Search
// Run different search scenarios to test the system (written with AI for tests)

import { EnhancedRecipeSearchEngine } from "./searcher";
import type { Recipe } from "./types.ts";
import { UserDatabaseManager } from "./user";

// ============================================
// DISPLAY HELPER
// ============================================
function displayRecipes(results: Recipe[], title: string = "") {
  if (title) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(title);
    console.log("=".repeat(70));
  }

  if (results.length === 0) {
    console.log("\n❌ No recipes found\n");
    return;
  }

  console.log(`\n✅ Found ${results.length} recipes:\n`);

  results.forEach((recipe, idx) => {
    console.log(`${idx + 1}. ${recipe.title} [score: ${recipe.score?.toFixed(1) ?? 'N/A'}]`);
    console.log(`   ⏱️  ${recipe.readyInMinutes} min | difficulty: ${recipe.difficulty}`);
    console.log(`   🍽️  Cuisine: ${recipe.cuisines.join(', ') || 'N/A'}`);
    console.log(`   🥗 Diet: ${recipe.diets.join(', ') || 'N/A'}`);
    console.log(`   📋 Type: ${recipe.dishTypes.join(', ') || 'N/A'}`);
    if (recipe.scoringDetails) {
      console.log(`   📊 Scoring: ${recipe.scoringDetails}`);
    }
    const ingList = recipe.extendedIngredients.slice(0, 8).map(i => i.name).join(', ');
    const more = recipe.extendedIngredients.length > 8 ? ` (+${recipe.extendedIngredients.length - 8} more)` : '';
    console.log(`   🥕 Ingredients: ${ingList}${more}`);
    console.log(`   🔗 ${recipe.sourceUrl || 'N/A'}\n`);
  });
}

// ============================================
// TEST SCENARIOS
// ============================================

async function runTests() {
  console.log("🧪 RECIPE SEARCH TEST SUITE\n");

  const searchEngine = new EnhancedRecipeSearchEngine();
  const userDb = new UserDatabaseManager();

  // ============================================
  // USER 1 SETUP: Health-conscious, Asian food preferences
  // ============================================
  console.log("=".repeat(70));
  console.log("USER 1 SETUP");
  console.log("=".repeat(70));

  const existing1 = userDb.verifyUser("user_one", "password123");
  if (existing1) userDb.deleteUser(existing1.id);

  const user1Id = userDb.createUser("user_one", "password123");
  console.log(`\n👤 user_one (ID: ${user1Id})`);

  userDb.addAllergy(user1Id, "peanuts");
  userDb.addAllergy(user1Id, "shellfish");
  console.log("🚫 Allergies: peanuts, shellfish");

  ["chicken", "rice", "garlic", "ginger", "soy sauce", "sesame oil", "tofu", "bok choy"].forEach(i => userDb.addIngredient(user1Id, i));
  console.log("🥕 Pantry: chicken, rice, garlic, ginger, soy sauce, sesame oil, tofu, bok choy");

  userDb.addCuisine(user1Id, "japanese");
  userDb.addCuisine(user1Id, "thai");
  userDb.addDiet(user1Id, "gluten free");
  console.log("⚙️  Preferences: japanese, thai | gluten free");

  // USER 1 — QUERY A
  console.log("\n" + "=".repeat(70));
  console.log("USER 1 | QUERY A: 'rice dinner' | Filter: cuisines=['asian']");
  console.log("=".repeat(70));
  console.log("Expected: Asian rice recipes only (hard filter)");
  console.log("Expected: No peanuts/shellfish | Japanese/Thai and gluten free boosted");
  console.log("Expected: 'dinner' boosts dinner dish types (+10)");
  console.log("Expected: Pantry ingredients boost garlic, ginger, soy sauce matches\n");

  displayRecipes(searchEngine.search({
    searchQuery: "rice dinner",
    userId: user1Id,
    filters: { cuisines: ["asian"] }
  }));

  userDb.deleteUser(user1Id);
  console.log("\n🧹 user_one deleted");

  // ============================================
  // USER 2 SETUP: Mediterranean, large pantry
  // ============================================
  console.log("\n" + "=".repeat(70));
  console.log("USER 2 SETUP");
  console.log("=".repeat(70));

  const existing2 = userDb.verifyUser("user_two", "password123");
  if (existing2) userDb.deleteUser(existing2.id);

  const user2Id = userDb.createUser("user_two", "password123");
  console.log(`\n👤 user_two (ID: ${user2Id})`);

  userDb.addAllergy(user2Id, "egg");
  console.log("🚫 Allergies: egg");

  ["olive oil", "tomato", "onion", "garlic", "lemon", "feta", "chickpeas", "lamb", "eggplant", "pasta"].forEach(i => userDb.addIngredient(user2Id, i));
  console.log("🥕 Pantry: olive oil, tomato, onion, garlic, lemon, feta, chickpeas, lamb, eggplant, pasta");

  userDb.addCuisine(user2Id, "mediterranean");
  userDb.addCuisine(user2Id, "greek");
  userDb.addDiet(user2Id, "vegetarian");
  console.log("⚙️  Preferences: mediterranean, greek | vegetarian");

  // USER 2 — QUERY B
  console.log("\n" + "=".repeat(70));
  console.log("USER 2 | QUERY B: 'salad' | Filter: cuisines=['mediterranean']");
  console.log("=".repeat(70));
  console.log("Expected: Mediterranean salads only (hard filter)");
  console.log("Expected: No eggs | Vegetarian preference boosted");
  console.log("Expected: Ingredient coverage boost from pantry\n");

  displayRecipes(searchEngine.search({
    searchQuery: "salad",
    userId: user2Id,
    filters: { cuisines: ["mediterranean"] }
  }));

  userDb.deleteUser(user2Id);
  console.log("\n🧹 user_two deleted");

  searchEngine.close();
  userDb.close();

  console.log("\n✅ ALL TESTS COMPLETE!\n");
}

// ============================================
// INTERACTIVE MODE
// ============================================
function interactiveMode() {
  const searchEngine = new EnhancedRecipeSearchEngine();

  console.log("\n🔍 INTERACTIVE SEARCH MODE");
  console.log("=".repeat(70));
  console.log("\nExamples:");
  console.log("  - 'chicken pasta'");
  console.log("  - 'quick vegetarian dinner'");
  console.log("  - 'italian easy'");
  console.log("  - 'mexican under 30 minutes'\n");

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("❌ Please provide a search query as an argument");
    console.log("   Example: npx tsx test.ts 'chicken pasta'");
    console.log("\n   Or run full test suite: npx tsx test.ts --test\n");
    searchEngine.close();
    return;
  }

  const query = args.join(" ");
  console.log(`Query: "${query}"\n`);

  const results = searchEngine.search({ searchQuery: query });
  displayRecipes(results, `Search Results for: "${query}"`);
  searchEngine.close();
}

// ============================================
// MAIN
// ============================================
const args = process.argv.slice(2);

if (args.includes("--test") || args.includes("-t")) {
  runTests().catch(console.error);
} else if (args.length > 0) {
  interactiveMode();
} else {
  console.log("\n🔍 RECIPE SEARCH TESTER\n");
  console.log("Usage:");
  console.log("  Run full test suite:    npx tsx test.ts --test");
  console.log("  Interactive search:     npx tsx test.ts 'your query here'");
  console.log("\nExamples:");
  console.log("  npx tsx test.ts --test");
  console.log("  npx tsx test.ts 'chicken pasta'");
  console.log("  npx tsx test.ts 'quick vegetarian dinner'");
  console.log("  npx tsx test.ts 'italian easy under 30 minutes'\n");
}
