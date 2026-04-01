import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  isRouteMode: boolean;
  onToggle: () => void;
};

export default function RoutePlanner({
  isRouteMode,
  onToggle,
}: Readonly<Props>) {
  return (
    <Pressable
      testID="routeModeButton"
      onPress={onToggle}
      style={[s.diamond, isRouteMode ? s.on : s.off]}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Toggle route mode"
    >
      <MaterialIcons
        testID="routeModeArrowIcon"
        name={isRouteMode ? "close" : "arrow-forward"}
        size={35}
        color={isRouteMode ? "#D94444" : "#B46BFF"}
        style={{ transform: [{ rotate: "-45deg" }] }}
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  diamond: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
  },
  on: {
    backgroundColor: "rgba(255,255,255)",
    borderColor: "#ffffff",
    borderWidth: 1.5,
  },

  off: {
    backgroundColor: "rgba(255,255,255)",
    borderColor: "#ffffff",
    borderWidth: 1.5,
  },
});
