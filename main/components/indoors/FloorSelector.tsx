import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { CampusTheme } from "./campusTheme";

interface FloorSelectorProps {
  floors: number[];
  selectedFloor: number | null;
  onSelectFloor: (floor: number) => void;
  campusTheme: CampusTheme;
  routeFloors?: number[];
}

export const FloorSelector: React.FC<FloorSelectorProps> = ({
  floors,
  selectedFloor,
  onSelectFloor,
  campusTheme,
  routeFloors = [],
}) => {
  const getFloorButtonStyle = (floor: number): ViewStyle | null => {
    if (selectedFloor === floor) {
      return { backgroundColor: campusTheme.selectedButtonColor };
    }
    if (routeFloors.includes(floor)) {
      return { backgroundColor: "#ffcccc", borderWidth: 2, borderColor: campusTheme.selectedButtonColor };
    }
    return null;
  };

  return (
    <ScrollView
      horizontal
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
  );
};

const styles = StyleSheet.create({
  floorSelectorScroll: {
    paddingHorizontal: 16,
    alignItems: "center",
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
