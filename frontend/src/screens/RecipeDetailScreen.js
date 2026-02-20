import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePantry } from '../context/PantryContext';

export default function RecipeDetailScreen({ route, navigation }) {
  const { item } = route.params;
  const { pantryIngredients } = usePantry();
  const [activeTab, setActiveTab] = useState('ingredients'); // 'ingredients' or 'instructions'

  // --- 1. SMART INGREDIENT LOGIC ---
  // We check each ingredient to see if it exists in the pantry
  const checkIngredient = (ingredient) => {
    const hasIt = pantryIngredients.some(pantryItem => 
      ingredient.toLowerCase().includes(pantryItem.toLowerCase())
    );
    return hasIt;
  };

  // Calculate totals for the progress bar
  const totalIngredients = item.ingredients?.length || 0;
  const ownedIngredients = item.ingredients?.filter(checkIngredient).length || 0;
  const missingCount = totalIngredients - ownedIngredients;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER IMAGE */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <View style={styles.overlay} />
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.tagRow}>
            <View style={styles.tag}><Text style={styles.tagText}>{item.category}</Text></View>
            <View style={styles.tag}><Text style={styles.tagText}>{item.readyInMinutes} min</Text></View>
          </View>
          <Text style={styles.title}>{item.title}</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        
        {/* PANTRY STATUS BAR */}
        <View style={styles.matchBar}>
          <Text style={styles.matchTitle}>
            You have {ownedIngredients} / {totalIngredients} ingredients
          </Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(ownedIngredients/totalIngredients)*100}%` }]} />
          </View>
          {missingCount > 0 ? (
            <Text style={styles.missingText}>You need {missingCount} more items 🛒</Text>
          ) : (
            <Text style={{color: '#27ae60', fontWeight: 'bold', marginTop: 5}}>You have everything! 🎉</Text>
          )}
        </View>

        {/* TABS */}
        <View style={styles.tabRow}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'ingredients' && styles.activeTab]}
            onPress={() => setActiveTab('ingredients')}
          >
            <Text style={[styles.tabText, activeTab === 'ingredients' && styles.activeTabText]}>Ingredients</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'instructions' && styles.activeTab]}
            onPress={() => setActiveTab('instructions')}
          >
            <Text style={[styles.tabText, activeTab === 'instructions' && styles.activeTabText]}>Instructions</Text>
          </TouchableOpacity>
        </View>

        {/* CONTENT AREA */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'ingredients' ? (
            <View style={styles.listContainer}>
              {item.ingredients?.map((ing, index) => {
                const isOwned = checkIngredient(ing);
                return (
                  <View key={index} style={styles.ingredientRow}>
                    <View style={[styles.checkBox, isOwned ? styles.checkedBox : styles.uncheckedBox]}>
                      <Ionicons name={isOwned ? "checkmark" : "add"} size={16} color={isOwned ? "#fff" : "#FF6B6B"} />
                    </View>
                    <Text style={[styles.ingredientText, isOwned && styles.ownedText]}>{ing}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {/* Fallback text since our JSON data might not have steps yet */}
              <Text style={styles.instructionText}>
                1. Heat your pan to medium heat.{"\n\n"}
                2. Combine the ingredients in a large bowl.{"\n\n"}
                3. Cook for {item.readyInMinutes} minutes until golden brown.{"\n\n"}
                4. Serve and enjoy!
              </Text>
            </View>
          )}
          {/* Spacer for bottom scrolling */}
          <View style={{height: 40}} />
        </ScrollView>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  imageContainer: { height: 300, width: '100%', position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  backBtn: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  headerContent: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  tagRow: { flexDirection: 'row', marginBottom: 10 },
  tag: { backgroundColor: '#FF6B6B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  tagText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  
  contentContainer: { flex: 1, marginTop: -20, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 25 },
  
  // Match Bar Styles
  matchBar: { marginBottom: 20 },
  matchTitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  progressBarBg: { height: 8, backgroundColor: '#EEE', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#27ae60', borderRadius: 4 },
  missingText: { fontSize: 12, color: '#FF6B6B', marginTop: 6, fontWeight: '600' },

  // Tabs
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE', marginBottom: 20 },
  tab: { marginRight: 20, paddingBottom: 10 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#FF6B6B' },
  tabText: { fontSize: 16, color: '#888', fontWeight: '600' },
  activeTabText: { color: '#333' },

  // List Styles
  listContainer: { paddingBottom: 20 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  checkBox: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkedBox: { backgroundColor: '#27ae60' },
  uncheckedBox: { borderWidth: 2, borderColor: '#FF6B6B', backgroundColor: '#fff' },
  ingredientText: { fontSize: 16, color: '#333' },
  ownedText: { textDecorationLine: 'line-through', color: '#aaa' },
  instructionText: { fontSize: 16, lineHeight: 26, color: '#444' }
});