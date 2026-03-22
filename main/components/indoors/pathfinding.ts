import type { IndoorEdge, IndoorNode } from "./types";

export interface IndoorPathResult {
  path: IndoorNode[];
  distance: number;
}

function buildNodeMap(nodes: IndoorNode[]): Map<string, IndoorNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

function buildAdjacencyList(
  edges: IndoorEdge[],
): Map<string, Array<{ nodeId: string; weight: number }>> {
  const adjacency = new Map<
    string,
    Array<{ nodeId: string; weight: number }>
  >();

  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    if (!adjacency.has(edge.target)) {
      adjacency.set(edge.target, []);
    }

    adjacency.get(edge.source)!.push({
      nodeId: edge.target,
      weight: edge.weight,
    });

    adjacency.get(edge.target)!.push({
      nodeId: edge.source,
      weight: edge.weight,
    });
  }

  return adjacency;
}

export function findShortestIndoorPath(
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  startId: string,
  destinationId: string,
): IndoorPathResult | null {
  if (startId === destinationId) {
    const node = nodes.find((item) => item.id === startId);
    if (!node) {
      return null;
    }

    return {
      path: [node],
      distance: 0,
    };
  }

  const nodeMap = buildNodeMap(nodes);
  if (!nodeMap.has(startId) || !nodeMap.has(destinationId)) {
    return null;
  }

  const adjacency = buildAdjacencyList(edges);
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const node of nodes) {
    distances.set(node.id, Number.POSITIVE_INFINITY);
    previous.set(node.id, null);
    unvisited.add(node.id);
  }

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let currentId: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    for (const nodeId of unvisited) {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (distance < currentDistance) {
        currentDistance = distance;
        currentId = nodeId;
      }
    }

    if (currentId === null || currentDistance === Number.POSITIVE_INFINITY) {
      break;
    }

    if (currentId === destinationId) {
      break;
    }

    unvisited.delete(currentId);

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

  const finalDistance =
    distances.get(destinationId) ?? Number.POSITIVE_INFINITY;

  if (finalDistance === Number.POSITIVE_INFINITY) {
    return null;
  }

  const pathIds: string[] = [];
  let currentId: string | null = destinationId;

  while (currentId !== null) {
    pathIds.unshift(currentId);
    currentId = previous.get(currentId) ?? null;
  }

  if (pathIds[0] !== startId) {
    return null;
  }

  const path = pathIds
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is IndoorNode => node !== undefined);

  return {
    path,
    distance: finalDistance,
  };
}
