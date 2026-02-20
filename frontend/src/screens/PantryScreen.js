import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, FlatList, TouchableOpacity, 
  Image, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../context/PantryContext';

export default function PantryScreen() {
  const [text, setText] = useState('');
  
  // 1. Get the loading state from our new Context
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
        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  // 2. SHOW SPINNER WHILE LOADING DATA
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
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

      {/* LIST OR EMPTY STATE */}
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

      {/* INPUT AREA */}
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
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F9F9' },
  
  header: { paddingHorizontal: 24, marginTop: 10, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#888', marginTop: 4 },

  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  
  itemCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B6B', marginRight: 12 },
  itemText: { fontSize: 16, fontWeight: '600', color: '#333' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 20 },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 8 },

  inputWrapper: {
    position: 'absolute', bottom: 30, width: '100%',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24
  },
  input: {
    flex: 1, backgroundColor: '#FFF', paddingVertical: 15, paddingHorizontal: 20,
    borderRadius: 30, marginRight: 15, fontSize: 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  addBtn: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: '#FF6B6B',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF6B6B', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5
  },
});