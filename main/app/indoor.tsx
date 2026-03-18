import React from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import IndoorScreen from "@/components/indoors/IndoorScreen";

export default function IndoorRoute() {
  const { building } = useLocalSearchParams<{ building: string }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <IndoorScreen buildingId={building || ""} />
    </>
  );
}
