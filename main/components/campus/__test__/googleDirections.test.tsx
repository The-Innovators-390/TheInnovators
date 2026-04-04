import type {
  DirectionRoute,
  LatLng,
} from "../helper_methods/googleDirections";
import {
  decodePolyline,
  fetchDirections,
  pickFastestRoute,
} from "../helper_methods/googleDirections";
import { RouteStrategyFactory } from "../helper_methods/RouteStrategyFactory";

jest.mock("../helper_methods/RouteStrategyFactory", () => ({
  RouteStrategyFactory: {
    create: jest.fn(),
  },
}));

describe("googleDirections.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("pickFastestRoute", () => {
    it("returns null for empty routes", () => {
      expect(pickFastestRoute([])).toBeNull();
    });

    it("returns the first route (assumes list already sorted)", () => {
      const routes: DirectionRoute[] = [
        {
          summary: "A",
          polyline: "polyA",
          durationSec: 10,
          durationText: "10s",
          distanceMeters: 100,
          distanceText: "0.1km",
        },
        {
          summary: "B",
          polyline: "polyB",
          durationSec: 20,
          durationText: "20s",
          distanceMeters: 200,
          distanceText: "0.2km",
        },
      ];

      expect(pickFastestRoute(routes)?.summary).toBe("A");
    });
  });

  describe("decodePolyline", () => {
    it("decodes a known Google encoded polyline example", () => {
      const encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
      const coords = decodePolyline(encoded);

      expect(coords).toHaveLength(3);

      expect(coords[0].latitude).toBeCloseTo(38.5, 5);
      expect(coords[0].longitude).toBeCloseTo(-120.2, 5);

      expect(coords[1].latitude).toBeCloseTo(40.7, 5);
      expect(coords[1].longitude).toBeCloseTo(-120.95, 5);

      expect(coords[2].latitude).toBeCloseTo(43.252, 5);
      expect(coords[2].longitude).toBeCloseTo(-126.453, 5);
    });

    it("returns empty array for empty string", () => {
      expect(decodePolyline("")).toEqual([]);
    });
  });

  describe("fetchDirections", () => {
    it("delegates to RouteStrategyFactory.create() then fetchRoutes()", async () => {
      const origin: LatLng = { latitude: 1, longitude: 2 };
      const destination: LatLng = { latitude: 3, longitude: 4 };

      const mockedRoutes: DirectionRoute[] = [
        {
          summary: "Route 1",
          polyline: "abc",
          durationSec: 123,
          durationText: "2 mins",
          distanceMeters: 456,
          distanceText: "0.4 km",
        },
      ];

      const fetchRoutes = jest.fn().mockResolvedValue(mockedRoutes);
      (RouteStrategyFactory.create as jest.Mock).mockReturnValue({
        fetchRoutes,
      });

      const res = await fetchDirections({
        origin,
        destination,
        mode: "walking",
      });

      expect(RouteStrategyFactory.create).toHaveBeenCalledWith("walking");
      expect(fetchRoutes).toHaveBeenCalledWith(origin, destination);
      expect(res).toEqual(mockedRoutes);
    });

    it("propagates factory-selected strategy errors", async () => {
      const origin: LatLng = { latitude: 1, longitude: 2 };
      const destination: LatLng = { latitude: 3, longitude: 4 };

      const fetchRoutes = jest.fn().mockRejectedValue(new Error("boom"));
      (RouteStrategyFactory.create as jest.Mock).mockReturnValue({
        fetchRoutes,
      });

      await expect(
        fetchDirections({ origin, destination, mode: "driving" }),
      ).rejects.toThrow("boom");
    });
  });
});
