import Constants from "expo-constants";

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
};

function getTransitLinesFromLeg(leg: unknown): TransitLine[] {
  const transitLines: TransitLine[] = [];
  const extracted = new Set<string>(); // To not store duplicate transit lines details

  for (const step of (leg as any)?.steps ?? []) {
    //We only want to extract the transit details of the part of the trip (step) that is done by transit
    //Therefore, if the mode is not transit then we skip it and move on to the next step
    if (step?.travel_mode !== "TRANSIT") continue;

    const transitDetails = step.transit_details;
    const line = transitDetails?.line;

    if (!line) {
      continue;
    }

    const lineName: string = String(
      line?.short_name ?? line?.name ?? "",
    ).trim();

    if (!lineName) {
      continue;
    }

    const vehicleType: string | undefined = line?.vehicle?.type;
    const headsign: string | undefined =
      typeof transitDetails?.headsign === "string"
        ? transitDetails.headsign.trim()
        : undefined;
    const agencyName: string | undefined =
      Array.isArray(line?.agencies) &&
      typeof line.agencies[0]?.name === "string"
        ? line.agencies[0].name.trim()
        : undefined; //some lines might have multiple agencies, so we will only use the first one as reference

    //we create a unique key for each transit line based on its name, vehicle type, headsign and agency name to store it in our extracted set to use as reference to avoid duplication
    const key = `${lineName}|${vehicleType}|${headsign}|${agencyName}`;

    //we check the set, if the transitDetails' key is already stored, we move to the next step without storing it in our TransitLines array
    if (extracted.has(key)) continue;
    extracted.add(key);

    transitLines.push({
      name: lineName,
      vehicleType: vehicleType,
      headsign: headsign,
      agency: agencyName,
    });
  }
  return transitLines;
}

export type DirectionStep = {
  instruction: string;
  distanceText: string;
  durationText: string;
  start: LatLng;
  end: LatLng;
};

export type DirectionRouteWithSteps = DirectionRoute & {
  steps: DirectionStep[];
};

function getGoogleMapsKey(): string {
  const key = (Constants.expoConfig?.extra as any)?.googleMapsApiKey;
  if (!key)
    throw new Error(
      "Missing Google Maps API key in expoConfig.extra.googleMapsApiKey",
    );
  return key;
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
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
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

export async function fetchDirections(params: {
  origin: LatLng;
  destination: LatLng;
  mode: TravelMode;
}): Promise<DirectionRoute[]> {
  const key = getGoogleMapsKey();
  const { origin, destination, mode } = params;

  const url =
    "https://maps.googleapis.com/maps/api/directions/json" +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=${mode}` +
    `&alternatives=true` +
    `&language=en` +
    `&region=ca` +
    `&key=${key}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(`Directions HTTP ${res.status}`);
  }

  if (json.status !== "OK") {
    // e.g. ZERO_RESULTS, REQUEST_DENIED
    throw new Error(
      `Directions API status: ${json.status} ${json.error_message ?? ""}`.trim(),
    );
  }

  const routes = (json.routes ?? []) as any[];

  return routes
    .map((r) => {
      const leg = r.legs?.[0];
      const duration = leg?.duration;
      const distance = leg?.distance;
      //for transit routes' details
      const transitLines =
        mode === "transit" && leg ? getTransitLinesFromLeg(leg) : undefined;

      return {
        summary: r.summary ?? "",
        polyline: r.overview_polyline?.points ?? "",
        durationSec: duration?.value ?? Number.MAX_SAFE_INTEGER,
        durationText: duration?.text ?? "",
        distanceMeters: distance?.value ?? 0,
        distanceText: distance?.text ?? "",
        transitLines,
      } as DirectionRoute;
    })
    .filter((r) => !!r.polyline);
}

/**
 * Returns the fastest route (shortest travel time) from a list.
 */
export function pickFastestRoute(
  routes: DirectionRoute[],
): DirectionRoute | null {
  if (!routes.length) return null;
  return routes[0];
}

//ADDED HELPER + FUNCTION DIRECTION WITH STEPS
function stripHtml(input: string): string {
  let out = "";
  let insideTag = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === "<") {
      insideTag = true;
      continue;
    }
    if (ch === ">") {
      insideTag = false;
      out += " "; // keep word separation
      continue;
    }

    if (!insideTag) out += ch;
  }

  return out.replace(/\s+/g, " ").trim();
}

export async function fetchDirectionsWithSteps(params: {
  origin: LatLng;
  destination: LatLng;
  mode: TravelMode;
}): Promise<DirectionRouteWithSteps[]> {
  const key = getGoogleMapsKey();
  const { origin, destination, mode } = params;

  const url =
    "https://maps.googleapis.com/maps/api/directions/json" +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=${mode}` +
    `&alternatives=true` +
    `&language=en` +
    `&region=ca` +
    `&key=${key}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok) throw new Error(`Directions HTTP ${res.status}`);
  if (json.status !== "OK") {
    throw new Error(
      `Directions API status: ${json.status} ${json.error_message ?? ""}`.trim(),
    );
  }

  const routes = (json.routes ?? []) as any[];

  return routes
    .map((r) => {
      const leg = r.legs?.[0];
      const duration = leg?.duration;
      const distance = leg?.distance;

      const stepsRaw = (leg?.steps ?? []) as any[];
      const steps: DirectionStep[] = stepsRaw
        .map((s) => {
          const start = s?.start_location;
          const end = s?.end_location;

          return {
            instruction: stripHtml(String(s?.html_instructions ?? "")),
            distanceText: String(s?.distance?.text ?? ""),
            durationText: String(s?.duration?.text ?? ""),
            start: {
              latitude: Number(start?.lat ?? 0),
              longitude: Number(start?.lng ?? 0),
            },
            end: {
              latitude: Number(end?.lat ?? 0),
              longitude: Number(end?.lng ?? 0),
            },
          };
        })
        .filter((st) => st.instruction.length > 0);

      return {
        summary: r.summary ?? "",
        polyline: r.overview_polyline?.points ?? "",
        durationSec: duration?.value ?? Number.MAX_SAFE_INTEGER,
        durationText: duration?.text ?? "",
        distanceMeters: distance?.value ?? 0,
        distanceText: distance?.text ?? "",
        steps,
      } as DirectionRouteWithSteps;
    })
    .filter((r) => !!r.polyline);
}
