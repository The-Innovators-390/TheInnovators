import { indoorData } from "@/components/indoors/indoorData";
import type { IndoorNode } from "@/components/indoors/types";

/**
 * Given a building code (e.g., "H") and a room name (e.g., "820"),
 * find a matching IndoorNode by label.
 */
export function findRoomNode(
  buildingCode: string,
  roomName: string,
): IndoorNode | null {
  const data = indoorData[buildingCode];
  if (!data?.nodes) return null;

  const normalizedRoom = roomName.trim().toLowerCase();

  // Try exact match first
  const exactMatch = data.nodes.find(
    (node) =>
      node.type === "room" &&
      node.label?.trim().toLowerCase() === normalizedRoom,
  );
  if (exactMatch) return exactMatch;

  // Try partial match (e.g., room is "820", label is "H-820")
  const partialMatch = data.nodes.find(
    (node) =>
      node.type === "room" &&
      node.label?.trim().toLowerCase().includes(normalizedRoom),
  );

  return partialMatch ?? null;
}
