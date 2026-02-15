/**
 * API client for the Recipe backend.
 * Set EXPO_PUBLIC_API_URL in .env (e.g. http://localhost:3001 for web, http://YOUR_COMPUTER_IP:3001 for device).
 * written with the help of AI
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(
  path: string,
  options: RequestInit & { body?: object } = {}
): Promise<T> {
  const { body, ...rest } = options;
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...rest.headers,
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return data as T;
}

export interface Recipe {
  id: number;
  title: string;
  readyInMinutes: number;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  extendedIngredients: { id: number; name: string; amount?: number; unit?: string }[];
  image?: string;
  imageType?: string;
  summary?: string;
  servings?: number;
  sourceUrl?: string;
}

export interface Filters {
  cuisines?: string[];
  diets?: string[];
  mealTypes?: string[];
  timeBuckets?: string[];
  difficulties?: string[];
}

export interface SearchBody {
  searchQuery?: string;
  filters?: Filters;
  userIngredients?: string[];
  userId?: number;
}

export const api = {
  // sanity check
  async health(): Promise<{ ok: boolean; message: string }> {
    return request("/api/health");
  },

  // main search function
  async search(body: SearchBody): Promise<{ results: Recipe[] }> {
    return request("/api/search", { method: "POST", body });
  },

  async register(username: string, password: string): Promise<{ user: { id: number; username: string } }> {
    return request("/api/auth/register", { method: "POST", body: { username, password } });
  },

  async login(username: string, password: string): Promise<{ user: { id: number; username: string } }> {
    return request("/api/auth/login", { method: "POST", body: { username, password } });
  },

  async getUserProfile(userId: number) {
    return request(`/api/users/${userId}`);
  },

  async updatePreferences(userId: number, preferences: Record<string, unknown>) {
    return request(`/api/users/${userId}/preferences`, {
      method: "PATCH",
      body: preferences,
    });
  },

  async addAllergy(userId: number, allergen: string) {
    return request(`/api/users/${userId}/allergies`, {
      method: "POST",
      body: { allergen },
    });
  },

  async removeAllergy(userId: number, allergen: string) {
    return request(`/api/users/${userId}/allergies?allergen=${encodeURIComponent(allergen)}`, {
      method: "DELETE",
    });
  },

  async addIngredient(userId: number, ingredient: string) {
    return request(`/api/users/${userId}/ingredients`, {
      method: "POST",
      body: { ingredient },
    });
  },

  async removeIngredient(userId: number, ingredient: string) {
    return request(`/api/users/${userId}/ingredients?ingredient=${encodeURIComponent(ingredient)}`, {
      method: "DELETE",
    });
  },
};

export { API_BASE };

