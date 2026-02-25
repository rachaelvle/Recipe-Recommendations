import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, FlatList, Image, TouchableOpacity, 
  StatusBar, ScrollView, Platform, Modal, Dimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { useRouter } from 'expo-router'; 
import { api } from '../../lib/api'; 
import { usePantry } from '../../src/context/PantryContext';
import { styles as globalStyles } from "@/styles/SimpleStyleSheet";

// This tells TypeScript exactly what a Recipe object looks like!
interface Recipe {
  id: string | number;
  title: string;
  image: string;
  readyInMinutes: number;
  difficulty?: string;
  category?: string;
  ingredients?: string[];
}

interface Filters {
  difficulty: string | null;
  maxTime: string | null;
  cuisine: string | null;
  dietary: string[];
}

const [activeFilters, setActiveFilters] = useState<Filters>({ 
    difficulty: null, 
    maxTime: null, 
    cuisine: null,
    dietary: [] 
  });

const RECIPE_MAP = require('../../assets/data/recipes_map.json'); 
const ALL_RECIPES_DATA: Recipe[] = Object.values(RECIPE_MAP); // Tell TS this is an array of Recipes

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'healthy', label: 'Healthy', emoji: '🥑' },
  { id: 'sweet', label: 'Sweet', emoji: '🍩' },
  { id: 'spicy', label: 'Spicy', emoji: '🌶️' },
];

const FilterDropdown = ({ 
  label, 
  value, 
  options, 
  onSelect 
}: { 
  label: string, 
  value: string | null, 
  options: string[], 
  onSelect: (val: string | null) => void 
}) => {
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
          {options.map((opt) => (
            <TouchableOpacity 
              key={opt} 
              style={styles.dropdownItem}
              onPress={() => { onSelect(opt); setIsOpen(false); }}
            >
              <Text style={{color: value === opt ? '#39afafff' : '#fff', fontWeight: value === opt ? 'bold' : 'normal'}}>
                {opt}
              </Text>
              {value === opt && <Ionicons name="checkmark" size={16} color="#39afafff" />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const DietarySection = ({ selected, onToggle }: { selected: string[], onToggle: (id: string) => void }) => {
  const options = [
    { id: 'vegan', label: 'Vegan', icon: '🌿' },
    { id: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
    { id: 'pescatarian', label: 'Pescatarian', icon: '🐟' },
    { id: 'carnivore', label: 'Carnivore', icon: '🥩' },
    { id: 'gluten-free', label: 'Gluten Free', icon: '🌾' },
    { id: 'lactose-intolerant', label: 'Dairy Free', icon: '🧀' },
    { id: 'peanut-allergy', label: 'No Peanuts', icon: '🥜' },
    { id: 'seafood-allergy', label: 'No Shellfish', icon: '🦐' },
  ];

  return (
    <View style={styles.dietSection}>
      <Text style={styles.dropdownLabel}>Dietary & Allergies</Text>
      <View style={styles.chipContainer}>
        {options.map((opt) => {
          const isActive = selected.includes(opt.id);
          return (
            <TouchableOpacity 
              key={opt.id} 
              style={[styles.dietChip, isActive && styles.dietChipActive]}
              onPress={() => onToggle(opt.id)}
            >
              <Text style={styles.chipEmoji}>{opt.icon}</Text>
              <Text style={[styles.dietChipText, isActive && styles.dietChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function Index() { 
  const router = useRouter();
  const { pantryIngredients } = usePantry();

  // --- STATE ---
  const [query, setQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  // We apply our Filters blueprint here!
  const [activeFilters, setActiveFilters] = useState<Filters>({ 
    difficulty: null, 
    maxTime: null, 
    cuisine: null,
    dietary: [] 
  });

  // We apply our Recipe[] blueprint here!
  const [results, setResults] = useState<Recipe[]>(ALL_RECIPES_DATA);
  const [greeting, setGreeting] = useState<string>('Good Morning');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [health, setHealth] = useState<string>("checking");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    api.health()
      .then(() => setHealth("ok"))
      .catch(() => setHealth("error"));
  }, []);

useEffect(() => {
    let filtered = [...ALL_RECIPES_DATA];

    if (query) {
      filtered = filtered.filter((r: Recipe) => r.title.toLowerCase().includes(query.toLowerCase()));
    }
    if (activeFilters.difficulty) {
      filtered = filtered.filter((r: Recipe) => r.difficulty === activeFilters.difficulty);
    }
    if (activeFilters.maxTime) {
      const minutes = parseInt(activeFilters.maxTime.replace(' min', ''));
      filtered = filtered.filter((r: Recipe) => r.readyInMinutes <= minutes);
    }

    if (activeFilters.dietary.length > 0) {
      filtered = filtered.filter((r: Recipe) => {
        // This assumes your recipe data has a 'dietary' array or keywords in the title/category
        // If your mock data doesn't have a 'dietary' field yet, we can match by category:
        return activeFilters.dietary.every(filter => 
          r.title.toLowerCase().includes(filter.toLowerCase()) || 
          r.category?.toLowerCase() === filter.toLowerCase()
        );
      });
    }

    setResults(filtered);
  }, [query, activeCategory, activeFilters]);


  const renderVerticalCard = ({ item }: { item: Recipe }) => {
    const matchCount = item.ingredients ? item.ingredients.filter((ing: string) => 
      pantryIngredients.some((pantryItem: string) => ing.toLowerCase().includes(pantryItem.toLowerCase()))
    ).length : 0;

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        style={styles.verticalCardWrapper}
        onPress={() => router.push({ pathname: '/RecipeDetail', params: { id: item.id } })}
      >
        <Image source={{ uri: item.image }} style={styles.verticalImage} />
        <View style={styles.verticalContent}>
          <Text style={styles.verticalTitle}>{item.title}</Text>
          {matchCount > 0 && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>✅ You have {matchCount} ingredients</Text>
            </View>
          )}
          <Text style={styles.verticalSubtitle}>
            {item.readyInMinutes} min • {item.difficulty || 'Easy'}
          </Text>
        </View>
        <View style={styles.arrowBtn}><Ionicons name="chevron-forward" size={20} color="#39afafff" /></View>
      </TouchableOpacity>
    );
  };

  const renderTrendingCard = ({ item }: { item: Recipe }) => {
    const matchCount = item.ingredients ? item.ingredients.filter((ing: string) => 
      pantryIngredients.some((pantryItem: string) => ing.toLowerCase().includes(pantryItem.toLowerCase()))
    ).length : 0;

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: '/RecipeDetail', params: { id: item.id } })}
        style={styles.trendingCard}
      >
        <Image source={{ uri: item.image }} style={styles.trendingImage} />
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

  const ListHeader = useMemo(() => {
    let suggestedRecipes: Recipe[] = [];
    const isFiltering = activeFilters.difficulty || activeFilters.maxTime || activeFilters.cuisine || activeFilters.dietary.length > 0;

    if (greeting === 'Good Morning') suggestedRecipes = ALL_RECIPES_DATA.filter((r: Recipe) => r.category === 'breakfast');
    else suggestedRecipes = ALL_RECIPES_DATA.filter((r: Recipe) => r.category === 'healthy');
    if (suggestedRecipes.length === 0) suggestedRecipes = ALL_RECIPES_DATA.slice(0, 3);

    return (
      <View style={{ backgroundColor: '#25292e' }}>
        <View style={styles.headerContainer}>
          <View style={styles.healthBadge}>
            {health === "checking" && <Text style={styles.healthText}>🔌 Connecting to API...</Text>}
            {health === "ok" && <Text style={[styles.healthText, {color: '#27ae60'}]}>🟢 Backend Connected</Text>}
            {health === "error" && <Text style={[styles.healthText, {color: '#c00'}]}>🔴 Backend Offline</Text>}
          </View>

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
          
          <TouchableOpacity 
            style={[styles.filterBtn, isFiltering && { backgroundColor: '#39afafff' }]} 
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="options" size={24} color={isFiltering ? "#fff" : "#fff"} />
          </TouchableOpacity>
        </View>

        {!query && !isFiltering && (
          <>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Suggested For You ✨</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingList}>
              {suggestedRecipes.map((item: Recipe) => <React.Fragment key={item.id}>{renderTrendingCard({ item })}</React.Fragment>)}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending Now 🔥</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingList}>
              {ALL_RECIPES_DATA.slice(0, 3).map((item: Recipe) => <React.Fragment key={item.id}>{renderTrendingCard({ item })}</React.Fragment>)}
            </ScrollView>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {query ? `Results for "${query}"` : isFiltering ? 'Filtered Results' : 'All Recipes'}
          </Text>
          {isFiltering && activeCategory !== 'all' && (
            <Text style={{fontSize: 12, color: '#888'}}>in {activeCategory}</Text>
          )}
        </View>
      </View>
    );
  }, [greeting, query, activeCategory, pantryIngredients, activeFilters, health]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <FlatList
        data={results}
        extraData={pantryIngredients} 
        keyExtractor={item => String(item.id)}
        renderItem={renderVerticalCard}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.mainList}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Recipes 🧂</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{color: '#39afafff', fontWeight: 'bold', fontSize: 16}}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <FilterDropdown 
                label="Difficulty"
                value={activeFilters.difficulty}
                options={['Easy', 'Medium', 'Hard']}
                onSelect={(val) => setActiveFilters({...activeFilters, difficulty: val})}
              />

              <FilterDropdown 
                label="Max Cooking Time"
                value={activeFilters.maxTime}
                options={['15 min', '30 min', '45 min', '60 min']}
                onSelect={(val) => setActiveFilters({...activeFilters, maxTime: val})}
              />
              

              <DietarySection 
                selected={activeFilters.dietary}
                onToggle={(id) => {
                  const next = activeFilters.dietary.includes(id)
                    ? activeFilters.dietary.filter(item => item !== id)
                    : [...activeFilters.dietary, id];
                  setActiveFilters({...activeFilters, dietary: next});
                }}
              />

               <FilterDropdown 
                label="Cuisine"
                value={activeFilters.cuisine}
                options={['Italian', 'Mexican', 'American', 'Asian']}
                onSelect={(val) => setActiveFilters({...activeFilters, cuisine: val})}
              />

              <TouchableOpacity 
                style={styles.resetBtn} 
                onPress={() => {
                  setActiveFilters({ difficulty: null, maxTime: null, cuisine: null, dietary: [] });
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

  container: { 
    flex: 1, 
    backgroundColor: '#25292e', 
    paddingTop: Platform.OS === 'android' ? 40 : 0 
  },
  mainList: { paddingBottom: 40 },
  headerContainer: { paddingHorizontal: 24, marginTop: 10, marginBottom: 20 },
  
  healthBadge: { marginBottom: 10 },
  healthText: { fontSize: 12, fontWeight: '600', color: '#888' },
  superHeader: { fontSize: 12, color: '#39afafff', fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  mainHeader: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', lineHeight: 36 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },

  searchRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 20, alignItems: 'center' },
  searchContainer: { flex: 1, position: 'relative', marginRight: 12 },
  searchBar: { 
    height: 50, 
    backgroundColor: '#333', 
    borderRadius: 16, 
    paddingLeft: 50, 
    paddingRight: 20, 
    fontSize: 16, 
    color: '#FFFFFF' 
  },
  searchIcon: { position: 'absolute', left: 18, top: 15 },
  filterBtn: { 
    height: 50, 
    width: 50, 
    backgroundColor: '#39afafff', 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  categoryScroll: { paddingHorizontal: 24, paddingBottom: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, marginRight: 10, borderWidth: 1, borderColor: '#444' },
  chipActive: { backgroundColor: '#39afafff', borderColor: '#39afafff' },
  chipEmoji: { marginRight: 6 },
  chipText: { fontWeight: '600', color: '#BBB' },
  chipTextActive: { color: '#fff' },

  trendingList: { paddingHorizontal: 24, paddingBottom: 20 },
  trendingCard: { width: width * 0.75, height: 200, marginRight: 20, borderRadius: 24, overflow: 'hidden', backgroundColor: '#333' },
  trendingMatchBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#25292e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, zIndex: 10 },
  trendingMatchText: { fontSize: 10, fontWeight: '800', color: '#39afafff' },
  trendingImage: { width: '100%', height: '100%' },
  trendingOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', justifyContent: 'flex-end', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  trendingLabel: { color: '#39afafff', fontWeight: '800', fontSize: 10, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.9)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  trendingTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },

  verticalCardWrapper: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 16, backgroundColor: '#333', borderRadius: 20, padding: 12 },
  verticalImage: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#444' },
  verticalContent: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  verticalTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  verticalSubtitle: { fontSize: 13, color: '#AAA' },
  matchBadge: { marginBottom: 4 },
  matchText: { color: '#39afafff', fontWeight: 'bold', fontSize: 12 },
  arrowBtn: { justifyContent: 'center', paddingRight: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#25292e', padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  dropdownContainer: { marginBottom: 20 },
  dropdownLabel: { fontSize: 14, color: '#AAA', marginBottom: 8, fontWeight: '600' },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#333', padding: 16, borderRadius: 12 },
  dropdownValue: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  dropdownList: { backgroundColor: '#333', marginTop: 5, borderRadius: 12, padding: 5 },
  dropdownItem: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#444' },
  resetBtn: { marginTop: 20, backgroundColor: '#f41d1dff', padding: 16, borderRadius: 16, alignItems: 'center' },
  dietSection: { marginBottom: 25 },
  chipContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginTop: 10 
  },
  dietChip: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#444' 
  },
  dietChipActive: { 
    backgroundColor: '#39afafff', 
    borderColor: '#39afafff' 
  },
  dietChipText: { color: '#BBB', fontSize: 13, fontWeight: '600' },
  dietChipTextActive: { color: '#fff' },
});