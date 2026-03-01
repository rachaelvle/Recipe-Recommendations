import { api } from "@/lib/api";
import { styles } from "@/styles/SimpleStyleSheet";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LoadCurrentUserID } from "../../Utils/jsonCommands";

const Diets = [
  "vegan",
  "vegetarian",
  "gluten free",
  "dairy free",
  "paleolithic",
  "primal",
];

const Cuisines = [
  "chinese",
  "asian",
  "mediterranean",
  "italian",
  "european",
  "mexican",
  "greek",
];

export default function GetUserAllergies() {
  const { isEditing } = useLocalSearchParams();

  const editingMode = isEditing === "true"; // convert string → boolean

  const [user, setUser] = useState<number | null>(0);
  const [selectedDiets, setSelectedDiet] = useState<Set<number>>(new Set()); // set of
  const [selectedCuisine, setSelectedCuisine] = useState<Set<number>>(new Set()); // set of

  useEffect(() => {
    const updateUI = async () => {

      const currUserID = await LoadCurrentUserID();
      
      setUser(currUserID);
      
      if (!isEditing) {
          return;
        } // not editing i.e. first time loading
      
      if (currUserID) {
        let USER = await api.getUserProfile(currUserID); // get the user data

        // for updating 
        let Dietlist = [];
        let CuisineList = [];

        let UserDiet = USER.preferences.defaultDiets
        let UserCuisine = USER.preferences.defaultCuisines

        // lsit handling for diets
        for (const promise of UserDiet) {
          const index = Diets.findIndex(
            (o) => o.toLowerCase() === promise.toLowerCase(),
          );
          if (index !== -1) Dietlist.push(index);
        }
        setSelectedDiet(new Set(Dietlist));

        // list handling for cuisines
        for (const promise of UserCuisine) {
          const index = Cuisines.findIndex(
            (o) => o.toLowerCase() === promise.toLowerCase(),
          );
          if (index !== -1) CuisineList.push(index);
        }

        setSelectedCuisine(new Set(CuisineList));
      }
    }; updateUI(); }, []);

  if (!user) {
    return <Text>Loading profile...</Text>;
  }

    const UpdateuserPreference = async () => {

      const DietList = Array.from(selectedDiets).map((i) => Diets[i]);
      const CuisinesList = Array.from(selectedCuisine).map((i) => Cuisines[i]);

      const currUserID: number | null = await LoadCurrentUserID();
      if (currUserID === null) return;
      const payload = {
        defaultCuisines: Array.from(CuisinesList),
        defaultDiets: Array.from(DietList),
      };
  
      await api.updatePreferences(currUserID, payload);
      router.replace("/UserProfileCreation/ShowUserProfile");
    };

  const toggleDiets = (id: number) => {
    // function called toggle, takes an integer and updates the box that is tied to that integer
    setSelectedDiet((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCuisine = (id: number) => {
    // function called toggle, takes an integer and updates the box that is tied to that integer
    setSelectedCuisine((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    // design if pressed button
    <View style={styles.preferenceContainer}>
      
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.BannerText}> What kind of Diet are you on?</Text>
        {Diets.map((label, i) => {
          const on = selectedDiets.has(i);

          return (
            // dynamic button, checks state and add/remove style based on current state
            <Pressable
              key={i}
              onPress={() => toggleDiets(i)}
              style={({ pressed }) => [
                styles.ToggleButton,
                on && styles.selected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.buttonText, on && styles.selectedText]}>
                {label}
              </Text>
            </Pressable>
          );
        })}

        <Text style={styles.SecondBannerText}> What type of cuisine do you enjoy?</Text>
        {Cuisines.map((label, i) => {
          const on = selectedCuisine.has(i);

          return (
            // dynamic button, checks state and add/remove style based on current state
            <Pressable
              key={i}
              onPress={() => toggleCuisine(i)}
              style={({ pressed }) => [
                styles.ToggleButton,
                on && styles.selected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.buttonText, on && styles.selectedText]}>
                {label}
              </Text>
            </Pressable>
          );
        })}


      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.YesButton,
            pressed && { opacity: 0.85 },
          ]} //   "User chose:", choices
          onPress={async () => {
            UpdateuserPreference();
          }}
        >
          <Text style={styles.Text}>CONTINUE</Text>
        </Pressable>
      </View>
    </View>
  );
}
