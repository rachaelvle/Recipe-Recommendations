// RecipeDetail.tsx - Screen for displaying detailed information about a selected recipe
//This code was written with the assistance of AI
import React, { useState, useEffect } from 'react';
import {
 StyleSheet, Text, View, Image, ScrollView, TouchableOpacity,
 ActivityIndicator, Dimensions, Platform, StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Recipe as APIRecipe } from '../lib/api';
import { LoadCurrentUserID } from '../Utils/jsonCommands';

const { width } = Dimensions.get('window');

export default function RecipeDetail() {
 const { id } = useLocalSearchParams();
 const router = useRouter();
 const [recipe, setRecipe] = useState<APIRecipe | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [crossedIngredients, setCrossedIngredients] = useState<string[]>([]);

 // we'll load the logged‑in user's ID from storage
 const [currentUserId, setCurrentUserId] = useState<number | null>(null);

 useEffect(() => {
   const fetchDetailAndPantry = async () => {
     try {
       setLoading(true);
       // make sure we know who is logged in
       const uid = await LoadCurrentUserID();
       setCurrentUserId(uid);

       const [recipeData, userProfile] = await Promise.all([
         (api as any).getRecipeDetail(Number(id)),
         uid && (api as any).getUserProfile
           ? (api as any).getUserProfile(uid).catch(() => null)
           : Promise.resolve(null),
       ]);

       setRecipe(recipeData);

       if (userProfile && (userProfile as any).ingredients) {
         const pantryNames = (userProfile as any).ingredients.map((i: any) =>
           i.ingredient.toLowerCase().trim()
         );
        
         const alreadyOwnedNames = recipeData.extendedIngredients
           .filter((ing: any) => {
             if (!ing.name) return false;
             const recipeIngName = ing.name.toLowerCase();
             return pantryNames.some((pName: string) =>
               recipeIngName.includes(pName) || pName.includes(recipeIngName)
             );
           })
           .map((ing: any) => ing.name);

         setCrossedIngredients(alreadyOwnedNames);
       }

     } catch (err) {
       console.error("Fetch Error:", err);
       setError("Could not load recipe details.");
     } finally {
       setLoading(false);
     }
   };

   if (id) fetchDetailAndPantry();
 }, [id]);

 const cleanSummary = recipe?.summary?.replace(/<[^>]*>?/gm, '') || "";

 const toggleIngredient = (ingredientName: string) => {
   if (!ingredientName) return;
   setCrossedIngredients(prev =>
     prev.includes(ingredientName)
       ? prev.filter(name => name !== ingredientName) 
       : [...prev, ingredientName]                    
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
       <View style={styles.imageContainer}>
         <Image source={{ uri: recipe.image }} style={styles.mainImage} />
         <TouchableOpacity style={styles.floatingBack} onPress={() => router.back()}>
           <Ionicons name="arrow-back" size={24} color="#fff" />
         </TouchableOpacity>
       </View>

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

         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dietScroll}>
           {/* Added :string and :number below */}
           {recipe.diets?.map((diet: string, index: number) => (
             <View key={index} style={styles.dietBadge}>
               <Text style={styles.dietText}>{diet.toUpperCase()}</Text>
             </View>
           ))}
         </ScrollView>

         <View style={styles.divider} />

         <Text style={styles.sectionTitle}>Summary</Text>
         <Text style={styles.summaryText}>{cleanSummary}</Text>

         <Text style={styles.sectionTitle}>Ingredients</Text>
         {/* Added :any and :number below */}
         {recipe.extendedIngredients?.map((ing: any, index: number) => {
           const isCrossed = crossedIngredients.includes(ing.name);
          
           return (
             <TouchableOpacity
               key={ing.id || index}
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