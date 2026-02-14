// HTTP API server for recipe search and user management
// set up the APIs
// written with the help of AI 
// Run: npx ts-node server.ts  (from backend directory)

import cors from "cors";
import express from "express";
import { EnhancedRecipeSearchEngine } from "./searcher.js";
import type { Filters, Recipe, UserPreferences } from "./types.js";
import { UserDatabaseManager } from "./user.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const app = express();
app.use(cors());
app.use(express.json());

let searchEngine: EnhancedRecipeSearchEngine;
let userDb: UserDatabaseManager;

function initServices() {
  try {
    searchEngine = new EnhancedRecipeSearchEngine();
    userDb = new UserDatabaseManager();
  } catch (err) {
    console.error("Failed to initialize services:", err);
    process.exit(1);
  }
}

// ----- Health -----
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Recipe API is running" });
});

// ----- Search -----
app.post("/api/search", (req, res) => {
  try {
    const {
      searchQuery,
      filters,
      userIngredients,
      userId,
    } = req.body as {
      searchQuery?: string;
      filters?: Filters;
      userIngredients?: string[];
      userId?: number;
    };

    const results: Recipe[] = searchEngine.search({
      searchQuery: searchQuery ?? "",
      filters,
      userIngredients,
      userId,
    });

    res.json({ results });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// ----- Auth -----
app.post("/api/auth/register", (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username?.trim() || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }
    const userId = userDb.createUser(username.trim(), password);
    const user = userDb.getUserById(userId);
    res.status(201).json({ user });
  } catch (err: any) {
    if (err?.message?.includes("UNIQUE")) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }
    const user = userDb.verifyUser(username, password);
    if (!user) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    res.json({ user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ----- User profile -----
app.get("/api/users/:id", (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }
    const profile = userDb.getUserProfile(userId);
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(profile);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

app.patch("/api/users/:id/preferences", (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }
    const preferences = req.body as Partial<UserPreferences>;
    userDb.updatePreferences(userId, preferences);
    const profile = userDb.getUserProfile(userId);
    res.json(profile);
  } catch (err) {
    console.error("Update preferences error:", err);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

app.post("/api/users/:id/allergies", (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { allergen } = req.body as { allergen?: string };
    if (isNaN(userId) || !allergen?.trim()) {
      res.status(400).json({ error: "Invalid user ID or allergen" });
      return;
    }
    userDb.addAllergy(userId, allergen.trim());
    const profile = userDb.getUserProfile(userId);
    res.json(profile);
  } catch (err) {
    console.error("Add allergy error:", err);
    res.status(500).json({ error: "Failed to add allergy" });
  }
});

app.delete("/api/users/:id/allergies", (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const allergen = (req.query.allergen as string)?.trim();
    if (isNaN(userId) || !allergen) {
      res.status(400).json({ error: "Invalid user ID or allergen" });
      return;
    }
    userDb.removeAllergy(userId, allergen);
    const profile = userDb.getUserProfile(userId);
    res.json(profile);
  } catch (err) {
    console.error("Remove allergy error:", err);
    res.status(500).json({ error: "Failed to remove allergy" });
  }
});

app.post("/api/users/:id/ingredients", (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { ingredient } = req.body as { ingredient?: string };
    if (isNaN(userId) || !ingredient?.trim()) {
      res.status(400).json({ error: "Invalid user ID or ingredient" });
      return;
    }
    userDb.addIngredient(userId, ingredient.trim());
    const profile = userDb.getUserProfile(userId);
    res.json(profile);
  } catch (err) {
    console.error("Add ingredient error:", err);
    res.status(500).json({ error: "Failed to add ingredient" });
  }
});

app.delete("/api/users/:id/ingredients", (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const ingredient = (req.query.ingredient as string)?.trim();
    if (isNaN(userId) || !ingredient) {
      res.status(400).json({ error: "Invalid user ID or ingredient" });
      return;
    }
    userDb.removeIngredient(userId, ingredient);
    const profile = userDb.getUserProfile(userId);
    res.json(profile);
  } catch (err) {
    console.error("Remove ingredient error:", err);
    res.status(500).json({ error: "Failed to remove ingredient" });
  }
});

// ----- Start -----
initServices();
app.listen(PORT, () => {
  console.log(`\n🍳 Recipe API running at http://localhost:${PORT}`);
  console.log(`   Health: GET  http://localhost:${PORT}/api/health`);
  console.log(`   Search: POST http://localhost:${PORT}/api/search\n`);
});
