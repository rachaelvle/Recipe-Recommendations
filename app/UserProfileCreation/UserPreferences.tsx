import { styles } from "@/styles/SimpleStyleSheet";
import { router } from "expo-router"; // <-- Added this so we can navigate!
import React from "react";
import { Pressable, Text, View } from "react-native";
import { PrintStoredUser } from "../../lib/jsonCommands";

export default function UserPreferences() {
  const handleGetStarted = async () => {
    await PrintStoredUser("dat@email.com");

    router.replace("/(tabs)" as any);
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.StartButton} onPress={handleGetStarted}>
        <Text style={styles.Text}>Get Started</Text>
      </Pressable>
    </View>
  );
}
