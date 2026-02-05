import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../styles/SimpleStyleSheet";

export default function Index() {

  return (
    <View style={styles.container}>
      <Text style={styles.HeaderText}>Welcome to ReccomendCipe 👋</Text>
      <Pressable style={styles.StartButton} onPress={() => router.push("/auth/FirstTimeUserCheck")}>
        <Text style={styles.Text}>Get Started</Text>
      </Pressable>
      
    </View>
  );
}
