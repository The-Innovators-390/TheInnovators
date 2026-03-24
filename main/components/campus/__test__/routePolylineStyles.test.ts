import {
  ROUTE_COLORS,
  baseSegmentKindForMode,
  colorForSegmentKind,
  dashPatternForSegmentKind,
  type RouteSegmentKind,
} from "@/components/campus/helper_methods/routePolylineStyles";

describe("routePolylineStyles", () => {
  describe("baseSegmentKindForMode", () => {
    it("returns walking for walking mode", () => {
      expect(baseSegmentKindForMode("walking")).toBe("walking");
    });

    it("returns bicycling for bicycling mode", () => {
      expect(baseSegmentKindForMode("bicycling")).toBe("bicycling");
    });

    it("returns shuttle for shuttle mode", () => {
      expect(baseSegmentKindForMode("shuttle")).toBe("shuttle");
    });

    it("returns bus for transit mode", () => {
      expect(baseSegmentKindForMode("transit")).toBe("bus");
    });

    it("returns driving for driving mode", () => {
      expect(baseSegmentKindForMode("driving")).toBe("driving");
    });

    it("returns driving for unsupported mode", () => {
      expect(baseSegmentKindForMode("something-else")).toBe("driving");
    });
  });

  describe("colorForSegmentKind", () => {
    const cases: Array<[RouteSegmentKind, string]> = [
      ["bus", ROUTE_COLORS.navy],
      ["metro-default", ROUTE_COLORS.navy],
      ["metro-1", ROUTE_COLORS.metroGreen],
      ["metro-2", ROUTE_COLORS.metroOrange],
      ["metro-4", ROUTE_COLORS.metroBlue],
      ["metro-5", ROUTE_COLORS.metroYellow],
      ["shuttle", ROUTE_COLORS.shuttleBurgundy],
      ["walking", ROUTE_COLORS.blue],
      ["bicycling", ROUTE_COLORS.blue],
      ["driving", ROUTE_COLORS.blue],
    ];

    it.each(cases)("returns correct color for %s", (kind, expected) => {
      expect(colorForSegmentKind(kind)).toBe(expected);
    });
  });

  describe("dashPatternForSegmentKind", () => {
    it("returns dashed pattern for walking", () => {
      expect(dashPatternForSegmentKind("walking")).toEqual([10, 8]);
    });

    it.each([
      "driving",
      "bicycling",
      "bus",
      "metro-1",
      "metro-2",
      "metro-4",
      "metro-5",
      "metro-default",
      "shuttle",
    ] as RouteSegmentKind[])("returns undefined for %s", (kind) => {
      expect(dashPatternForSegmentKind(kind)).toBeUndefined();
    });
  });
});
