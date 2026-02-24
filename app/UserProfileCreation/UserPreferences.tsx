import { styles } from "@/styles/SimpleStyleSheet";
import React from "react";
import { Pressable, Text, View } from "react-native";
import "../jsonCommands";
import { PrintStoredUser } from "../jsonCommands";

export default function UserPreferences() {
  return (


    <View style={styles.container}>
      <Pressable style={styles.StartButton} onPress={ async () => PrintStoredUser("dat@email.com")}>
        <Text style={styles.Text}>Get Started</Text>
    </Pressable>
    </View>


  );
}