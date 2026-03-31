import { useEffect } from "react";
import type { IndoorNode } from "./types";

type GraphData = {
  nodes: IndoorNode[];
};

type Params = {
  normalizedDestinationNodeId?: string;
  normalizedDestinationLabel?: string;
  graphData?: GraphData;
  startNode: IndoorNode | null;
  setDestinationNode: (node: IndoorNode | null) => void;
  setDestText: (text: string) => void;
  setStartNode: (node: IndoorNode | null) => void;
  setStartText: (text: string) => void;
  setSelectedOutdoorBuilding: (value: null) => void;
  setSelectedExternalRoom: (value: null) => void;
  setActiveField: (field: "start" | "destination") => void;
  setCurrentStepIndex: (index: number) => void;
};

export function useIndoorDeepLinkEffect({
  normalizedDestinationNodeId,
  normalizedDestinationLabel,
  graphData,
  startNode,
  setDestinationNode,
  setDestText,
  setStartNode,
  setStartText,
  setSelectedOutdoorBuilding,
  setSelectedExternalRoom,
  setActiveField,
  setCurrentStepIndex,
}: Readonly<Params>) {
  useEffect(() => {
    if (!normalizedDestinationNodeId || !graphData) return;

    const matchedNode =
      graphData.nodes.find((node) => node.id === normalizedDestinationNodeId) ??
      null;

    if (!matchedNode) return;

    setDestinationNode(matchedNode);
    setDestText(normalizedDestinationLabel ?? matchedNode.label ?? "");

    if (startNode !== null) return;

    const entryNodes = graphData.nodes.filter(
      (node) => node.type === "building_entry_exit",
    );

    const getDistance = (a: IndoorNode, b: IndoorNode) => {
      if (a.x == null || a.y == null || b.x == null || b.y == null) {
        return Number.POSITIVE_INFINITY;
      }
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    if (entryNodes.length > 0) {
      const firstEntryNode = entryNodes[0];
      const closestEntryNode = entryNodes.reduce((closest, current) => {
        return getDistance(current, matchedNode) <
          getDistance(closest, matchedNode)
          ? current
          : closest;
      }, firstEntryNode);

      setStartNode({
        ...closestEntryNode,
        label: "Entrance",
      });
      setStartText("Entrance");
    }

    setSelectedOutdoorBuilding(null);
    setSelectedExternalRoom(null);
    setActiveField("destination");
    setCurrentStepIndex(0);
  }, [normalizedDestinationNodeId, normalizedDestinationLabel, graphData]);
}
