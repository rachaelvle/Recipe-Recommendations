import { styles } from "@/styles/SimpleStyleSheet";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from 'expo-router'; 
import "../../lib/jsonCommands";
import { PrintStoredUser } from "../../lib/jsonCommands";

export default function UserPreferences() {
  const router = useRouter(); 

  const handleGetStarted = async () => {
    await PrintStoredUser("dat@email.com");
    

    router.replace("/(tabs)"); 
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.StartButton} onPress={handleGetStarted}>
        <Text style={styles.Text}>Get Started</Text>
      </Pressable>
    </View>
  );
}