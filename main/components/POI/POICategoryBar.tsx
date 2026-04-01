import React from "react";
import { ScrollView, Pressable, StyleSheet, Text, View } from "react-native";
import { POI_CATEGORIES, type POICategory } from "@/components/POI/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface POICategoryBarProps {
  activeCategory: POICategory | null;
  onSelect: (category: POICategory | null) => void;
  disabled?: boolean;
}

export default function POICategoryBar({
  activeCategory,
  onSelect,
  disabled = false,
}: Readonly<POICategoryBarProps>) {
  const handlePress = (key: POICategory) => {
    // Toggle: tap same pill to deselect
    onSelect(activeCategory === key ? null : key);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {POI_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              testID={`poi-category-${cat.key}`}
              onPress={() => handlePress(cat.key)}
              disabled={disabled}
              style={[
                styles.pill,
                isActive && styles.pillActive,
                disabled && styles.pillDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${cat.label} points of interest`}
              accessibilityState={{ selected: isActive }}
            >
              <MaterialCommunityIcons
                name={cat.iconName}
                size={14}
                color={isActive ? "#ffffff" : "#333333"}
              />
              <Text
                style={[styles.pillLabel, isActive && styles.pillLabelActive]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
  },
  row: {
    paddingHorizontal: 4,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  pillActive: {
    backgroundColor: "#912338",
    borderColor: "#912338",
  },
  pillDisabled: {
    opacity: 0.5,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333333",
  },
  pillLabelActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
