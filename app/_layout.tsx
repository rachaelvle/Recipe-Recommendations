// Recipe Detail Screen - Displays detailed information about a selected recipe, including ingredients and summary.
// this code was written with the assistance of AI
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, 
  ActivityIndicator, Dimensions, Platform, StatusBar 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Recipe as APIRecipe } from '../lib/api';

const { width } = Dimensions.get('window');

export default function RecipeDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [recipe, setRecipe] = useState<APIRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // We kept the manual cross-off state since it's a nice UI feature
  // and requires ZERO backend connection!
  const [crossedIngredients, setCrossedIngredients] = useState<string[]>([]);

  useEffect(() => {
    const fetchRecipeDetail = async () => {
      try {
        setLoading(true);
        // Only fetch the recipe details, no more user profile fetching!
        const recipeData = await api.getRecipeDetail(Number(id));
        setRecipe(recipeData);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError("Could not load recipe details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchRecipeDetail();
  }, [id]);

  // Clean HTML tags from the backend summary string
  const cleanSummary = recipe?.summary?.replace(/<[^>]*>?/gm, '') || "";

  // Function to toggle an ingredient's crossed-off state manually
  const toggleIngredient = (ingredientName: string) => {
    if (!ingredientName) return;
    setCrossedIngredients(prev => 
      prev.includes(ingredientName) 
        ? prev.filter(name => name !== ingredientName) // Un-cross
        : [...prev, ingredientName]                    // Cross off
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#39afafff" />
        <Text style={{color: '#aaa', marginTop: 10}}>Fetching deliciousness...</Text>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{color: '#fff', marginBottom: 20}}>{error || "Recipe not found"}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{color: '#fff', fontWeight: 'bold'}}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: recipe.image }} style={styles.mainImage} />
          <TouchableOpacity style={styles.floatingBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        <View style={styles.contentCard}>
          <Text style={styles.title}>{recipe.title}</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color="#39afafff" />
              <Text style={styles.infoText}>{recipe.readyInMinutes} mins</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={20} color="#39afafff" />
              <Text style={styles.infoText}>{recipe.servings} servings</Text>
            </View>
          </View>

          {/* Diets / Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dietScroll}>
            {recipe.diets?.map((diet, index) => (
              <View key={index} style={styles.dietBadge}>
                <Text style={styles.dietText}>{diet.toUpperCase()}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          {/* Summary */}
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summaryText}>{cleanSummary}</Text>

          {/* Ingredients */}
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {recipe.extendedIngredients?.map((ing, index) => {
            const isCrossed = crossedIngredients.includes(ing.name);
            
            return (
              <TouchableOpacity 
                // Using index in the key fixes the duplicate ingredient React warning
                key={`${ing.id}-${index}`} 
                style={[styles.ingredientRow, isCrossed && styles.ingredientRowCrossed]}
                onPress={() => toggleIngredient(ing.name)}
                activeOpacity={0.6}
              >
                <View style={[styles.checkbox, isCrossed && styles.checkboxCrossed]}>
                  {isCrossed && <Ionicons name="checkmark" size={14} color="#25292e" />}
                </View>
                
                <Text style={[styles.ingredientText, isCrossed && styles.ingredientTextCrossed]}>
                  <Text style={{fontWeight: 'bold', color: isCrossed ? '#666' : '#39afafff'}}>
                    {ing.amount} {ing.unit}
                  </Text> {ing.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#25292e' },
  center: { justifyContent: 'center', alignItems: 'center' },
  imageContainer: { width: '100%', height: 350, position: 'relative' },
  mainImage: { width: '100%', height: '100%' },
  floatingBack: { 
    position: 'absolute', top: 50, left: 20, 
    backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25 
  },
  contentCard: { 
    marginTop: -30, backgroundColor: '#25292e', 
    borderTopLeftRadius: 35, borderTopRightRadius: 35, 
    padding: 25, minHeight: 500 
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 15 },
  infoRow: { flexDirection: 'row', marginBottom: 20, gap: 20 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { color: '#aaa', fontWeight: '600' },
  dietScroll: { marginBottom: 20 },
  dietBadge: { 
    backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 12, 
    borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#444' 
  },
  dietText: { color: '#39afafff', fontSize: 10, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 20, marginBottom: 12 },
  summaryText: { color: '#ccc', lineHeight: 22, fontSize: 15, marginBottom: 10 },
  ingredientRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12, 
    paddingRight: 20,
    paddingVertical: 4
  },
  ingredientRowCrossed: { 
    opacity: 0.5 
  },
  checkbox: { 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    borderWidth: 2,
    borderColor: '#39afafff', 
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxCrossed: {
    backgroundColor: '#39afafff',
  },
  ingredientText: { 
    color: '#ddd', 
    fontSize: 16 
  },
  ingredientTextCrossed: {
    textDecorationLine: 'line-through',
    color: '#666'
  },
  backBtn: { backgroundColor: '#39afafff', padding: 15, borderRadius: 12 }
});