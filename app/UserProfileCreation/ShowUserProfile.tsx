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
      const currUserID = await LoadCurrentUserID();
      if (!currUserID) {
        // no logged in user; send back to login screen
        router.replace('/auth/Login');
        return;
      }

      try {
        const USER = await api.getUserProfile(currUserID);
        if (!USER) {
          throw new Error('Profile missing');
        }

        const allergyList: string[] = [];
        for (const a of USER.allergies) {
          allergyList.push(a.allergen);
        }

        const builtUser = {
          username: USER.user.username,
          allergies: allergyList,
          prefDiets: USER.preferences?.defaultDiets ?? [],
          prefCuisines: USER.preferences?.defaultCuisines ?? [],
        };

        setUser(builtUser);
      } catch (err) {
        console.error('Failed to load profile', err);
        // maybe redirect to login or show error
      }
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
          value={(user.prefDiets || []).join(", ")}
          onChange={() =>
            router.push({
              pathname: "/UserProfileCreation/GetUserPreference",
              params: { isEditing: "true" },
            })
          }
        />
        <InfoRow
          label="Perferred Cuisines"
          value={(user.prefCuisines || []).join(", ")}
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
    backgroundColor: "#333333",
    justifyContent: "center", // Vertical center (all screen sizes)
  },
  card: {
    backgroundColor: "#444444",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#f4f4f4",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
    color: "#f4f4f4",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  label: {
    fontSize: 12,
    color: "#ffffff",
    marginBottom: 3,
    textTransform: "capitalize",
  },
  value: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f4f4f4",
  },
  changeBtn: {
    borderWidth: 2,
    borderColor: "#39afaf",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#333333",
  },
  changeText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#f4f4f4"
  },
  divider: {
    height: 1,
    backgroundColor: "#39afaf",
  },
  startButton: {
    marginTop: 20,
    backgroundColor: "#39afaf",
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
