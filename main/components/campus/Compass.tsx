import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

type Props = {
  onPress: () => void;
  visible?: boolean;
  rotationDegrees?: number;
  style?: any;
};

export default function Compass({
  onPress,
  visible = true,
  rotationDegrees = 0,
  style,
}: Readonly<Props>) {
  if (!visible) return null;

  return (
    <Pressable
      testID="compassButton"
      onPress={onPress}
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel="Reset map direction to north"
    >
      <View
        style={[
          styles.needleWrap,
          { transform: [{ rotate: `${rotationDegrees}deg` }] },
        ]}
      >
        <View style={styles.needleNorth} />
        <View style={styles.needleSouth} />
        <View style={styles.centerDot} />
      </View>
    </Pressable>
  );
}

const NEEDLE_WIDTH = 10;
const NEEDLE_HEIGHT = 14;

const styles = StyleSheet.create({
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 5,
  },

  needleWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  needleNorth: {
    position: "absolute",
    top: -1,
    width: 0,
    height: 0,
    borderLeftWidth: NEEDLE_WIDTH / 2,
    borderRightWidth: NEEDLE_WIDTH / 2,
    borderBottomWidth: NEEDLE_HEIGHT,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#E53935",
  },

  needleSouth: {
    position: "absolute",
    bottom: -1,
    width: 0,
    height: 0,
    borderLeftWidth: NEEDLE_WIDTH / 2,
    borderRightWidth: NEEDLE_WIDTH / 2,
    borderTopWidth: NEEDLE_HEIGHT,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#D9D9D9",
  },

  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3A3A3A",
    zIndex: 2,
  },
});
