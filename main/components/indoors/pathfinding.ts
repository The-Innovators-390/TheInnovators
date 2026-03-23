import type { IndoorEdge, IndoorNode } from "./types";

export interface IndoorPathResult {
  path: IndoorNode[];
  distance: number;
}

type AdjacencyEntry = {
  nodeId: string;
  weight: number;
};

type AdjacencyList = Map<string, AdjacencyEntry[]>;
type DistanceMap = Map<string, number>;
type PreviousMap = Map<string, string | null>;

function buildNodeMap(nodes: IndoorNode[]): Map<string, IndoorNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

function ensureAdjacencyEntry(
  adjacency: AdjacencyList,
  nodeId: string,
): AdjacencyEntry[] {
  const existing = adjacency.get(nodeId);

  if (existing) {
    return existing;
  }

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
  ensureAdjacencyEntry(adjacency, source).push({
    nodeId: target,
    weight,
  });

  ensureAdjacencyEntry(adjacency, target).push({
    nodeId: source,
    weight,
  });
}

export interface IndoorRoutingOptions {
  accessible?: boolean;
}

function buildAdjacencyList(
  edges: IndoorEdge[],
  options?: IndoorRoutingOptions,
): AdjacencyList {
  const adjacency: AdjacencyList = new Map();

  for (const edge of edges) {
    if (options?.accessible && edge.accessible === false) {
      continue;
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

  if (!node) {
    return null;
  }

  return {
    path: [node],
    distance: 0,
  };
}

function hasRequiredEndpoints(
  nodeMap: Map<string, IndoorNode>,
  startId: string,
  destinationId: string,
): boolean {
  return nodeMap.has(startId) && nodeMap.has(destinationId);
}

function initializeDijkstraState(
  nodes: IndoorNode[],
  startId: string,
): {
  distances: DistanceMap;
  previous: PreviousMap;
  unvisited: Set<string>;
} {
  const distances: DistanceMap = new Map();
  const previous: PreviousMap = new Map();
  const unvisited = new Set<string>();

  for (const node of nodes) {
    distances.set(node.id, Number.POSITIVE_INFINITY);
    previous.set(node.id, null);
    unvisited.add(node.id);
  }

  distances.set(startId, 0);

  return {
    distances,
    previous,
    unvisited,
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

  return {
    nodeId: closestNodeId,
    distance: closestDistance,
  };
}

function shouldStopTraversal(
  currentId: string | null,
  currentDistance: number,
  destinationId: string,
): boolean {
  return (
    currentId === null ||
    currentDistance === Number.POSITIVE_INFINITY ||
    currentId === destinationId
  );
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
    if (!unvisited.has(neighbor.nodeId)) {
      continue;
    }

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

  if (pathIds[0] !== startId) {
    return null;
  }

  return pathIds;
}

function buildPathFromIds(
  pathIds: string[],
  nodeMap: Map<string, IndoorNode>,
): IndoorNode[] | null {
  const path = pathIds
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is IndoorNode => node !== undefined);

  if (path.length !== pathIds.length) {
    return null;
  }

  return path;
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

  const nodeMap = buildNodeMap(nodes);

  if (!hasRequiredEndpoints(nodeMap, startId, destinationId)) {
    return null;
  }

  const adjacency = buildAdjacencyList(edges, options);
  const { distances, previous, unvisited } = initializeDijkstraState(
    nodes,
    startId,
  );

  while (unvisited.size > 0) {
    const { nodeId: currentId, distance: currentDistance } =
      findClosestUnvisitedNode(unvisited, distances);

    if (currentId === null || currentDistance === Number.POSITIVE_INFINITY) {
      break;
    }

    if (currentId === destinationId) {
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

  const finalDistance =
    distances.get(destinationId) ?? Number.POSITIVE_INFINITY;

  if (finalDistance === Number.POSITIVE_INFINITY) {
    return null;
  }

  const pathIds = reconstructPathIds(previous, startId, destinationId);

  if (!pathIds) {
    return null;
  }

  const path = buildPathFromIds(pathIds, nodeMap);

  if (!path) {
    return null;
  }

  return {
    path,
    distance: finalDistance,
  };
}
