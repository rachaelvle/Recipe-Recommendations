// PantryContext.js - Context for managing pantry ingredients across the app
// this code was written with the assistance of AI
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';


const PantryContext = createContext();


export const PantryProvider = ({ children }) => {
 const [pantryIngredients, setPantryIngredients] = useState([]);
 const [loading, setLoading] = useState(true); // New: Tracks if we are still loading data


 useEffect(() => {
   loadPantry();
 }, []);


 const loadPantry = async () => {
   try {
     const storedData = await AsyncStorage.getItem('@my_pantry_v1');
     if (storedData !== null) {
       setPantryIngredients(JSON.parse(storedData));
     }
   } catch (e) {
     console.error("Failed to load pantry:", e);
   } finally {
     setLoading(false);
   }
 };


 const savePantry = async (newIngredients) => {
   try {
     await AsyncStorage.setItem('@my_pantry_v1', JSON.stringify(newIngredients));
   } catch (e) {
     console.error("Failed to save pantry:", e);
   }
 };


 const addToPantry = (ingredient) => {
   // Only add if it's not already there (prevent duplicates)
   if (!pantryIngredients.some(i => i.toLowerCase() === ingredient.toLowerCase())) {
     const updatedList = [...pantryIngredients, ingredient];
     setPantryIngredients(updatedList);
     savePantry(updatedList); // Save immediately
   }
 };

 const removeFromPantry = (ingredient) => {
   const updatedList = pantryIngredients.filter(item => item !== ingredient);
   setPantryIngredients(updatedList);
   savePantry(updatedList); // Save immediately
 };


 return (
   <PantryContext.Provider value={{
     pantryIngredients,
     addToPantry,
     removeFromPantry,
     loading
   }}>
     {children}
   </PantryContext.Provider>
 );
};


export const usePantry = () => useContext(PantryContext);

