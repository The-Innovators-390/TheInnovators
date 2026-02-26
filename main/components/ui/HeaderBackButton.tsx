import { Pressable, Text } from "react-native";
import { router } from "expo-router";

export function HeaderBackButton() {
  return (
    <Pressable
      onPress={() => router.back()} // Brings the user back to where he was last time
      hitSlop={10} // Allows for better accessibility when clicking the button
      style={{ paddingHorizontal: 12, paddingVertical: 6 }}
    >
      <Text style={{ fontSize: 16 }}>Back</Text>
    </Pressable>
  );
}
