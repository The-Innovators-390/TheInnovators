import { getFloorNodes, getFloorEdges, getFloorData } from "../floorFiltering";
import { IndoorGraphData } from "../types";

const mockGraphData: IndoorGraphData = {
  meta: { buildingId: "TEST" },
  nodes: [
    { id: "n1", type: "room", buildingId: "TEST", floor: 1, x: 1, y: 1 },
    { id: "n2", type: "room", buildingId: "TEST", floor: 1, x: 2, y: 2 },
    { id: "n3", type: "room", buildingId: "TEST", floor: 2, x: 3, y: 3 },
  ],
  edges: [
    { source: "n1", target: "n2", type: "path", weight: 1 },
    { source: "n2", target: "n3", type: "path", weight: 1 },
  ],
};

describe("floorFiltering", () => {
  test("getFloorNodes filters nodes by floor", () => {
    const nodes = getFloorNodes(mockGraphData, 1);
    expect(nodes).toHaveLength(2);
    expect(nodes.every((n) => n.floor === 1)).toBe(true);
  });

  test("getFloorNodes returns empty array if floor is null", () => {
    const nodes = getFloorNodes(mockGraphData, null);
    expect(nodes).toEqual([]);
  });

  test("getFloorEdges filters edges by nodes on floor", () => {
    const nodesOnFloor1 = getFloorNodes(mockGraphData, 1);
    const edges = getFloorEdges(nodesOnFloor1, mockGraphData.edges);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe("n1");
    expect(edges[0].target).toBe("n2");
  });

  test("getFloorData returns filtered nodes and edges", () => {
    const data = getFloorData(mockGraphData, 1);
    expect(data.nodes).toHaveLength(2);
    expect(data.edges).toHaveLength(1);
  });

  test("getFloorData returns empty data if graphData is null", () => {
    // @ts-ignore
    const data = getFloorData(null, 1);
    expect(data).toEqual({ nodes: [], edges: [] });
  });
});
