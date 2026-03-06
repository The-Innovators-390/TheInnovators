import React from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  distanceText: string;
  streetText: string;
  onPress?: () => void;
};

export function TopDirectionsCard({
  visible,
  distanceText,
  streetText,
  onPress,
}: Props) {
  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={styles.wrap}
      testID="topDirectionsCard"
    >
      <Pressable
        testID="topDirectionsCardPressable"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      >
        <MaterialIcons name="turn-right" size={28} color="#111" />
        <View style={styles.textCol}>
          <Text style={styles.distance} testID="instructionDistance">
            {distanceText}
          </Text>
          <Text
            style={styles.street}
            numberOfLines={1}
            testID="instructionText"
          >
            {streetText}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 6 },
  default: {},
});

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 52,
    left: 10,
    right: 10,
    zIndex: 9999,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...shadow,
  },
  textCol: { flex: 1 },
  distance: { fontSize: 18, fontWeight: "700", color: "#111" },
  street: { fontSize: 16, fontWeight: "600", color: "#111", marginTop: 2 },
});
