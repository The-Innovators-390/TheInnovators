import React from "react";
import { Pressable, StyleSheet, Image } from "react-native";
import { router } from "expo-router";

export function NextClassDebugCard() {
  return (
    <Pressable
      style={styles.button}
      onPress={() => router.push("/(tabs)/calendar")}
    >
      <Image
        source={require("../assets/images/google-calendar-icon.png")}
        style={styles.icon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 110,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  icon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
});