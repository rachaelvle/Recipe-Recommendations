import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, FlatList, Image, TouchableOpacity, 
  StatusBar, ScrollView, Platform, Modal, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; // We need this for the arrows

// 1. IMPORT PANTRY HOOK
import { usePantry } from '../context/PantryContext';

const RECIPE_MAP = require('../../assets/data/recipes_map.json'); 
const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'healthy', label: 'Healthy', emoji: '🥑' },
  { id: 'sweet', label: 'Sweet', emoji: '🍩' },
  { id: 'spicy', label: 'Spicy', emoji: '🌶️' },
];

// --- HELPER COMPONENT: CUSTOM DROPDOWN ---
const FilterDropdown = ({ label, value, options, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity 
        style={styles.dropdownButton} 
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <Text style={[styles.dropdownValue, !value && { color: '#aaa' }]}>
          {value || 'Any'}
        </Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#666" />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownList}>
          <TouchableOpacity 
            style={styles.dropdownItem} 
            onPress={() => { onSelect(null); setIsOpen(false); }}
          >
            <Text style={{color: '#888'}}>Any (Reset)</Text>
          </TouchableOpacity>
          {options.map((opt) => (
            <TouchableOpacity 
              key={opt} 
              style={styles.dropdownItem}
              onPress={() => { onSelect(opt); setIsOpen(false); }}
            >
              <Text style={{color: value === opt ? '#FF6B6B' : '#333', fontWeight: value === opt ? 'bold' : 'normal'}}>
                {opt}
              </Text>
              {value === opt && <Ionicons name="checkmark" size={16} color="#FF6B6B" />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function HomeScreen({ navigation }) { 
  // 2. USE THE HOOK INSIDE THE COMPONENT
  const { pantryIngredients } = usePantry();

  // --- STATE ---
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFilters, setActiveFilters] = useState({ difficulty: null, maxTime: null, cuisine: null });
  
  const [results, setResults] = useState(Object.values(RECIPE_MAP));
  const [greeting, setGreeting] = useState('Good Morning');
  const [modalVisible, setModalVisible] = useState(false);

  // --- 3. GREETING LOGIC ---
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // --- 4. MASTER SEARCH EFFECT (Runs whenever anything changes) ---
  useEffect(() => {
    let filtered = Object.values(RECIPE_MAP);

    // Filter 1: Text Search
    if (query) {
      filtered = filtered.filter(r => r.title.toLowerCase().includes(query.toLowerCase()));
    }

    // Filter 2: Category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(r => r.category?.toLowerCase() === activeCategory.toLowerCase());
    }

    // Filter 3: Dropdowns (Difficulty)
    if (activeFilters.difficulty) {
      filtered = filtered.filter(r => r.difficulty === activeFilters.difficulty);
    }

    // Filter 4: Dropdowns (Time)
    if (activeFilters.maxTime) {
      const minutes = parseInt(activeFilters.maxTime.replace(' min', ''));
      filtered = filtered.filter(r => r.readyInMinutes <= minutes);
    }

    setResults(filtered);
  }, [query, activeCategory, activeFilters]);


  // --- RENDER CARD ---
  const renderVerticalCard = ({ item }) => {
    // Check Pantry Matches
    const matchCount = item.ingredients ? item.ingredients.filter(ing => 
      pantryIngredients.some(pantryItem => ing.toLowerCase().includes(pantryItem.toLowerCase()))
    ).length : 0;

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        style={styles.verticalCardWrapper}
        onPress={() => navigation.navigate('RecipeDetail', { item })}
      >
        <Image source={{ uri: item.image }} style={styles.verticalImage} />
        <View style={styles.verticalContent}>
          <Text style={styles.verticalTitle}>{item.title}</Text>
          
          {/* PANTRY MATCH BADGE */}
          {matchCount > 0 && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>✅ You have {matchCount} ingredients</Text>
            </View>
          )}

          <Text style={styles.verticalSubtitle}>
            {item.readyInMinutes} min • {item.difficulty || 'Easy'}
          </Text>
        </View>
        <View style={styles.arrowBtn}><Ionicons name="chevron-forward" size={20} color="#FF6B6B" /></View>
      </TouchableOpacity>
    );
  };

const renderTrendingCard = ({ item }) => {
    // 1. Calculate Match Count (Same logic as the vertical list)
    const matchCount = item.ingredients ? item.ingredients.filter(ing => 
      pantryIngredients.some(pantryItem => ing.toLowerCase().includes(pantryItem.toLowerCase()))
    ).length : 0;

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => navigation.navigate('RecipeDetail', { item })}
        style={styles.trendingCard}
      >
        <Image source={{ uri: item.image }} style={styles.trendingImage} />
        
        {/* 2. NEW: Floating Match Badge */}
        {matchCount > 0 && (
          <View style={styles.trendingMatchBadge}>
            <Text style={styles.trendingMatchText}>✅ Have {matchCount}</Text>
          </View>
        )}

        <View style={styles.trendingOverlay}>
          <Text style={styles.trendingLabel}>TRENDING</Text>
          <Text style={styles.trendingTitle}>{item.title}</Text>
        </View>
      </TouchableOpacity>
    );
  };

// --- HEADER COMPONENT ---
  const ListHeader = useMemo(() => {
    const allRecipes = Object.values(RECIPE_MAP);
    let suggestedRecipes = [];

    // Check if any filter is actually active
    const isFiltering = activeFilters.difficulty || activeFilters.maxTime || activeFilters.cuisine;

    // Simple Suggestion Logic
    if (greeting === 'Good Morning') suggestedRecipes = allRecipes.filter(r => r.category === 'breakfast');
    else suggestedRecipes = allRecipes.filter(r => r.category === 'healthy');
    if (suggestedRecipes.length === 0) suggestedRecipes = allRecipes.slice(0, 3);

    return (
      <View style={{ backgroundColor: '#F9F9F9' }}>
        <View style={styles.headerContainer}>
          <Text style={styles.superHeader}>{greeting.toUpperCase()}, CHEF 👨‍🍳</Text>
          <Text style={styles.mainHeader}>What do you want to cook today?</Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search recipes..."
              placeholderTextColor="#A0A0A0"
              onChangeText={setQuery}
              value={query}
            />
            <Ionicons name="search" size={20} color="#A0A0A0" style={styles.searchIcon} />
          </View>
          
          {/* Change color if filter is active so user knows */}
          <TouchableOpacity 
            style={[styles.filterBtn, isFiltering && { backgroundColor: '#FF6B6B' }]} 
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="options" size={24} color={isFiltering ? "#fff" : "#333"} />
          </TouchableOpacity>
        </View>

        {/* ONLY SHOW DISCOVERY SECTIONS IF NOT SEARCHING AND NOT FILTERING */}
        {!query && !isFiltering && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.chip, activeCategory === cat.id && styles.chipActive]}
                  onPress={() => setActiveCategory(cat.id)}
                >
                  <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.chipText, activeCategory === cat.id && styles.chipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Suggested For You ✨</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingList}>
              {suggestedRecipes.map(item => <React.Fragment key={item.id}>{renderTrendingCard({ item })}</React.Fragment>)}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending Now 🔥</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingList}>
              {allRecipes.slice(0, 3).map(item => <React.Fragment key={item.id}>{renderTrendingCard({ item })}</React.Fragment>)}
            </ScrollView>
          </>
        )}

        {/* UPDATE TITLE BASED ON STATE */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {query ? `Results for "${query}"` : isFiltering ? 'Filtered Results' : 'All Recipes'}
          </Text>
          
          {/* Optional: Show active category if filtering */}
          {isFiltering && activeCategory !== 'all' && (
            <Text style={{fontSize: 12, color: '#888'}}>in {activeCategory}</Text>
          )}
        </View>
      </View>
    );
  }, [greeting, query, activeCategory, pantryIngredients, activeFilters]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <FlatList
        data={results}
        // 5. THIS IS THE KEY FIX FOR PANTRY UPDATES
        extraData={pantryIngredients} 
        keyExtractor={item => item.id.toString()}
        renderItem={renderVerticalCard}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.mainList}
        showsVerticalScrollIndicator={false}
      />

      {/* --- NEW FILTER MODAL --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Recipes 🧂</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{color: '#FF6B6B', fontWeight: 'bold', fontSize: 16}}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {/* Dropdown 1: Difficulty */}
              <FilterDropdown 
                label="Difficulty"
                value={activeFilters.difficulty}
                options={['Easy', 'Medium', 'Hard']}
                onSelect={(val) => setActiveFilters({...activeFilters, difficulty: val})}
              />

              {/* Dropdown 2: Time */}
              <FilterDropdown 
                label="Max Cooking Time"
                value={activeFilters.maxTime}
                options={['15 min', '30 min', '45 min', '60 min']}
                onSelect={(val) => setActiveFilters({...activeFilters, maxTime: val})}
              />
              
              {/* Bonus Dropdown: Cuisine (If you add cuisine data later) */}
               <FilterDropdown 
                label="Cuisine"
                value={activeFilters.cuisine}
                options={['Italian', 'Mexican', 'American', 'Asian']}
                onSelect={(val) => setActiveFilters({...activeFilters, cuisine: val})}
              />

              <TouchableOpacity 
                style={styles.resetBtn} 
                onPress={() => {
                  setActiveFilters({ difficulty: null, maxTime: null, cuisine: null });
                  setActiveCategory('all');
                  setModalVisible(false);
                }}
              >
                <Text style={{color: '#fff', fontWeight: 'bold'}}>Reset All</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  mainList: { paddingBottom: 40 },
  headerContainer: { paddingHorizontal: 24, marginTop: 10, marginBottom: 20 },
  superHeader: { fontSize: 12, color: '#FF6B6B', fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  mainHeader: { fontSize: 30, fontWeight: '800', color: '#1A1A1A', lineHeight: 36 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 20, alignItems: 'center' },
  searchContainer: { flex: 1, position: 'relative', marginRight: 12 },
  searchBar: { height: 50, backgroundColor: '#fff', borderRadius: 16, paddingLeft: 50, paddingRight: 20, fontSize: 16, color: '#333', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  searchIcon: { position: 'absolute', left: 18, top: 15 },
  filterBtn: { height: 50, width: 50, backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  categoryScroll: { paddingHorizontal: 24, paddingBottom: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, marginRight: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  chipActive: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
  chipEmoji: { marginRight: 6 },
  chipText: { fontWeight: '600', color: '#333' },
  chipTextActive: { color: '#fff' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  trendingList: { paddingHorizontal: 24, paddingBottom: 20 },
  trendingCard: { width: width * 0.75, height: 200, marginRight: 20, borderRadius: 24, overflow: 'hidden', backgroundColor: '#eee' },
  trendingMatchBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10, // Ensures it sits on top of the image
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  trendingMatchText: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#27ae60' 
  },
  trendingImage: { width: '100%', height: '100%' },
  trendingOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', justifyContent: 'flex-end', padding: 20, backgroundColor: 'rgba(0,0,0,0.3)' },
  trendingLabel: { color: '#FF6B6B', fontWeight: '800', fontSize: 10, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.9)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  trendingTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  verticalCardWrapper: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 16, backgroundColor: '#fff', borderRadius: 20, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  verticalImage: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#eee' },
  verticalContent: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  verticalTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  verticalSubtitle: { fontSize: 13, color: '#888' },
  matchBadge: { marginBottom: 4 },
  matchText: { color: '#27ae60', fontWeight: 'bold', fontSize: 12 },
  arrowBtn: { justifyContent: 'center', paddingRight: 10 },
  
  // --- MODAL & DROPDOWN STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#333' },
  
  dropdownContainer: { marginBottom: 20 },
  dropdownLabel: { fontSize: 14, color: '#888', marginBottom: 8, fontWeight: '600' },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 16, borderRadius: 12 },
  dropdownValue: { fontSize: 16, color: '#333', fontWeight: '500' },
  dropdownList: { backgroundColor: '#F5F5F5', marginTop: 5, borderRadius: 12, padding: 5 },
  dropdownItem: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  
  resetBtn: { marginTop: 20, backgroundColor: '#FF6B6B', padding: 16, borderRadius: 16, alignItems: 'center' }
});