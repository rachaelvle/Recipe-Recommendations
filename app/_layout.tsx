import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />; // we dont want to show screen yet until user gets onto the app itself
}
