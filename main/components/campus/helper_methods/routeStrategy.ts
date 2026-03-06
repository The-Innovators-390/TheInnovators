import Constants from "expo-constants";
import type {
  LatLng,
  DirectionRoute,
  TransitLine,
  TravelMode,
  DirectionStep,
} from "./googleDirections";

export type RouteChip =
  | { kind: "bus"; label: string }
  | { kind: "metro"; label: string; line?: "1" | "2" | "4" | "5" };

// Helper methods
function directionsToURL(
  origin: LatLng,
  destination: LatLng,
  mode: Exclude<TravelMode, "shuttle">,
  key: string,
): string {
  return (
    "https://maps.googleapis.com/maps/api/directions/json" +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=${mode}` +
    `&alternatives=true` +
    `&language=en` +
    `&region=ca` +
    `&key=${key}`
  );
}

function getGoogleMapsKey(): string {
  const key = (Constants.expoConfig?.extra as any)?.googleMapsApiKey;
  if (!key)
    throw new Error(
      "Missing Google Maps API key in expoConfig.extra.googleMapsApiKey",
    );
  return key;
}

function parseBasicRoute(r: any): DirectionRoute {
  const leg = r.legs?.[0];
  const duration = leg?.duration;
  const distance = leg?.distance;

  return {
    summary: r.summary ?? "",
    polyline: r.overview_polyline?.points ?? "",
    durationSec: duration?.value ?? Number.MAX_SAFE_INTEGER,
    durationText: duration?.text ?? "",
    distanceMeters: distance?.value ?? 0,
    distanceText: distance?.text ?? "",
  };
}

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
      out += " ";
      continue;
    }
    if (!insideTag) out += ch;
  }

  return out.replace(/\s+/g, " ").trim();
}

function parseStepsFromLeg(leg: any): DirectionStep[] {
  const stepsRaw = (leg?.steps ?? []) as any[];

  return stepsRaw
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
      } as DirectionStep;
    })
    .filter((st) => st.instruction.length > 0);
}

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

// Chips helpers (bus + metro)
function busChipsFrom(route: DirectionRoute): RouteChip[] {
  const set = new Set<string>();
  for (const line of route.transitLines ?? []) {
    if (line.vehicleType?.toLowerCase() === "bus" && line.name)
      set.add(line.name);
  }
  return [...set].slice(0, 4).map((n) => ({ kind: "bus", label: n }));
}

function metroLineColor(name: string): string | undefined {
  const n = name.trim().toLowerCase();
  if (n.includes("1")) return "#2E7D32"; // green
  if (n.includes("2")) return "#EF6C00"; // orange
  if (n.includes("4")) return "#F9A825"; // yellow
  if (n.includes("5")) return "#1565C0"; // blue
  return undefined;
}

function metroChipsFrom(route: DirectionRoute): RouteChip[] {
  const set = new Set<string>();
  for (const line of route.transitLines ?? []) {
    const t = line.vehicleType?.toLowerCase();
    if ((t === "subway" || t === "metro") && line.name) set.add(line.name);
  }
  return [...set]
    .slice(0, 2)
    .map((n) => ({ kind: "metro", label: n, lineColor: metroLineColor(n) }));
}

//===========================================================================================================================================================
// Strategy pattern to encapsulate fetching and parsing Google Directions API responses for different travel modes (driving, walking, transit, bicycling).
//===========================================================================================================================================================
abstract class RouteStrategy {
  abstract readonly mode: Exclude<TravelMode, "shuttle">;

  protected parseRoute(r: any): DirectionRoute {
    return parseBasicRoute(r);
  }

  protected async fetchDirectionsJSON(
    origin: LatLng,
    destination: LatLng,
  ): Promise<any> {
    const key = getGoogleMapsKey();
    const url = directionsToURL(origin, destination, this.mode, key);

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

    return json;
  }

  async fetchRoutes(
    origin: LatLng,
    destination: LatLng,
  ): Promise<DirectionRoute[]> {
    const json = await this.fetchDirectionsJSON(origin, destination);
    const routes = (json.routes ?? []) as any[];

    return routes.map(this.parseRoute).filter((r) => !!r.polyline);
  }

  getChips(route: DirectionRoute): RouteChip[] {
    return [];
  }
}

export class DrivingStrategy extends RouteStrategy {
  readonly mode = "driving";

  protected parseRoute(r: any): DirectionRoute {
    const base = parseBasicRoute(r);
    const leg = r.legs?.[0];

    return {
      ...base,
      steps: leg ? parseStepsFromLeg(leg) : [],
    };
  }
}

export class WalkingStrategy extends RouteStrategy {
  readonly mode = "walking";
}

export class BicyclingStrategy extends RouteStrategy {
  readonly mode = "bicycling";
}

export class TransitStrategy extends RouteStrategy {
  readonly mode = "transit";

  protected parseRoute(r: any): DirectionRoute {
    const base = parseBasicRoute(r);
    const leg = r.legs?.[0];

    const transitLines = leg ? getTransitLinesFromLeg(leg) : [];
    const steps = leg ? parseStepsFromLeg(leg) : [];

    return {
      ...base,
      transitLines,
      steps,
    };
  }

  getChips(route: DirectionRoute): RouteChip[] {
    return [...busChipsFrom(route), ...metroChipsFrom(route)];
  }
}

export function getRouteStrategy(mode: TravelMode): RouteStrategy {
  switch (mode) {
    case "driving":
      return new DrivingStrategy();
    case "walking":
      return new WalkingStrategy();
    case "transit":
      return new TransitStrategy();
    case "bicycling":
      return new BicyclingStrategy();
    case "shuttle":
      return null as any; //shuttle should be handled separately and should not use this function to be retrieved
    default:
      throw new Error(`Unsupported travel mode: ${mode}`);
  }
}
