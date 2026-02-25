import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../src/context/PantryContext';
export default function RecipeDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { pantryIngredients } = usePantry();

  // Mock data - replace this with your actual API/JSON fetch logic
  const recipe = {
    title: "Chocolate Cake",
    image: "https://via.placeholder.com/400", // Your actual image link here
    readyInMinutes: 60,
    category: "Dinner",
    ingredients: ["flour", "sugar", "cocoa", "eggs"],
    instructions: "Mix and bake..."
  };

  const matchCount = recipe.ingredients.filter(ing => 
    pantryIngredients.some(p => ing.toLowerCase().includes(p.toLowerCase()))
  ).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: recipe.image }} style={styles.image} />
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.contentCard}>
          <View style={styles.tagRow}>
            <Text style={styles.categoryTag}>{recipe.category.toUpperCase()}</Text>
            <Text style={styles.timeTag}>{recipe.readyInMinutes} MIN</Text>
          </View>

          <Text style={styles.title}>{recipe.title}</Text>

          {/* Pantry Progress Bar */}
          <View style={styles.pantryStatus}>
            <Text style={styles.pantryText}>
              You have {matchCount} / {recipe.ingredients.length} ingredients
            </Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(matchCount/recipe.ingredients.length)*100}%` }]} />
            </View>
            <Text style={[styles.needText, { color: matchCount === recipe.ingredients.length ? '#12fd02ff' : '#f41d1dff' }]}>
              {matchCount === recipe.ingredients.length ? "You're ready to cook! 🎉" : `You need ${recipe.ingredients.length - matchCount} more items`}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Ingredients</Text>
          {recipe.ingredients.map((ing, index) => {
            const hasIt = pantryIngredients.some(p => ing.toLowerCase().includes(p.toLowerCase()));
            return (
              <View key={index} style={styles.ingredientRow}>
                <Ionicons 
                  name={hasIt ? "checkmark-circle" : "add-circle-outline"} 
                  size={22} 
                  color={hasIt ? "#12fd02ff" : "#AAA"} 
                />
                <Text style={[styles.ingredientText, { color: hasIt ? '#FFFFFF' : '#AAA' }]}>{ing}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#25292e' },
  imageContainer: { height: 300, width: '100%', position: 'relative' },
  image: { width: '100%', height: '100%' },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25 },
  contentCard: { flex: 1, backgroundColor: '#25292e', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, padding: 25 },
  tagRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  categoryTag: { backgroundColor: '#39afafff', color: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: '800' },
  timeTag: { backgroundColor: '#333', color: '#AAA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 20 },
  pantryStatus: { backgroundColor: '#333', padding: 15, borderRadius: 20, marginBottom: 25 },
  pantryText: { color: '#fff', fontWeight: '600', marginBottom: 10 },
  progressBarBg: { height: 8, backgroundColor: '#444', borderRadius: 4, marginBottom: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#12fd02ff', borderRadius: 4 },
  needText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 15 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  ingredientText: { fontSize: 16 }
});
