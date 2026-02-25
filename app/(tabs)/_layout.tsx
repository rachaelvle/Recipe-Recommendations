import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
<Tabs
  screenOptions={{
    tabBarActiveTintColor: '#39afafff', // Teammate's teal color
    tabBarInactiveTintColor: '#888',
    tabBarStyle: {
      backgroundColor: '#25292e', // Matched to background
      borderTopColor: '#333',
      height: 60,
    },
    headerShown: false,
  }}
>
      {/* 1. Explore / Home Screen */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />

      {/* 2. Pantry Screen */}
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'My Pantry',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="basket" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}