import type { IndoorEdge, IndoorNode } from "./types";

const METERS_PER_COORD_UNIT = 0.35;

export function formatFloor(floor: number): string {
  if (floor === 0) return "ground floor";
  if (floor === 1) return "1st floor";
  if (floor === 2) return "2nd floor";
  if (floor === 3) return "3rd floor";
  return `${floor}th floor`;
}

export function formatMeters(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return "";
  }

  if (distanceMeters < 10) {
    return `${Math.max(1, Math.round(distanceMeters))} m`;
  }

  return `${Math.round(distanceMeters / 5) * 5} m`;
}

export function getNodeFloor(node: IndoorNode): number {
  return typeof node.floor === "number" ? node.floor : 0;
}

export function getNodeLabel(node: IndoorNode): string {
  return node.label?.trim() || "the destination";
}

export function getTransportKind(
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

export function getNodeX(node: IndoorNode): number | null {
  const value = (node as IndoorNode & { x?: number }).x;
  return typeof value === "number" ? value : null;
}

export function getNodeY(node: IndoorNode): number | null {
  const value = (node as IndoorNode & { y?: number }).y;
  return typeof value === "number" ? value : null;
}

export function computeApproxMetersFromNodes(
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
  const coordDistance = Math.hypot(dx, dy);

  return coordDistance * METERS_PER_COORD_UNIT;
}

export function computeDisplayMeters(
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

export function buildWalkInstruction(
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
