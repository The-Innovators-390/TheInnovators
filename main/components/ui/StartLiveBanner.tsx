import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";

type Props = {
  visible: boolean;
  bottomOffset: number; // BrandBar height
  onExit: () => void;
};

export function StartLiveBanner({ visible, bottomOffset, onExit }: Props) {
  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: bottomOffset }]}
    >
      <View style={styles.card}>
        <Text style={styles.text}>Go to start to begin live navigation</Text>

        <Pressable
          testID="exit-btn-directions"
          onPress={onExit}
          style={({ pressed }) => [
            styles.exitBtn,
            pressed && { opacity: 0.92 },
          ]}
        >
          <Text style={styles.exitText}>Exit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  android: { elevation: 10 },
  default: {},
});

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9998,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  exitBtn: {
    backgroundColor: "#E53935",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  exitText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
});
