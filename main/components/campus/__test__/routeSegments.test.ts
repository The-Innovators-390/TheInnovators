import {
  buildRouteRenderSegments,
  flattenRouteSegmentCoordinates,
} from "@/components/campus/helper_methods/routeSegments";
import type {
  DirectionRoute,
  DirectionStep,
  LatLng,
} from "@/components/campus/helper_methods/googleDirections";

jest.mock("@/components/campus/helper_methods/googleDirections", () => {
  return {
    decodePolyline: jest.fn(),
  };
});

import { decodePolyline } from "@/components/campus/helper_methods/googleDirections";

const mockedDecodePolyline = decodePolyline as jest.MockedFunction<
  typeof decodePolyline
>;

describe("routeSegments", () => {
  const p1: LatLng = { latitude: 45.1, longitude: -73.1 };
  const p2: LatLng = { latitude: 45.2, longitude: -73.2 };
  const p3: LatLng = { latitude: 45.3, longitude: -73.3 };
  const p4: LatLng = { latitude: 45.4, longitude: -73.4 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeStep(overrides: Partial<DirectionStep> = {}): DirectionStep {
    return {
      instruction: "step",
      distanceText: "1 km",
      durationText: "5 mins",
      start: p1,
      end: p2,
      ...overrides,
    };
  }

  function makeRoute(overrides: Partial<DirectionRoute> = {}): DirectionRoute {
    return {
      summary: "route",
      polyline: "overview-polyline",
      durationSec: 100,
      durationText: "1 min",
      distanceMeters: 1000,
      distanceText: "1 km",
      ...overrides,
    };
  }

  describe("buildRouteRenderSegments - default modes", () => {
    it("builds a driving segment from the overview polyline", () => {
      mockedDecodePolyline.mockReturnValue([p1, p2, p3]);

      const route = makeRoute();

      expect(buildRouteRenderSegments("driving", route)).toEqual([
        {
          coordinates: [p1, p2, p3],
          kind: "driving",
        },
      ]);

      expect(mockedDecodePolyline).toHaveBeenCalledWith("overview-polyline");
    });

    it("builds a bicycling segment", () => {
      mockedDecodePolyline.mockReturnValue([p1, p2]);

      const route = makeRoute();

      expect(buildRouteRenderSegments("bicycling", route)).toEqual([
        {
          coordinates: [p1, p2],
          kind: "bicycling",
        },
      ]);
    });

    it("returns empty array when default decoded polyline has less than 2 points", () => {
      mockedDecodePolyline.mockReturnValue([p1]);

      const route = makeRoute();

      expect(buildRouteRenderSegments("walking", route)).toEqual([]);
    });

    it("returns empty array when decodePolyline throws for default modes", () => {
      mockedDecodePolyline.mockImplementation(() => {
        throw new Error("bad polyline");
      });

      const route = makeRoute();

      expect(buildRouteRenderSegments("driving", route)).toEqual([]);
    });
  });

  describe("buildRouteRenderSegments - transit", () => {
    it("builds walking, bus, and metro segments correctly", () => {
      mockedDecodePolyline.mockImplementation((polyline?: string) => {
        switch (polyline) {
          case "walk":
            return [p1, p2];
          case "bus":
            return [p2, p3];
          case "metro1":
            return [p3, p4];
          default:
            return [];
        }
      });

      const route = makeRoute({
        steps: [
          makeStep({
            travelMode: "WALKING",
            polyline: "walk",
          }),
          makeStep({
            travelMode: "TRANSIT",
            transitVehicleType: "BUS",
            polyline: "bus",
          }),
          makeStep({
            travelMode: "TRANSIT",
            transitVehicleType: "SUBWAY",
            transitLineName: "Line 1 Green",
            polyline: "metro1",
          }),
        ],
      });

      expect(buildRouteRenderSegments("transit", route)).toEqual([
        { coordinates: [p1, p2], kind: "walking" },
        { coordinates: [p2, p3], kind: "bus" },
        { coordinates: [p3, p4], kind: "metro-1" },
      ]);
    });

    it("maps metro line names to metro-2, metro-4, metro-5 and default", () => {
      mockedDecodePolyline.mockImplementation((polyline?: string) => {
        switch (polyline) {
          case "m2":
            return [p1, p2];
          case "m4":
            return [p2, p3];
          case "m5":
            return [p3, p4];
          case "mX":
            return [p1, p4];
          default:
            return [];
        }
      });

      const route = makeRoute({
        steps: [
          makeStep({
            travelMode: "TRANSIT",
            transitVehicleType: "METRO",
            transitLineName: "2 Orange",
            polyline: "m2",
          }),
          makeStep({
            travelMode: "TRANSIT",
            transitVehicleType: "SUBWAY",
            transitLineName: "4",
            polyline: "m4",
          }),
          makeStep({
            travelMode: "TRANSIT",
            transitVehicleType: "SUBWAY",
            transitLineName: "5 Blue",
            polyline: "m5",
          }),
          makeStep({
            travelMode: "TRANSIT",
            transitVehicleType: "SUBWAY",
            transitLineName: "Unknown Metro",
            polyline: "mX",
          }),
        ],
      });

      expect(buildRouteRenderSegments("transit", route)).toEqual([
        { coordinates: [p1, p2], kind: "metro-2" },
        { coordinates: [p2, p3], kind: "metro-4" },
        { coordinates: [p3, p4], kind: "metro-5" },
        { coordinates: [p1, p4], kind: "metro-default" },
      ]);
    });

    it("skips walking segments that only connect metro to metro", () => {
      mockedDecodePolyline.mockImplementation((polyline?: string) => {
        switch (polyline) {
          case "metroA":
            return [p1, p2];
          case "walk-connection":
            return [p2, p3];
          case "metroB":
            return [p3, p4];
          default:
            return [];
        }
      });

      const route = makeRoute({
        steps: [
          makeStep({
            travelMode: "TRANSIT",
            transitVehicleType: "SUBWAY",
            transitLineName: "1",
            polyline: "metroA",
          }),
          makeStep({
            travelMode: "WALKING",
            polyline: "walk-connection",
          }),
          makeStep({
            travelMode: "TRANSIT",
            transitVehicleType: "METRO",
            transitLineName: "2",
            polyline: "metroB",
          }),
        ],
      });

      expect(buildRouteRenderSegments("transit", route)).toEqual([
        { coordinates: [p1, p2], kind: "metro-1" },
        { coordinates: [p3, p4], kind: "metro-2" },
      ]);
    });

    it("falls back to the overview transit polyline when no valid step segments exist", () => {
      mockedDecodePolyline.mockImplementation((polyline?: string) => {
        if (polyline === "overview-polyline") return [p1, p2, p3];
        return [];
      });

      const route = makeRoute({
        steps: [
          makeStep({
            travelMode: "TRANSIT",
            transitVehicleType: "BUS",
            polyline: "bad-step",
          }),
        ],
      });

      expect(buildRouteRenderSegments("transit", route)).toEqual([
        {
          coordinates: [p1, p2, p3],
          kind: "bus",
        },
      ]);
    });

    it("ignores step polylines that throw during decode", () => {
      mockedDecodePolyline.mockImplementation((polyline?: string) => {
        if (polyline === "bad") throw new Error("decode failed");
        if (polyline === "overview-polyline") return [p1, p2];
        return [];
      });

      const route = makeRoute({
        steps: [
          makeStep({
            travelMode: "TRANSIT",
            transitVehicleType: "BUS",
            polyline: "bad",
          }),
        ],
      });

      expect(buildRouteRenderSegments("transit", route)).toEqual([
        {
          coordinates: [p1, p2],
          kind: "bus",
        },
      ]);
    });
  });

  describe("buildRouteRenderSegments - shuttle", () => {
    it("builds shuttle segments from segmentPolylines", () => {
      mockedDecodePolyline.mockImplementation((polyline?: string) => {
        switch (polyline) {
          case "walk-to-stop":
            return [p1, p2];
          case "shuttle-ride":
            return [p2, p3];
          case "walk-destination":
            return [p3, p4];
          default:
            return [];
        }
      });

      const route = makeRoute({
        segmentPolylines: {
          walkToStop: "walk-to-stop",
          shuttle: "shuttle-ride",
          walkToDestination: "walk-destination",
        },
      } as any);

      expect(buildRouteRenderSegments("shuttle", route)).toEqual([
        { coordinates: [p1, p2], kind: "walking" },
        { coordinates: [p2, p3], kind: "shuttle" },
        { coordinates: [p3, p4], kind: "walking" },
      ]);
    });

    it("falls back to shuttle default polyline when segmentPolylines is missing", () => {
      mockedDecodePolyline.mockReturnValue([p1, p2, p3]);

      const route = makeRoute();

      expect(buildRouteRenderSegments("shuttle", route)).toEqual([
        {
          coordinates: [p1, p2, p3],
          kind: "shuttle",
        },
      ]);
    });

    it("falls back to shuttle default polyline when decoded segmentPolylines are invalid", () => {
      mockedDecodePolyline.mockImplementation((polyline?: string) => {
        if (polyline === "overview-polyline") return [p1, p2];
        return [p1];
      });

      const route = makeRoute({
        segmentPolylines: {
          walkToStop: "walk-to-stop",
          shuttle: "shuttle-ride",
          walkToDestination: "walk-destination",
        },
      } as any);

      expect(buildRouteRenderSegments("shuttle", route)).toEqual([
        {
          coordinates: [p1, p2],
          kind: "shuttle",
        },
      ]);
    });
  });

  describe("flattenRouteSegmentCoordinates", () => {
    it("flattens segments and avoids duplicating touching points after the first segment", () => {
      const segments = [
        { coordinates: [p1, p2, p3], kind: "walking" as const },
        { coordinates: [p3, p4], kind: "bus" as const },
        { coordinates: [p4, p1], kind: "metro-1" as const },
      ];

      expect(flattenRouteSegmentCoordinates(segments)).toEqual([
        p1,
        p2,
        p3,
        p4,
        p1,
      ]);
    });

    it("returns empty array for empty segments", () => {
      expect(flattenRouteSegmentCoordinates([])).toEqual([]);
    });
  });
});
