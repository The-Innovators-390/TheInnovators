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
import IndoorRouteInput from "./IndoorRouteInput";
import IndoorSuggestionsList from "./IndoorSuggestionsList";
import { findShortestIndoorPath } from "./pathfinding";
import type { IndoorNode } from "./types";

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

  const [startNode, setStartNode] = useState<IndoorNode | null>(null);
  const [destinationNode, setDestinationNode] = useState<IndoorNode | null>(
    null,
  );
  const [startText, setStartText] = useState("");
  const [destText, setDestText] = useState("");
  const [activeField, setActiveField] = useState<"start" | "destination">(
    "start",
  );

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

  // For same-floor navigation only, start/dest shouldnt reset for multi-floor
  useEffect(() => {
    setStartNode(null);
    setDestinationNode(null);
    setStartText("");
    setDestText("");
    setActiveField("start");
  }, [selectedFloor]);

  const currentFloorMap = useMemo(() => {
    if (selectedFloor === null) return undefined;
    return floorMaps[trimmedBuildingId]?.[selectedFloor.toString()];
  }, [trimmedBuildingId, selectedFloor]);

  const floorData = useMemo(() => {
    return getFloorData(graphData, selectedFloor);
  }, [graphData, selectedFloor]);

  const suggestions = useMemo(() => {
    const query = activeField === "start" ? startText : destText;
    const normalizedQuery = query.trim().toLowerCase();

    const selectedNode = activeField === "start" ? startNode : destinationNode;

    if (!normalizedQuery || selectedNode) {
      return [];
    }

    return floorData.nodes
      .filter((node) => node.type === "room" && !!node.label)
      .filter((node) => node.label?.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [
    activeField,
    startText,
    destText,
    startNode,
    destinationNode,
    floorData.nodes,
  ]);

  const routeResult = useMemo(() => {
    if (!startNode || !destinationNode) {
      return null;
    }

    return findShortestIndoorPath(
      floorData.nodes,
      floorData.edges,
      startNode.id,
      destinationNode.id,
    );
  }, [startNode, destinationNode, floorData.nodes, floorData.edges]);

  function handlePickIndoorNode(node: IndoorNode) {
    if (activeField === "start") {
      setStartNode(node);
      setStartText(node.label ?? "");
      setActiveField("destination");
    } else {
      setDestinationNode(node);
      setDestText(node.label ?? "");
    }
  }

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

      <View style={styles.routePanelContainer}>
        <IndoorRouteInput
          start={startNode}
          destination={destinationNode}
          activeField={activeField}
          onFocusField={setActiveField}
          onSwap={() => {
            const previousStart = startNode;
            const previousDestination = destinationNode;

            setStartNode(previousDestination);
            setDestinationNode(previousStart);

            setStartText(previousDestination?.label ?? destText);
            setDestText(previousStart?.label ?? startText);
          }}
          startText={startText}
          destText={destText}
          onChangeStartText={(text) => {
            setActiveField("start");
            setStartText(text);
            if (startNode) setStartNode(null);
          }}
          onChangeDestText={(text) => {
            setActiveField("destination");
            setDestText(text);
            if (destinationNode) setDestinationNode(null);
          }}
          onClearStart={() => {
            setStartText("");
            setStartNode(null);
            setActiveField("start");
          }}
          onClearDestination={() => {
            setDestText("");
            setDestinationNode(null);
            setActiveField("destination");
          }}
        />
        <IndoorSuggestionsList
          suggestions={suggestions}
          onPick={handlePickIndoorNode}
        />
      </View>
      <View style={styles.content}>
        <IndoorMapViewer
          imageSource={currentFloorMap}
          nodes={floorData.nodes}
          edges={floorData.edges}
          path={routeResult?.path ?? []}
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
  routePanelContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 0,
    backgroundColor: "#fff",
  },
  routeSummary: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  routeSummaryText: {
    fontSize: 13,
    color: "#374151",
  },
});
