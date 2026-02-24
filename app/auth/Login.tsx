import { styles } from "@/styles/SimpleStyleSheet";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { loadUser } from "../jsonCommands";
// create a password checking with a simple password / email hardcoded list 

export default function Login() {

  // store user input to be later checked for login 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");


  const handleSubmit = async () => { // takes user input and handles email and password 
    if (!email || !password) 
    {
      setError("Please enter email and password");
      return;
    } // no input 

    const user = await loadUser(email); // pass in the provided email
    if (!user || user.password != password) 
    {
      setError("Invalid Credentials");
      return;
    }

    setError(""); // clear error

    // just for testing right now will make actual account checking maybe :3
    if (email == user.email && password == user.password){
      router.push("/home/HomePage") // CHANGE LATER WHEN FINALIZING
    }

  }

    return (
    <View style={styles.container}>
      <Text style={styles.HeaderText}>Login</Text>

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

      {error ? <Text style={styles.error}>{error}</Text> : null} 
      
      <Pressable style={styles.YesButton} onPress={handleSubmit}>
        <Text style={styles.Text}>Sign In</Text>
      </Pressable>
    </View>
  );
}
function setError(arg0: string) {
  throw new Error("Function not implemented.");
}

