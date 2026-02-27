import { api } from "@/lib/api";
import { styles } from "@/styles/SimpleStyleSheet";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StoreCurrentUserID } from "../../Utils/jsonCommands";

export default function CreateUserProfile() {
  // store user input to be later checked for login
  const [username, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async () => {
    // takes user input and handles email and password
    if (!username) {
      setError("Please enter valid email");
      return;
    } // no input
    else if (!password) {
      setError("Please enter a password");
      return;
    } else if (!confirmPassword) {
      setError("Please Re-enter password");
      return;
    } else if (password != confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError(""); // clear error

    // Rachaels API import account created in the sqlite datbase
    try {
      const response = await api.register(username, confirmPassword);
      console.log("User created:", response.user);
      StoreCurrentUserID(response.user.id); // STORE USER ID TO PASS ONTO NEXT PAGE ON THE STACK

      router.push({
        pathname: "/UserProfileCreation/GetUserAllergies",
        params: { isEditing: "false" },
      }); // get the user's dietary restrictions
    } catch (error) {
      setError("User already exists");
      console.error("Registration failed:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.HeaderText}>Lets make your account</Text>

      <TextInput
        placeholder="Username"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={username}
        autoCapitalize="none"
        onChangeText={setUserName} // sets email when user sets email
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={password}
        onChangeText={setPassword} // sets password when user inputs in text box
        secureTextEntry // password dots
      />

      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword} // sets password when user inputs in text box
        secureTextEntry // password dots
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.YesButton} onPress={handleSubmit}>
        <Text style={styles.Text}>Register</Text>
      </Pressable>
    </View>
  );
}
