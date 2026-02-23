import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";

type Props = {
  visible: boolean;
  bottomOffset: number; // to sit above BrandBar
  arrivalTimeText: string;
  durationMinText: string;
  distanceKmText: string;
  onExit: () => void;
};

export function BottomNavigationBar({
  visible,
  bottomOffset,
  arrivalTimeText,
  durationMinText,
  distanceKmText,
  onExit,
}: Props) {
  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: bottomOffset }]}
    >
      <View style={styles.bar}>
        <View style={styles.metrics}>
          <Metric value={arrivalTimeText} label="arrival" />
          <Metric value={durationMinText} label="min" />
          <Metric value={distanceKmText} label="km" />
        </View>

        <Pressable
          testID="exit-btn-live"
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

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
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
  },
  bar: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.10)",
    ...shadow,
  },
  metrics: {
    flexDirection: "row",
    gap: 22,
    alignItems: "flex-end",
  },
  metric: {
    alignItems: "flex-start",
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    lineHeight: 22,
  },
  label: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(0,0,0,0.55)",
  },
  exitBtn: {
    marginLeft: "auto",
    backgroundColor: "#E53935",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
