import { styles } from "@/styles/SimpleStyleSheet";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

export default function Introduction() {
  return (
    <View style={styles.container}>
      <Text style={styles.HeaderText}>Welcome to ReccomendCipe</Text>
      <Pressable style={styles.StartButton} onPress={() => router.push('/auth/Login')}>
        <Text style={styles.Text}>Get Started</Text>
      </Pressable>
    </View>
  );
}