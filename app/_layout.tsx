import React from 'react';
import { Stack } from 'expo-router';

import { PantryProvider } from '../src/context/PantryContext';

export default function RootLayout() {
  return (
    <PantryProvider>
      <Stack screenOptions={{ headerShown: false }}>
        
        {/* We explicitly declare our main screens here */}
        <Stack.Screen name="index" />
        <Stack.Screen name="RecipeDetail" />
        <Stack.Screen name="pantry" />
        
      </Stack>
    </PantryProvider>
  );
}