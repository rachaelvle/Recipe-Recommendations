import { styles } from "@/styles/SimpleStyleSheet";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { LoadCurrentUserID, UpdateUserName } from "../../lib/jsonCommands";

export default function RequestUserName() {
  const [username, setUsername] = useState("");

  const handleSubmit = async () => {
    const userID = await LoadCurrentUserID();
    console.log(userID);
    UpdateUserName(userID, username); // update user name
    router.push("/UserProfileCreation/UserRestrictions"); // move to next page
  };
  return (
    <View style={styles.container}>
      <Text style={styles.Text}>What is your name? </Text>
      <TextInput
        placeholder="Name"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={username}
        autoCapitalize="none"
        onChangeText={setUsername} // sets email when user sets email
        keyboardType="email-address"
      />

      <Pressable style={styles.YesButton} onPress={handleSubmit}>
        <Text style={styles.Text}>Sign In</Text>
      </Pressable>
    </View>
  );
}
