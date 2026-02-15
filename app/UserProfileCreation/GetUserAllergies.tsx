import { api } from "@/lib/api";
import { styles } from "@/styles/SimpleStyleSheet";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LoadCurrentUserID } from "../../Utils/jsonCommands";

const options = ["Shell Fish", "Peanuts", "Almonds", "Gluten", "Lactose Intolerant", "Fish", "Soy", "Eggs", "Sesame"];

export default function GetUserAllergies() {
    const [selected, setSelected] = useState<Set<number>>(new Set()); // set of 

    const UpdateUserRestrictions = async () => {
        // make the list of strictions and then adds to the user database
        let test;
        const choices = Array.from(selected).map(i => options[i]);  

        const currUserID: number|null = await LoadCurrentUserID() 
          
        if (currUserID === null) return;

        let UserProfile = await api.getUserProfile(currUserID); 
        let currUserAllergies = UserProfile.allergies // lsit of allergies

        // remove any allergies that were not selected 
        for (const food of currUserAllergies) {
            await api.removeAllergy(currUserID, food.allergen); // empty the list 
        }
        // add the allergies that were 
        if (choices.length != 0)
        {
            for (const food of choices) {
                test = await api.addAllergy(currUserID, food);  
            }
            // console.log(test.allergies);
        }
        else {
            UserProfile = await api.getUserProfile(currUserID); 
            // console.log(UserProfile.allergies)
        }
        
        router.push('/UserProfileCreation/ShowUserProfile')

    };

    const toggle = (id: number) => {
        // function called toggle, takes an integer and updates the box that is tied to that integer 
        setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
        });
    };
    
    return (
        // design if pressed button 
        <View style={styles.preferenceContainer}>
        <Text style={styles.BannerText}> What are you unable to eat?</Text>
        <ScrollView style={styles.scroll}
            contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {options.map((label, i) => {
            const on = selected.has(i);

            return (
                // dynamic button, checks state and add/remove style based on current state
                <Pressable key={i}
                onPress={() => toggle(i)}
                style={({ pressed }) => [
                    styles.ToggleButton,
                    on && styles.selected,
                    pressed && styles.pressed,
                ]}
                >
                <Text style= {[styles.buttonText, on && styles.selectedText]}>{label}</Text>
                </Pressable>
            );
            })}
        </ScrollView>
        <View style={styles.footer}>
            <Pressable style={({ pressed }) => [styles.YesButton, pressed && { opacity: 0.85 }]} //   "User chose:", choices
                onPress={async () => {UpdateUserRestrictions()}}>
            <Text style={styles.Text}>CONTINUE</Text>
            </Pressable>
        </View>


        </View>
    );
} 
