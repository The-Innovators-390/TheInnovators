import {
  buildIndoorRouteSteps,
  findShortestIndoorPath,
  findShortestIndoorPathWithSteps,
  findShortestPathToBuildingExit,
  findShortestPathToBuildingExitWithSteps,
} from "@/components/indoors/pathfinding";
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
});

describe("indoor route steps", () => {
  it("builds an exit step when path ends at building exit", () => {
    const nodes: IndoorNode[] = [
      {
        id: "A",
        type: "room",
        buildingId: "H",
        floor: 1,
        x: 0,
        y: 0,
        label: "Start",
      },
      {
        id: "B",
        type: "hallway",
        buildingId: "H",
        floor: 1,
        x: 10,
        y: 0,
        label: "Hall",
      },
      {
        id: "EXIT",
        type: "building_entry_exit",
        buildingId: "H",
        floor: 1,
        x: 20,
        y: 0,
        label: "Exit",
      },
    ];

    const edges: IndoorEdge[] = [
      { source: "A", target: "B", type: "corridor", weight: 7 },
      { source: "B", target: "EXIT", type: "corridor", weight: 3 },
    ];

    const steps = buildIndoorRouteSteps(nodes, edges);
    expect(steps.map((s) => s.kind)).toEqual(["walk", "exit"]);
    expect(steps[1].instruction).toBe("Exit the building");
    expect(steps[1].fromNodeId).toBe("B");
    expect(steps[1].toNodeId).toBe("EXIT");
  });

  it("builds elevator/stairs steps on floor change and formats floors", () => {
    const nodes: IndoorNode[] = [
      {
        id: "A",
        type: "room",
        buildingId: "H",
        floor: 0,
        x: 0,
        y: 0,
        label: "Start",
      },
      {
        id: "EL",
        type: "elevator",
        buildingId: "H",
        floor: 2,
        x: 0,
        y: 10,
        label: "Elevator",
      },
      {
        id: "L2",
        type: "hallway",
        buildingId: "H",
        floor: 2,
        x: 0,
        y: 20,
        label: "Level 2",
      },
      {
        id: "ST",
        type: "stair",
        buildingId: "H",
        floor: 3,
        x: 0,
        y: 25,
        label: "Stairs",
      },
      {
        id: "DEST",
        type: "room",
        buildingId: "H",
        floor: 3,
        x: 0,
        y: 30,
        label: "Destination",
      },
    ];

    const edges: IndoorEdge[] = [
      { source: "A", target: "EL", type: "path", weight: 1 },
      { source: "EL", target: "L2", type: "path", weight: 1 },
      { source: "L2", target: "ST", type: "stair", weight: 1 },
      { source: "ST", target: "DEST", type: "path", weight: 1 },
    ];

    const steps = buildIndoorRouteSteps(nodes, edges);

    expect(steps.map((s) => s.kind)).toEqual([
      "elevator",
      "walk",
      "stairs",
      "walk",
    ]);
    expect(steps[0].instruction).toContain("2nd floor");
    expect(steps[2].instruction).toContain("3rd floor");
  });

  it("falls back to edge weight when node coordinates are missing", () => {
    const nodes: IndoorNode[] = [
      {
        id: "A",
        type: "room",
        buildingId: "H",
        floor: 1,
        label: "A",
      } as IndoorNode,
      {
        id: "B",
        type: "room",
        buildingId: "H",
        floor: 1,
        label: "B",
      } as IndoorNode,
    ];

    const edges: IndoorEdge[] = [
      { source: "A", target: "B", type: "path", weight: 4 },
    ];

    const steps = buildIndoorRouteSteps(nodes, edges);
    expect(steps).toHaveLength(1);
    expect(steps[0].kind).toBe("walk");
    expect(steps[0].distance).toBe(4);
    expect(steps[0].instruction).toContain("4 m");
  });
});

describe("indoor path helpers with steps", () => {
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
      id: "EXIT",
      type: "building_entry_exit",
      buildingId: "H",
      floor: 1,
      x: 2,
      y: 0,
      label: "Exit",
    },
  ];

  const edges: IndoorEdge[] = [
    { source: "A", target: "B", type: "corridor", weight: 1 },
    { source: "B", target: "EXIT", type: "corridor", weight: 1 },
  ];

  it("returns shortest path with steps", () => {
    const result = findShortestIndoorPathWithSteps(nodes, edges, "A", "EXIT");
    expect(result?.path.map((n) => n.id)).toEqual(["A", "B", "EXIT"]);
    expect(result?.steps.map((s) => s.kind)).toEqual(["walk", "exit"]);
  });

  it("finds shortest path to a building exit", () => {
    const result = findShortestPathToBuildingExit(nodes, edges, "A");
    expect(result?.path.map((n) => n.id)).toEqual(["A", "B", "EXIT"]);
  });

  it("returns null when there are no exit candidates", () => {
    const noExitNodes: IndoorNode[] = [
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
    ];
    const result = findShortestPathToBuildingExit(noExitNodes, edges, "A");
    expect(result).toBeNull();
  });

  it("returns path to best reachable exit with steps", () => {
    const moreNodes: IndoorNode[] = [
      ...nodes,
      {
        id: "EXIT2",
        type: "building_entry_exit",
        buildingId: "H",
        floor: 1,
        x: 100,
        y: 0,
        label: "Exit2",
      },
    ];
    const moreEdges: IndoorEdge[] = [
      ...edges,
      { source: "A", target: "EXIT2", type: "corridor", weight: 50 },
    ];

    const result = findShortestPathToBuildingExitWithSteps(
      moreNodes,
      moreEdges,
      "A",
    );
    expect(result?.path.map((n) => n.id)).toEqual(["A", "B", "EXIT"]);
    expect(result?.steps.some((s) => s.kind === "exit")).toBe(true);
  });
});
