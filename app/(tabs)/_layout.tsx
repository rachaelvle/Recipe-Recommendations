import React, { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#39afafff', 
        tabBarStyle: { 
          backgroundColor: '#25292e', 
          borderTopColor: '#333',
        },
        headerShown: false, 
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />


      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color }) => (
            <Ionicons name="nutrition" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}