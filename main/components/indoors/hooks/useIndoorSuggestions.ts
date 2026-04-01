import { useMemo } from "react";
import { indoorData } from "../indoorData";
import type { Building } from "../../Buildings/types";
import type { IndoorNode } from "../types";
import type { SuggestionItem } from "../IndoorSuggestionsList";

type MixedSuggestion =
  | IndoorNode
  | {
      type: "outdoor_building";
      label: string;
      building: Building;
    }
  | {
      type: "external_room";
      label: string;
      building: Building;
      roomNode: IndoorNode;
    };

type GraphData = {
  nodes: IndoorNode[];
};

type Params = {
  activeField: "start" | "destination";
  startText: string;
  destText: string;
  startNode: IndoorNode | null;
  destinationNode: IndoorNode | null;
  graphData?: GraphData;
  allBuildings: Building[];
  trimmedBuildingId: string;
};

export function useIndoorSuggestions({
  activeField,
  startText,
  destText,
  startNode,
  destinationNode,
  graphData,
  allBuildings,
  trimmedBuildingId,
}: Readonly<Params>) {
  return useMemo(() => {
    const query = activeField === "start" ? startText : destText;
    const normalizedQuery = query.trim().toLowerCase();

    const selectedNode = activeField === "start" ? startNode : destinationNode;
    if (!normalizedQuery || selectedNode || !graphData) {
      return [] as SuggestionItem[];
    }

    if (activeField === "start") {
      return graphData.nodes
        .filter((node) => node.type === "room" && !!node.label)
        .filter((node) => node.label?.toLowerCase().includes(normalizedQuery))
        .slice(0, 8);
    }

    const sameBuildingRooms = graphData.nodes
      .filter((node) => node.type === "room" && !!node.label)
      .filter((node) => node.label?.toLowerCase().includes(normalizedQuery))
      .slice(0, 4);

    const outdoorBuildings = allBuildings
      .filter((b) => {
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

      const targetBuilding = allBuildings.find((b) => b.code === code);
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
    ) as SuggestionItem[];
  }, [
    activeField,
    startText,
    destText,
    startNode,
    destinationNode,
    graphData,
    allBuildings,
    trimmedBuildingId,
  ]);
}
