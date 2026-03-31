import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
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
import type { IndoorNode } from "./types";
import { useIndoorDeepLinkEffect } from "./useIndoorDeepLinkEffect";
import { useIndoorSuggestions } from "./useIndoorSuggestions";
import { useIndoorRouteHandlers } from "./useIndoorRouteHandlers";
import { useIndoorRouteComputation } from "./useIndoorRouteComputation";

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

  const [selectedOutdoorBuilding, setSelectedOutdoorBuilding] = useState<
    (typeof ALL_BUILDINGS)[number] | null
  >(null);
  const [selectedExternalRoom, setSelectedExternalRoom] = useState<{
    building: (typeof ALL_BUILDINGS)[number];
    roomNode: IndoorNode;
  } | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [accessible, setAccessible] = useState(false);

  const graphData = useMemo(() => {
    return indoorData[trimmedBuildingId];
  }, [trimmedBuildingId]);

  useIndoorDeepLinkEffect({
    normalizedDestinationNodeId,
    normalizedDestinationLabel,
    graphData,
    startNode,
    setDestinationNode,
    setDestText,
    setStartNode,
    setStartText,
    setSelectedOutdoorBuilding: () => setSelectedOutdoorBuilding(null),
    setSelectedExternalRoom: () => setSelectedExternalRoom(null),
    setActiveField,
    setCurrentStepIndex,
  });

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

  const suggestions = useIndoorSuggestions({
    activeField,
    startText,
    destText,
    startNode,
    destinationNode,
    graphData,
    allBuildings: ALL_BUILDINGS,
    trimmedBuildingId,
  });

  const {
    isOutdoorHandoffRoute,
    routeResult,
    routeSteps,
    currentStep,
    isLastStep,
    routeFloors,
  } = useIndoorRouteComputation({
    startNode,
    destinationNode,
    graphData,
    accessible,
    hasSelectedOutdoorBuilding: !!selectedOutdoorBuilding,
    hasSelectedExternalRoom: !!selectedExternalRoom,
    currentStepIndex,
  });

  useEffect(() => {
    if (!routeResult?.path?.length) return;

    const firstPathFloor = routeResult.path[0]?.floor;
    if (typeof firstPathFloor === "number") {
      setSelectedFloor(firstPathFloor);
    }
  }, [routeResult]);

  const hasSuggestions = suggestions.length > 0;
  const hasRouteEndpoints = !!startNode && !!destinationNode;
  const shouldShowNoRouteMessage =
    hasRouteEndpoints &&
    !isOutdoorHandoffRoute &&
    routeResult === null &&
    !hasSuggestions;

  const {
    handleAdvanceStep,
    handleSwapRouteFields,
    handleChangeStartText,
    handleChangeDestText,
    handleClearStart,
    handleClearDestination,
    handlePickIndoorNode,
    handleContinueToCampusRoute,
  } = useIndoorRouteHandlers({
    graphData,
    routeStepsLength: routeSteps.length,
    currentStep,
    routeResultExists: !!routeResult,
    isLastStep,
    startNode,
    destinationNode,
    selectedOutdoorBuilding,
    selectedExternalRoom,
    building,
    startText,
    destText,
    activeField,
    setSelectedFloor,
    setCurrentStepIndex,
    setStartNode,
    setDestinationNode,
    setSelectedOutdoorBuilding,
    setSelectedExternalRoom,
    setStartText,
    setDestText,
    setActiveField,
  });

  const currentFloorLabel =
    selectedFloor === -2 ? "S2" : String(selectedFloor ?? "-");

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
                suggestions={suggestions}
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

        <RouteStepOverlay
          currentStep={currentStep}
          currentStepIndex={currentStepIndex}
          routeStepsLength={routeSteps.length}
          isOutdoorHandoffRoute={isOutdoorHandoffRoute}
          isLastStep={isLastStep}
          hasSuggestions={hasSuggestions}
          onContinueToCampusRoute={handleContinueToCampusRoute}
          onAdvanceStep={handleAdvanceStep}
        />

        {shouldShowNoRouteMessage ? (
          <View style={styles.noRouteOverlay}>
            <Text style={styles.noRouteText}>
              No indoor path found between these rooms in current map data.
            </Text>
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
            Floor: {currentFloorLabel}
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

function RouteStepOverlay({
  currentStep,
  currentStepIndex,
  routeStepsLength,
  isOutdoorHandoffRoute,
  isLastStep,
  hasSuggestions,
  onContinueToCampusRoute,
  onAdvanceStep,
}: Readonly<{
  currentStep: { instruction: string } | null;
  currentStepIndex: number;
  routeStepsLength: number;
  isOutdoorHandoffRoute: boolean;
  isLastStep: boolean;
  hasSuggestions: boolean;
  onContinueToCampusRoute: () => void;
  onAdvanceStep: () => void;
}>) {
  if (!currentStep) return null;

  let action: React.ReactNode = (
    <Pressable
      testID="indoorNextStepButton"
      onPress={onAdvanceStep}
      style={styles.nextStepButton}
    >
      <Text style={styles.nextStepText}>Next</Text>
    </Pressable>
  );

  if (isOutdoorHandoffRoute && isLastStep) {
    action = (
      <Pressable
        testID="confirmExitBuildingButton"
        onPress={onContinueToCampusRoute}
        style={continueStyles.button}
      >
        <Text style={continueStyles.text}>
          Confirm you have exited the building
        </Text>
      </Pressable>
    );
  } else if (isLastStep) {
    action = (
      <View style={styles.arrivedBadge}>
        <Text style={styles.arrivedText}>You have reached this step</Text>
      </View>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.stepOverlay,
        hasSuggestions ? styles.stepOverlayWithSuggestions : null,
      ]}
    >
      <View style={styles.stepCard}>
        <Text style={styles.stepBadge}>
          Step {currentStepIndex + 1} of {routeStepsLength}
        </Text>
        <Text style={styles.stepText}>{currentStep.instruction}</Text>
        {action}
      </View>
    </View>
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
  noRouteOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: INDOOR_LAYOUT.FLOOR_SELECTOR_HEIGHT + 10,
    zIndex: 7,
    backgroundColor: "rgba(255, 248, 240, 0.96)",
    borderColor: "#F59E0B",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noRouteText: {
    color: "#7C2D12",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
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
