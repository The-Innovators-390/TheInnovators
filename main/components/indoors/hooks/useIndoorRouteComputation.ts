import { useMemo } from "react";
import {
  findShortestIndoorPathWithSteps,
  findShortestPathToBuildingExitWithSteps,
  type IndoorRoutingOptions,
  type IndoorRouteStep,
} from "../pathfinding";
import type { IndoorNode } from "../types";

type GraphData = {
  nodes: IndoorNode[];
  edges: any[];
};

type Params = {
  startNode: IndoorNode | null;
  destinationNode: IndoorNode | null;
  graphData?: GraphData;
  accessible: boolean;
  hasSelectedOutdoorBuilding: boolean;
  hasSelectedExternalRoom: boolean;
  currentStepIndex: number;
};

export function useIndoorRouteComputation({
  startNode,
  destinationNode,
  graphData,
  accessible,
  hasSelectedOutdoorBuilding,
  hasSelectedExternalRoom,
  currentStepIndex,
}: Readonly<Params>) {
  const isOutdoorHandoffRoute = useMemo(() => {
    return (
      !!startNode && (hasSelectedOutdoorBuilding || hasSelectedExternalRoom)
    );
  }, [startNode, hasSelectedOutdoorBuilding, hasSelectedExternalRoom]);

  const routeResult = useMemo(() => {
    if (!startNode || !graphData) return null;

    const options: IndoorRoutingOptions = { accessible };
    if (isOutdoorHandoffRoute) {
      return findShortestPathToBuildingExitWithSteps(
        graphData.nodes,
        graphData.edges,
        startNode.id,
        options,
      );
    }

    if (!destinationNode) return null;

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

  const routeSteps = routeResult?.steps ?? [];
  const currentStep: IndoorRouteStep | null =
    routeSteps[currentStepIndex] ?? null;
  const isLastStep =
    routeSteps.length > 0 && currentStepIndex === routeSteps.length - 1;
  const routeFloors = useMemo(() => {
    return Array.from(
      new Set(routeResult?.path.map((node: IndoorNode) => node.floor) ?? []),
    );
  }, [routeResult]);

  return {
    isOutdoorHandoffRoute,
    routeResult,
    routeSteps,
    currentStep,
    isLastStep,
    routeFloors,
  };
}
