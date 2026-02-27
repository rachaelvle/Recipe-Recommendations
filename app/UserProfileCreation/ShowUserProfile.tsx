import { api } from "@/lib/api";
import { LoadCurrentUserID } from "@/Utils/jsonCommands";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  // user object for displaying data
  const [user, setUser] = useState<null | {
    username: string;
    allergies: string[];
    prefDiets: string[];
    prefCuisines: string[];
  }>(null);

  useEffect(() => {
    const initUser = async () => {
      // make API calls in useEffect

      // FGet user data and pass to UI
      const currUserID = await LoadCurrentUserID();
      let allergyList = [];

      let USER;
      if (currUserID) {
        USER = await api.getUserProfile(currUserID);
        for (const promise of USER.allergies) {
          allergyList.push(promise.allergen); // add allergen to list
        }
      }

      const builtUser = {
        username: USER.user.username,
        allergies: allergyList,
        prefDiets: USER.preferences.defaultCuisines, // will impliment prefernce list later on
        prefCuisines: USER.preferences.defaultDiets,
      };

      setUser(builtUser); // set user as the one we just made
    };

    initUser();
  }, []);

  // do not load UI until user data is loaded
  if (!user) {
    return <Text>Loading profile...</Text>;
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.header}>Your Information</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>{user.username}</Text>
          </View>
        </View>

        <Divider />

        <InfoRow
          label="Allergies"
          value={user.allergies.join(", ")}
          onChange={() =>
            router.push({
              pathname: "/UserProfileCreation/GetUserAllergies",
              params: { isEditing: "true" },
            })
          }
        />
        <Divider />
        <InfoRow
          label="Perferred Diets"
          value={user.prefDiets.join(", ")}
          onChange={() =>
            router.push({
              pathname: "/UserProfileCreation/GetUserPreference",
              params: { isEditing: "true" },
            })
          }
        />
        <InfoRow
          label="Perferred Cuisines"
          value={user.prefCuisines.join(", ")}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.startButton,
          pressed && { opacity: 0.9 },
        ]}
        onPress={() => router.push("/")}
      >
        <Text style={styles.startText}>Lets start cooking!</Text>
      </Pressable>
    </View>
  );
}

function InfoRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {" "}
          {value.length > 0 ? value : "None selected"}{" "}
        </Text>
      </View>
      {onChange && (
        <Pressable
          style={({ pressed }) => [
            styles.changeBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={onChange}
        >
          <Text style={styles.changeText}>Change</Text>
        </Pressable>
      )}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  page: {
    flex: 1, // FULL screen height (important)
    padding: 20,
    backgroundColor: "#f4f6fb",
    justifyContent: "center", // Vertical center (all screen sizes)
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
    color: "#1f2430",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  label: {
    fontSize: 12,
    color: "#7b8496",
    marginBottom: 3,
    textTransform: "capitalize",
  },
  value: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
  },
  changeBtn: {
    borderWidth: 2,
    borderColor: "#ff5e65",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  changeText: {
    fontWeight: "700",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#e6e9f0",
  },
  startButton: {
    marginTop: 20,
    backgroundColor: "#ff5e65",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  startText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
