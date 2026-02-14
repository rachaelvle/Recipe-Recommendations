// Test Script for Recipe Search
// Run different search scenarios to test the system (written with AI for tests)

import { EnhancedRecipeSearchEngine } from "./searcher.ts";
import type { Recipe } from "./types.ts";
import { UserDatabaseManager } from "./user.ts";

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
    console.log(`${idx + 1}. ${recipe.title}`);
    console.log(`   ⏱️  ${recipe.readyInMinutes} min`);
    console.log(`   🍽️  Cuisine: ${recipe.cuisines.join(', ') || 'N/A'}`);
    console.log(`   🥗 Diet: ${recipe.diets.join(', ') || 'N/A'}`);
    console.log(`   📋 Type: ${recipe.dishTypes.join(', ') || 'N/A'}`);
    
    // Show first 8 ingredients
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

  // TEST: Create test user with preferences
  console.log("\n" + "=".repeat(70));
  console.log("TEST 6: Create Test User");
  console.log("=".repeat(70));

  console.log("\n👤 Creating test user 'test_user'...");
  
  // Check if user exists, delete if so
  const existing = userDb.verifyUser("test_user", "password123");
  if (existing) {
    console.log("   User already exists, deleting...");
    userDb.deleteUser(existing.id);
  }

  const testUserId = userDb.createUser("test_user", "password123");
  console.log(`✅ User created with ID: ${testUserId}`);

  // Add allergies
  console.log("\n🚫 Adding allergies:");
  userDb.addAllergy(testUserId, "peanuts");
  userDb.addAllergy(testUserId, "shellfish");
  console.log("   - peanuts");
  console.log("   - shellfish");

  // Add pantry ingredients
  console.log("\n🥕 Adding pantry ingredients:");
  const pantry = ["chicken", "rice", "tomato", "garlic", "onion", "olive oil", "pasta", "coconut", "pepper"];
  pantry.forEach(ing => userDb.addIngredient(testUserId, ing));
  console.log(`   - ${pantry.join(', ')}`);

  // Set preferences
  console.log("\n⚙️ Setting preferences:");
  userDb.addCuisine(testUserId, "japanese");
  userDb.addCuisine(testUserId, "thai");
  userDb.addDiet(testUserId, "gluten free");
  userDb.updatePreferences(testUserId, {
    defaultMealTypes: ["dinner"],
    defaultTimeBuckets: ["15-30", "30-45"],
    defaultDifficulties: ["easy", "medium"]
  });
  console.log("   - Cuisines: japanese, thai");
  console.log("   - Diet: gluten free");
  console.log("   - Meal type: dinner");
  console.log("   - Time: 15-45 minutes");
  console.log("   - Difficulty: easy, medium");

  // ============================================
  // TEST 7: Search with user profile
  // ============================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST: Search with User Profile");
  console.log("=".repeat(70));
  console.log("Query: 'curry dinner'");
  console.log(`User: test_user (ID: ${testUserId})`);
  console.log("Expected: Japanese/Thai, gluten free, 15-45 min");
  console.log("Expected: No peanuts/shellfish");
  console.log("Expected: Boost for pantry ingredients\n");

  const test7 = searchEngine.search({
    searchQuery: "curry dinner",
    userId: testUserId
  });
  displayRecipes(test7);

  // ============================================
  // TEST
  // ============================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST");
  console.log("=".repeat(70));
  console.log("Query: 'pasta'");
  console.log(`User: test_user (ID: ${testUserId})`);
  console.log("Expected: Still no peanuts/shellfish (allergies always apply)\n");

  const test8 = searchEngine.search({
    searchQuery: "pasta",
    userId: testUserId
  });
  displayRecipes(test8);

  // ============================================
  // TEST: Explicit filters
  // ============================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST: Explicit Filter Parameters");
  console.log("=".repeat(70));
  console.log("Query: 'soup'");
  console.log("Filters: cuisines=['asian'], diets=['vegetarian']\n");

  const test10 = searchEngine.search({
    searchQuery: "soup",
    filters: {
      cuisines: ["asian"],
      diets: ["vegetarian"]
    }
  });
  displayRecipes(test10);

  // ============================================
  // CLEANUP
  // ============================================
  console.log("\n" + "=".repeat(70));
  console.log("🧹 Cleanup");
  console.log("=".repeat(70));
  console.log("\nDeleting test user...");
  userDb.deleteUser(testUserId);
  console.log("✅ Test user deleted");

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
  console.log("\nEnter your search query:");
  console.log("Examples:");
  console.log("  - 'chicken pasta'");
  console.log("  - 'quick vegetarian dinner'");
  console.log("  - 'italian easy'");
  console.log("  - 'mexican under 30 minutes'\n");

  // Get query from command line args
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("❌ Please provide a search query as an argument");
    console.log("   Example: ts-node test-search.ts 'chicken pasta'");
    console.log("\n   Or run full test suite: ts-node test-search.ts --test\n");
    searchEngine.close();
    return;
  }

  const query = args.join(" ");
  console.log(`Query: "${query}"\n`);

  const results = searchEngine.search({
    searchQuery: query
  });

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
  console.log("  Run full test suite:    ts-node test.ts --test");
  console.log("  Interactive search:     ts-node test.ts 'your query here'");
  console.log("\nExamples:");
  console.log("  ts-node test.ts --test");
  console.log("  ts-node test.ts 'chicken pasta'");
  console.log("  ts-node test.ts 'quick vegetarian dinner'");
  console.log("  ts-node test.ts 'italian easy under 30 minutes'\n");
}