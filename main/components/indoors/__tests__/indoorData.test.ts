import { indoorData } from "../indoorData";

describe("indoorData", () => {
  it("should have data for expected buildings", () => {
    expect(indoorData).toHaveProperty("H");
    expect(indoorData).toHaveProperty("CC");
    expect(indoorData).toHaveProperty("MB");
    expect(indoorData).toHaveProperty("VE");
    expect(indoorData).toHaveProperty("VL");
  });

  it("should have valid graph data structure for each building", () => {
    Object.entries(indoorData).forEach(([buildingId, data]) => {
      expect(data).toHaveProperty("meta");
      expect(data.meta.buildingId.toLowerCase()).toBe(
        buildingId === "H" ? "hall" : buildingId.toLowerCase(),
      );

      expect(data).toHaveProperty("nodes");
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(data.nodes.length).toBeGreaterThan(0);

      expect(data).toHaveProperty("edges");
      expect(Array.isArray(data.edges)).toBe(true);
    });
  });
});
