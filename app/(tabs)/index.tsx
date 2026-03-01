// Main screen with search, filters, and recipe listings
// this code was written with the assistance of AI 
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TextInput, FlatList, Image, TouchableOpacity, 
  StatusBar, ScrollView, Platform, Modal, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { useRouter } from 'expo-router'; 
import { api, Recipe as APIRecipe, SearchBody } from '../../lib/api'; 
import { usePantry } from '../../src/context/PantryContext';
import { LoadCurrentUserID, ClearCurrentUserID } from '../../Utils/jsonCommands';

// 1. Define the UI Filter state interface
interface FilterState {
  difficulty: string | null;
  maxTime: string | null;
  cuisine: string | null;
  dietary: string[];
  mealType: string | null;
}

// 2. Load and Type your local backup data
const RECIPE_MAP = require('../../backend/recipes.json');
const ALL_RECIPES_DATA: APIRecipe[] = Object.values(RECIPE_MAP);

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'healthy', label: 'Healthy', emoji: '🥑' },
  { id: 'sweet', label: 'Sweet', emoji: '🍩' },
  { id: 'spicy', label: 'Spicy', emoji: '🌶️' },
];

// --- SUB-COMPONENTS ---

const FilterDropdown = ({ 
  label, value, options, onSelect 
}: { 
  label: string, value: string | null, options: string[], onSelect: (val: string | null) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdownButton} onPress={() => setIsOpen(!isOpen)} activeOpacity={0.8}>
        <Text style={[styles.dropdownValue, !value && { color: '#aaa' }]}>{value || 'Any'}</Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#666" />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map((opt) => (
            <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { onSelect(opt); setIsOpen(false); }}>
              <Text style={{color: value === opt ? '#39afafff' : '#fff', fontWeight: value === opt ? 'bold' : 'normal'}}>{opt}</Text>
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
    { id: 'dairy-free', label: 'Dairy Free', icon: '🧀' },
  ];
  return (
    <View style={styles.dietSection}>
      <Text style={styles.dropdownLabel}>Dietary & Allergies</Text>
      <View style={styles.chipContainer}>
        {options.map((opt) => {
          const isActive = selected.includes(opt.id);
          return (
            <TouchableOpacity key={opt.id} style={[styles.dietChip, isActive && styles.dietChipActive]} onPress={() => onToggle(opt.id)}>
              <Text style={styles.chipEmoji}>{opt.icon}</Text>
              <Text style={[styles.dietChipText, isActive && styles.dietChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// --- MAIN COMPONENT ---

export default function Index() { 
  const router = useRouter();
  const { pantryIngredients } = usePantry();

  // STATE
  const [query, setQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeFilters, setActiveFilters] = useState<FilterState>({ 
    difficulty: null, maxTime: null, cuisine: null, dietary: [], mealType: null 
  });
  const [results, setResults] = useState<APIRecipe[]>(ALL_RECIPES_DATA);
  const [greeting, setGreeting] = useState<string>('Good Morning');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [health, setHealth] = useState<string>("checking");

  // logged-in user ID for search personalization
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Greeting & Health Check
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    api.health().then(() => setHealth("ok")).catch(() => setHealth("error"));

    // load stored user id for personalized search
    (async () => {
      const uid = await LoadCurrentUserID();
      setCurrentUserId(uid);
    })();
  }, []);

  // Backend Search Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
            const searchBody: SearchBody = {
              searchQuery: query,
              filters: {
                diets: activeFilters.dietary,
                cuisines: activeFilters.cuisine ? [activeFilters.cuisine] : [],
                mealTypes: activeFilters.mealType ? [activeFilters.mealType] : [],
                // This logic handles the "60+" by telling the backend the time limit
                timeBuckets: activeFilters.maxTime ? [activeFilters.maxTime] : [],
              },
              userIngredients: pantryIngredients,
              userId: currentUserId ?? undefined, // include if we know the user
            };
        const response = await api.search(searchBody);
        setResults(response.results);
      } catch (err) {
        console.error("Backend Search Error:", err);
        setResults(ALL_RECIPES_DATA);
      }
    };
    fetchData();
  }, [query, activeFilters, pantryIngredients, currentUserId]);

  // LOGOUT
  const handleLogout = useCallback(async () => {
    await ClearCurrentUserID();
    router.replace('/auth/Login'); // adjust this path to match your login screen route
  }, [router]);

  // RENDER HELPERS
  const renderVerticalCard = ({ item }: { item: APIRecipe }) => {
    // Check match count using ingredients from backend (or fallback to local schema)
    const recipeIngs = item.extendedIngredients?.map(i => i.name) || (item as any).ingredients || [];
    const matchCount = recipeIngs.filter((ing: string) => 
      pantryIngredients.some((p: string) => ing.toLowerCase().includes(p.toLowerCase()))
    ).length;

    return (
      <TouchableOpacity 
        activeOpacity={0.9} style={styles.verticalCardWrapper}
        onPress={() => router.push({ pathname: '/RecipeDetail', params: { id: item.id } })}
      >
        <Image source={{ uri: item.image || 'https://via.placeholder.com/80' }} style={styles.verticalImage} />
        <View style={styles.verticalContent}>
          <Text style={styles.verticalTitle}>{item.title}</Text>
          {matchCount > 0 && (
            <View style={styles.matchBadge}><Text style={styles.matchText}>✅ You have {matchCount} ingredients</Text></View>
          )}
          <Text style={styles.verticalSubtitle}>{item.readyInMinutes} min</Text>
        </View>
        <View style={styles.arrowBtn}><Ionicons name="chevron-forward" size={20} color="#39afafff" /></View>
      </TouchableOpacity>
    );
  };

  const renderTrendingCard = ({ item }: { item: APIRecipe }) => (
    <TouchableOpacity 
      activeOpacity={0.9} style={styles.trendingCard}
      onPress={() => router.push({ pathname: '/RecipeDetail', params: { id: item.id } })}
    >
      <Image source={{ uri: item.image || 'https://via.placeholder.com/300' }} style={styles.trendingImage} />
      <View style={styles.trendingOverlay}>
        <Text style={styles.trendingLabel}>TRENDING</Text>
        <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  const ListHeader = useMemo(() => {
    const isFiltering = activeFilters.difficulty || activeFilters.maxTime || activeFilters.cuisine || activeFilters.dietary.length > 0;
    let suggested = ALL_RECIPES_DATA.slice(0, 3);

    return (
      <View style={{ backgroundColor: '#25292e' }}>
        <View style={styles.headerContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={styles.healthBadge}>
              <Text style={[styles.healthText, health === "ok" && {color: '#27ae60'}, health === "error" && {color: '#c00'}]}>
                {health === "ok" ? "🟢 Backend Connected" : health === "error" ? "🔴 Backend Offline" : "🔌 Connecting..."}
              </Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="#f41d1d" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.superHeader}>{greeting.toUpperCase()}, CHEF 👨‍🍳</Text>
          <Text style={styles.mainHeader}>What do you want to cook today?</Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <TextInput style={styles.searchBar} placeholder="Search recipes..." placeholderTextColor="#A0A0A0" onChangeText={setQuery} value={query} />
            <Ionicons name="search" size={20} color="#A0A0A0" style={styles.searchIcon} />
          </View>
          <TouchableOpacity style={[styles.filterBtn, isFiltering && { backgroundColor: '#39afafff' }]} onPress={() => setModalVisible(true)}>
            <Ionicons name="options" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {!query && !isFiltering && (
          <>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Suggested For You ✨</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingList}>
              {suggested.map(item => <React.Fragment key={item.id}>{renderTrendingCard({ item })}</React.Fragment>)}
            </ScrollView>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{query ? `Results for "${query}"` : isFiltering ? 'Filtered Results' : 'All Recipes'}</Text>
        </View>
      </View>
    );
  }, [greeting, query, pantryIngredients, activeFilters, health, handleLogout]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={results}
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
              <FilterDropdown label="Difficulty" value={activeFilters.difficulty} options={['Easy', 'Medium', 'Hard']} onSelect={(val) => setActiveFilters({...activeFilters, difficulty: val})} />
              <FilterDropdown label="Max Cooking Time" value={activeFilters.maxTime} options={['15 min', '30 min', '45 min', '60 min', '60+ min']} onSelect={(val) => setActiveFilters({...activeFilters, maxTime: val})} />
                <FilterDropdown label="Type of Meal" value={activeFilters.mealType} options={['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']} onSelect={(val) => setActiveFilters({...activeFilters, mealType: val})}/>
              <FilterDropdown label="Cuisine" value={activeFilters.cuisine} options={['Italian', 'Mexican', 'American', 'Asian', 'Indian', 'French']} onSelect={(val) => setActiveFilters({...activeFilters, cuisine: val})}/>
              
              <DietarySection selected={activeFilters.dietary} onToggle={(id) => {
                const next = activeFilters.dietary.includes(id) ? activeFilters.dietary.filter(x => x !== id) : [...activeFilters.dietary, id];
                setActiveFilters({...activeFilters, dietary: next});
              }} />
              <TouchableOpacity style={styles.resetBtn} onPress={() => { setActiveFilters({ difficulty: null, maxTime: null, cuisine: null, dietary: [], mealType: null }); setModalVisible(false); }}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>Reset All</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#25292e', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  mainList: { paddingBottom: 40 },
  headerContainer: { paddingHorizontal: 24, marginTop: 10, marginBottom: 20 },
  healthBadge: { marginBottom: 0 },
  healthText: { fontSize: 12, fontWeight: '600', color: '#888' },
  superHeader: { fontSize: 12, color: '#39afafff', fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  mainHeader: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', lineHeight: 36 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  searchRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 20, alignItems: 'center' },
  searchContainer: { flex: 1, position: 'relative', marginRight: 12 },
  searchBar: { height: 50, backgroundColor: '#333', borderRadius: 16, paddingLeft: 50, paddingRight: 20, fontSize: 16, color: '#FFFFFF' },
  searchIcon: { position: 'absolute', left: 18, top: 15 },
  filterBtn: { height: 50, width: 50, backgroundColor: '#444', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  trendingList: { paddingHorizontal: 24, paddingBottom: 20 },
  trendingCard: { width: width * 0.75, height: 200, marginRight: 20, borderRadius: 24, overflow: 'hidden', backgroundColor: '#333' },
  trendingImage: { width: '100%', height: '100%' },
  trendingOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', justifyContent: 'flex-end', padding: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  trendingLabel: { color: '#39afafff', fontWeight: '800', fontSize: 10, marginBottom: 4, backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  trendingTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  verticalCardWrapper: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 16, backgroundColor: '#333', borderRadius: 20, padding: 12 },
  verticalImage: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#444' },
  verticalContent: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  verticalTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  verticalSubtitle: { fontSize: 13, color: '#AAA' },
  matchBadge: { marginBottom: 4 },
  matchText: { color: '#39afafff', fontWeight: 'bold', fontSize: 12 },
  arrowBtn: { justifyContent: 'center', paddingRight: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#25292e', padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  dropdownContainer: { marginBottom: 20 },
  dropdownLabel: { fontSize: 14, color: '#AAA', marginBottom: 8, fontWeight: '600' },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#333', padding: 16, borderRadius: 12 },
  dropdownValue: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  dropdownList: { backgroundColor: '#333', marginTop: 5, borderRadius: 12, padding: 5 },
  dropdownItem: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#444' },
  resetBtn: { marginTop: 20, backgroundColor: '#f41d1d', padding: 16, borderRadius: 16, alignItems: 'center' },
  dietSection: { marginBottom: 25 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  dietChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#444' },
  dietChipActive: { backgroundColor: '#39afafff', borderColor: '#39afafff' },
  chipEmoji: { marginRight: 6 },
  dietChipText: { color: '#BBB', fontSize: 13, fontWeight: '600' },
  dietChipTextActive: { color: '#fff' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoutText: { color: '#f41d1d', fontWeight: '700', fontSize: 13 },
});