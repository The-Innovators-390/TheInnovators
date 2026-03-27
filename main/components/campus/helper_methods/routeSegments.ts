import {
  decodePolyline,
  type DirectionRoute,
  type DirectionStep,
  type TravelMode,
  type LatLng,
} from "@/components/campus/helper_methods/googleDirections";
import {
  baseSegmentKindForMode,
  type RouteSegmentKind,
} from "@/components/campus/helper_methods/routePolylineStyles";

export type RouteRenderSegment = {
  coordinates: LatLng[];
  kind: RouteSegmentKind;
};

function metroKindFromLineName(name?: string): RouteSegmentKind {
  const normalized = String(name ?? "")
    .trim()
    .toLowerCase();

  if (normalized.includes("1")) return "metro-1";
  if (normalized.includes("2")) return "metro-2";
  if (normalized.includes("4")) return "metro-4";
  if (normalized.includes("5")) return "metro-5";

  return "metro-default";
}

function decodeSafe(polyline?: string): LatLng[] {
  if (!polyline) return [];

  try {
    return decodePolyline(polyline);
  } catch {
    return [];
  }
}

function buildDefaultSegments(
  mode: TravelMode,
  route: DirectionRoute,
): RouteRenderSegment[] {
  const coordinates = decodeSafe(route.polyline);
  if (coordinates.length < 2) return [];

  return [
    {
      coordinates,
      kind: baseSegmentKindForMode(mode),
    },
  ];
}

function isMetroTransitStep(step: DirectionStep | undefined): boolean {
  if (!step) return false;
  return (
    step.travelMode?.toUpperCase() === "TRANSIT" &&
    ["SUBWAY", "METRO"].includes(step.transitVehicleType?.toUpperCase() ?? "")
  );
}

function buildTransitSegments(route: DirectionRoute): RouteRenderSegment[] {
  const segments: RouteRenderSegment[] = [];
  const steps = route.steps ?? [];

  steps.forEach((step, index) => {
    const coordinates = decodeSafe(step.polyline);
    if (coordinates.length < 2) return;

    const travelMode = step.travelMode?.toUpperCase();

    if (travelMode === "WALKING") {
      const previousStep = steps[index - 1];
      const nextStep = steps[index + 1];

      const isMetroConnectionWalk =
        isMetroTransitStep(previousStep) && isMetroTransitStep(nextStep);

      if (!isMetroConnectionWalk) {
        segments.push({ coordinates, kind: "walking" });
      }

      return;
    }

    if (travelMode === "TRANSIT") {
      const vehicleType = step.transitVehicleType?.toUpperCase();

      if (vehicleType === "SUBWAY" || vehicleType === "METRO") {
        segments.push({
          coordinates,
          kind: metroKindFromLineName(step.transitLineName),
        });
        return;
      }

      segments.push({ coordinates, kind: "bus" });
    }
  });

  return segments.length > 0
    ? segments
    : buildDefaultSegments("transit", route);
}

function buildShuttleSegments(route: DirectionRoute): RouteRenderSegment[] {
  const segmentPolylines = route.segmentPolylines;
  if (!segmentPolylines) {
    return buildDefaultSegments("shuttle", route);
  }

  const result: RouteRenderSegment[] = [];

  const walkToStop = decodeSafe(segmentPolylines.walkToStop);
  if (walkToStop.length >= 2) {
    result.push({ coordinates: walkToStop, kind: "walking" });
  }

  const shuttleRide = decodeSafe(segmentPolylines.shuttle);
  if (shuttleRide.length >= 2) {
    result.push({ coordinates: shuttleRide, kind: "shuttle" });
  }

  const walkToDestination = decodeSafe(segmentPolylines.walkToDestination);
  if (walkToDestination.length >= 2) {
    result.push({ coordinates: walkToDestination, kind: "walking" });
  }

  return result.length > 0 ? result : buildDefaultSegments("shuttle", route);
}

export function buildRouteRenderSegments(
  mode: TravelMode,
  route: DirectionRoute,
): RouteRenderSegment[] {
  if (mode === "transit") {
    return buildTransitSegments(route);
  }

  if (mode === "shuttle") {
    return buildShuttleSegments(route);
  }

  return buildDefaultSegments(mode, route);
}

export function flattenRouteSegmentCoordinates(
  segments: RouteRenderSegment[],
): LatLng[] {
  const combined: LatLng[] = [];

  segments.forEach((segment, index) => {
    if (index === 0) {
      combined.push(...segment.coordinates);
      return;
    }

    combined.push(...segment.coordinates.slice(1));
  });

  return combined;
}
