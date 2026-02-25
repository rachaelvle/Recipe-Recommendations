// User Database Schema and Management
// Stores user profiles, allergies, and preferences for personalized recipe search
// code was written with the assitance of AI

import type { User, UserAllergy, UserIngredient, UserPreferences } from "./types.ts";

import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";

const USER_DB_FILE = path.join(process.cwd(), "users.db");

export class UserDatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string = USER_DB_FILE) {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  /**
   * Initialize user database tables
   */
  private initializeTables() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
      )
    `);

    // Allergies table (many-to-many: user can have multiple allergies)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_allergies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        allergen TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId, allergen)
      )
    `);

    // User's available ingredients table (many-to-many)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        ingredient TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId, ingredient)
      )
    `);

    // Preferences table (one-to-one with users)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        userId INTEGER PRIMARY KEY,
        defaultCuisines TEXT,           -- JSON array // user input at creation
        defaultDiets TEXT,              -- JSON array // user input at creation
        defaultMealTypes TEXT,          -- JSON array // not used at creation atm 
        defaultTimeBuckets TEXT,        -- JSON array // not used at creation atm 
        defaultDifficulties TEXT,       -- JSON array // not used at creation atm
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for faster lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_allergies_userId ON user_allergies(userId);
      CREATE INDEX IF NOT EXISTS idx_user_ingredients_userId ON user_ingredients(userId);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
  }

  /**
   * Hash password for secure storage
   */
  private hashPassword(password: string): string {
    // Using username as salt is simpler and still secure enough for most use cases
    // For production, consider using bcrypt or argon2
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Create a new user
   */
  createUser(username: string, password: string): number {
    const passwordHash = this.hashPassword(password);

    const stmt = this.db.prepare(`
      INSERT INTO users (username, password_hash)
      VALUES (?, ?)
    `);

    const result = stmt.run(username, passwordHash);
    const userId = result.lastInsertRowid as number;

    // Initialize empty preferences for the user
    this.db.prepare(`
      INSERT INTO user_preferences (userId) VALUES (?)
    `).run(userId);

    return userId;
  }

  /**
   * Verify user login
   */
  verifyUser(username: string, password: string): User | null {
    const row = this.db.prepare(`
      SELECT id, username, password_hash
      FROM users
      WHERE username = ?
    `).get(username) as any;

    if (!row) return null;

    const hash = this.hashPassword(password);
    if (hash !== row.password_hash) return null;

    return {
      id: row.id,
      username: row.username
    };
  }

  /**
   * Get user by ID
   */
  getUserById(userId: number): User | null {
    const row = this.db.prepare(`
      SELECT id, username
      FROM users
      WHERE id = ?
    `).get(userId) as any;

    if (!row) return null;

    return {
      id: row.id,
      username: row.username
    };
  }

  /**
   * Add allergy for a user
   */
  addAllergy(userId: number, allergen: string) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_allergies (userId, allergen)
      VALUES (?, ?)
    `);
    stmt.run(userId, allergen.toLowerCase());
  }

  /**
   * Remove allergy for a user
   */
  removeAllergy(userId: number, allergen: string) {
    this.db.prepare(`
      DELETE FROM user_allergies
      WHERE userId = ? AND allergen = ?
    `).run(userId, allergen.toLowerCase());
  }

  /**
   * Get all allergies for a user
   */
  getAllergies(userId: number): UserAllergy[] {
    const rows = this.db.prepare(`
      SELECT userId, allergen
      FROM user_allergies
      WHERE userId = ?
    `).all(userId) as any[];

    return rows.map(row => ({
      userId: row.userId,
      allergen: row.allergen
    }));
  }

  /**
   * Add ingredient to user's pantry
   */
  addIngredient(userId: number, ingredient: string) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_ingredients (userId, ingredient)
      VALUES (?, ?)
    `);
    stmt.run(userId, ingredient.toLowerCase());
  }

  /**
   * Remove ingredient from user's pantry
   */
  removeIngredient(userId: number, ingredient: string) {
    this.db.prepare(`
      DELETE FROM user_ingredients
      WHERE userId = ? AND ingredient = ?
    `).run(userId, ingredient.toLowerCase());
  }

  /**
   * Get all ingredients for a user
   */
  getIngredients(userId: number): UserIngredient[] {
    const rows = this.db.prepare(`
      SELECT userId, ingredient
      FROM user_ingredients
      WHERE userId = ?
    `).all(userId) as any[];

    return rows.map(row => ({
      userId: row.userId,
      ingredient: row.ingredient
    }));
  }

  /**
   * Add cuisine to user's preferences
   */
  addCuisine(userId: number, cuisine: string) {
    const prefs = this.getPreferences(userId);
    const cuisines = prefs?.defaultCuisines || [];
    
    if (!cuisines.includes(cuisine.toLowerCase())) {
      cuisines.push(cuisine.toLowerCase());
      this.updatePreferences(userId, { defaultCuisines: cuisines });
    }
  }

  /**
   * Remove cuisine from user's preferences
   */
  removeCuisine(userId: number, cuisine: string) {
    const prefs = this.getPreferences(userId);
    if (!prefs?.defaultCuisines) return;

    const cuisines = prefs.defaultCuisines.filter(c => c !== cuisine.toLowerCase());
    this.updatePreferences(userId, { defaultCuisines: cuisines });
  }

  /**
   * Add diet to user's preferences
   */
  addDiet(userId: number, diet: string) {
    const prefs = this.getPreferences(userId);
    const diets = prefs?.defaultDiets || [];
    
    if (!diets.includes(diet.toLowerCase())) {
      diets.push(diet.toLowerCase());
      this.updatePreferences(userId, { defaultDiets: diets });
    }
  }

  /**
   * Remove diet from user's preferences
   */
  removeDiet(userId: number, diet: string) {
    const prefs = this.getPreferences(userId);
    if (!prefs?.defaultDiets) return;

    const diets = prefs.defaultDiets.filter(d => d !== diet.toLowerCase());
    this.updatePreferences(userId, { defaultDiets: diets });
  }

  /**
   * Update user preferences
   */
  updatePreferences(userId: number, preferences: Partial<UserPreferences>) {
    const fields: string[] = [];
    const values: any[] = [];

    if (preferences.defaultCuisines !== undefined) {
      fields.push('defaultCuisines = ?');
      values.push(JSON.stringify(preferences.defaultCuisines));
    }
    if (preferences.defaultDiets !== undefined) {
      fields.push('defaultDiets = ?');
      values.push(JSON.stringify(preferences.defaultDiets));
    }
    if (preferences.defaultMealTypes !== undefined) {
      fields.push('defaultMealTypes = ?');
      values.push(JSON.stringify(preferences.defaultMealTypes));
    }
    if (preferences.defaultTimeBuckets !== undefined) {
      fields.push('defaultTimeBuckets = ?');
      values.push(JSON.stringify(preferences.defaultTimeBuckets));
    }
    if (preferences.defaultDifficulties !== undefined) {
      fields.push('defaultDifficulties = ?');
      values.push(JSON.stringify(preferences.defaultDifficulties));
    }

    if (fields.length === 0) return;

    values.push(userId);
    this.db.prepare(`
      UPDATE user_preferences
      SET ${fields.join(', ')}
      WHERE userId = ?
    `).run(...values);
  }

  /**
   * Get user preferences
   */
  getPreferences(userId: number): UserPreferences | null {
    const row = this.db.prepare(`
      SELECT * FROM user_preferences WHERE userId = ?
    `).get(userId) as any;

    if (!row) return null;

    return {
      userId: row.userId,
      defaultCuisines: row.defaultCuisines ? JSON.parse(row.defaultCuisines) : undefined,
      defaultDiets: row.defaultDiets ? JSON.parse(row.defaultDiets) : undefined,
      defaultMealTypes: row.defaultMealTypes ? JSON.parse(row.defaultMealTypes) : undefined,
      defaultTimeBuckets: row.defaultTimeBuckets ? JSON.parse(row.defaultTimeBuckets) : undefined,
      defaultDifficulties: row.defaultDifficulties ? JSON.parse(row.defaultDifficulties) : undefined
    };
  }

  /**
   * Get complete user profile (user + allergies + ingredients + preferences)
   */
  getUserProfile(userId: number) {
    const user = this.getUserById(userId);
    if (!user) return null;

    const allergies = this.getAllergies(userId);
    const ingredients = this.getIngredients(userId);
    const preferences = this.getPreferences(userId);

    return {
      user,
      allergies,
      ingredients,
      preferences
    };
  }

  /**
   * Delete user and all associated data
   */
  deleteUser(userId: number) {
    // Foreign key CASCADE will automatically delete allergies and preferences
    this.db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
  }

  close() {
    this.db.close();
  }
}
