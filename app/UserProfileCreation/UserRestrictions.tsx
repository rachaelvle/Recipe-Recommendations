import { styles } from "@/styles/SimpleStyleSheet";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import "../../lib/jsonCommands";
import {
    LoadCurrentUserID,
    updatedUserRestrictions,
} from "../../lib/jsonCommands";

const options = [
  "Vegan",
  "Gluten-Free",
  "Carnivore",
  "Lactose-Interolant",
  "Vegetarian",
  "Pescetarian",
  "Peanut Allergy",
  "Seafood Allergy",
];

const DietaryRestrictions: Record<string, string[]> = {
  Vegan: ["beef", "pork", "chicken", "fish", "eggs", "milk"],
  "Gluten-Free": ["bread", "flour", "dough"],
  Carnivore: ["vegetables", "corn"],
  "Lactose-Interolant": ["milk", "yogurt", "ice cream", "cream"],
  Vegetarian: ["beef", "pork", "chicken", "fish"],
  Pescetarian: ["beef", "pork", "chicken"],
  "Peanut Allergy": ["peanuts", "almonds", "cashews", "nuts"],
  "Seafood Allergy": ["fish", "shrimp", "crab", "lobsters"],
};

export default function UserPreferences() {
  const [selected, setSelected] = useState<Set<number>>(new Set()); // set of

  const formRestrictionsList = (restrict: string[]) => {
    // from user selection create a list of things they can't eat
    // input: list of dietary restrictions

    // reference the map, return a list of things they can't eat
    let noFood: string[] = []; // retVal

    for (const item of restrict) {
      noFood.push(...DietaryRestrictions[item]); // item in list, check map add list together of checked boxes
    }

    return noFood;
  };

  const toggle = (id: number) => {
    // function called toggle, takes an integer and updates the box that is tied to that integer
    setSelected((prev) => {
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
        {options.map((label, i) => {
          const on = selected.has(i);

          return (
            <Pressable
              key={i}
              onPress={() => toggle(i)}
              style={({ pressed }) => [
                styles.ToggleButton,
                on && styles.selected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.Text}>{label}</Text>
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
            const choices = Array.from(selected).map((i) => options[i]);
            const userID = await LoadCurrentUserID();
            updatedUserRestrictions(userID, formRestrictionsList(choices));
            router.push("/UserProfileCreation/UserPreferences");
            //PrintStoredUser('a');
          }}
        >
          <Text style={styles.Text}>CONT</Text>
        </Pressable>
      </View>
    </View>
  );
}
