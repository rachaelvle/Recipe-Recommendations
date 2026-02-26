 // Pantry Screen - where users can manage their ingredients
// this code was written with the assistance of AI
import React, { useState } from 'react';
import {
 StyleSheet, Text, View, TextInput, FlatList, TouchableOpacity,
 Image, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../../src/context/PantryContext';
import { styles as globalStyles } from "@/styles/SimpleStyleSheet";


export default function PantryScreen() {
 const [text, setText] = useState('');
 const { pantryIngredients, addToPantry, removeFromPantry, loading } = usePantry();


 const handleAddItem = () => {
   if (text.trim().length > 0) {
     addToPantry(text.trim());
     setText(''); // Clear input
   }
 };


 const renderItem = ({ item }) => (
   <View style={styles.itemCard}>
     <View style={styles.itemLeft}>
       <View style={styles.bullet} />
       <Text style={styles.itemText}>{item}</Text>
     </View>
     <TouchableOpacity onPress={() => removeFromPantry(item)}>
       <Ionicons name="trash-outline" size={20} color="#39afafff" />
     </TouchableOpacity>
   </View>
 );

 if (loading) {
   return (
     <View style={styles.loadingContainer}>
       <ActivityIndicator size="large" color="#39afafff" />
       <Text style={{marginTop: 10, color: '#888'}}>Loading your kitchen...</Text>
     </View>
   );
 }


 return (
   <SafeAreaView style={styles.container}>
     <StatusBar barStyle="dark-content" />
    
<View style={styles.header}>
       <Text style={styles.headerTitle}>My Pantry 🥕</Text>
       <Text style={styles.headerSubtitle}>
         {pantryIngredients.length} items collected
       </Text>
     </View>


     {pantryIngredients.length === 0 ? (
       <View style={styles.emptyState}>
         <Ionicons name="basket-outline" size={80} color="#DDD" />
         <Text style={styles.emptyText}>Your pantry is empty!</Text>
         <Text style={styles.emptySubText}>Add ingredients to see what you can cook.</Text>
       </View>
     ) : (
       <FlatList
         data={pantryIngredients}
         keyExtractor={(item, index) => index.toString()}
         renderItem={renderItem}
         contentContainerStyle={styles.listContent}
         showsVerticalScrollIndicator={false}
       />
     )}


     <KeyboardAvoidingView
       behavior={Platform.OS === "ios" ? "padding" : "height"}
       keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
       style={styles.inputWrapper}
     >
       <TextInput
         style={styles.input}
         placeholder="Add an item (e.g. Eggs)..."
         value={text}
         onChangeText={setText}
         onSubmitEditing={handleAddItem}
       />
       <TouchableOpacity onPress={handleAddItem}>
         <View style={styles.addBtn}>
           <Ionicons name="add" size={30} color="#FFF" />
         </View>
       </TouchableOpacity>
     </KeyboardAvoidingView>


   </SafeAreaView>
 );
}


const styles = StyleSheet.create({
 container: {
   flex: 1,
   backgroundColor: '#25292e',
   paddingHorizontal: 24,
 },

 header: {
   marginTop: 20,
   marginBottom: 20,
 },
 headerTitle: {
   fontSize: 28,
   fontWeight: '800',
   color: '#FFFFFF',
   marginBottom: 5,
 },
 headerSubtitle: {
   fontSize: 14,
   color: '#AAA',
   marginBottom: 10,
 },

 emptyState: {
   flex: 1,
   justifyContent: 'center',
   alignItems: 'center',
   marginTop: -100,
 },
 emptyText: {
   color: '#FFFFFF',
   fontSize: 18,
   fontWeight: '700',
   marginTop: 20,
 },
 emptySubText: {
   color: '#AAA',
   textAlign: 'center',
   marginTop: 8,
   paddingHorizontal: 40,
 },

 itemCard: {
   flexDirection: 'row',
   backgroundColor: '#333',
   padding: 16,
   borderRadius: 16,
   alignItems: 'center',
   justifyContent: 'space-between',
   marginBottom: 12,
 },
 itemLeft: {
   flexDirection: 'row',
   alignItems: 'center',
 },
 bullet: {
   width: 8,
   height: 8,
   borderRadius: 4,
   backgroundColor: '#39afafff',
   marginRight: 12,
 },
 itemText: {
   color: '#FFFFFF',
   fontSize: 16,
   fontWeight: '600',
 },
 inputWrapper: {
   flexDirection: 'row',
   alignItems: 'center',
   marginBottom: Platform.OS === 'ios' ? 20 : 10,
   gap: 12,
 },
 input: {
   flex: 1,
   height: 56,
   backgroundColor: '#333',
   borderRadius: 16,
   paddingHorizontal: 20,
   color: '#FFFFFF',
 },
 addBtn: {
   width: 56,
   height: 56,
   backgroundColor: '#39afafff', // Teammate's teal
   borderRadius: 16,
   justifyContent: 'center',
   alignItems: 'center',
 },
 loadingContainer: {
   flex: 1,
   backgroundColor: '#25292e',
   justifyContent: 'center',
   alignItems: 'center',
 },
});



