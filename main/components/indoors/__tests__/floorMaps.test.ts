import { floorMaps } from "../floorMaps";

describe("floorMaps", () => {
  it("should have mappings for expected buildings", () => {
    expect(floorMaps).toHaveProperty("H");
    expect(floorMaps).toHaveProperty("CC");
    expect(floorMaps).toHaveProperty("MB");
    expect(floorMaps).toHaveProperty("VE");
    expect(floorMaps).toHaveProperty("VL");
  });

  it("should have at least one floor for each building", () => {
    Object.values(floorMaps).forEach((floors) => {
      expect(Object.keys(floors).length).toBeGreaterThan(0);
    });
  });

  it("should have MB-S2 floor for MB building", () => {
    expect(floorMaps.MB).toHaveProperty("-2");
  });
});
