import React from "react";
import { View, StyleSheet } from "react-native";
import CampusMap from "@/components/campus/CampusMap";
import { NextClassDebugCard } from "@/components/NextClassDebugCard";

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <CampusMap />
      <NextClassDebugCard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});