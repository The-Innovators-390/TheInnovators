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

  it("filters out inaccessible edges when requested", () => {
    const inaccessibleEdges: IndoorEdge[] = [
      {
        source: "A",
        target: "B",
        type: "corridor",
        weight: 1,
        accessible: false,
      },
      {
        source: "A",
        target: "C",
        type: "corridor",
        weight: 10,
        accessible: true,
      },
      {
        source: "C",
        target: "B",
        type: "corridor",
        weight: 1,
        accessible: true,
      },
    ];

    // With accessibility: true, it should avoid A-B
    const result = findShortestIndoorPath(nodes, inaccessibleEdges, "A", "B", {
      accessible: true,
    });

    expect(result).not.toBeNull();
    expect(result?.path.map((n) => n.id)).toEqual(["A", "C", "B"]);
    expect(result?.distance).toBe(11);

    // Without accessibility constraint, it should take A-B
    const resultNormal = findShortestIndoorPath(
      nodes,
      inaccessibleEdges,
      "A",
      "B",
    );
    expect(resultNormal?.path.map((n) => n.id)).toEqual(["A", "B"]);
    expect(resultNormal?.distance).toBe(1);
  });

  it("skips stair edges in accessible mode only", () => {
    const stairNodes: IndoorNode[] = [
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
      },
      {
        id: "C",
        type: "room",
        buildingId: "H",
        floor: 2,
        x: 1,
        y: 0,
        label: "C",
      },
    ];
    const stairEdges: IndoorEdge[] = [
      { source: "A", target: "B", type: "hallway", weight: 1 },
      {
        source: "B",
        target: "C",
        type: "stair",
        weight: 0,
        accessible: true,
      },
      { source: "A", target: "C", type: "elevator", weight: 50 },
    ];

    const normal = findShortestIndoorPath(stairNodes, stairEdges, "A", "C");
    expect(normal?.path.map((n) => n.id)).toEqual(["A", "B", "C"]);
    expect(normal?.distance).toBe(1);

    const acc = findShortestIndoorPath(stairNodes, stairEdges, "A", "C", {
      accessible: true,
    });
    expect(acc?.path.map((n) => n.id)).toEqual(["A", "C"]);
    expect(acc?.distance).toBe(50);
  });

  it("skips edges to nodes marked accessible false in accessible mode only", () => {
    const blockedNodes: IndoorNode[] = [
      {
        id: "X",
        type: "room",
        buildingId: "H",
        floor: 1,
        x: 0,
        y: 0,
        label: "X",
      },
      {
        id: "Y",
        type: "hallway",
        buildingId: "H",
        floor: 1,
        x: 1,
        y: 0,
      },
      {
        id: "Z",
        type: "stair_landing",
        buildingId: "H",
        floor: 1,
        x: 2,
        y: 0,
        accessible: false,
      },
      {
        id: "W",
        type: "room",
        buildingId: "H",
        floor: 1,
        x: 3,
        y: 0,
        label: "W",
      },
    ];
    const blockedEdges: IndoorEdge[] = [
      { source: "X", target: "Z", type: "hallway", weight: 1 },
      { source: "Z", target: "W", type: "hallway", weight: 1 },
      { source: "X", target: "Y", type: "hallway", weight: 5 },
      { source: "Y", target: "W", type: "hallway", weight: 5 },
    ];

    const normal = findShortestIndoorPath(blockedNodes, blockedEdges, "X", "W");
    expect(normal?.distance).toBe(2);
    expect(normal?.path.map((n) => n.id)).toEqual(["X", "Z", "W"]);

    const acc = findShortestIndoorPath(blockedNodes, blockedEdges, "X", "W", {
      accessible: true,
    });
    expect(acc?.distance).toBe(10);
    expect(acc?.path.map((n) => n.id)).toEqual(["X", "Y", "W"]);
  });
});
