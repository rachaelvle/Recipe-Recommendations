import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { PantryProvider } from '../src/context/PantryContext'; 
import { LogBox } from 'react-native';
import { useRouter } from 'expo-router';
import { LoadCurrentUserID } from '../Utils/jsonCommands';

LogBox.ignoreLogs([
  'Blocked aria-hidden on an element',
  'props.pointerEvents is deprecated',
]);

export default function RootLayout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userId = await LoadCurrentUserID();
        if (userId) {
          // User is logged in, go to home
          router.replace('/(tabs)');
        } else {
          // User not logged in, go to login
          router.replace('/auth/Login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Default to login on error
        router.replace('/auth/Login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  return (
    <PantryProvider>
      <Stack screenOptions={{ headerShown: false }}>
      </Stack>
    </PantryProvider>
  );
}
