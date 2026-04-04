import type { LatLng } from "../helper_methods/googleDirections";
import {
  BicyclingStrategy,
  DrivingStrategy,
  TransitStrategy,
  WalkingStrategy,
} from "../helper_methods/routeStrategy";

jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: { googleMapsApiKey: "TEST_GOOGLE_KEY" },
  },
}));

describe("routeStrategy.ts", () => {
  const origin: LatLng = { latitude: 45.5, longitude: -73.6 };
  const destination: LatLng = { latitude: 45.49, longitude: -73.57 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockFetchOnce(opts: { ok: boolean; status: number; json: any }) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: opts.ok,
      status: opts.status,
      json: jest.fn().mockResolvedValue(opts.json),
    } as any);
  }

  describe("RouteStrategy.fetchRoutes (integration via concrete strategies)", () => {
    it("throws if HTTP response is not ok", async () => {
      mockFetchOnce({
        ok: false,
        status: 500,
        json: { status: "OK", routes: [] },
      });

      const strat = new WalkingStrategy();

      await expect(strat.fetchRoutes(origin, destination)).rejects.toThrow(
        "Directions HTTP 500",
      );
    });

    it("throws if Google API status is not OK", async () => {
      mockFetchOnce({
        ok: true,
        status: 200,
        json: { status: "ZERO_RESULTS", routes: [] },
      });

      const strat = new WalkingStrategy();

      await expect(strat.fetchRoutes(origin, destination)).rejects.toThrow(
        /Directions API status: ZERO_RESULTS/,
      );
    });

    it("filters out routes with missing polyline", async () => {
      mockFetchOnce({
        ok: true,
        status: 200,
        json: {
          status: "OK",
          routes: [
            {
              summary: "no poly",
              overview_polyline: { points: "" },
              legs: [
                {
                  duration: { value: 1, text: "1m" },
                  distance: { value: 1, text: "1m" },
                },
              ],
            },
            {
              summary: "has poly",
              overview_polyline: { points: "ENCODED" },
              legs: [
                {
                  duration: { value: 2, text: "2m" },
                  distance: { value: 2, text: "2m" },
                },
              ],
            },
          ],
        },
      });

      const strat = new WalkingStrategy();
      const routes = await strat.fetchRoutes(origin, destination);

      expect(routes).toHaveLength(1);
      expect(routes[0].summary).toBe("has poly");
      expect(routes[0].polyline).toBe("ENCODED");
    });

    it("DrivingStrategy includes parsed steps with HTML stripped", async () => {
      mockFetchOnce({
        ok: true,
        status: 200,
        json: {
          status: "OK",
          routes: [
            {
              summary: "Drive A",
              overview_polyline: { points: "P1" },
              legs: [
                {
                  duration: { value: 120, text: "2 mins" },
                  distance: { value: 1000, text: "1 km" },
                  steps: [
                    {
                      html_instructions: "<b>Head</b> <div>north</div>",
                      distance: { text: "1 km" },
                      duration: { text: "2 mins" },
                      start_location: { lat: 1, lng: 2 },
                      end_location: { lat: 3, lng: 4 },
                      travel_mode: "DRIVING",
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      const strat = new DrivingStrategy();
      const routes = await strat.fetchRoutes(origin, destination);

      expect(routes).toHaveLength(1);
      expect(routes[0].steps).toBeDefined();
      expect(routes[0].steps![0].instruction).toBe("Head north");
      expect(routes[0].steps![0].start).toEqual({ latitude: 1, longitude: 2 });
      expect(routes[0].steps![0].end).toEqual({ latitude: 3, longitude: 4 });
    });

    it("TransitStrategy extracts unique transit lines + builds bus/metro chips", async () => {
      mockFetchOnce({
        ok: true,
        status: 200,
        json: {
          status: "OK",
          routes: [
            {
              summary: "Transit A",
              overview_polyline: { points: "T1" },
              legs: [
                {
                  duration: { value: 600, text: "10 mins" },
                  distance: { value: 3000, text: "3 km" },
                  steps: [
                    {
                      travel_mode: "TRANSIT",
                      html_instructions: "Take bus",
                      distance: { text: "1 km" },
                      duration: { text: "3 mins" },
                      start_location: { lat: 1, lng: 2 },
                      end_location: { lat: 3, lng: 4 },
                      transit_details: {
                        headsign: "WEST",
                        line: {
                          short_name: "211",
                          vehicle: { type: "BUS" },
                          agencies: [{ name: "STM" }],
                        },
                      },
                    },
                    {
                      travel_mode: "TRANSIT",
                      html_instructions: "Take bus again",
                      distance: { text: "1 km" },
                      duration: { text: "3 mins" },
                      start_location: { lat: 1, lng: 2 },
                      end_location: { lat: 3, lng: 4 },
                      transit_details: {
                        headsign: "WEST",
                        line: {
                          short_name: "211",
                          vehicle: { type: "BUS" },
                          agencies: [{ name: "STM" }],
                        },
                      },
                    },
                    {
                      travel_mode: "TRANSIT",
                      html_instructions: "Take metro",
                      distance: { text: "2 km" },
                      duration: { text: "7 mins" },
                      start_location: { lat: 5, lng: 6 },
                      end_location: { lat: 7, lng: 8 },
                      transit_details: {
                        headsign: "ANGRIGNON",
                        line: {
                          name: "Line 1",
                          vehicle: { type: "SUBWAY" },
                          agencies: [{ name: "STM" }],
                        },
                      },
                    },
                    {
                      travel_mode: "WALKING",
                      html_instructions: "Walk",
                      distance: { text: "10 m" },
                      duration: { text: "1 min" },
                      start_location: { lat: 9, lng: 10 },
                      end_location: { lat: 11, lng: 12 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      const strat = new TransitStrategy();
      const routes = await strat.fetchRoutes(origin, destination);

      expect(routes).toHaveLength(1);
      const route = routes[0];

      expect(route.transitLines).toBeDefined();
      expect(route.transitLines!.length).toBe(2);

      const names = route.transitLines!.map((l) => l.name).sort();
      expect(names).toEqual(["211", "Line 1"]);

      const chips = strat.getChips(route);
      expect(chips.some((c) => c.kind === "bus" && c.label === "211")).toBe(
        true,
      );
      expect(
        chips.some((c) => c.kind === "metro" && c.label === "Line 1"),
      ).toBe(true);

      const metroChip = chips.find((c) => c.kind === "metro");
      expect(metroChip && "lineColor" in metroChip).toBe(true);
    });

    it("BicyclingStrategy can be instantiated and uses bicycling mode", () => {
      const strat = new BicyclingStrategy();
      expect(strat.mode).toBe("bicycling");
    });
  });

  it("throws when expoConfig.extra.googleMapsApiKey is missing", async () => {
    jest.resetModules();

    jest.doMock("expo-constants", () => ({
      expoConfig: { extra: {} },
    }));

    let WalkingStrategyLocal: any;

    jest.isolateModules(() => {
      ({
        WalkingStrategy: WalkingStrategyLocal,
      } = require("../helper_methods/routeStrategy"));
    });

    global.fetch = jest.fn() as any;

    const strat = new WalkingStrategyLocal();

    await expect(strat.fetchRoutes(origin, destination)).rejects.toThrow(
      "Missing Google Maps API key in expoConfig.extra.googleMapsApiKey",
    );
  });
});
