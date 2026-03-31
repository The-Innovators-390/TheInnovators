import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Keyboard, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import {
  findShortestIndoorPathWithSteps,
  findShortestPathToBuildingExitWithSteps,
  IndoorRoutingOptions,
  type IndoorRouteStep,
} from "./pathfinding";
import type { IndoorNode } from "./types";

interface IndoorScreenProps {
  buildingId: string;
}

type MixedSuggestion =
  | IndoorNode
  | {
      type: "outdoor_building";
      label: string;
      building: any;
    }
  | {
      type: "external_room";
      label: string;
      building: any;
      roomNode: IndoorNode;
    };

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

  const router = useRouter();

  const { destinationNodeId, destinationLabel } = useLocalSearchParams<{
    destinationNodeId?: string | string[];
    destinationLabel?: string | string[];
  }>();

  const normalizedDestinationNodeId = Array.isArray(destinationNodeId)
    ? destinationNodeId[0]
    : destinationNodeId;

  const normalizedDestinationLabel = Array.isArray(destinationLabel)
    ? destinationLabel[0]
    : destinationLabel;

  const ALL_BUILDINGS = useMemo(
    () => [...SGW_BUILDINGS, ...LOYOLA_BUILDINGS],
    [],
  );

  const [selectedOutdoorBuilding, setSelectedOutdoorBuilding] =
    useState<any>(null);
  const [selectedExternalRoom, setSelectedExternalRoom] = useState<any>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [accessible, setAccessible] = useState(false);

  const graphData = useMemo(() => {
    return indoorData[trimmedBuildingId];
  }, [trimmedBuildingId]);

  useEffect(() => {
    if (!normalizedDestinationNodeId || !graphData) return;

    const matchedNode =
      graphData.nodes.find(
        (node: IndoorNode) => node.id === normalizedDestinationNodeId,
      ) ?? null;

    if (!matchedNode) return;

    setDestinationNode(matchedNode);
    setDestText(normalizedDestinationLabel ?? matchedNode.label ?? "");
    setSelectedOutdoorBuilding(null);
    setSelectedExternalRoom(null);
    setActiveField("destination");
    setCurrentStepIndex(0);
  }, [normalizedDestinationNodeId, normalizedDestinationLabel, graphData]);

  const availableFloors = useMemo(() => {
    if (BUILDING_FLOORS[trimmedBuildingId]) {
      return BUILDING_FLOORS[trimmedBuildingId];
    }

    if (!graphData) return [];

    const floors = Array.from(
      new Set(graphData.nodes.map((node: IndoorNode) => node.floor)),
    );
    return floors.sort((a, b) => a - b);
  }, [graphData, trimmedBuildingId]);

  useEffect(() => {
    if (selectedFloor === null && availableFloors.length > 0) {
      setSelectedFloor(availableFloors[0]);
    }
  }, [availableFloors, selectedFloor]);

  useEffect(() => {
    setCurrentStepIndex(0);
  }, [
    startNode?.id,
    destinationNode?.id,
    selectedOutdoorBuilding?.id,
    selectedExternalRoom?.roomNode?.id,
    accessible,
    trimmedBuildingId,
  ]);

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

    if (!normalizedQuery || selectedNode || !graphData) {
      return [];
    }

    if (activeField === "start") {
      return graphData.nodes
        .filter((node: IndoorNode) => node.type === "room" && !!node.label)
        .filter((node: IndoorNode) =>
          node.label?.toLowerCase().includes(normalizedQuery),
        )
        .slice(0, 8);
    }

    const sameBuildingRooms = graphData.nodes
      .filter((node: IndoorNode) => node.type === "room" && !!node.label)
      .filter((node: IndoorNode) =>
        node.label?.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 4);

    const outdoorBuildings = ALL_BUILDINGS.filter((b) => {
      const code = b.code?.toLowerCase() ?? "";
      const name = b.name?.toLowerCase() ?? "";
      const address = b.address?.toLowerCase() ?? "";

      return (
        code.includes(normalizedQuery) ||
        name.includes(normalizedQuery) ||
        address.includes(normalizedQuery)
      );
    })
      .slice(0, 4)
      .map((b) => ({
        type: "outdoor_building" as const,
        label: `${b.code} - ${b.name}`,
        building: b,
      }));

    const externalRooms: MixedSuggestion[] = [];

    Object.entries(indoorData).forEach(([code, data]) => {
      if (code === trimmedBuildingId) return;

      const targetBuilding = ALL_BUILDINGS.find((b) => b.code === code);
      if (!targetBuilding) return;

      data.nodes
        .filter((node: IndoorNode) => node.type === "room" && !!node.label)
        .filter((node: IndoorNode) =>
          node.label?.toLowerCase().includes(normalizedQuery),
        )
        .slice(0, 2)
        .forEach((node: IndoorNode) => {
          externalRooms.push({
            type: "external_room",
            label: `${node.label} (${targetBuilding.code})`,
            building: targetBuilding,
            roomNode: node,
          });
        });
    });

    return [...sameBuildingRooms, ...outdoorBuildings, ...externalRooms].slice(
      0,
      8,
    );
  }, [
    activeField,
    startText,
    destText,
    startNode,
    destinationNode,
    graphData,
    ALL_BUILDINGS,
    trimmedBuildingId,
  ]);

  const isOutdoorHandoffRoute = useMemo(() => {
    return !!startNode && (!!selectedOutdoorBuilding || !!selectedExternalRoom);
  }, [startNode, selectedOutdoorBuilding, selectedExternalRoom]);

  const routeResult = useMemo(() => {
    if (!startNode || !graphData) {
      return null;
    }

    const options: IndoorRoutingOptions = { accessible };

    if (isOutdoorHandoffRoute) {
      return findShortestPathToBuildingExitWithSteps(
        graphData.nodes,
        graphData.edges,
        startNode.id,
        options,
      );
    }

    if (!destinationNode) {
      return null;
    }

    return findShortestIndoorPathWithSteps(
      graphData.nodes,
      graphData.edges,
      startNode.id,
      destinationNode.id,
      options,
    );
  }, [
    startNode,
    destinationNode,
    graphData,
    accessible,
    isOutdoorHandoffRoute,
  ]);

  useEffect(() => {
    if (!routeResult?.path?.length) return;

    const firstPathFloor = routeResult.path[0]?.floor;
    if (typeof firstPathFloor === "number") {
      setSelectedFloor(firstPathFloor);
    }
  }, [routeResult]);

  const routeSteps = routeResult?.steps ?? [];

  const currentStep: IndoorRouteStep | null =
    routeSteps[currentStepIndex] ?? null;

  const isLastStep =
    routeSteps.length > 0 && currentStepIndex === routeSteps.length - 1;

  const hasSuggestions = suggestions.length > 0;

  const getNodeById = (nodeId: string) => {
    return (
      graphData?.nodes.find((node: IndoorNode) => node.id === nodeId) ?? null
    );
  };

  const handleAdvanceStep = () => {
    if (!currentStep || !routeResult) return;
    if (isLastStep) return;

    if (currentStep.kind === "elevator" || currentStep.kind === "stairs") {
      const destinationTransportNode = getNodeById(currentStep.toNodeId);
      if (destinationTransportNode?.floor != null) {
        setSelectedFloor(destinationTransportNode.floor);
      }
    }

    setCurrentStepIndex((prev) => Math.min(prev + 1, routeSteps.length - 1));
  };

  const handleSwapRouteFields = () => {
    const previousStart = startNode;
    const previousDestination = destinationNode;

    setStartNode(previousDestination);
    setDestinationNode(previousStart);
    setSelectedOutdoorBuilding(null);
    setSelectedExternalRoom(null);

    setStartText(previousDestination?.label ?? destText);
    setDestText(previousStart?.label ?? startText);
    setCurrentStepIndex(0);
  };

  const handleChangeStartText = (text: string) => {
    setActiveField("start");
    setStartText(text);

    if (startNode) {
      setStartNode(null);
    }
  };

  const handleChangeDestText = (text: string) => {
    setActiveField("destination");
    setDestText(text);

    if (destinationNode) {
      setDestinationNode(null);
    }

    if (selectedOutdoorBuilding) {
      setSelectedOutdoorBuilding(null);
    }

    if (selectedExternalRoom) {
      setSelectedExternalRoom(null);
    }

    setCurrentStepIndex(0);
  };

  const handleClearStart = () => {
    setStartText("");
    setStartNode(null);
    setCurrentStepIndex(0);
    setActiveField("start");
  };

  const handleClearDestination = () => {
    setDestText("");
    setDestinationNode(null);
    setSelectedOutdoorBuilding(null);
    setSelectedExternalRoom(null);
    setCurrentStepIndex(0);
    setActiveField("destination");
  };

  function handlePickIndoorNode(node: any) {
    if (activeField === "start") {
      setStartNode(node);
      setStartText(node.label ?? "");
      setActiveField("destination");
      setCurrentStepIndex(0);
      Keyboard.dismiss();
      return;
    }
    if (node.type === "outdoor_building") {
      setDestinationNode(null);
      setSelectedExternalRoom(null);
      setSelectedOutdoorBuilding(node.building);
      setDestText(node.label ?? "");
      setCurrentStepIndex(0);
      Keyboard.dismiss();
      return;
    }

    if (node.type === "external_room") {
      setDestinationNode(null);
      setSelectedOutdoorBuilding(node.building);
      setSelectedExternalRoom({
        building: node.building,
        roomNode: node.roomNode,
      });
      setDestText(node.label ?? "");
      setCurrentStepIndex(0);
      Keyboard.dismiss();
      return;
    }

    setDestinationNode(node);
    setSelectedOutdoorBuilding(null);
    setSelectedExternalRoom(null);
    setDestText(node.label ?? "");
    setCurrentStepIndex(0);
    Keyboard.dismiss();
  }

  const handleContinueToCampusRoute = () => {
    if (!building || !startNode || !selectedOutdoorBuilding) return;

    router.push({
      pathname: "/(tabs)/map",
      params: {
        indoorStartBuildingCode: building.code,
        indoorStartBuildingId: building.id,
        indoorStartLabel: startNode.label ?? startText ?? "Selected room",
        destBuildingId: selectedOutdoorBuilding.id,
        externalDestRoomNodeId: selectedExternalRoom?.roomNode?.id,
        externalDestRoomLabel: selectedExternalRoom?.roomNode?.label ?? "",
        externalDestBuildingCode: selectedExternalRoom?.building?.code ?? "",
      },
    });
  };

  const routeFloors = useMemo(() => {
    return Array.from(
      new Set(routeResult?.path.map((node: IndoorNode) => node.floor) ?? []),
    );
  }, [routeResult]);

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

      <View style={styles.mapSection}>
        <IndoorMapViewer
          imageSource={currentFloorMap}
          nodes={floorData.nodes}
          edges={floorData.edges}
          path={routeResult?.path ?? []}
          currentFloor={selectedFloor ?? 0}
        />
        <View style={styles.topOverlay}>
          <View
            style={[
              styles.routeCard,
              accessible && styles.routeCardAccessibleShell,
            ]}
          >
            <IndoorRouteInput
              start={startNode}
              destination={destinationNode}
              activeField={activeField}
              onFocusField={setActiveField}
              onSwap={handleSwapRouteFields}
              startText={startText}
              destText={destText}
              onChangeStartText={handleChangeStartText}
              onChangeDestText={handleChangeDestText}
              onClearStart={handleClearStart}
              onClearDestination={handleClearDestination}
              accessible={accessible}
            />
          </View>

          {hasSuggestions ? (
            <View style={styles.suggestionsOverlay}>
              <IndoorSuggestionsList
                suggestions={suggestions as any}
                onPick={handlePickIndoorNode}
              />
            </View>
          ) : null}

          {routeResult != null && routeResult.path.length > 0 ? (
            <Text
              testID="indoor-route-calculated"
              style={styles.hiddenRouteTestHook}
            >
              {routeResult.path.length}
            </Text>
          ) : null}
        </View>

        {currentStep ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.stepOverlay,
              hasSuggestions ? styles.stepOverlayWithSuggestions : null,
            ]}
          >
            <View style={styles.stepCard}>
              <Text style={styles.stepBadge}>
                Step {currentStepIndex + 1} of {routeSteps.length}
              </Text>
              <Text style={styles.stepText}>{currentStep.instruction}</Text>

              {isOutdoorHandoffRoute && isLastStep ? (
                <Pressable
                  testID="confirmExitBuildingButton"
                  onPress={handleContinueToCampusRoute}
                  style={continueStyles.button}
                >
                  <Text style={continueStyles.text}>
                    Confirm you have exited the building
                  </Text>
                </Pressable>
              ) : isLastStep ? (
                <View style={styles.arrivedBadge}>
                  <Text style={styles.arrivedText}>
                    You have reached this step
                  </Text>
                </View>
              ) : (
                <Pressable
                  testID="indoorNextStepButton"
                  onPress={handleAdvanceStep}
                  style={styles.nextStepButton}
                >
                  <Text style={styles.nextStepText}>Next</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}

        <View
          style={styles.floorSelectorContainer}
          testID="indoor-floor-selector"
        >
          <Text
            style={styles.hiddenFloorTestHook}
            testID="indoor-current-floor"
          >
            Floor: {selectedFloor === -2 ? "S2" : (selectedFloor ?? "-")}
          </Text>
          <FloorSelector
            floors={availableFloors}
            selectedFloor={selectedFloor}
            onSelectFloor={setSelectedFloor}
            campusTheme={campusTheme}
            routeFloors={routeFloors}
            accessible={accessible}
            onPressAccessible={() => setAccessible((prev) => !prev)}
          />
        </View>
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
  mapSection: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  topOverlay: {
    position: "absolute",
    top: 6,
    left: 8,
    right: 8,
    zIndex: 8,
  },
  routeCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  /** Avoid a second white ring around the blue accessible route card. */
  routeCardAccessibleShell: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  suggestionsOverlay: {
    marginTop: 4,
    zIndex: 9,
  },
  stepOverlay: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: INDOOR_LAYOUT.FLOOR_SELECTOR_HEIGHT + 10,
    zIndex: 7,
  },
  stepOverlayWithSuggestions: {
    bottom: INDOOR_LAYOUT.FLOOR_SELECTOR_HEIGHT + 10,
  },
  stepCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(248, 250, 252, 0.96)",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  stepBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },
  stepText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#111827",
    fontWeight: "600",
  },
  nextStepButton: {
    marginTop: 8,
    alignSelf: "flex-end",
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  nextStepText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  arrivedBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  arrivedText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 13,
  },
  floorSelectorContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: INDOOR_LAYOUT.FLOOR_SELECTOR_HEIGHT,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    zIndex: 10,
  },
  hiddenFloorTestHook: {
    fontSize: 1,
    lineHeight: 1,
    color: "transparent",
    textAlign: "center",
    marginTop: 1,
  },
  hiddenRouteTestHook: {
    position: "absolute",
    width: 1,
    height: 1,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    fontSize: 1,
    lineHeight: 1,
    color: "transparent",
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
});

const continueStyles = StyleSheet.create({
  button: {
    marginTop: 8,
    alignSelf: "center",
    backgroundColor: "#912338",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
});
