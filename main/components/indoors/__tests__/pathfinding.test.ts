import { findShortestIndoorPath } from "@/components/indoors/pathfinding";
import type { IndoorEdge, IndoorNode } from "@/components/indoors/types";

describe("findShortestIndoorPath", () => {
  const nodes: IndoorNode[] = [
    {
      id: "A",
      type: "room",
      buildingId: "H",
      floor: 1,
      x: 0,
      y: 0,
      label: "A",
    },
    {
      id: "B",
      type: "hallway",
      buildingId: "H",
      floor: 1,
      x: 1,
      y: 0,
      label: "B",
    },
    {
      id: "C",
      type: "hallway",
      buildingId: "H",
      floor: 1,
      x: 2,
      y: 0,
      label: "C",
    },
    {
      id: "D",
      type: "room",
      buildingId: "H",
      floor: 1,
      x: 3,
      y: 0,
      label: "D",
    },
    {
      id: "E",
      type: "room",
      buildingId: "H",
      floor: 1,
      x: 4,
      y: 0,
      label: "E",
    },
  ];

  const edges: IndoorEdge[] = [
    {
      source: "A",
      target: "B",
      type: "corridor",
      weight: 2,
    },
    {
      source: "B",
      target: "C",
      type: "corridor",
      weight: 2,
    },
    {
      source: "C",
      target: "D",
      type: "corridor",
      weight: 2,
    },
    {
      source: "A",
      target: "D",
      type: "corridor",
      weight: 10,
    },
  ];

  it("returns a single-node path when start and destination are the same", () => {
    const result = findShortestIndoorPath(nodes, edges, "A", "A");

    expect(result).toEqual({
      path: [nodes[0]],
      distance: 0,
    });
  });

  it("returns null when start node does not exist", () => {
    const result = findShortestIndoorPath(nodes, edges, "Z", "A");

    expect(result).toBeNull();
  });

  it("returns null when destination node does not exist", () => {
    const result = findShortestIndoorPath(nodes, edges, "A", "Z");

    expect(result).toBeNull();
  });

  it("returns the shortest path using Dijkstra", () => {
    const result = findShortestIndoorPath(nodes, edges, "A", "D");

    expect(result).not.toBeNull();
    expect(result?.distance).toBe(6);
    expect(result?.path.map((node) => node.id)).toEqual(["A", "B", "C", "D"]);
  });

  it("prefers the direct path when it is shorter", () => {
    const directEdges: IndoorEdge[] = [
      {
        source: "A",
        target: "B",
        type: "corridor",
        weight: 5,
      },
      {
        source: "B",
        target: "D",
        type: "corridor",
        weight: 5,
      },
      {
        source: "A",
        target: "D",
        type: "corridor",
        weight: 3,
      },
    ];

    const result = findShortestIndoorPath(nodes, directEdges, "A", "D");

    expect(result).not.toBeNull();
    expect(result?.distance).toBe(3);
    expect(result?.path.map((node) => node.id)).toEqual(["A", "D"]);
  });

  it("returns null when no path exists", () => {
    const disconnectedEdges: IndoorEdge[] = [
      {
        source: "A",
        target: "B",
        type: "corridor",
        weight: 1,
      },
      {
        source: "C",
        target: "D",
        type: "corridor",
        weight: 1,
      },
    ];

    const result = findShortestIndoorPath(nodes, disconnectedEdges, "A", "D");

    expect(result).toBeNull();
  });

  it("returns null when start equals destination but the node does not exist", () => {
    const result = findShortestIndoorPath(nodes, edges, "Z", "Z");

    expect(result).toBeNull();
  });
});
