import { getRouteStrategy } from "./routeStrategy";

export type DirectionsParams = {
  origin: LatLng;
  destination: LatLng;
  mode: TravelMode;
};

export type TravelMode =
  | "driving"
  | "walking"
  | "transit"
  | "bicycling"
  | "shuttle";

export type LatLng = { latitude: number; longitude: number };

/*this type will allow us to fetch and store/display the transit details on the 
routes summary for better UI experience when selecting a route*/
export type TransitLine = {
  name: string; // e.g. "211"
  vehicleType?: string; // e.g. "BUS", "SUBWAY"
  headsign?: string; // e.g. "WEST"
  agency?: string; // e.g. "STM"
};

export type DirectionRoute = {
  summary: string;
  polyline: string;
  durationSec: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
  transitLines?: TransitLine[];
  steps?: DirectionStep[];
  /** Optional: when a "route" is actually a composed journey (e.g., shuttle).
   *  Allows the UI to render segments with different styles (walk dashed, ride solid).
   */
  segmentPolylines?: {
    walkToStop: string;
    shuttle: string;
    walkToDestination: string;
  };
};

export type DirectionStep = {
  instruction: string;
  distanceText: string;
  durationText: string;
  start: LatLng;
  end: LatLng;
};

/**
 * Returns the fastest route (shortest travel time) from a list.
 */
export function pickFastestRoute(
  routes: DirectionRoute[],
): DirectionRoute | null {
  if (!routes.length) return null;
  return routes[0];
}

/**
 * Minimal polyline decoder (Google encoded polyline algorithm)
 */
export function decodePolyline(encoded: string): LatLng[] {
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLng[] = [];

  while (index < len) {
    let b = 0;
    let shift = 0;
    let result = 0;

    do {
      b = (encoded.codePointAt(index++) ?? 0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = (encoded.codePointAt(index++) ?? 0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coordinates;
}

// Encapsulates fetching and parsing Google Directions API responses for a specific travel mode by using the strategy pattern.
export async function fetchDirections(params: {
  origin: LatLng;
  destination: LatLng;
  mode: TravelMode;
}): Promise<DirectionRoute[]> {
  const strat = getRouteStrategy(params.mode);
  return strat.fetchRoutes(params.origin, params.destination);
}
