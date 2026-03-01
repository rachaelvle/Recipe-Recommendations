import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { LoadCurrentUserID } from '../../Utils/jsonCommands';

const PantryContext = createContext();

export const PantryProvider = ({ children }) => {
  const [pantryIngredients, setPantryIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  const fetchPantry = async (uid) => {
    if (!uid) return;
    try {
      setLoading(true);
      const profile = await api.getUserProfile(uid);
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
    // load current user id once at start
    const load = async () => {
      const uid = await LoadCurrentUserID();
      setUserId(uid);
      if (uid) {
        await fetchPantry(uid);
      }
    };
    load();
  }, []);

  const addToPantry = async (ingredient) => {
    if (!userId) return;
    try {
      await api.addIngredient(userId, ingredient);
      await fetchPantry(userId);
    } catch (error) {
      console.error("Error adding ingredient:", error);
    }
  };

  const removeFromPantry = async (ingredient) => {
    if (!userId) return;
    try {
      await api.removeIngredient(userId, ingredient);
      await fetchPantry(userId);
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