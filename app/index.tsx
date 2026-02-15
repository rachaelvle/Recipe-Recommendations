import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, type Recipe } from "../lib/api";

export default function Index() {
  const [health, setHealth] = useState<"checking" | "ok" | "error">("checking");
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    api
      .health()
      .then(() => setHealth("ok"))
      .catch(() => setHealth("error"));
  }, []);

  const onSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const { results } = await api.search({ searchQuery: query.trim() });
      setRecipes(results);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
      setRecipes([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Backend</Text>
        {health === "checking" && (
          <ActivityIndicator size="small" color="#666" style={styles.status} />
        )}
        {health === "ok" && (
          <Text style={[styles.status, styles.statusOk]}>Connected</Text>
        )}
        {health === "error" && (
          <Text style={[styles.status, styles.statusError]}>
            Cannot reach API. Start backend: cd backend && npm run dev
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Search recipes</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="e.g. chicken pasta"
            value={query}
            onChangeText={setQuery}
            editable={!searching}
          />
          <TouchableOpacity
            style={[styles.button, searching && styles.buttonDisabled]}
            onPress={onSearch}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Search</Text>
            )}
          </TouchableOpacity>

            {/* for getting to intro page for testing */}
          <Pressable  onPress={() => router.push('/Introduction')}>
                  <Text>Get Started</Text>
          </Pressable>


        </View>
        {searchError && (
          <Text style={styles.error}>{searchError}</Text>
        )}
        {recipes.length > 0 && (
          <Text style={styles.resultCount}>
            {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} found
          </Text>
        )}
        {recipes.length > 0 && (
          <View style={styles.list}>
            {recipes.slice(0, 5).map((r) => (
              <Text key={r.id} style={styles.recipeTitle}>
                • {r.title} ({r.readyInMinutes} min)
              </Text>
            ))}
            {recipes.length > 5 && (
              <Text style={styles.more}>... and {recipes.length - 5} more</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 60,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  status: {
    fontSize: 14,
    color: "#666",
  },
  statusOk: {
    color: "#0a0",
  },
  statusError: {
    color: "#c00",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  error: {
    marginTop: 8,
    color: "#c00",
    fontSize: 14,
  },
  resultCount: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  list: {
    marginTop: 8,
    paddingLeft: 8,
  },
  recipeTitle: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  more: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
  },
});
