import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ViewStyle,
  Image,
  Pressable,
} from "react-native";
import { CampusTheme } from "./campusTheme";

interface FloorSelectorProps {
  floors: number[];
  selectedFloor: number | null;
  onSelectFloor: (floor: number) => void;
  campusTheme: CampusTheme;
  routeFloors?: number[];
  accessible?: boolean;
  onPressAccessible?: () => void;
}

export const FloorSelector: React.FC<FloorSelectorProps> = ({
  floors,
  selectedFloor,
  onSelectFloor,
  campusTheme,
  routeFloors = [],
  accessible = false,
  onPressAccessible,
}) => {
  const getFloorButtonStyle = (floor: number): ViewStyle | null => {
    if (selectedFloor === floor) {
      return { backgroundColor: campusTheme.selectedButtonColor };
    }
    if (routeFloors.includes(floor)) {
      return {
        backgroundColor: "#ffcccc",
        borderWidth: 2,
        borderColor: campusTheme.selectedButtonColor,
      };
    }
    return null;
  };

  const accessibilityRingStyle: ViewStyle = {
    borderWidth: 2,
    borderRadius: 14,
    borderColor: accessible
      ? campusTheme.selectedButtonColor
      : "transparent",
  };

  const accessibilityIcon = (
    <Image
      source={require("@/assets/icons/accessibility-button.png")}
      style={styles.accessibilityIconImage}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );

  return (
    <View style={styles.row}>
      <ScrollView
        horizontal
        style={styles.scroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.floorSelectorScroll}
      >
        {floors.map((floor) => (
          <TouchableOpacity
            key={floor}
            testID={`indoor-floor-${floor === -2 ? "S2" : floor}`}
            style={[styles.floorButton, getFloorButtonStyle(floor)]}
            onPress={() => onSelectFloor(floor)}
          >
            <Text
              style={[
                styles.floorButtonText,
                selectedFloor === floor && styles.selectedFloorButtonText,
              ]}
            >
              {floor === -2 ? "S2" : floor}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {onPressAccessible ? (
        <Pressable
          testID="indoor-floor-accessible-icon"
          onPress={onPressAccessible}
          accessibilityRole="button"
          accessibilityLabel="Accessible route"
          accessibilityState={{ selected: accessible }}
          style={[styles.accessibilityPressable, accessibilityRingStyle]}
        >
          {accessibilityIcon}
        </Pressable>
      ) : (
        <View
          style={[styles.accessibilityPressable, accessibilityRingStyle]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {accessibilityIcon}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
    minWidth: 0,
  },
  floorSelectorScroll: {
    paddingHorizontal: 16,
    paddingRight: 8,
    alignItems: "center",
  },
  accessibilityPressable: {
    marginRight: 12,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  /** Asset already includes white tile + shadow; no extra wrapper. */
  accessibilityIconImage: {
    width: 44,
    height: 44,
  },
  floorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  floorButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  selectedFloorButtonText: {
    color: "#fff",
  },
});
