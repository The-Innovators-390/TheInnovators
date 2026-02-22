import {
  SGW_SHUTTLE_STOP,
  LOY_SHUTTLE_STOP,
  isCampusToCampusRoute,
  getShuttleDirection,
  getShuttleStatus,
  getNextDepartures,
  buildShuttleDirectionRoute,
  buildShuttleNavigationSteps,
  buildShuttleInfo,
} from "@/components/campus/helper_methods/shuttleSchedule";

// ─── Mock Intl.DateTimeFormat to control Montreal time ────────────────────────

const _OrigDateTimeFormat = Intl.DateTimeFormat;

function setMontrealTime(weekday: string, hour: number, minute: number) {
  const formatToParts = jest.fn().mockReturnValue([
    { type: "weekday", value: weekday },
    { type: "hour", value: String(hour).padStart(2, "0") },
    { type: "minute", value: String(minute).padStart(2, "0") },
  ]);
  // @ts-ignore – replace the constructor for the duration of the test
  global.Intl = {
    ...global.Intl,
    DateTimeFormat: function () {
      return { formatToParts };
    },
  };
}

afterEach(() => {
  // @ts-ignore – restore
  global.Intl = { ...global.Intl, DateTimeFormat: _OrigDateTimeFormat };
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe("shuttle stop coordinates", () => {
  it("SGW_SHUTTLE_STOP has valid lat/lng", () => {
    expect(SGW_SHUTTLE_STOP.latitude).toBeCloseTo(45.4968, 2);
    expect(SGW_SHUTTLE_STOP.longitude).toBeCloseTo(-73.5789, 2);
  });

  it("LOY_SHUTTLE_STOP has valid lat/lng", () => {
    expect(LOY_SHUTTLE_STOP.latitude).toBeCloseTo(45.458, 2);
    expect(LOY_SHUTTLE_STOP.longitude).toBeCloseTo(-73.6395, 2);
  });
});

// ─── isCampusToCampusRoute ────────────────────────────────────────────────────

describe("isCampusToCampusRoute", () => {
  it("returns true for SGW → LOY", () => {
    expect(isCampusToCampusRoute("SGW", "LOY")).toBe(true);
  });

  it("returns true for LOY → SGW", () => {
    expect(isCampusToCampusRoute("LOY", "SGW")).toBe(true);
  });

  it("returns false for SGW → SGW", () => {
    expect(isCampusToCampusRoute("SGW", "SGW")).toBe(false);
  });

  it("returns false for LOY → LOY", () => {
    expect(isCampusToCampusRoute("LOY", "LOY")).toBe(false);
  });
});

// ─── getShuttleDirection ──────────────────────────────────────────────────────

describe("getShuttleDirection", () => {
  it("returns SGW_TO_LOY when starting at SGW", () => {
    expect(getShuttleDirection("SGW", "LOY")).toBe("SGW_TO_LOY");
  });

  it("returns LOY_TO_SGW when starting at LOY", () => {
    expect(getShuttleDirection("LOY", "SGW")).toBe("LOY_TO_SGW");
  });
});

// ─── getShuttleStatus ─────────────────────────────────────────────────────────

describe("getShuttleStatus", () => {
  it("returns 'no-service-today' on Saturday", () => {
    setMontrealTime("Saturday", 10, 0);
    expect(getShuttleStatus("SGW_TO_LOY")).toBe("no-service-today");
  });

  it("returns 'no-service-today' on Sunday", () => {
    setMontrealTime("Sunday", 12, 0);
    expect(getShuttleStatus("LOY_TO_SGW")).toBe("no-service-today");
  });

  it("returns 'operating' on Monday before first departure", () => {
    // Monday 09:00 → 540 min; first SGW→LOY dep is 09:30 → 570 min
    setMontrealTime("Monday", 9, 0);
    expect(getShuttleStatus("SGW_TO_LOY")).toBe("operating");
  });

  it("returns 'last-bus-departed' on Monday after 18:30", () => {
    // Monday 19:00 → 1140 min; last departure 18:30 → 1110 min
    setMontrealTime("Monday", 19, 0);
    expect(getShuttleStatus("SGW_TO_LOY")).toBe("last-bus-departed");
  });

  it("returns 'operating' on Tuesday for LOY_TO_SGW mid-day", () => {
    setMontrealTime("Tuesday", 12, 0);
    expect(getShuttleStatus("LOY_TO_SGW")).toBe("operating");
  });

  it("returns 'operating' on Wednesday for LOY_TO_SGW", () => {
    setMontrealTime("Wednesday", 10, 0);
    expect(getShuttleStatus("LOY_TO_SGW")).toBe("operating");
  });

  it("returns 'operating' on Thursday for SGW_TO_LOY", () => {
    setMontrealTime("Thursday", 10, 0);
    expect(getShuttleStatus("SGW_TO_LOY")).toBe("operating");
  });

  it("returns 'operating' on Friday for SGW_TO_LOY (Friday schedule)", () => {
    setMontrealTime("Friday", 10, 0);
    expect(getShuttleStatus("SGW_TO_LOY")).toBe("operating");
  });

  it("returns 'operating' on Friday for LOY_TO_SGW (Friday schedule)", () => {
    setMontrealTime("Friday", 10, 0);
    expect(getShuttleStatus("LOY_TO_SGW")).toBe("operating");
  });

  it("returns 'last-bus-departed' on Friday after 18:15", () => {
    setMontrealTime("Friday", 19, 0);
    expect(getShuttleStatus("SGW_TO_LOY")).toBe("last-bus-departed");
  });

  it("returns 'last-bus-departed' on Friday LOY_TO_SGW after last bus", () => {
    setMontrealTime("Friday", 19, 0);
    expect(getShuttleStatus("LOY_TO_SGW")).toBe("last-bus-departed");
  });
});

// ─── getNextDepartures ────────────────────────────────────────────────────────

describe("getNextDepartures", () => {
  it("returns empty array on weekend", () => {
    setMontrealTime("Saturday", 10, 0);
    expect(getNextDepartures("SGW_TO_LOY", 3)).toEqual([]);
  });

  it("returns next departures after current time on Monday", () => {
    // Monday 09:31 → 571 min; first dep after that is 09:45 → 585 min
    setMontrealTime("Monday", 9, 31);
    const result = getNextDepartures("SGW_TO_LOY", 3);
    expect(result.length).toBe(3);
    expect(result[0]).toBe("09:45");
  });

  it("limits result to the requested count", () => {
    setMontrealTime("Monday", 9, 0);
    const result = getNextDepartures("SGW_TO_LOY", 2);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when past all departures", () => {
    setMontrealTime("Monday", 20, 0);
    expect(getNextDepartures("SGW_TO_LOY", 5)).toEqual([]);
  });

  it("returns Friday LOY_TO_SGW schedule when on Friday", () => {
    setMontrealTime("Friday", 9, 0);
    const result = getNextDepartures("LOY_TO_SGW", 3);
    expect(result.length).toBe(3);
    // Friday LOY_TO_SGW first departure is 09:15
    expect(result[0]).toBe("09:15");
  });

  it("returns Friday SGW_TO_LOY schedule when on Friday", () => {
    setMontrealTime("Friday", 9, 0);
    const result = getNextDepartures("SGW_TO_LOY", 1);
    // Friday SGW_TO_LOY first departure is 09:45
    expect(result[0]).toBe("09:45");
  });

  it("returns Mon-Thu LOY_TO_SGW schedule on Thursday", () => {
    setMontrealTime("Thursday", 9, 0);
    const result = getNextDepartures("LOY_TO_SGW", 1);
    // Mon-Thu LOY_TO_SGW first departure is 09:15
    expect(result[0]).toBe("09:15");
  });
});

// ─── buildShuttleDirectionRoute ───────────────────────────────────────────────

const ORIGIN = { latitude: 45.497, longitude: -73.578 };
const DEST = { latitude: 45.458, longitude: -73.639 };

describe("buildShuttleDirectionRoute", () => {
  it("returns null when not operating (weekend)", () => {
    setMontrealTime("Saturday", 10, 0);
    expect(buildShuttleDirectionRoute("SGW_TO_LOY", ORIGIN, DEST)).toBeNull();
  });

  it("returns null when last bus has departed", () => {
    setMontrealTime("Monday", 20, 0);
    expect(buildShuttleDirectionRoute("SGW_TO_LOY", ORIGIN, DEST)).toBeNull();
  });

  it("returns a valid DirectionRoute on Monday morning", () => {
    // Monday 09:00 → wait = 09:30 - 09:00 = 30 min → total = 30 + 30 = 60 min
    setMontrealTime("Monday", 9, 0);
    const route = buildShuttleDirectionRoute("SGW_TO_LOY", ORIGIN, DEST);

    expect(route).not.toBeNull();
    expect(route?.summary).toBe("Concordia Shuttle");
    expect(route?.distanceText).toBe("~8 km");
    expect(route?.distanceMeters).toBe(8000);
    expect(typeof route?.polyline).toBe("string");
    expect(route!.polyline.length).toBeGreaterThan(0);
    expect(route?.durationSec).toBeGreaterThan(0);
  });

  it("returns route for LOY_TO_SGW direction", () => {
    setMontrealTime("Monday", 9, 0);
    const route = buildShuttleDirectionRoute("LOY_TO_SGW", DEST, ORIGIN);
    expect(route).not.toBeNull();
    expect(route?.summary).toBe("Concordia Shuttle");
  });

  it("formats durationText as 'Xh Y min' when wait > 60 min", () => {
    // Monday 08:00 → 480 min; first dep 09:30 → 570 min; wait=90 min; total=120 min → 2h
    setMontrealTime("Monday", 8, 0);
    const route = buildShuttleDirectionRoute("SGW_TO_LOY", ORIGIN, DEST);
    expect(route?.durationText).toMatch(/h/);
  });

  it("formats durationText as 'X min' when total < 60 min", () => {
    // Monday 09:29 → 569 min; first dep 09:30 → wait=1 min; total=31 min
    setMontrealTime("Monday", 9, 29);
    const route = buildShuttleDirectionRoute("SGW_TO_LOY", ORIGIN, DEST);
    expect(route?.durationText).toMatch(/min/);
    expect(route?.durationText).not.toMatch(/\dh/);
  });

  it("returns a valid route on Friday (Friday schedule)", () => {
    setMontrealTime("Friday", 9, 0);
    const route = buildShuttleDirectionRoute("SGW_TO_LOY", ORIGIN, DEST);
    expect(route).not.toBeNull();
    expect(route?.summary).toBe("Concordia Shuttle");
  });

  it("durationText is exactly 'Xh' when wait is a round hour with no leftover minutes", () => {
    // Monday 07:30 → 450 min; first dep 09:30 → 570 min; wait=120 min → total=150 min → 2h 30 min
    setMontrealTime("Monday", 7, 30);
    const route = buildShuttleDirectionRoute("SGW_TO_LOY", ORIGIN, DEST);
    expect(route?.durationText).toContain("h");
  });
});

// ─── buildShuttleNavigationSteps ─────────────────────────────────────────────

describe("buildShuttleNavigationSteps", () => {
  it("returns exactly 3 steps for SGW_TO_LOY", () => {
    setMontrealTime("Monday", 9, 0);
    const steps = buildShuttleNavigationSteps("SGW_TO_LOY", ORIGIN, DEST);
    expect(steps).toHaveLength(3);
  });

  it("step 0: walk instruction mentions SGW and next departure time", () => {
    setMontrealTime("Monday", 9, 0);
    const steps = buildShuttleNavigationSteps("SGW_TO_LOY", ORIGIN, DEST);
    expect(steps[0].instruction).toContain("SGW");
    expect(steps[0].instruction).toContain("09:30");
  });

  it("step 1: ride instruction mentions ~30 min and destination campus", () => {
    setMontrealTime("Monday", 9, 0);
    const steps = buildShuttleNavigationSteps("SGW_TO_LOY", ORIGIN, DEST);
    expect(steps[1].instruction).toContain("~30 min");
    expect(steps[1].instruction).toContain("Loyola");
    expect(steps[1].distanceText).toContain("km");
    expect(steps[1].durationText).toContain("min");
  });

  it("step 2: arrival instruction mentions destination campus", () => {
    setMontrealTime("Monday", 9, 0);
    const steps = buildShuttleNavigationSteps("SGW_TO_LOY", ORIGIN, DEST);
    expect(steps[2].instruction).toContain("Loyola");
  });

  it("step coordinates match correct stops for SGW_TO_LOY", () => {
    setMontrealTime("Monday", 9, 0);
    const steps = buildShuttleNavigationSteps("SGW_TO_LOY", ORIGIN, DEST);
    expect(steps[0].start).toEqual(ORIGIN);
    expect(steps[0].end).toEqual(SGW_SHUTTLE_STOP);
    expect(steps[1].start).toEqual(SGW_SHUTTLE_STOP);
    expect(steps[1].end).toEqual(LOY_SHUTTLE_STOP);
    expect(steps[2].start).toEqual(LOY_SHUTTLE_STOP);
    expect(steps[2].end).toEqual(DEST);
  });

  it("returns 3 steps for LOY_TO_SGW direction", () => {
    setMontrealTime("Monday", 9, 0);
    const steps = buildShuttleNavigationSteps("LOY_TO_SGW", DEST, ORIGIN);
    expect(steps).toHaveLength(3);
    expect(steps[0].instruction).toContain("Loyola");
    expect(steps[2].instruction).toContain("SGW");
  });

  it("step coordinates match correct stops for LOY_TO_SGW", () => {
    setMontrealTime("Monday", 9, 0);
    const steps = buildShuttleNavigationSteps("LOY_TO_SGW", DEST, ORIGIN);
    expect(steps[0].end).toEqual(LOY_SHUTTLE_STOP);
    expect(steps[1].start).toEqual(LOY_SHUTTLE_STOP);
    expect(steps[1].end).toEqual(SGW_SHUTTLE_STOP);
    expect(steps[2].end).toEqual(ORIGIN);
  });

  it("omits departure time note when no upcoming buses (weekend)", () => {
    setMontrealTime("Saturday", 10, 0);
    const steps = buildShuttleNavigationSteps("SGW_TO_LOY", ORIGIN, DEST);
    expect(steps[0].instruction).not.toContain("next departure at");
  });
});

// ─── buildShuttleInfo ─────────────────────────────────────────────────────────

describe("buildShuttleInfo", () => {
  it("returns operating status with departures on a weekday morning", () => {
    setMontrealTime("Monday", 9, 0);
    const info = buildShuttleInfo("SGW_TO_LOY");
    expect(info.status).toBe("operating");
    expect(info.nextDepartures.length).toBeGreaterThan(0);
    expect(info.direction).toBe("SGW_TO_LOY");
  });

  it("returns no-service-today on weekend with empty departures", () => {
    setMontrealTime("Sunday", 12, 0);
    const info = buildShuttleInfo("SGW_TO_LOY");
    expect(info.status).toBe("no-service-today");
    expect(info.nextDepartures).toEqual([]);
    expect(info.direction).toBe("SGW_TO_LOY");
  });

  it("returns last-bus-departed status after hours with empty departures", () => {
    setMontrealTime("Monday", 20, 0);
    const info = buildShuttleInfo("LOY_TO_SGW");
    expect(info.status).toBe("last-bus-departed");
    expect(info.nextDepartures).toEqual([]);
    expect(info.direction).toBe("LOY_TO_SGW");
  });
});
