import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeaderBackButton } from "../ui/HeaderBackButton";
import { indoorData } from "./indoorData";
import { floorMaps } from "./floorMaps";
import IndoorMapViewer from "./IndoorMapViewer";
import { SGW_BUILDINGS } from "../Buildings/SGW/SGWBuildings";
import { LOYOLA_BUILDINGS } from "../Buildings/Loyola/LoyolaBuildings";
import { getCampusTheme } from "./campusTheme";
import { getFloorData } from "./floorFiltering";
import { BUILDING_FLOORS, INDOOR_LAYOUT } from "./indoor.constants";
import { FloorSelector } from "./FloorSelector";

interface IndoorScreenProps {
  buildingId: string;
}

export default function IndoorScreen({
  buildingId,
}: Readonly<IndoorScreenProps>) {
  const trimmedBuildingId = buildingId.trim();

  const building = useMemo(() => {
    const allBuildings = [...SGW_BUILDINGS, ...LOYOLA_BUILDINGS];
    return allBuildings.find((b) => b.code === trimmedBuildingId);
  }, [trimmedBuildingId]);

  const buildingDisplayName = building ? building.name : trimmedBuildingId;
  const campus = building?.campus;

  const campusTheme = useMemo(() => getCampusTheme(campus), [campus]);

  const graphData = useMemo(() => {
    return indoorData[trimmedBuildingId];
  }, [trimmedBuildingId]);

  const availableFloors = useMemo(() => {
    if (BUILDING_FLOORS[trimmedBuildingId]) {
      return BUILDING_FLOORS[trimmedBuildingId];
    }

    if (!graphData) return [];

    const floors = Array.from(
      new Set(graphData.nodes.map((node) => node.floor)),
    );
    return floors.sort((a, b) => a - b);
  }, [graphData, trimmedBuildingId]);

  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  useEffect(() => {
    if (selectedFloor === null && availableFloors.length > 0) {
      setSelectedFloor(availableFloors[0]);
    }
  }, [availableFloors, selectedFloor]);

  const currentFloorMap = useMemo(() => {
    if (selectedFloor === null) return undefined;
    return floorMaps[trimmedBuildingId]?.[selectedFloor.toString()];
  }, [trimmedBuildingId, selectedFloor]);

  const floorData = useMemo(() => {
    return getFloorData(graphData, selectedFloor);
  }, [graphData, selectedFloor]);

  if (!graphData) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={[
            styles.header,
            { backgroundColor: campusTheme.headerBackgroundColor },
          ]}
        >
          <View style={styles.backButtonContainer}>
            <HeaderBackButton color={campusTheme.headerTextColor} />
          </View>
          <Text
            style={[styles.headerTitle, { color: campusTheme.headerTextColor }]}
          >
            Building Not Found
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.errorContainer}>
          <Text style={styles.errorText} testID="indoor-unavailable-message">
            Indoor map coming soon for {buildingDisplayName}.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={[
          styles.header,
          { backgroundColor: campusTheme.headerBackgroundColor },
        ]}
      >
        <View style={styles.backButtonContainer}>
          <HeaderBackButton color={campusTheme.headerTextColor} />
        </View>
        <Text
          style={[styles.headerTitle, { color: campusTheme.headerTextColor }]}
        >
          {buildingDisplayName}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <IndoorMapViewer
          imageSource={currentFloorMap}
          nodes={floorData.nodes}
          edges={floorData.edges}
        />
      </View>

      <View
        style={styles.floorSelectorContainer}
        testID="indoor-floor-selector"
      >
        <Text style={styles.hiddenFloorTestHook} testID="indoor-current-floor">
          Floor: {selectedFloor === -2 ? "S2" : (selectedFloor ?? "-")}
        </Text>
        <FloorSelector
          floors={availableFloors}
          selectedFloor={selectedFloor}
          onSelectFloor={setSelectedFloor}
          campusTheme={campusTheme}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: INDOOR_LAYOUT.HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButtonContainer: {
    width: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
  floorSelectorContainer: {
    height: INDOOR_LAYOUT.FLOOR_SELECTOR_HEIGHT,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  hiddenFloorTestHook: {
    fontSize: 1,
    lineHeight: 1,
    color: "transparent",
    textAlign: "center",
    marginTop: 1,
  },
});
