import MapView from "react-native-maps";
import type { RouteRenderSegment } from "@/components/campus/helper_methods/routeSegments";
import type {
  TravelMode,
  DirectionRoute,
} from "@/components/campus/helper_methods/googleDirections";
import type { PendingTransitRender } from "@/components/campus/CampusMap";
import type { ShuttleDirection } from "./shuttleSchedule";

export function applySelectedRouteRendering(params: {
  bestMode: TravelMode;
  selectedSegments: RouteRenderSegment[];
  selectedCoords: { latitude: number; longitude: number }[];
  setShowRouteLayer: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderedRouteSegments: React.Dispatch<
    React.SetStateAction<RouteRenderSegment[]>
  >;
  setRoutePolylineMountKey: React.Dispatch<React.SetStateAction<number>>;
  setPendingTransitRender: React.Dispatch<
    React.SetStateAction<PendingTransitRender | null>
  >;
  mapRef: React.RefObject<MapView | null>;
}) {
  const {
    bestMode,
    selectedSegments,
    selectedCoords,
    setShowRouteLayer,
    setRenderedRouteSegments,
    setRoutePolylineMountKey,
    setPendingTransitRender,
    mapRef,
  } = params;

  if (bestMode === "transit") {
    setShowRouteLayer(false);
    setRenderedRouteSegments([]);
    setRoutePolylineMountKey((k) => k + 1);
    setPendingTransitRender({
      segments: selectedSegments,
      coords: selectedCoords,
      fitToRoute: true,
    });
    return;
  }

  setRenderedRouteSegments(selectedSegments);
  setShowRouteLayer(selectedSegments.length > 0);
  setRoutePolylineMountKey((k) => k + 1);

  if (selectedCoords.length >= 2) {
    mapRef.current?.fitToCoordinates(selectedCoords, {
      edgePadding: {
        top: 90,
        right: 70,
        bottom: 260,
        left: 70,
      },
      animated: true,
    });
  }
}

export function buildTravelModes(
  routesByMode: Record<TravelMode, DirectionRoute[]>,
  shuttleDirection: ShuttleDirection | null,
  shuttleEligible: boolean,
) {
  const travelModes = [
    { mode: "driving" as TravelMode, routes: routesByMode.driving },
    { mode: "transit" as TravelMode, routes: routesByMode.transit },
    { mode: "walking" as TravelMode, routes: routesByMode.walking },
    { mode: "bicycling" as TravelMode, routes: routesByMode.bicycling },
  ];

  if (shuttleDirection !== null && shuttleEligible) {
    travelModes.push({
      mode: "shuttle" as TravelMode,
      routes: routesByMode.shuttle,
    });
  }

  return travelModes;
}
