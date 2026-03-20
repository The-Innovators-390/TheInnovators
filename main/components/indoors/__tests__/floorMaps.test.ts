import { floorMaps } from "../floorMaps";

describe("floorMaps", () => {
  it("contains all expected building keys", () => {
    expect(floorMaps).toHaveProperty("H");
    expect(floorMaps).toHaveProperty("CC");
    expect(floorMaps).toHaveProperty("MB");
    expect(floorMaps).toHaveProperty("VE");
    expect(floorMaps).toHaveProperty("VL");
  });

  it("contains the correct Hall floor mappings", () => {
    expect(floorMaps.H).toHaveProperty("1");
    expect(floorMaps.H).toHaveProperty("2");
    expect(floorMaps.H).toHaveProperty("8");
    expect(floorMaps.H).toHaveProperty("9");

    expect(floorMaps.H["1"]).toBeDefined();
    expect(floorMaps.H["2"]).toBeDefined();
    expect(floorMaps.H["8"]).toBeDefined();
    expect(floorMaps.H["9"]).toBeDefined();
  });

  it("contains the correct CC floor mappings", () => {
    expect(floorMaps.CC).toHaveProperty("1");
    expect(floorMaps.CC["1"]).toBeDefined();
  });

  it("contains the correct MB floor mappings", () => {
    expect(floorMaps.MB).toHaveProperty("-2");
    expect(floorMaps.MB).toHaveProperty("1");

    expect(floorMaps.MB["-2"]).toBeDefined();
    expect(floorMaps.MB["1"]).toBeDefined();
  });

  it("contains the correct VE floor mappings", () => {
    expect(floorMaps.VE).toHaveProperty("1");
    expect(floorMaps.VE).toHaveProperty("2");

    expect(floorMaps.VE["1"]).toBeDefined();
    expect(floorMaps.VE["2"]).toBeDefined();
  });

  it("contains the correct VL floor mappings", () => {
    expect(floorMaps.VL).toHaveProperty("1");
    expect(floorMaps.VL).toHaveProperty("2");

    expect(floorMaps.VL["1"]).toBeDefined();
    expect(floorMaps.VL["2"]).toBeDefined();
  });
});
