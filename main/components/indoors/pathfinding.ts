import type { IndoorEdge, IndoorNode } from "./types";
import {
  buildWalkInstruction,
  computeDisplayMeters,
  formatFloor,
  getNodeFloor,
  getTransportKind,
} from "./indoorNavigationUtils";
import { reconstructPathIds, runDijkstra } from "@/utils/graph";

export interface IndoorPathResult {
  path: IndoorNode[];
  distance: number;
}

export interface IndoorRoutingOptions {
  accessible?: boolean;
}

export type IndoorStepKind = "walk" | "elevator" | "stairs" | "exit";

export interface IndoorRouteStep {
  kind: IndoorStepKind;
  instruction: string;
  floor: number;
  fromNodeId: string;
  toNodeId: string;
  distance: number; // display distance in meters
}

export interface IndoorPathWithStepsResult extends IndoorPathResult {
  steps: IndoorRouteStep[];
}

function buildNodeMap(nodes: IndoorNode[]): Map<string, IndoorNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

function buildEdgeMap(edges: IndoorEdge[]): Map<string, IndoorEdge> {
  const edgeMap = new Map<string, IndoorEdge>();

  for (const edge of edges) {
    edgeMap.set(`${edge.source}__${edge.target}`, edge);
    edgeMap.set(`${edge.target}__${edge.source}`, edge);
  }

  return edgeMap;
}

function getEdgeBetween(
  edgeMap: Map<string, IndoorEdge>,
  sourceId: string,
  targetId: string,
): IndoorEdge | undefined {
  return edgeMap.get(`${sourceId}__${targetId}`);
}

function buildSingleNodePath(
  nodes: IndoorNode[],
  nodeId: string,
): IndoorPathResult | null {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) return null;

  return {
    path: [node],
    distance: 0,
  };
}

function buildWalkStep(
  fromNode: IndoorNode,
  toNode: IndoorNode,
  distance: number,
  isFinalWalk: boolean,
): IndoorRouteStep {
  return {
    kind: "walk",
    instruction: buildWalkInstruction(fromNode, toNode, distance, isFinalWalk),
    floor: getNodeFloor(fromNode),
    fromNodeId: fromNode.id,
    toNodeId: toNode.id,
    distance,
  };
}

function buildExitStep(
  current: IndoorNode,
  next: IndoorNode,
  distance: number,
): IndoorRouteStep {
  return {
    kind: "exit",
    instruction: "Exit the building",
    floor: getNodeFloor(current),
    fromNodeId: current.id,
    toNodeId: next.id,
    distance,
  };
}

function buildTransportStep(
  current: IndoorNode,
  next: IndoorNode,
  distance: number,
  transportKind: "elevator" | "stairs",
): IndoorRouteStep {
  const nextFloor = getNodeFloor(next);
  return {
    kind: transportKind,
    instruction: buildTransportInstruction(transportKind, nextFloor),
    floor: getNodeFloor(current),
    fromNodeId: current.id,
    toNodeId: next.id,
    distance,
  };
}

function buildTransportInstruction(
  kind: "elevator" | "stairs",
  nextFloor: number,
): string {
  return kind === "elevator"
    ? `Take the elevator to ${formatFloor(nextFloor)}`
    : `Take the stairs to ${formatFloor(nextFloor)}`;
}

function getSegmentTransport(
  current: IndoorNode,
  next: IndoorNode,
  edge?: IndoorEdge,
): "elevator" | "stairs" | null {
  if (getNodeFloor(current) === getNodeFloor(next)) return null;
  return getTransportKind(current, next, edge);
}

export function buildIndoorRouteSteps(
  path: IndoorNode[],
  edges: IndoorEdge[],
): IndoorRouteStep[] {
  if (path.length < 2) return [];

  const edgeMap = buildEdgeMap(edges);
  const steps: IndoorRouteStep[] = [];

  let walkStartIndex = 0;
  let walkDistanceMeters = 0;

  const flushWalkStep = (endIndex: number) => {
    if (endIndex <= walkStartIndex) return;

    const fromNode = path[walkStartIndex];
    const toNode = path[endIndex];
    const isFinalWalk = endIndex === path.length - 1;

    steps.push(
      buildWalkStep(fromNode, toNode, walkDistanceMeters, isFinalWalk),
    );

    walkDistanceMeters = 0;
    walkStartIndex = endIndex;
  };

  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    const edge = getEdgeBetween(edgeMap, current.id, next.id);
    const edgeDistanceMeters = computeDisplayMeters(current, next, edge);

    const isExitStep = next.type === "building_entry_exit";
    const segmentTransport = getSegmentTransport(current, next, edge);

    if (isExitStep) {
      flushWalkStep(i);

      steps.push(buildExitStep(current, next, edgeDistanceMeters));

      walkStartIndex = i + 1;
      walkDistanceMeters = 0;
      continue;
    }

    if (segmentTransport) {
      flushWalkStep(i);

      steps.push(
        buildTransportStep(current, next, edgeDistanceMeters, segmentTransport),
      );

      walkStartIndex = i + 1;
      walkDistanceMeters = 0;
      continue;
    }

    walkDistanceMeters += edgeDistanceMeters;
  }

  flushWalkStep(path.length - 1);

  return steps;
}

export function findShortestIndoorPath(
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  startId: string,
  destinationId: string,
  options?: IndoorRoutingOptions,
): IndoorPathResult | null {
  if (startId === destinationId) {
    return buildSingleNodePath(nodes, startId);
  }

  const dijkstra = runDijkstra(nodes, edges, startId, options);
  if (!dijkstra) return null;

  const { nodeMap, distances, previous } = dijkstra;

  if (!nodeMap.has(destinationId)) {
    return null;
  }

  const finalDistance =
    distances.get(destinationId) ?? Number.POSITIVE_INFINITY;
  if (finalDistance === Number.POSITIVE_INFINITY) return null;

  const pathIds = reconstructPathIds(previous, startId, destinationId);
  if (!pathIds) return null;

  const path = pathIds
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is IndoorNode => node !== undefined);

  return path.length === pathIds.length
    ? { path, distance: finalDistance }
    : null;
}

export function findShortestIndoorPathWithSteps(
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  startId: string,
  destinationId: string,
  options?: IndoorRoutingOptions,
): IndoorPathWithStepsResult | null {
  const result = findShortestIndoorPath(
    nodes,
    edges,
    startId,
    destinationId,
    options,
  );

  if (!result) return null;

  return {
    ...result,
    steps: buildIndoorRouteSteps(result.path, edges),
  };
}

export function findShortestPathToBuildingExit(
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  startId: string,
  options?: IndoorRoutingOptions,
): IndoorPathResult | null {
  const dijkstra = runDijkstra(nodes, edges, startId, options);
  if (!dijkstra) return null;

  const { nodeMap, distances, previous } = dijkstra;

  const exitCandidates = nodes.filter(
    (node) => node.type === "building_entry_exit",
  );

  if (exitCandidates.length === 0) {
    return null;
  }

  let bestExit: IndoorNode | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const exitNode of exitCandidates) {
    const distance = distances.get(exitNode.id) ?? Number.POSITIVE_INFINITY;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestExit = exitNode;
    }
  }

  if (!bestExit || bestDistance === Number.POSITIVE_INFINITY) {
    return null;
  }

  const pathIds = reconstructPathIds(previous, startId, bestExit.id);
  if (!pathIds) return null;

  const path = pathIds
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is IndoorNode => node !== undefined);

  return path.length === pathIds.length
    ? { path, distance: bestDistance }
    : null;
}

export function findShortestPathToBuildingExitWithSteps(
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  startId: string,
  options?: IndoorRoutingOptions,
): IndoorPathWithStepsResult | null {
  const result = findShortestPathToBuildingExit(nodes, edges, startId, options);

  if (!result) return null;

  return {
    ...result,
    steps: buildIndoorRouteSteps(result.path, edges),
  };
}
