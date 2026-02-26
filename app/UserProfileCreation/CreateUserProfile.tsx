import { styles } from "@/styles/SimpleStyleSheet";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StoreCurrentUserID, StoreUserProfile } from "../../lib/jsonCommands";
// TODO: add a way to store user data json file?

const Admin = "admin";
const AdminPass = "password";

export default function CreateUserProfile() {
  // store user input to be later checked for login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = () => {
    // takes user input and handles email and password
    if (!email) {
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

    // just for testing right now will make actual account checking maybe :3
    if (email == Admin && password == AdminPass) {
      router.push("/about"); // CHANGE LATER WHEN FINALIZING
    }
    StoreUserProfile(email, confirmPassword); // store the data

    StoreCurrentUserID(email); // store the ID for later use

    router.push("/UserProfileCreation/RequestUserName");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.HeaderText}>
        Please Enter your Email and Password
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={email}
        autoCapitalize="none"
        onChangeText={setEmail} // sets email when user sets email
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
