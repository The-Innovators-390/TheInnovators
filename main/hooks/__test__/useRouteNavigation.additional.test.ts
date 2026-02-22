import { act, renderHook } from "@testing-library/react-native";

import { useRouteNavigation } from "@/hooks/useRouteNavigation";
import type {
  DirectionStep,
  LatLng,
} from "@/components/campus/helper_methods/googleDirections";
import { fetchDirectionsWithSteps } from "@/components/campus/helper_methods/googleDirections";

jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  fetchDirectionsWithSteps: jest.fn(),
}));

jest.mock("@/components/campus/helper_methods/geo", () => ({
  distanceMeters: jest.fn().mockReturnValue(999),
}));

function makeLatLng(lat: number, lng: number): LatLng {
  return { lat, lng } as unknown as LatLng;
}

function makeStep(label: string, start: LatLng, end: LatLng): DirectionStep {
  return { instruction: label, distanceText: "", durationText: "", start, end };
}

const origin = makeLatLng(45.0, -73.0);
const destination = makeLatLng(45.01, -73.01);

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── startNavigationWithSteps ─────────────────────────────────────────────────

describe("startNavigationWithSteps", () => {
  it("sets navigation state from pre-built steps without calling the API", () => {
    const { result } = renderHook(() =>
      useRouteNavigation({ origin, destination, userLocation: null }),
    );

    const steps: DirectionStep[] = [
      makeStep("Walk to shuttle stop", origin, makeLatLng(45.005, -73.005)),
      makeStep("Board shuttle", makeLatLng(45.005, -73.005), destination),
    ];

    const summary = {
      mode: "shuttle" as any,
      durationText: "35 min",
      durationSec: 2100,
      distanceText: "~8 km",
      distanceMeters: 8000,
      summary: "Concordia Shuttle",
    };

    act(() => {
      result.current.startNavigationWithSteps(steps, summary);
    });

    expect(result.current.isNavigating).toBe(true);
    expect(result.current.activeSteps).toHaveLength(2);
    expect(result.current.activeStepIndex).toBe(0);
    expect(result.current.activeSummary?.mode).toBe("shuttle");
    expect(result.current.activeSummary?.durationSec).toBe(2100);
    expect(fetchDirectionsWithSteps).not.toHaveBeenCalled();
  });

  it("calls onStarted callback when using startNavigationWithSteps", () => {
    const onStarted = jest.fn();
    const { result } = renderHook(() =>
      useRouteNavigation({ origin, destination, userLocation: null, onStarted }),
    );

    act(() => {
      result.current.startNavigationWithSteps(
        [makeStep("Step", origin, destination)],
        {
          mode: "shuttle" as any,
          durationText: "30 min",
          durationSec: 1800,
          distanceText: "8 km",
          distanceMeters: 8000,
          summary: "Concordia Shuttle",
        },
      );
    });

    expect(onStarted).toHaveBeenCalledTimes(1);
  });
});

// ─── startNavigation error paths ──────────────────────────────────────────────

describe("startNavigation – error paths", () => {
  it("sets navError when origin is null", async () => {
    const { result } = renderHook(() =>
      useRouteNavigation({ origin: null, destination, userLocation: null }),
    );

    await act(async () => {
      await result.current.startNavigation("walking" as any, 0);
    });

    expect(result.current.navError).toMatch(/Missing/);
    expect(result.current.isNavigating).toBe(false);
  });

  it("sets navError when destination is null", async () => {
    const { result } = renderHook(() =>
      useRouteNavigation({ origin, destination: null, userLocation: null }),
    );

    await act(async () => {
      await result.current.startNavigation("walking" as any, 0);
    });

    expect(result.current.navError).toMatch(/Missing/);
    expect(result.current.isNavigating).toBe(false);
  });

  it("sets navError when chosen route index is out of bounds", async () => {
    (fetchDirectionsWithSteps as jest.Mock).mockResolvedValue([
      {
        durationText: "5 mins",
        durationSec: 300,
        distanceText: "1 km",
        distanceMeters: 1000,
        summary: "Route",
        steps: [makeStep("Go", origin, destination)],
      },
    ]);

    const { result } = renderHook(() =>
      useRouteNavigation({ origin, destination, userLocation: null }),
    );

    await act(async () => {
      await result.current.startNavigation("walking" as any, 99); // index 99 doesn't exist
    });

    expect(result.current.navError).toMatch(/Could not find/);
    expect(result.current.isNavigating).toBe(false);
    expect(result.current.isStarting).toBe(false);
  });

  it("sets navError when fetchDirectionsWithSteps throws", async () => {
    (fetchDirectionsWithSteps as jest.Mock).mockRejectedValue(
      new Error("Network failure"),
    );

    const { result } = renderHook(() =>
      useRouteNavigation({ origin, destination, userLocation: null }),
    );

    await act(async () => {
      await result.current.startNavigation("walking" as any, 0);
    });

    expect(result.current.navError).toContain("Network failure");
    expect(result.current.isNavigating).toBe(false);
    expect(result.current.isStarting).toBe(false);
  });

  it("sets navError from error without message property", async () => {
    (fetchDirectionsWithSteps as jest.Mock).mockRejectedValue("bare error");

    const { result } = renderHook(() =>
      useRouteNavigation({ origin, destination, userLocation: null }),
    );

    await act(async () => {
      await result.current.startNavigation("walking" as any, 0);
    });

    expect(result.current.navError).toBe("Failed to start navigation.");
  });
});

// ─── nextStep / prevStep ──────────────────────────────────────────────────────

describe("nextStep and prevStep", () => {
  async function startWithSteps(steps: DirectionStep[]) {
    const { result } = renderHook(() =>
      useRouteNavigation({ origin, destination, userLocation: null }),
    );

    act(() => {
      result.current.startNavigationWithSteps(steps, {
        mode: "walking" as any,
        durationText: "5 min",
        durationSec: 300,
        distanceText: "0.5 km",
        distanceMeters: 500,
        summary: "Walk",
      });
    });

    return result;
  }

  it("nextStep advances to the next step", async () => {
    const steps = [
      makeStep("Step 1", origin, makeLatLng(45.005, -73.005)),
      makeStep("Step 2", makeLatLng(45.005, -73.005), destination),
    ];

    const result = await startWithSteps(steps);

    expect(result.current.activeStepIndex).toBe(0);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.activeStepIndex).toBe(1);
  });

  it("nextStep does not go past the last step", async () => {
    const steps = [makeStep("Only step", origin, destination)];
    const result = await startWithSteps(steps);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.activeStepIndex).toBe(0);
  });

  it("prevStep does not go below 0", async () => {
    const steps = [makeStep("Only step", origin, destination)];
    const result = await startWithSteps(steps);

    act(() => {
      result.current.prevStep();
    });

    expect(result.current.activeStepIndex).toBe(0);
  });

  it("prevStep goes back from step 1 to step 0", async () => {
    const steps = [
      makeStep("Step 1", origin, makeLatLng(45.005, -73.005)),
      makeStep("Step 2", makeLatLng(45.005, -73.005), destination),
    ];

    const result = await startWithSteps(steps);

    act(() => {
      result.current.nextStep();
    });
    expect(result.current.activeStepIndex).toBe(1);

    act(() => {
      result.current.prevStep();
    });
    expect(result.current.activeStepIndex).toBe(0);
  });

  it("isArrived is true when on the last step", async () => {
    const steps = [
      makeStep("Step 1", origin, makeLatLng(45.005, -73.005)),
      makeStep("Step 2", makeLatLng(45.005, -73.005), destination),
    ];

    const result = await startWithSteps(steps);

    expect(result.current.isArrived).toBe(false);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.isArrived).toBe(true);
  });
});
