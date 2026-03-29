import { indoorData } from "@/components/indoors/indoorData";
import { findShortestIndoorPath } from "@/components/indoors/pathfinding";
import type { IndoorEdge, IndoorNode } from "@/components/indoors/types";

function pathUsesStairEdge(
  path: IndoorNode[],
  edges: IndoorEdge[],
): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i].id;
    const b = path[i + 1].id;
    const edge = edges.find(
      (e) =>
        (e.source === a && e.target === b) ||
        (e.source === b && e.target === a),
    );
    if (edge?.type === "stair") return true;
  }
  return false;
}

describe("findShortestIndoorPath (Hall building graph)", () => {
  const { nodes, edges } = indoorData.H;

  it("finds an accessible cross-floor path with no stair edges", () => {
    const result = findShortestIndoorPath(
      nodes,
      edges,
      "Hall_F2_room_143",
      "Hall_F9_room_202",
      { accessible: true },
    );

    expect(result).not.toBeNull();
    expect(pathUsesStairEdge(result!.path, edges)).toBe(false);
    expect(
      result!.path.some((n) => n.id.includes("elevator")),
    ).toBe(true);
  });

  it("standard mode still returns a path for the same endpoints", () => {
    const result = findShortestIndoorPath(
      nodes,
      edges,
      "Hall_F2_room_143",
      "Hall_F9_room_202",
    );

    expect(result).not.toBeNull();
    expect(result!.path.length).toBeGreaterThan(1);
  });
});
