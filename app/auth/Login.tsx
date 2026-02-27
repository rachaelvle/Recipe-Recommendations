import { api } from "@/lib/api";
import { styles } from "@/styles/SimpleStyleSheet";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StoreCurrentUserID } from "../../Utils/jsonCommands";
// create a password checking with a simple password / email hardcoded list 

export default function Login() {

  // store user input to be later checked for login 
  const [UserName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");


  const handleSubmit = async () => { // takes user input and handles email and password 
    if (!UserName || !password) 
    {
      setError("Please enter email and password");
      return;
    } // no input 

    setError(""); // clear error
    // just for testing right now will make actual account checking maybe :3
    try {
      const loginResponse = await api.login(UserName, password); // check database for user login
      StoreCurrentUserID(loginResponse.user.id) // STORE USER ID TO PASS ONTO NEXT PAGE ON THE STACK

      // *************************************** USING FOR TESTING RIGHT NOW CHANGE TO SOMETHING ELSE LATER **************************************************
      router.push('/UserProfileCreation/ShowUserProfile') // go to home or something 

    } catch (error) {
      console.error('Login Failed', error); // debugging 
      setError("Invalid Credentials"); // visuals
    } 

  }

    return (
    <View style={styles.container}>
      <Text style={styles.HeaderText}>Login</Text>
      
      <TextInput
        placeholder="Username"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={UserName}
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

      {error ? <Text style={styles.error}>{error}</Text> : null} 
      
      <Pressable style={styles.YesButton} onPress={handleSubmit}>
        <Text style={styles.Text}>Sign In</Text>
      </Pressable>

      <View style={{ marginTop: 30 }}>
        <Pressable onPress={() => router.push('/UserProfileCreation/CreateUserProfile')}>
          <Text style={{ textAlign: "center", color: "black", fontWeight: "600" }}>
            No Account? Sign Up
          </Text>
        </Pressable>
      </View>
      
    </View>
  );
}
function setError(arg0: string) {
  throw new Error("Function not implemented.");
}

