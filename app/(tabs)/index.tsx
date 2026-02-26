// This is the main screen of your app, located at the root of the (tabs) directory.
// this code was written with the assistance of AI
import React, { useState, useEffect, useMemo } from 'react';
import {
 StyleSheet, Text, View, TextInput, FlatList, Image, TouchableOpacity,
 StatusBar, ScrollView, Platform, Modal, Dimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api, Recipe as APIRecipe, SearchBody } from '../../lib/api';
import { usePantry } from '../../src/context/PantryContext';

interface FilterState {
 difficulty: string | null;
 maxTime: string | null;
 cuisine: string | null;
 dietary: string[];
 mealType: string | null;
}

const { width } = Dimensions.get('window');

const CATEGORIES: { id: string, label: string, emoji: string }[] = [
 { id: 'all', label: 'All', emoji: '🍽️' },
 { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
 { id: 'healthy', label: 'Healthy', emoji: '🥑' },
 { id: 'sweet', label: 'Sweet', emoji: '🍩' },
 { id: 'spicy', label: 'Spicy', emoji: '🌶️' },
];

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
 const options: { id: string, label: string, icon: string }[] = [
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

export default function Index() {
 const router = useRouter();
 const { pantryIngredients } = usePantry();

 // STATE
 const [query, setQuery] = useState<string>('');
 const [activeFilters, setActiveFilters] = useState<FilterState>({
   difficulty: null, maxTime: null, cuisine: null, dietary: [], mealType: null
 });
 const [results, setResults] = useState<APIRecipe[]>([]);
 const [loading, setLoading] = useState<boolean>(false);
 const [greeting, setGreeting] = useState<string>('Good Morning');
 const [modalVisible, setModalVisible] = useState<boolean>(false);
 const [health, setHealth] = useState<"checking" | "ok" | "error">("checking");

 // Greeting & Health Check
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
   const fetchData = async () => {
     setLoading(true);
     try {
       const searchBody: SearchBody = {
         searchQuery: query,
         filters: {
           diets: activeFilters.dietary,
           cuisines: activeFilters.cuisine ? [activeFilters.cuisine] : [],
           mealTypes: activeFilters.mealType ? [activeFilters.mealType] : [],
           timeBuckets: activeFilters.maxTime ? [activeFilters.maxTime] : [],
         },
         userIngredients: pantryIngredients,
       };
       const response = await api.search(searchBody);
       setResults(response.results);
     } catch (err) {
       console.error("Backend Search Error:", err);
     } finally {
       setLoading(false);
     }
   };

   const timer = setTimeout(() => {
     fetchData();
   }, 500); 

   return () => clearTimeout(timer);
 }, [query, activeFilters, pantryIngredients]);

 const renderVerticalCard = ({ item }: { item: APIRecipe }) => {
   const recipeIngs = item.extendedIngredients?.map(i => i.name) || (item as any).ingredients || [];
   const matchCount = recipeIngs.filter((ing: string) =>
     pantryIngredients.some((p: string) => ing.toLowerCase().includes(p.toLowerCase()))
   ).length;

   return (
     <TouchableOpacity
       activeOpacity={0.9} style={styles.verticalCardWrapper}
       onPress={() => router.push({ pathname: '/RecipeDetail' as any, params: { id: item.id } })}
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

 const ListHeader = useMemo(() => {
   const isFiltering = activeFilters.difficulty || activeFilters.maxTime || activeFilters.cuisine || activeFilters.dietary.length > 0;
   
   return (
     <View style={{ backgroundColor: '#25292e' }}>
       <View style={styles.headerContainer}>
         <View style={styles.healthBadge}>
           <Text style={[styles.healthText, health === "ok" && {color: '#27ae60'}, health === "error" && {color: '#ff4444'}]}>
             {health === "ok" ? "🟢 Backend Connected" : health === "error" ? "🔴 Backend Offline (Check Terminal)" : "🔌 Connecting..."}
           </Text>
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
           <Ionicons name="options" size={24} color="#fff" />
         </TouchableOpacity>
       </View>

       {loading && <ActivityIndicator size="large" color="#39afafff" style={{ marginVertical: 20 }} />}

       <View style={styles.sectionHeader}>
         <Text style={styles.sectionTitle}>
           {query ? `Results for "${query}"` : isFiltering ? 'Filtered Results' : 'Suggested Recipes'}
         </Text>
       </View>
     </View>
   );
 }, [greeting, query, health, loading, activeFilters]);

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
       ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No recipes found. Try a different search!</Text> : null}
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

const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: '#25292e' },
 mainList: { paddingBottom: 40 },
 headerContainer: { paddingHorizontal: 24, marginTop: 10, marginBottom: 20 },
 healthBadge: { marginBottom: 10 },
 healthText: { fontSize: 12, fontWeight: '600' },
 superHeader: { fontSize: 12, color: '#39afafff', fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
 mainHeader: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', lineHeight: 36 },
 sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 15, marginTop: 10 },
 sectionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
 searchRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 20, alignItems: 'center' },
 searchContainer: { flex: 1, position: 'relative', marginRight: 12 },
 searchBar: { height: 50, backgroundColor: '#333', borderRadius: 16, paddingLeft: 50, paddingRight: 20, fontSize: 16, color: '#FFFFFF' },
 searchIcon: { position: 'absolute', left: 18, top: 15 },
 filterBtn: { height: 50, width: 50, backgroundColor: '#444', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
 verticalCardWrapper: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 16, backgroundColor: '#333', borderRadius: 20, padding: 12 },
 verticalImage: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#444' },
 verticalContent: { flex: 1, marginLeft: 15, justifyContent: 'center' },
 verticalTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
 verticalSubtitle: { fontSize: 13, color: '#AAA' },
 matchBadge: { marginBottom: 4 },
 matchText: { color: '#39afafff', fontWeight: 'bold', fontSize: 12 },
 arrowBtn: { justifyContent: 'center', paddingRight: 10 },
 emptyText: { color: '#aaa', textAlign: 'center', marginTop: 50, fontSize: 16 },
 modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
 modalContent: { backgroundColor: '#25292e', padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '75%' },
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
});