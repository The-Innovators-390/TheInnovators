import type { IndoorEdge, IndoorNode } from "@/components/indoors/types";

type AdjacencyEntry = {
  nodeId: string;
  weight: number;
};

export type AdjacencyList = Map<string, AdjacencyEntry[]>;
export type DistanceMap = Map<string, number>;
export type PreviousMap = Map<string, string | null>;

type GraphRoutingOptions = {
  accessible?: boolean;
};

type GraphEdgePolicy = {
  allows: (edge: IndoorEdge) => boolean;
};

function buildNodeMap(nodes: IndoorNode[]): Map<string, IndoorNode> {
  return new Map(nodes.map((node) => [node.id, node]));
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

function createGraphEdgePolicy(
  nodeMap: Map<string, IndoorNode>,
  options?: GraphRoutingOptions,
): GraphEdgePolicy {
  return {
    allows: (edge: IndoorEdge) => {
      if (!options?.accessible) return true;
      if (edge.accessible === false) return false;
      if (edge.type === "stair") return false;

      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (
        sourceNode?.accessible === false ||
        targetNode?.accessible === false
      ) {
        return false;
      }

      return true;
    },
  };
}

function buildAdjacencyList(
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  options?: GraphRoutingOptions,
): AdjacencyList {
  const adjacency: AdjacencyList = new Map();
  const nodeMap = buildNodeMap(nodes);
  const policy = createGraphEdgePolicy(nodeMap, options);

  for (const edge of edges) {
    if (!policy.allows(edge)) continue;

    addUndirectedEdge(adjacency, edge.source, edge.target, edge.weight);
  }

  return adjacency;
}

export function findClosestUnvisitedNode(
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

export function relaxNeighbors(
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

export function reconstructPathIds(
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

export function runDijkstra(
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  startId: string,
  options?: GraphRoutingOptions,
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
