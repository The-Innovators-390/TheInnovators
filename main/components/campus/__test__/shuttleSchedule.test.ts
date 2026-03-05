/* eslint-disable import/first */
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

import {
  getShuttleStatus,
  getNextDepartures,
  buildShuttleInfo,
  buildShuttleDirectionRoute,
  buildShuttleDirectionRouteFromGoogle,
  SGW_SHUTTLE_STOP,
  LOY_SHUTTLE_STOP,
  type ShuttleDirection,
} from "../helper_methods/shuttleSchedule";

type LatLng = { latitude: number; longitude: number };

const mockFetchDirections = jest.fn();
const mockPickFastestRoute = jest.fn();

jest.mock("../helper_methods/googleDirections", () => ({
  __esModule: true,
  fetchDirections: (...args: any[]) => mockFetchDirections(...args),
  pickFastestRoute: (...args: any[]) => mockPickFastestRoute(...args),
}));

// --- Helper: mock Montreal time via Intl.DateTimeFormat().formatToParts() ---
const RealDateTimeFormat = Intl.DateTimeFormat;

function mockMontrealTime(parts: {
  weekday?: string;
  hour?: string;
  minute?: string;
}) {
  // mock the constructor Intl.DateTimeFormat
  (Intl as any).DateTimeFormat = jest.fn(() => ({
    formatToParts: () => {
      const out: any[] = [];
      if (parts.weekday != null)
        out.push({ type: "weekday", value: parts.weekday });
      if (parts.hour != null) out.push({ type: "hour", value: parts.hour });
      if (parts.minute != null)
        out.push({ type: "minute", value: parts.minute });
      return out;
    },
  }));
}

function restoreIntl() {
  Intl.DateTimeFormat = RealDateTimeFormat;
}

const ORIGIN: LatLng = { latitude: 45.49729, longitude: -73.57898 };
const DEST: LatLng = { latitude: 45.45824, longitude: -73.64051 };

describe("shuttleSchedule helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    restoreIntl();

    // default: Monday 09:00 (so next SGW->LOY departure is 09:30)
    mockMontrealTime({ weekday: "Monday", hour: "09", minute: "00" });

    // pickFastestRoute just returns first route
    mockPickFastestRoute.mockImplementation(
      (routes: any[]) => routes?.[0] ?? null,
    );
  });

  afterEach(() => {
    restoreIntl();
  });

  it("returns no-service-today on weekends", () => {
    mockMontrealTime({ weekday: "Saturday", hour: "10", minute: "00" });

    expect(getShuttleStatus("SGW_TO_LOY")).toBe("no-service-today");
    expect(getNextDepartures("SGW_TO_LOY", 3)).toEqual([]);
  });

  it("returns last-bus-departed when no upcoming departures remain", () => {
    // Monday at 23:59 => no departures left
    mockMontrealTime({ weekday: "Monday", hour: "23", minute: "59" });

    expect(getShuttleStatus("LOY_TO_SGW")).toBe("last-bus-departed");
    expect(getNextDepartures("LOY_TO_SGW", 2)).toEqual([]);
  });

  it("selects Friday schedule when day is Friday (schedule key branch)", () => {
    // Friday 09:00 => should return upcoming Friday-specific times
    mockMontrealTime({ weekday: "Friday", hour: "09", minute: "00" });

    const next = getNextDepartures("SGW_TO_LOY", 2);
    // first Friday SGW->LOY departure is 09:45
    expect(next[0]).toBe("09:45");
  });

  it("normalizes hour '24' to 0 (midnight edge case) and still works", () => {
    // Sunday at "24:00" still Sunday => no service
    mockMontrealTime({ weekday: "Sunday", hour: "24", minute: "00" });
    expect(getShuttleStatus("SGW_TO_LOY")).toBe("no-service-today");
  });

  it("buildShuttleInfo returns status + up to 5 next departures", () => {
    mockMontrealTime({ weekday: "Monday", hour: "09", minute: "00" });

    const info = buildShuttleInfo("SGW_TO_LOY");
    expect(info.direction).toBe("SGW_TO_LOY");
    expect(info.status).toBe("operating");
    expect(info.nextDepartures.length).toBeGreaterThan(0);
    expect(info.nextDepartures.length).toBeLessThanOrEqual(5);
  });

  it("buildShuttleDirectionRoute returns null when shuttle is not operating", () => {
    mockMontrealTime({ weekday: "Saturday", hour: "10", minute: "00" });

    const route = buildShuttleDirectionRoute("SGW_TO_LOY", ORIGIN, DEST);
    expect(route).toBeNull();
  });

  it("buildShuttleDirectionRoute returns a synthetic route when operating (durationText hour-branch)", () => {
    // Monday 00:00 => next is 09:30 => wait is large => triggers "Xh Ym" duration text branch
    mockMontrealTime({ weekday: "Monday", hour: "00", minute: "00" });

    const route = buildShuttleDirectionRoute("SGW_TO_LOY", ORIGIN, DEST);
    expect(route).toBeTruthy();
    expect(route?.summary).toBe("Concordia Shuttle");
    expect(route?.polyline).toEqual(expect.any(String));
    expect(route?.durationSec).toBeGreaterThan(0);
    expect(route?.durationText).toContain("h"); // covers hour formatting branch
  });

  it("buildShuttleDirectionRouteFromGoogle builds 3 segments and returns segmentPolylines", async () => {
    mockMontrealTime({ weekday: "Monday", hour: "09", minute: "00" });

    const walk1 = {
      polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
      durationSec: 120,
      distanceMeters: 200,
      durationText: "2 min",
      distanceText: "0.2 km",
      summary: "Walk1",
    };
    const ride = {
      polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
      durationSec: 900,
      distanceMeters: 6000,
      durationText: "15 min",
      distanceText: "6.0 km",
      summary: "Ride",
    };
    const walk2 = {
      polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
      durationSec: 180,
      distanceMeters: 300,
      durationText: "3 min",
      distanceText: "0.3 km",
      summary: "Walk2",
    };

    // fetchDirections called 3 times; return different arrays
    mockFetchDirections
      .mockResolvedValueOnce([walk1]) // origin -> boardStop (walking)
      .mockResolvedValueOnce([ride]) // boardStop -> alightStop (driving)
      .mockResolvedValueOnce([walk2]); // alightStop -> destination (walking)

    const direction: ShuttleDirection = "SGW_TO_LOY";
    const route = await buildShuttleDirectionRouteFromGoogle(
      direction,
      ORIGIN,
      DEST,
    );

    expect(mockFetchDirections).toHaveBeenCalledTimes(3);

    // confirm correct stops used based on direction (covers boardStop/alightStop branches)
    expect(mockFetchDirections).toHaveBeenNthCalledWith(1, {
      origin: ORIGIN,
      destination: SGW_SHUTTLE_STOP,
      mode: "walking",
    });
    expect(mockFetchDirections).toHaveBeenNthCalledWith(2, {
      origin: SGW_SHUTTLE_STOP,
      destination: LOY_SHUTTLE_STOP,
      mode: "driving",
    });
    expect(mockFetchDirections).toHaveBeenNthCalledWith(3, {
      origin: LOY_SHUTTLE_STOP,
      destination: DEST,
      mode: "walking",
    });

    expect(route).toBeTruthy();
    expect(route?.segmentPolylines).toEqual({
      walkToStop: walk1.polyline,
      shuttle: ride.polyline,
      walkToDestination: walk2.polyline,
    });
    expect(route?.distanceMeters).toBe(200 + 6000 + 300);
    expect(route?.distanceText).toContain("~"); // metersToApproxText normal path
  });

  it("buildShuttleDirectionRouteFromGoogle falls back to ride polyline when combinedPts < 2", async () => {
    mockMontrealTime({ weekday: "Monday", hour: "09", minute: "00" });

    // Polyline "!" decodes to 1 point in decodePolylineSafe => combinedPts length < 2
    const onePoint = {
      polyline: "!",
      durationSec: 60,
      distanceMeters: 100,
      durationText: "1 min",
      distanceText: "0.1 km",
      summary: "X",
    };

    mockFetchDirections
      .mockResolvedValueOnce([onePoint])
      .mockResolvedValueOnce([onePoint])
      .mockResolvedValueOnce([onePoint]);

    const route = await buildShuttleDirectionRouteFromGoogle(
      "SGW_TO_LOY",
      ORIGIN,
      DEST,
    );

    expect(route).toBeTruthy();
    // This hits: combinedPts.length >= 2 ? encodePolyline(...) : ride.polyline
    expect(route?.polyline).toBe("!");
  });
});
