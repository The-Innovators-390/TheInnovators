import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useRouteNavigation } from "@/hooks/useRouteNavigation";

import type {
  DirectionStep,
  LatLng,
} from "@/components/campus/helper_methods/googleDirections";

import { fetchDirections } from "@/components/campus/helper_methods/googleDirections";
import { distanceMeters } from "@/components/campus/helper_methods/geo";

jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  fetchDirections: jest.fn(),
}));

jest.mock("@/components/campus/helper_methods/geo", () => ({
  distanceMeters: jest.fn(),
}));

type HookProps = { userLoc: LatLng };

function makeLatLng(lat: number, lng: number): LatLng {
  // Cast so we don’t have to guess your LatLng exact keys
  return { lat, lng } as unknown as LatLng;
}

function makeSteps(origin: LatLng, destination: LatLng): DirectionStep[] {
  return [
    {
      instruction: "Step 1",
      start: origin,
      end: makeLatLng(45.001, -73.001),
    } as DirectionStep,
    {
      instruction: "Step 2",
      start: makeLatLng(45.001, -73.001),
      end: destination,
    } as DirectionStep,
  ];
}

function makeRoute(durationSec: number, origin: LatLng, destination: LatLng) {
  return {
    durationText: `${Math.round(durationSec / 60)} mins`,
    durationSec,
    distanceText: "1 km",
    distanceMeters: 1000,
    summary: `Route ${durationSec}`,
    steps: makeSteps(origin, destination),
  };
}

describe("useRouteNavigation", () => {
  const origin = makeLatLng(45.0, -73.0);
  const destination = makeLatLng(45.01, -73.01);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("startNavigation sorts by duration and selects by index; sets state and calls onStarted", async () => {
    (fetchDirections as jest.Mock).mockResolvedValue([
      makeRoute(600, origin, destination), // 10 min
      makeRoute(300, origin, destination), // 5 min
    ]);

    const onStarted = jest.fn();

    const { result } = renderHook(() =>
      useRouteNavigation({
        origin,
        destination,
        userLocation: origin,
        onStarted,
      }),
    );

    await act(async () => {
      await result.current.startNavigation("walking" as any, 0);
    });

    expect(result.current.navError).toBeNull();
    expect(result.current.isStarting).toBe(false);
    expect(result.current.isNavigating).toBe(true);

    expect(result.current.activeSteps).toHaveLength(2);
    expect(result.current.activeStepIndex).toBe(0);
    expect(result.current.currentStep?.instruction).toBe("Step 1");

    // index 0 after sorting should pick 300 sec route
    expect(result.current.activeSummary?.durationSec).toBe(300);

    expect(onStarted).toHaveBeenCalledTimes(1);
  });

  it("auto-advances when near start and near end of current step (not last step)", async () => {
    (fetchDirections as jest.Mock).mockResolvedValue([
      makeRoute(300, origin, destination),
    ]);

    (distanceMeters as jest.Mock).mockReturnValue(10); // always near

    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(10_000);

    const { result } = renderHook(() =>
      useRouteNavigation({
        origin,
        destination,
        userLocation: origin,
      }),
    );

    await act(async () => {
      await result.current.startNavigation("walking" as any, 0);
    });

    await waitFor(() => {
      expect(result.current.activeStepIndex).toBe(1);
    });

    nowSpy.mockRestore();
  });

  it("does not auto-advance until near start (isNearStart stays false)", async () => {
    (fetchDirections as jest.Mock).mockResolvedValue([
      makeRoute(300, origin, destination),
    ]);

    (distanceMeters as jest.Mock).mockReturnValue(100); // always far

    const far = makeLatLng(46.0, -74.0);

    const { result, rerender } = renderHook<
      ReturnType<typeof useRouteNavigation>,
      HookProps
    >(
      ({ userLoc }) =>
        useRouteNavigation({
          origin,
          destination,
          userLocation: userLoc,
        }),
      { initialProps: { userLoc: far } },
    );

    await act(async () => {
      await result.current.startNavigation("walking" as any, 0);
    });

    await act(async () => {
      rerender({ userLoc: far });
    });

    expect(result.current.isNearStart).toBe(false);
    expect(result.current.activeStepIndex).toBe(0);
  });

  it("indoor origin handoff: near start even when far from the building pin", async () => {
    (fetchDirections as jest.Mock).mockResolvedValue([
      makeRoute(300, origin, destination),
    ]);

    (distanceMeters as jest.Mock).mockReturnValue(800);

    const far = makeLatLng(46.0, -74.0);

    const { result, rerender } = renderHook<
      ReturnType<typeof useRouteNavigation>,
      HookProps
    >(
      ({ userLoc }) =>
        useRouteNavigation({
          origin,
          destination,
          userLocation: userLoc,
          indoorOriginHandoff: true,
        }),
      { initialProps: { userLoc: far } },
    );

    await act(async () => {
      await result.current.startNavigation("walking" as any, 0);
    });

    await act(async () => {
      rerender({ userLoc: far });
    });

    expect(result.current.isNearStart).toBe(true);
  });

  it("exitNavigation resets state", async () => {
    (fetchDirections as jest.Mock).mockResolvedValue([
      makeRoute(300, origin, destination),
    ]);

    const { result } = renderHook(() =>
      useRouteNavigation({
        origin,
        destination,
        userLocation: origin,
      }),
    );

    await act(async () => {
      await result.current.startNavigation("walking" as any, 0);
    });

    expect(result.current.isNavigating).toBe(true);
    expect(result.current.activeSteps.length).toBeGreaterThan(0);

    act(() => {
      result.current.exitNavigation();
    });

    expect(result.current.isNavigating).toBe(false);
    expect(result.current.activeSteps).toEqual([]);
    expect(result.current.activeStepIndex).toBe(0);
    expect(result.current.activeSummary).toBeNull();
    expect(result.current.navError).toBeNull();
    expect(result.current.isStarting).toBe(false);
  });

  it("isArrived is true only when on last step AND near destination", async () => {
    const destination = makeLatLng(45.01, -73.01);
    const nearDest = makeLatLng(45.01001, -73.01001);
    const farFromDest = makeLatLng(45.0, -73.0);

    (fetchDirections as jest.Mock).mockResolvedValue([
      makeRoute(300, origin, destination),
    ]);

    // First, far from destination
    (distanceMeters as jest.Mock)
      .mockReturnValueOnce(0) // dStart near
      .mockReturnValueOnce(100); // dEnd far (for step advance check)

    const { result, rerender } = renderHook<
      ReturnType<typeof useRouteNavigation>,
      { userLoc: LatLng }
    >(
      ({ userLoc }) =>
        useRouteNavigation({
          origin,
          destination,
          userLocation: userLoc,
        }),
      { initialProps: { userLoc: farFromDest } },
    );

    await act(async () => {
      await result.current.startNavigation("walking" as any, 0);
    });

    // Manually go to last step (index 1)
    act(() => {
      result.current.setActiveStepIndex(1);
    });

    // Check isArrived when far
    (distanceMeters as jest.Mock).mockReturnValue(100); // dEnd far
    await act(async () => {
      rerender({ userLoc: farFromDest });
    });
    expect(result.current.isArrived).toBe(false);

    // Check isArrived when near
    (distanceMeters as jest.Mock).mockReturnValue(10); // dEnd near (<= 25)
    await act(async () => {
      rerender({ userLoc: nearDest });
    });
    expect(result.current.isArrived).toBe(true);
  });
});
