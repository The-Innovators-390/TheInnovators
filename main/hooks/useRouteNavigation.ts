import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  fetchDirections,
  type DirectionStep,
  type LatLng,
  type TravelMode,
} from "@/components/campus/helper_methods/googleDirections";
import { distanceMeters } from "@/components/campus/helper_methods/geo";

type ActiveRouteSummary = {
  mode: TravelMode;
  durationText: string;
  durationSec: number;
  distanceText: string;
  distanceMeters: number;
  summary: string;
};

const START_THRESHOLD_M = 35;
const STEP_END_THRESHOLD_M = 25;

export function useRouteNavigation(params: {
  origin: LatLng | null;
  destination: LatLng | null;
  userLocation: LatLng | null;
  onStarted?: () => void; // e.g. close popup
}) {
  const { origin, destination, userLocation, onStarted } = params;

  const [isNavigating, setIsNavigating] = useState(false);
  const [activeSteps, setActiveSteps] = useState<DirectionStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeSummary, setActiveSummary] = useState<ActiveRouteSummary | null>(
    null,
  );
  const [navError, setNavError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isNearStart, setIsNearStart] = useState(false);

  const currentStep = useMemo(
    () => activeSteps[activeStepIndex] ?? null,
    [activeSteps, activeStepIndex],
  );

  const lastAdvanceAtRef = useRef(0);

  useEffect(() => {
    if (!isNavigating) return;
    if (!userLocation || !origin) return;

    // Are we near the starting point?
    const dStart = distanceMeters(userLocation, origin);
    const near = dStart <= START_THRESHOLD_M;
    setIsNearStart(near);

    // Don't advance steps until near the start
    if (!near) return;

    // Auto-advance when close to the end of the current step
    if (!currentStep) return;

    const now = Date.now();
    if (now - lastAdvanceAtRef.current < 1200) return; // debounce: 1.2s

    const dEnd = distanceMeters(userLocation, currentStep.end);

    const isLast = activeStepIndex >= activeSteps.length - 1;
    if (!isLast && dEnd <= STEP_END_THRESHOLD_M) {
      lastAdvanceAtRef.current = now;
      setActiveStepIndex((i) => Math.min(i + 1, activeSteps.length - 1));
    }
  }, [
    isNavigating,
    userLocation,
    origin,
    currentStep,
    activeStepIndex,
    activeSteps.length,
  ]);

  /**
   * Starts navigation using pre-built steps (e.g. shuttle mode).
   * Bypasses the Google Directions API entirely.
   */
  const startNavigationWithSteps = useCallback(
    (steps: DirectionStep[], summary: ActiveRouteSummary) => {
      setActiveSteps(steps);
      setActiveStepIndex(0);
      setActiveSummary(summary);
      setIsNavigating(true);
      onStarted?.();
    },
    [onStarted],
  );

  const startNavigation = useCallback(
    async (mode: TravelMode, index: number) => {
      if (!origin || !destination) {
        setNavError("Missing start or destination coordinates.");
        return;
      }

      setIsStarting(true);
      setNavError(null);

      try {
        const detailed = await fetchDirections({
          origin,
          destination,
          mode,
        });

        const sorted = [...detailed].sort(
          (a, b) => a.durationSec - b.durationSec,
        );
        const chosen = sorted[index];

        if (!chosen) {
          setNavError("Could not find the selected route.");
          return;
        }

        setActiveSteps(chosen.steps ?? []);
        setActiveStepIndex(0);
        setActiveSummary({
          mode,
          durationText: chosen.durationText,
          durationSec: chosen.durationSec,
          distanceText: chosen.distanceText,
          distanceMeters: chosen.distanceMeters,
          summary: chosen.summary,
        });
        setIsNavigating(true);
        onStarted?.();
      } catch (e: any) {
        setNavError(e?.message ?? "Failed to start navigation.");
      } finally {
        setIsStarting(false);
      }
    },
    [origin, destination, onStarted],
  );

  const isArrived = useMemo(() => {
    if (!isNavigating) return false;
    if (!activeSteps.length) return false;

    // If we're on the last step, check if we're close enough to the destination
    const lastStep = activeSteps.at(-1);
    if (!lastStep || !userLocation) return false;

    const dEnd = distanceMeters(userLocation, lastStep.end);
    return (
      activeStepIndex >= activeSteps.length - 1 && dEnd <= STEP_END_THRESHOLD_M
    );
  }, [isNavigating, activeSteps, activeStepIndex, userLocation]);

  const exitNavigation = useCallback(() => {
    setIsNavigating(false);
    setActiveSteps([]);
    setActiveStepIndex(0);
    setActiveSummary(null);
    setNavError(null);
    setIsStarting(false);
  }, []);

  const nextStep = useCallback(() => {
    setActiveStepIndex((i) =>
      Math.min(i + 1, Math.max(0, activeSteps.length - 1)),
    );
  }, [activeSteps.length]);

  const prevStep = useCallback(() => {
    setActiveStepIndex((i) => Math.max(0, i - 1));
  }, []);

  return {
    // state
    isNavigating,
    isStarting,
    navError,
    isNearStart,
    activeSteps,
    activeStepIndex,
    currentStep,
    activeSummary,
    isArrived,

    // actions
    startNavigation,
    startNavigationWithSteps,
    exitNavigation,
    nextStep,
    prevStep,
    setActiveStepIndex,
  };
}
