import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../../styles/SimpleStyleSheet";

export default function questionnaire() {

  const HasUsed = (used:Boolean) => {
    // chekcs which button user has pressed and send them to the correct page 

    if (used) {
      // used before -> go login
      router.push("/auth/Login");
    } else {
      // first time -> go questionnaire
      router.push("/auth/CreateUserProfile");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.HeaderText}>Have you used ReccomendCipe before? </Text>

       <View style={styles.buttonRow}>
        <Pressable style={styles.YesButton} onPress={() => HasUsed(true)}>
          <Text style={styles.Text}>Yes</Text>
        </Pressable>

        <Pressable style={styles.NoButton} onPress={() => HasUsed(false)}>
          <Text style={styles.Text}>No</Text>
        </Pressable>
      </View>
      
    </View>
  );
  
}



