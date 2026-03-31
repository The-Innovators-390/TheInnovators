import { useCallback } from "react";
import { Keyboard } from "react-native";
import { useRouter } from "expo-router";
import type { Building } from "../../Buildings/types";
import type { IndoorNode } from "../types";
import type { SuggestionItem } from "../IndoorSuggestionsList";

type OutdoorBuildingSuggestion = Extract<
  SuggestionItem,
  { type: "outdoor_building" }
>;
type ExternalRoomSuggestion = Extract<
  SuggestionItem,
  { type: "external_room" }
>;

type GraphData = {
  nodes: IndoorNode[];
};

type SelectedExternalRoom = {
  building: Building;
  roomNode: IndoorNode;
} | null;

type Params = {
  graphData?: GraphData;
  routeStepsLength: number;
  currentStep: {
    kind: string;
    toNodeId: string;
  } | null;
  routeResultExists: boolean;
  isLastStep: boolean;
  startNode: IndoorNode | null;
  destinationNode: IndoorNode | null;
  selectedOutdoorBuilding: Building | null;
  selectedExternalRoom: SelectedExternalRoom;
  building: Building | undefined;
  startText: string;
  destText: string;
  activeField: "start" | "destination";
  setSelectedFloor: React.Dispatch<React.SetStateAction<number | null>>;
  setCurrentStepIndex: React.Dispatch<React.SetStateAction<number>>;
  setStartNode: React.Dispatch<React.SetStateAction<IndoorNode | null>>;
  setDestinationNode: React.Dispatch<React.SetStateAction<IndoorNode | null>>;
  setSelectedOutdoorBuilding: React.Dispatch<
    React.SetStateAction<Building | null>
  >;
  setSelectedExternalRoom: React.Dispatch<
    React.SetStateAction<SelectedExternalRoom>
  >;
  setStartText: React.Dispatch<React.SetStateAction<string>>;
  setDestText: React.Dispatch<React.SetStateAction<string>>;
  setActiveField: React.Dispatch<React.SetStateAction<"start" | "destination">>;
};

export function useIndoorRouteHandlers({
  graphData,
  routeStepsLength,
  currentStep,
  routeResultExists,
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
}: Readonly<Params>) {
  const router = useRouter();

  const getNodeById = useCallback(
    (nodeId: string) => {
      return graphData?.nodes.find((node) => node.id === nodeId) ?? null;
    },
    [graphData],
  );

  const handleAdvanceStep = useCallback(() => {
    if (!currentStep || !routeResultExists || isLastStep) return;

    if (currentStep.kind === "elevator" || currentStep.kind === "stairs") {
      const destinationTransportNode = getNodeById(currentStep.toNodeId);
      if (destinationTransportNode?.floor != null) {
        setSelectedFloor(destinationTransportNode.floor);
      }
    }

    setCurrentStepIndex((prev) => Math.min(prev + 1, routeStepsLength - 1));
  }, [
    currentStep,
    routeResultExists,
    isLastStep,
    getNodeById,
    setSelectedFloor,
    setCurrentStepIndex,
    routeStepsLength,
  ]);

  const handleSwapRouteFields = useCallback(() => {
    const previousStart = startNode;
    const previousDestination = destinationNode;

    setStartNode(previousDestination);
    setDestinationNode(previousStart);
    setSelectedOutdoorBuilding(null);
    setSelectedExternalRoom(null);

    setStartText(previousDestination?.label ?? destText);
    setDestText(previousStart?.label ?? startText);
    setCurrentStepIndex(0);
  }, [
    startNode,
    destinationNode,
    setStartNode,
    setDestinationNode,
    setSelectedOutdoorBuilding,
    setSelectedExternalRoom,
    setStartText,
    setDestText,
    destText,
    startText,
    setCurrentStepIndex,
  ]);

  const handleChangeStartText = useCallback(
    (text: string) => {
      setActiveField("start");
      setStartText(text);
      if (startNode) {
        setStartNode(null);
      }
    },
    [setActiveField, setStartText, startNode, setStartNode],
  );

  const handleChangeDestText = useCallback(
    (text: string) => {
      setActiveField("destination");
      setDestText(text);

      if (destinationNode) setDestinationNode(null);
      if (selectedOutdoorBuilding) setSelectedOutdoorBuilding(null);
      if (selectedExternalRoom) setSelectedExternalRoom(null);

      setCurrentStepIndex(0);
    },
    [
      setActiveField,
      setDestText,
      destinationNode,
      setDestinationNode,
      selectedOutdoorBuilding,
      setSelectedOutdoorBuilding,
      selectedExternalRoom,
      setSelectedExternalRoom,
      setCurrentStepIndex,
    ],
  );

  const handleClearStart = useCallback(() => {
    setStartText("");
    setStartNode(null);
    setCurrentStepIndex(0);
    setActiveField("start");
  }, [setStartText, setStartNode, setCurrentStepIndex, setActiveField]);

  const handleClearDestination = useCallback(() => {
    setDestText("");
    setDestinationNode(null);
    setSelectedOutdoorBuilding(null);
    setSelectedExternalRoom(null);
    setCurrentStepIndex(0);
    setActiveField("destination");
  }, [
    setDestText,
    setDestinationNode,
    setSelectedOutdoorBuilding,
    setSelectedExternalRoom,
    setCurrentStepIndex,
    setActiveField,
  ]);

  const handlePickIndoorNode = useCallback(
    (node: SuggestionItem) => {
      if (activeField === "start") {
        setStartNode(node as IndoorNode);
        setStartText(node.label ?? "");
        setActiveField("destination");
        setCurrentStepIndex(0);
        Keyboard.dismiss();
        return;
      }

      if (node.type === "outdoor_building") {
        const outdoorNode = node as OutdoorBuildingSuggestion;
        setDestinationNode(null);
        setSelectedExternalRoom(null);
        setSelectedOutdoorBuilding(outdoorNode.building as Building);
        setDestText(outdoorNode.label ?? "");
        setCurrentStepIndex(0);
        Keyboard.dismiss();
        return;
      }

      if (node.type === "external_room") {
        const externalRoomNode = node as ExternalRoomSuggestion;
        setDestinationNode(null);
        setSelectedOutdoorBuilding(externalRoomNode.building as Building);
        setSelectedExternalRoom({
          building: externalRoomNode.building as Building,
          roomNode: externalRoomNode.roomNode,
        });
        setDestText(externalRoomNode.label ?? "");
        setCurrentStepIndex(0);
        Keyboard.dismiss();
        return;
      }

      setDestinationNode(node as IndoorNode);
      setSelectedOutdoorBuilding(null);
      setSelectedExternalRoom(null);
      setDestText(node.label ?? "");
      setCurrentStepIndex(0);
      Keyboard.dismiss();
    },
    [
      activeField,
      setStartNode,
      setStartText,
      setActiveField,
      setCurrentStepIndex,
      setDestinationNode,
      setSelectedExternalRoom,
      setSelectedOutdoorBuilding,
      setDestText,
    ],
  );

  const handleContinueToCampusRoute = useCallback(() => {
    if (!building || !startNode || !selectedOutdoorBuilding) return;

    const externalRoomNodeId =
      selectedExternalRoom?.roomNode?.id ?? destinationNode?.id ?? null;
    const externalRoomLabel =
      selectedExternalRoom?.roomNode?.label ?? destinationNode?.label ?? "";
    const externalBuildingCode =
      selectedExternalRoom?.building?.code ??
      selectedOutdoorBuilding?.code ??
      "";

    router.push({
      pathname: "/(tabs)/map",
      params: {
        indoorStartBuildingCode: building.code,
        indoorStartBuildingId: building.id,
        indoorStartLabel: startNode.label ?? startText ?? "Selected room",
        destBuildingId: selectedOutdoorBuilding.id,
        externalDestRoomNodeId: externalRoomNodeId,
        externalDestRoomLabel: externalRoomLabel,
        externalDestBuildingCode: externalBuildingCode,
      },
    });
  }, [
    building,
    startNode,
    selectedOutdoorBuilding,
    selectedExternalRoom,
    destinationNode,
    startText,
    router,
  ]);

  return {
    handleAdvanceStep,
    handleSwapRouteFields,
    handleChangeStartText,
    handleChangeDestText,
    handleClearStart,
    handleClearDestination,
    handlePickIndoorNode,
    handleContinueToCampusRoute,
  };
}
