import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../styles/SimpleStyleSheet";

export default function Index() {
  const onGetStarted = () => {
    const hasUsed = false;

    if (hasUsed) {
      // used before -> go login
      router.push("/auth/Login");
    } else {
      // first time -> go questionnaire
      router.push("/auth/questionnare");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.HeaderText}>Welcome to ReccomendCipe 👋</Text>
      <Pressable style={styles.StartButton} onPress={() => onGetStarted()}>
        <Text style={styles.Text}>Get Started</Text>
      </Pressable>
      
    </View>
  );
}
