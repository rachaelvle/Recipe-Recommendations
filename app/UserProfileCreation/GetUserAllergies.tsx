import { api } from "@/lib/api";
import { styles } from "@/styles/SimpleStyleSheet";
import { LoadCurrentUserID } from "@/Utils/jsonCommands";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";



export default function GetUserPreference() {
  const { isEditing } = useLocalSearchParams();

  const editingMode = isEditing === "true"; // convert string → boolean

  const [user, setUser] = useState<number | null>(0);

  const [chips, setChips] = useState<string[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const updateUI = async () => {
      const currUserID = await LoadCurrentUserID();

      setUser(currUserID);

      if (!isEditing) {
        return;
      } // not editing i.e. first time loading
      let allergens: string[] = []
      if (currUserID) {
        
        let USER = await api.getUserProfile(currUserID); // get the user data
        for (const promise of USER.allergies) {
          allergens.push(promise.allergen)
         }
        setChips(allergens);
      }
    };

    updateUI();
  }, []);

  if (!user) {
    return <Text>Loading profile...</Text>;
  }

  const addChip = (raw: string) => {
    const input = raw.trim();
    if (!input) return;
    if (chips.includes(input.toLowerCase())) return;
    setChips((prev) => [...prev, input.toLowerCase()]);
    setText("");
  };

  const removeChip = (chip: string) => {
    setChips((prev) => prev.filter((c) => c !== chip));
  };


  const UpdateUserRestrictions = async () => {
    // get list of user pref and store 
    const currUserID: number | null = await LoadCurrentUserID();

    if (currUserID === null) return;

    let UserProfile = await api.getUserProfile(currUserID);
    let currUserAllergies = UserProfile.allergies; // lsit of allergies

    // remove any allergies that were not selected
    for (const food of currUserAllergies) {
      await api.removeAllergy(currUserID, food.allergen); // empty the list
    }
    // add the allergies that were
    if (chips.length != 0) {
      for (const food of chips) {
        let test = await api.addAllergy(currUserID, food);
      }

    
    }
    if (editingMode) {
      router.push("/UserProfileCreation/ShowUserProfile");
    } else {
      router.push("/UserProfileCreation/GetUserPreference");
    }
  ;}

  return (
    <View style={styles.Prefcontainer}>
      <Text style={styles.title}>What foods are you allergic to?</Text>

      {/* Input bar */}
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="E.g. Shrimp"
          placeholderTextColor="#ffffff"
          style={styles.Headerinput}
          returnKeyType="done"
          onSubmitEditing={() => addChip(text)}
        />
        <Pressable
          onPress={() => addChip(text)}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {/* Chips list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.chipList}
        showsVerticalScrollIndicator={false}
      >
        {chips.length === 0 ? (
          <Text style={styles.emptyHint}>No allergens added yet.</Text>
        ) : (
          chips.map((c) => (
            <Pressable
              key={c}
              onPress={() => removeChip(c)}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={styles.chipX}>✕</Text>
              <Text style={styles.chipText}>{c}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Save button */}
      {(
        <Pressable
          onPress={UpdateUserRestrictions}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
          ]}
        >
          <Text style={styles.saveButtonText}>Save Preferences</Text>
        </Pressable>
      )}
    </View>
  );
}
