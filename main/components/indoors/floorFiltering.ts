import { IndoorEdge, IndoorNode, IndoorGraphData } from "./types";

export function getFloorNodes(
  graphData: IndoorGraphData,
  floor: number | null,
): IndoorNode[] {
  if (floor === null) return [];
  return graphData.nodes.filter((node) => node.floor === floor);
}

export function getFloorEdges(
  nodes: IndoorNode[],
  edges: IndoorEdge[],
): IndoorEdge[] {
  const nodeIdsOnFloor = new Set(nodes.map((node) => node.id));
  return edges.filter(
    (edge) =>
      nodeIdsOnFloor.has(edge.source) && nodeIdsOnFloor.has(edge.target),
  );
}

export function getFloorData(
  graphData: IndoorGraphData,
  floor: number | null,
): { nodes: IndoorNode[]; edges: IndoorEdge[] } {
  if (!graphData) return { nodes: [], edges: [] };
  const nodes = getFloorNodes(graphData, floor);
  const edges = getFloorEdges(nodes, graphData.edges);
  return { nodes, edges };
}
