import { buildShuttleDirectionRouteFromGoogle } from "@/components/campus/helper_methods/shuttleSchedule";

const mockFetchDirections = jest.fn();
const mockPickFastestRoute = jest.fn();

jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  __esModule: true,
  fetchDirections: (...args: any[]) => mockFetchDirections(...args),
  pickFastestRoute: (...args: any[]) => mockPickFastestRoute(...args),
}));

const VALID_POLYLINE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

// Save original constructor (real Intl.DateTimeFormat)
const OrigDateTimeFormat = Intl.DateTimeFormat;

function setMontrealTime(weekday: string, hour: number, minute: number) {
  const formatToParts = jest.fn().mockReturnValue([
    { type: "weekday", value: weekday },
    { type: "hour", value: String(hour).padStart(2, "0") },
    { type: "minute", value: String(minute).padStart(2, "0") },
  ]);

  // Override Intl.DateTimeFormat with a mock constructor
  // NOTE: Cast to any to satisfy DateTimeFormatConstructor typing.
  (global as any).Intl = (global as any).Intl || {};
  (global as any).Intl.DateTimeFormat = jest
    .fn()
    .mockImplementation(() => ({ formatToParts })) as any;

  // Keep supportedLocalesOf to avoid runtime surprises (optional but safe)
  (global as any).Intl.DateTimeFormat.supportedLocalesOf = (
    OrigDateTimeFormat as any
  ).supportedLocalesOf;
}

afterEach(() => {
  // Restore original constructor
  (global as any).Intl = (global as any).Intl || {};
  (global as any).Intl.DateTimeFormat = OrigDateTimeFormat as any;
});

function makeRoute(durationSec: number, distanceMeters: number) {
  return {
    summary: "Segment",
    polyline: VALID_POLYLINE,
    durationSec,
    durationText: `${durationSec}s`,
    distanceMeters,
    distanceText: `${distanceMeters}m`,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPickFastestRoute.mockImplementation(
    (routes: any[]) => routes?.[0] ?? null,
  );
});

describe("buildShuttleDirectionRouteFromGoogle", () => {
  const origin = { latitude: 45.497, longitude: -73.578 };
  const destination = { latitude: 45.458, longitude: -73.639 };

  it("returns null on weekend and does not call Google directions", async () => {
    setMontrealTime("Saturday", 10, 0);

    const result = await buildShuttleDirectionRouteFromGoogle(
      "SGW_TO_LOY",
      origin,
      destination,
    );

    expect(result).toBeNull();
    expect(mockFetchDirections).not.toHaveBeenCalled();
  });

  it("returns null when one of the 3 Google segments is missing", async () => {
    setMontrealTime("Monday", 9, 29);

    mockFetchDirections
      .mockResolvedValueOnce([makeRoute(60, 100)]) // walk to stop
      .mockResolvedValueOnce([]) // shuttle leg missing
      .mockResolvedValueOnce([makeRoute(180, 300)]); // walk to destination

    const result = await buildShuttleDirectionRouteFromGoogle(
      "SGW_TO_LOY",
      origin,
      destination,
    );

    expect(result).toBeNull();
    expect(mockFetchDirections).toHaveBeenCalledTimes(3);
  });

  it("builds a composed shuttle route with segment polylines when all 3 segments exist", async () => {
    setMontrealTime("Monday", 9, 29); // 1 minute wait until 09:30

    mockFetchDirections
      .mockResolvedValueOnce([makeRoute(60, 100)]) // walk to stop
      .mockResolvedValueOnce([makeRoute(120, 1000)]) // shuttle leg
      .mockResolvedValueOnce([makeRoute(180, 400)]); // walk to destination

    const result = await buildShuttleDirectionRouteFromGoogle(
      "SGW_TO_LOY",
      origin,
      destination,
    );

    expect(mockFetchDirections).toHaveBeenCalledTimes(3);

    expect(result).not.toBeNull();
    expect(result?.summary).toBe("Concordia Shuttle");
    expect(result?.segmentPolylines).toEqual({
      walkToStop: VALID_POLYLINE,
      shuttle: VALID_POLYLINE,
      walkToDestination: VALID_POLYLINE,
    });

    // wait 1 min + (60 + 120 + 180 sec = 6 min) => total 7 min
    expect(result?.durationSec).toBe(420);
    expect(result?.durationText).toBe("7 min");

    // 100 + 1000 + 400 = 1500m
    expect(result?.distanceMeters).toBe(1500);
    expect(result?.distanceText).toBe("~1.5 km");
    expect(typeof result?.polyline).toBe("string");
    expect(result?.polyline.length).toBeGreaterThan(0);
  });
});
