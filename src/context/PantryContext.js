import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../../lib/api';

const PantryContext = createContext();

export const PantryProvider = ({ children }) => {
  const [pantryIngredients, setPantryIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const userId = 1; // Assuming default user for now

  const fetchPantry = async () => {
    try {
      setLoading(true);
      const profile = await api.getUserProfile(userId);
      if (profile && profile.ingredients) {
        setPantryIngredients(profile.ingredients.map(i => i.ingredient));
      }
    } catch (error) {
      console.error("Failed to fetch pantry:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPantry();
  }, []);

  const addToPantry = async (ingredient) => {
    try {
      await api.addIngredient(userId, ingredient);
      await fetchPantry();
    } catch (error) {
      console.error("Error adding ingredient:", error);
    }
  };

  const removeFromPantry = async (ingredient) => {
    try {
      await api.removeIngredient(userId, ingredient);
      await fetchPantry();
    } catch (error) {
      console.error("Error removing ingredient:", error);
    }
  };

  return (
    <PantryContext.Provider value={{ pantryIngredients, addToPantry, removeFromPantry, loading }}>
      {children}
    </PantryContext.Provider>
  );
};

export const usePantry = () => useContext(PantryContext);