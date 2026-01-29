require('dotenv').config();
const fs = require('fs');

const API_KEY = process.env.SPOONACULAR_API_KEY;
const NUMBER_OF_RECIPES = 100; // Start small to test, then increase (Spoonacular has daily limits!)

async function fetchRecipes() {
  const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&number=${NUMBER_OF_RECIPES}&addRecipeInformation=true&fillIngredients=true&instructionsRequired=true`;

  try {
    console.log("Fetching recipes from Spoonacular...");
    const response = await fetch(url);
    const data = await response.json();

    if (data.results) {
      // Save the raw data to a JSON file
      fs.writeFileSync('recipe_corpus.json', JSON.stringify(data.results, null, 2));
      console.log(`Success! Saved ${data.results.length} recipes to 'recipe_corpus.json'.`);
    } else {
      console.log("Error fetching data:", data);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
}

fetchRecipes();