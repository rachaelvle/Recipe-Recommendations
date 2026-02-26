import React from 'react';
import { Stack } from 'expo-router';
import { PantryProvider } from '../src/context/PantryContext'; 
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'Blocked aria-hidden on an element',
  'props.pointerEvents is deprecated',
]);

export default function RootLayout() {
  return (
    <PantryProvider>
      <Stack screenOptions={{ headerShown: false }}>
      </Stack>
    </PantryProvider>
  );
}
