import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../styles/SimpleStyleSheet";
import { GenerateInitialProfiles } from "./jsonCommands";


// user accounts for showcasing 
const username1: string = "Dat";
const username2: string = "Ariana"

const ShowCaseUser1: string = "dat@email.com";
const ShowCasePass1 : string = "12345";

const ShowCaseUser2: string = "ari@email.com";
const ShowCasePass2 : string = "00000";


// categories for the showcases 
const restriction1: string[] = ["beef", "pork", "chicken", "fish", "eggs", "milk"] // vegan
const restriction2: string[] = ["milk","yogurt","ice cream", "cream"] // lactose-intolerant 

const preferences1: string[] = ["apples", "corn", "rice"]
const preferences2: string[] = ["beef", "chicken", "milk"]

export default function Index() {

  return (
    <View style={styles.container}>
      <Text style={styles.HeaderText}>Welcome to ReccomendCipe 👋</Text>
      {/* on start generate the user profiles for showcasing */}
      <Pressable style={styles.StartButton} onPress={() =>
            // generate initial accounts 
          { 
            GenerateInitialProfiles(username1, ShowCaseUser1, ShowCasePass1, restriction1, preferences1);
            GenerateInitialProfiles(username2, ShowCaseUser2, ShowCasePass2, restriction2, preferences2);
            router.push("/auth/FirstTimeUserCheck") 
           
          }}>
        <Text style={styles.Text}>Get Started</Text>
      </Pressable>
      
    </View>
  );
}
