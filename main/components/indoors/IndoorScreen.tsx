import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeaderBackButton } from "../ui/HeaderBackButton";
import { indoorData } from "./indoorData";
import { floorMaps } from "./floorMaps";
import IndoorMapViewer from "./IndoorMapViewer";
import { SGW_BUILDINGS } from "../Buildings/SGW/SGWBuildings";
import { LOYOLA_BUILDINGS } from "../Buildings/Loyola/LoyolaBuildings";

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

  const headerStyle = useMemo(() => {
    let backgroundColor = "#fff";
    let textColor = "#000";

    if (campus === "SGW") {
      backgroundColor = "#912338";
      textColor = "#fff";
    } else if (campus === "LOY") {
      backgroundColor = "#e3ac20";
      textColor = "#fff";
    }

    return { backgroundColor, textColor };
  }, [campus]);

  const graphData = useMemo(() => {
    return indoorData[trimmedBuildingId];
  }, [trimmedBuildingId]);

  const availableFloors = useMemo(() => {
    if (trimmedBuildingId === "MB") {
      return [-2, 1];
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
    if (selectedFloor === null) return null;
    return floorMaps[trimmedBuildingId]?.[selectedFloor.toString()] || null;
  }, [trimmedBuildingId, selectedFloor]);

  if (!graphData) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={[
            styles.header,
            { backgroundColor: headerStyle.backgroundColor },
          ]}
        >
          <View style={styles.backButtonContainer}>
            <HeaderBackButton color={headerStyle.textColor} />
          </View>
          <Text style={[styles.headerTitle, { color: headerStyle.textColor }]}>
            Building Not Found
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            No indoor map data available for {buildingDisplayName}.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const floorNodes = graphData.nodes.filter(
    (node) => node.floor === selectedFloor,
  );

  const nodeIdsOnFloor = new Set(floorNodes.map((node) => node.id));

  const floorEdges = graphData.edges.filter(
    (edge) =>
      nodeIdsOnFloor.has(edge.source) && nodeIdsOnFloor.has(edge.target),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={[
          styles.header,
          { backgroundColor: headerStyle.backgroundColor },
        ]}
      >
        <View style={styles.backButtonContainer}>
          <HeaderBackButton color={headerStyle.textColor} />
        </View>
        <Text style={[styles.headerTitle, { color: headerStyle.textColor }]}>
          {buildingDisplayName}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <IndoorMapViewer
          SvgComponent={currentFloorMap ?? undefined}
          nodes={floorNodes}
          edges={floorEdges}
        />
      </View>

      <View style={styles.floorSelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.floorSelectorScroll}
        >
          {availableFloors.map((floor) => {
            let selectedStyle = null;

            if (selectedFloor === floor) {
              if (campus === "SGW") {
                selectedStyle = styles.selectedFloorButtonSGW;
              } else if (campus === "LOY") {
                selectedStyle = styles.selectedFloorButtonLOY;
              } else {
                selectedStyle = styles.selectedFloorButton;
              }
            }

            return (
              <TouchableOpacity
                key={floor}
                style={[styles.floorButton, selectedStyle]}
                onPress={() => setSelectedFloor(floor)}
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
            );
          })}
        </ScrollView>
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
    height: 60,
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
    height: 70,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
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
  selectedFloorButton: {
    backgroundColor: "#007AFF",
  },
  selectedFloorButtonSGW: {
    backgroundColor: "#912338",
  },
  selectedFloorButtonLOY: {
    backgroundColor: "#e3ac20",
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
