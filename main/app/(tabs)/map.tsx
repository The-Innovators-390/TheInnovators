import React from "react";
import { View, StyleSheet } from "react-native";
import CampusMap from "@/components/campus/CampusMap";

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <CampusMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
