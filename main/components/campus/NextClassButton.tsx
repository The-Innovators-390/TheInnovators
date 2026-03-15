import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { router } from "expo-router";

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function NextClassButton({ style }: Readonly<Props>) {
  return (
    <Pressable
      testID="nextClassButton"
      style={[styles.button, style]}
      onPress={() => router.push("/(tabs)/calendar")}
    >
      <Image
        source={require("../../assets/images/google-calendar-icon.png")}
        style={styles.icon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  icon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
});
