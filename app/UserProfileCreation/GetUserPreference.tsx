import { api } from "@/lib/api";
import { styles } from "@/styles/SimpleStyleSheet";
import { LoadCurrentUserID } from "@/Utils/jsonCommands";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

const SimpleDietList = new Set<string>([
  "vegan",
  "vegetarian",
  "gluten free",
  "dairy free",
  "paleolithic",
  "primal",
]);
const SimpleCuisineList = new Set<string>([
  "chinese",
  "asian",
  "mediterranean",
  "italian",
  "european",
  "mexican",
  "greek",
]);

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

      if (currUserID) {
        let USER = await api.getUserProfile(currUserID); // get the user data

        let prefs = [
          ...USER.preferences.defaultDiets,
          ...USER.preferences.defaultCuisines,
        ];
        setChips(prefs);
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

  const sortInputs = () => {
    let Diets: string[] = [];
    let Cuisines: string[] = [];

    // since we are demoing we only need the simple inputs, I will include some simple ones for profile
    for (const item of chips) {
      let pref = item.toLowerCase().trim();
      if (SimpleDietList.has(pref)) {
        Diets.push(item);
      } else {
        Cuisines.push(item);
      }
    }

    return [Diets, Cuisines];
  };

  const UpdateuserPrefernce = async () => {
    const currUserID: number | null = await LoadCurrentUserID();
    if (currUserID === null) return;
    let sortedPreferences = sortInputs();
    const payload = {
      defaultCuisines: Array.from(sortedPreferences[0]),
      defaultDiets: Array.from(sortedPreferences[1]),
    };

    await api.updatePreferences(currUserID, payload);
    router.replace("/UserProfileCreation/ShowUserProfile");
  };

  return (
    <View style={styles.Prefcontainer}>
      <Text style={styles.title}>Tell us about your tastes!</Text>

      {/* Input bar */}
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="E.g. Mexican"
          placeholderTextColor="#999"
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
          <Text style={styles.emptyHint}>No preferences added yet.</Text>
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
      {chips.length > 0 && (
        <Pressable
          onPress={UpdateuserPrefernce}
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
