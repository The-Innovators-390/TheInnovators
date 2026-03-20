import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import type { DirectionStep } from "@/components/campus/helper_methods/googleDirections";

type Props = {
  visible: boolean;
  steps: DirectionStep[];
  activeIndex: number;
  onClose: () => void;
  maxVisible?: number;
};

export function StepsDropdown({
  visible,
  steps,
  activeIndex,
  onClose,
  maxVisible = 8,
}: Readonly<Props>) {
  if (!visible) return null;

  const slice = steps.slice(activeIndex);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Tap-outside backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Dropdown card */}
      <View pointerEvents="box-none" style={styles.wrap}>
        {/* Prevent taps inside card from closing */}
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
          >
            {slice.map((s, idx) => {
              const isCurrent = idx === 0;
              return (
                <View
                  key={activeIndex + idx}
                  style={[styles.row, isCurrent && styles.rowActive]}
                >
                  <Text style={styles.text} numberOfLines={2}>
                    {s.instruction}
                  </Text>
                  {!!s.distanceText && (
                    <Text style={styles.sub}>{s.distanceText}</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </View>
    </View>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 7 },
  default: {},
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  wrap: {
    position: "absolute",
    top: 110,
    left: 10,
    right: 10,
    zIndex: 9999,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    ...shadow,
  },
  scroll: {
    maxHeight: 260,
  },
  content: {},
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.12)",
  },
  rowActive: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(0,0,0,0.55)",
  },
});
