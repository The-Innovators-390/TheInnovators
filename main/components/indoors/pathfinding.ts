import type { IndoorEdge, IndoorNode } from "./types";

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

type AdjacencyEntry = {
  nodeId: string;
  weight: number;
};

type AdjacencyList = Map<string, AdjacencyEntry[]>;
type DistanceMap = Map<string, number>;
type PreviousMap = Map<string, string | null>;


const METERS_PER_COORD_UNIT = 0.35;

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

function ensureAdjacencyEntry(
  adjacency: AdjacencyList,
  nodeId: string,
): AdjacencyEntry[] {
  const existing = adjacency.get(nodeId);
  if (existing) return existing;

  const created: AdjacencyEntry[] = [];
  adjacency.set(nodeId, created);
  return created;
}

function addUndirectedEdge(
  adjacency: AdjacencyList,
  source: string,
  target: string,
  weight: number,
): void {
  ensureAdjacencyEntry(adjacency, source).push({ nodeId: target, weight });
  ensureAdjacencyEntry(adjacency, target).push({ nodeId: source, weight });
}

function buildAdjacencyList(
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  options?: IndoorRoutingOptions,
): AdjacencyList {
  const adjacency: AdjacencyList = new Map();
  const nodeMap = buildNodeMap(nodes);

  for (const edge of edges) {
    if (options?.accessible) {
      if (edge.accessible === false) continue;
      if (edge.type === "stair") continue;

      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);

      if (src?.accessible === false || tgt?.accessible === false) continue;
    }

    addUndirectedEdge(adjacency, edge.source, edge.target, edge.weight);
  }

  return adjacency;
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

function findClosestUnvisitedNode(
  unvisited: Set<string>,
  distances: DistanceMap,
): { nodeId: string | null; distance: number } {
  let closestNodeId: string | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const nodeId of unvisited) {
    const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
    if (distance < closestDistance) {
      closestDistance = distance;
      closestNodeId = nodeId;
    }
  }

  return { nodeId: closestNodeId, distance: closestDistance };
}

function relaxNeighbors(
  currentId: string,
  currentDistance: number,
  adjacency: AdjacencyList,
  unvisited: Set<string>,
  distances: DistanceMap,
  previous: PreviousMap,
): void {
  const neighbors = adjacency.get(currentId) ?? [];

  for (const neighbor of neighbors) {
    if (!unvisited.has(neighbor.nodeId)) continue;

    const candidateDistance = currentDistance + neighbor.weight;
    const knownDistance =
      distances.get(neighbor.nodeId) ?? Number.POSITIVE_INFINITY;

    if (candidateDistance < knownDistance) {
      distances.set(neighbor.nodeId, candidateDistance);
      previous.set(neighbor.nodeId, currentId);
    }
  }
}

function reconstructPathIds(
  previous: PreviousMap,
  startId: string,
  destinationId: string,
): string[] | null {
  const pathIds: string[] = [];
  let currentId: string | null = destinationId;

  while (currentId !== null) {
    pathIds.unshift(currentId);
    currentId = previous.get(currentId) ?? null;
  }

  return pathIds[0] === startId ? pathIds : null;
}

function runDijkstra(
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  startId: string,
  options?: IndoorRoutingOptions,
): {
  nodeMap: Map<string, IndoorNode>;
  distances: DistanceMap;
  previous: PreviousMap;
} | null {
  const nodeMap = buildNodeMap(nodes);
  if (!nodeMap.has(startId)) {
    return null;
  }

  const adjacency = buildAdjacencyList(nodes, edges, options);
  const distances: DistanceMap = new Map();
  const previous: PreviousMap = new Map();
  const unvisited = new Set<string>();

  for (const node of nodes) {
    distances.set(node.id, Number.POSITIVE_INFINITY);
    previous.set(node.id, null);
    unvisited.add(node.id);
  }

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    const { nodeId: currentId, distance: currentDistance } =
      findClosestUnvisitedNode(unvisited, distances);

    if (currentId === null || currentDistance === Number.POSITIVE_INFINITY) {
      break;
    }

    unvisited.delete(currentId);

    relaxNeighbors(
      currentId,
      currentDistance,
      adjacency,
      unvisited,
      distances,
      previous,
    );
  }

  return { nodeMap, distances, previous };
}

function formatFloor(floor: number): string {
  if (floor === 0) return "ground floor";
  if (floor === 1) return "1st floor";
  if (floor === 2) return "2nd floor";
  if (floor === 3) return "3rd floor";
  return `${floor}th floor`;
}

function getNodeFloor(node: IndoorNode): number {
  return typeof node.floor === "number" ? node.floor : 0;
}

function getNodeLabel(node: IndoorNode): string {
  return node.label?.trim() || "the destination";
}

function getTransportKind(
  current: IndoorNode,
  next: IndoorNode,
  edge?: IndoorEdge,
): "elevator" | "stairs" | null {
  const currentType = current.type?.toLowerCase?.() ?? "";
  const nextType = next.type?.toLowerCase?.() ?? "";
  const edgeType = edge?.type?.toLowerCase?.() ?? "";

  if (
    currentType.includes("elevator") ||
    nextType.includes("elevator") ||
    edgeType.includes("elevator")
  ) {
    return "elevator";
  }

  if (
    currentType.includes("stair") ||
    nextType.includes("stair") ||
    edgeType === "stair"
  ) {
    return "stairs";
  }

  return null;
}

function getNodeX(node: IndoorNode): number | null {
  const value = (node as IndoorNode & { x?: number }).x;
  return typeof value === "number" ? value : null;
}

function getNodeY(node: IndoorNode): number | null {
  const value = (node as IndoorNode & { y?: number }).y;
  return typeof value === "number" ? value : null;
}

function computeApproxMetersFromNodes(
  current: IndoorNode,
  next: IndoorNode,
): number | null {
  const x1 = getNodeX(current);
  const y1 = getNodeY(current);
  const x2 = getNodeX(next);
  const y2 = getNodeY(next);

  if (x1 === null || y1 === null || x2 === null || y2 === null) {
    return null;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const coordDistance = Math.sqrt(dx * dx + dy * dy);

  return coordDistance * METERS_PER_COORD_UNIT;
}

function computeDisplayMeters(
  current: IndoorNode,
  next: IndoorNode,
  edge?: IndoorEdge,
): number {
  const approxMeters = computeApproxMetersFromNodes(current, next);

  if (approxMeters !== null && Number.isFinite(approxMeters)) {
    return approxMeters;
  }

  return edge?.weight ?? 0;
}

function formatMeters(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return "";
  }

  if (distanceMeters < 10) {
    return `${Math.max(1, Math.round(distanceMeters))} m`;
  }

  return `${Math.round(distanceMeters / 5) * 5} m`;
}

function buildWalkInstruction(
  fromNode: IndoorNode,
  toNode: IndoorNode,
  distanceMeters: number,
  isFinalWalk: boolean,
): string {
  const toLabel = getNodeLabel(toNode);
  const fromLabel = getNodeLabel(fromNode);
  const formattedMeters = formatMeters(distanceMeters);

  if (isFinalWalk) {
    return formattedMeters
      ? `Continue for ${formattedMeters} to ${toLabel}`
      : `Proceed to ${toLabel}`;
  }

  if (toNode.type === "hallway" || toNode.type === "corridor") {
    return formattedMeters
      ? `Continue for ${formattedMeters}`
      : "Continue along the route";
  }

  if (fromLabel !== toLabel) {
    return formattedMeters
      ? `Continue for ${formattedMeters} toward ${toLabel}`
      : `Continue toward ${toLabel}`;
  }

  return formattedMeters
    ? `Continue for ${formattedMeters}`
    : "Continue along the route";
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

    steps.push({
      kind: "walk",
      instruction: buildWalkInstruction(
        fromNode,
        toNode,
        walkDistanceMeters,
        isFinalWalk,
      ),
      floor: getNodeFloor(fromNode),
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      distance: walkDistanceMeters,
    });

    walkDistanceMeters = 0;
    walkStartIndex = endIndex;
  };

  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    const edge = getEdgeBetween(edgeMap, current.id, next.id);
    const edgeDistanceMeters = computeDisplayMeters(current, next, edge);

    const isExitStep = next.type === "building_entry_exit";
    const currentFloor = getNodeFloor(current);
    const nextFloor = getNodeFloor(next);
    const floorChanged = currentFloor !== nextFloor;
    const transportKind = getTransportKind(current, next, edge);

    if (isExitStep) {
      flushWalkStep(i);

      steps.push({
        kind: "exit",
        instruction: "Exit the building",
        floor: currentFloor,
        fromNodeId: current.id,
        toNodeId: next.id,
        distance: edgeDistanceMeters,
      });

      walkStartIndex = i + 1;
      walkDistanceMeters = 0;
      continue;
    }

    if (floorChanged && transportKind) {
      flushWalkStep(i);

      steps.push({
        kind: transportKind,
        instruction:
          transportKind === "elevator"
            ? `Take the elevator to ${formatFloor(nextFloor)}`
            : `Take the stairs to ${formatFloor(nextFloor)}`,
        floor: currentFloor,
        fromNodeId: current.id,
        toNodeId: next.id,
        distance: edgeDistanceMeters,
      });

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
  const result = findShortestPathToBuildingExit(
    nodes,
    edges,
    startId,
    options,
  );

  if (!result) return null;

  return {
    ...result,
    steps: buildIndoorRouteSteps(result.path, edges),
  };
}