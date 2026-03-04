/**
 * Concordia Shuttle Bus schedule data and helpers.
 *
 * The shuttle runs Monday–Friday between SGW (Sir George Williams) and
 * Loyola campuses. Weekend service is not offered.
 */

import type { Campus } from "@/components/Buildings/types";
import {
    fetchDirections,
    pickFastestRoute,
    type DirectionRoute,
    type DirectionStep,
    type LatLng,
} from "./googleDirections";

// ─── Shuttle Stop Coordinates ─────────────────────────────────────────────────

/** Concordia shuttle pickup point at SGW campus (near Hall Building) */
export const SGW_SHUTTLE_STOP: LatLng = {
    latitude: 45.4968,
    longitude: -73.5789,
};

/** Concordia shuttle pickup point at Loyola campus (near AD Building) */
export const LOY_SHUTTLE_STOP: LatLng = {
    latitude: 45.458,
    longitude: -73.6395,
};

// ─── Schedule Data ────────────────────────────────────────────────────────────

const SHUTTLE_RIDE_MIN = 30; // approximate ride time between campuses
const SHUTTLE_DISTANCE_M = 8_000; // ~8 km between campuses

type ScheduleEntry = {
    days: string[];
    departures: string[];
    lastBus: string;
};

const SCHEDULE: Record<string, ScheduleEntry> = {
    SGW_TO_LOYOLA: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        departures: [
            "09:30",
            "09:45",
            "10:00",
            "10:15",
            "10:30",
            "10:45",
            "11:00",
            "11:15",
            "11:30",
            "12:15",
            "12:30",
            "12:45",
            "13:00",
            "13:15",
            "13:30",
            "13:45",
            "14:00",
            "14:15",
            "14:30",
            "14:45",
            "15:00",
            "15:15",
            "15:30",
            "16:00",
            "16:15",
            "16:45",
            "17:00",
            "17:15",
            "17:30",
            "17:45",
            "18:00",
            "18:15",
            "18:30",
        ],
        lastBus: "18:30",
    },
    LOYOLA_TO_SGW: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        departures: [
            "09:15",
            "09:30",
            "09:45",
            "10:00",
            "10:15",
            "10:30",
            "10:45",
            "11:00",
            "11:15",
            "11:30",
            "11:45",
            "12:30",
            "12:45",
            "13:00",
            "13:15",
            "13:30",
            "13:45",
            "14:00",
            "14:15",
            "14:30",
            "14:45",
            "15:00",
            "15:15",
            "15:30",
            "15:45",
            "16:30",
            "16:45",
            "17:00",
            "17:15",
            "17:30",
            "17:45",
            "18:00",
            "18:15",
            "18:30",
        ],
        lastBus: "18:30",
    },
    SGW_TO_LOYOLA_FRIDAY: {
        days: ["Friday"],
        departures: [
            "09:45",
            "10:00",
            "10:15",
            "10:45",
            "11:15",
            "11:30",
            "12:15",
            "12:30",
            "12:45",
            "13:15",
            "13:45",
            "14:00",
            "14:15",
            "14:45",
            "15:00",
            "15:15",
            "15:45",
            "16:00",
            "16:45",
            "17:15",
            "17:45",
            "18:15",
        ],
        lastBus: "18:15",
    },
    LOYOLA_TO_SGW_FRIDAY: {
        days: ["Friday"],
        departures: [
            "09:15",
            "09:30",
            "09:45",
            "10:15",
            "10:45",
            "11:00",
            "11:15",
            "12:00",
            "12:15",
            "12:45",
            "13:00",
            "13:15",
            "13:45",
            "14:15",
            "14:30",
            "14:45",
            "15:15",
            "15:30",
            "15:45",
            "16:45",
            "17:15",
            "17:45",
            "18:15",
        ],
        lastBus: "18:15",
    },
};

// ─── Direction ────────────────────────────────────────────────────────────────

export type ShuttleDirection = "SGW_TO_LOY" | "LOY_TO_SGW";

/** True only when one endpoint is SGW and the other is Loyola. */
export function isCampusToCampusRoute(
    startCampus: Campus,
    destCampus: Campus,
): boolean {
    return (
        (startCampus === "SGW" && destCampus === "LOY") ||
        (startCampus === "LOY" && destCampus === "SGW")
    );
}

export function getShuttleDirection(
    startCampus: Campus,
    destCampus: Campus,
): ShuttleDirection {
    return startCampus === "SGW" ? "SGW_TO_LOY" : "LOY_TO_SGW";
}

// ─── Montreal Time Utilities ──────────────────────────────────────────────────

function getMontrealNow(): { dayName: string; minuteOfDay: number } {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Montreal",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);

    const dayName = parts.find((p) => p.type === "weekday")?.value ?? "";
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minute = parseInt(
        parts.find((p) => p.type === "minute")?.value ?? "0",
        10,
    );
    // Intl.DateTimeFormat can return "24" for midnight — normalise it
    const normHour = hour >= 24 ? 0 : hour;
    return { dayName, minuteOfDay: normHour * 60 + minute };
}

function parseMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

// ─── Schedule Lookup ──────────────────────────────────────────────────────────

function getTodaySchedule(direction: ShuttleDirection): string[] | null {
    const { dayName } = getMontrealNow();
    const day = dayName.toLowerCase();

    if (day === "saturday" || day === "sunday") return null;

    const isFriday = day === "friday";
    const key =
        direction === "SGW_TO_LOY"
            ? isFriday
                ? "SGW_TO_LOYOLA_FRIDAY"
                : "SGW_TO_LOYOLA"
            : isFriday
                ? "LOYOLA_TO_SGW_FRIDAY"
                : "LOYOLA_TO_SGW";

    return SCHEDULE[key]?.departures ?? null;
}

// ─── Status ───────────────────────────────────────────────────────────────────

export type ShuttleStatus =
    | "operating"
    | "no-service-today"
    | "last-bus-departed";

export function getShuttleStatus(direction: ShuttleDirection): ShuttleStatus {
    const schedule = getTodaySchedule(direction);
    if (!schedule) return "no-service-today";

    const { minuteOfDay } = getMontrealNow();
    const hasUpcoming = schedule.some((t) => parseMinutes(t) > minuteOfDay);
    return hasUpcoming ? "operating" : "last-bus-departed";
}

// ─── Next Departures ──────────────────────────────────────────────────────────

/** Returns the next `count` departure times ("HH:MM") from now. */
export function getNextDepartures(
    direction: ShuttleDirection,
    count: number,
): string[] {
    const schedule = getTodaySchedule(direction);
    if (!schedule) return [];

    const { minuteOfDay } = getMontrealNow();
    return schedule.filter((t) => parseMinutes(t) > minuteOfDay).slice(0, count);
}

// ─── Shared Info Type (used by TravelOptionsPopup) ───────────────────────────

export type ShuttleInfo = {
    status: ShuttleStatus;
    /** Up to 5 next departure times in "HH:MM" format. */
    nextDepartures: string[];
    direction: ShuttleDirection;
};

export function buildShuttleInfo(direction: ShuttleDirection): ShuttleInfo {
    return {
        status: getShuttleStatus(direction),
        nextDepartures: getNextDepartures(direction, 5),
        direction,
    };
}

// ─── Polyline Encoder ─────────────────────────────────────────────────────────

function encodePolylineValue(value: number): string {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let result = "";
    while (v >= 0x20) {
        result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
        v >>= 5;
    }
    return result + String.fromCharCode(v + 63);
}

function encodePolyline(points: LatLng[]): string {
    let prevLat = 0;
    let prevLng = 0;
    let result = "";
    for (const { latitude, longitude } of points) {
        const lat = Math.round(latitude * 1e5);
        const lng = Math.round(longitude * 1e5);
        result +=
            encodePolylineValue(lat - prevLat) + encodePolylineValue(lng - prevLng);
        prevLat = lat;
        prevLng = lng;
    }
    return result;
}

// ─── Build Synthetic DirectionRoute ──────────────────────────────────────────

/**
 * Builds a synthetic DirectionRoute for the shuttle leg.
 * Returns null when there is no service or no upcoming bus today.
 *
 * The polyline follows: origin → campus stop → remote stop → destination.
 */
export function buildShuttleDirectionRoute(
    direction: ShuttleDirection,
    origin: LatLng,
    destination: LatLng,
): DirectionRoute | null {
    const status = getShuttleStatus(direction);
    if (status !== "operating") return null;

    const next = getNextDepartures(direction, 1);
    if (next.length === 0) return null;

    const { minuteOfDay } = getMontrealNow();
    const boardStop =
        direction === "SGW_TO_LOY" ? SGW_SHUTTLE_STOP : LOY_SHUTTLE_STOP;
    const alightStop =
        direction === "SGW_TO_LOY" ? LOY_SHUTTLE_STOP : SGW_SHUTTLE_STOP;

    const polyline = encodePolyline([origin, boardStop, alightStop, destination]);

    const waitMin = parseMinutes(next[0]) - minuteOfDay;
    const totalMin = waitMin + SHUTTLE_RIDE_MIN;
    const totalSec = totalMin * 60;

    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const durationText =
        h > 0 ? `${h}h ${m > 0 ? `${m} min` : ""}`.trim() : `${m} min`;

    return {
        summary: "Concordia Shuttle",
        polyline,
        durationSec: totalSec,
        durationText,
        distanceMeters: SHUTTLE_DISTANCE_M,
        distanceText: "~8 km",
    };
}

/**
 * Builds a shuttle route that follows real roads/paths by composing 3 Google routes:
 *   1) walking: origin -> boarding stop (dashed)
 *   2) driving: boarding stop -> alight stop (solid)
 *   3) walking: alight stop -> destination (dashed)
 *
 * Returns null when there is no upcoming shuttle service.
 */
export async function buildShuttleDirectionRouteFromGoogle(
    direction: ShuttleDirection,
    origin: LatLng,
    destination: LatLng,
): Promise<DirectionRoute | null> {
    const status = getShuttleStatus(direction);
    if (status !== "operating") return null;

    const next = getNextDepartures(direction, 1);
    if (next.length === 0) return null;

    const { minuteOfDay } = getMontrealNow();
    const boardStop =
        direction === "SGW_TO_LOY" ? SGW_SHUTTLE_STOP : LOY_SHUTTLE_STOP;
    const alightStop =
        direction === "SGW_TO_LOY" ? LOY_SHUTTLE_STOP : SGW_SHUTTLE_STOP;

    // Fetch 3 segments in parallel.
    const [walkToStopRoutes, rideRoutes, walkToDestRoutes] = await Promise.all([
        fetchDirections({ origin, destination: boardStop, mode: "walking" }),
        // We use "driving" to force road-following geometry and avoid a straight line.
        fetchDirections({
            origin: boardStop,
            destination: alightStop,
            mode: "driving",
        }),
        fetchDirections({ origin: alightStop, destination, mode: "walking" }),
    ]);

    const sortByDuration = (rs: DirectionRoute[]) =>
        [...rs].sort((a, b) => a.durationSec - b.durationSec);

    const walk1 = pickFastestRoute(sortByDuration(walkToStopRoutes));
    const ride = pickFastestRoute(sortByDuration(rideRoutes));
    const walk2 = pickFastestRoute(sortByDuration(walkToDestRoutes));

    if (!walk1 || !ride || !walk2) return null;

    // Combined polyline for fit-to-coordinates (avoid duplicates at boundaries).
    // We keep segment polylines too, so UI can render dashed walking legs.
    const walk1Pts = decodePolylineSafe(walk1.polyline);
    const ridePts = decodePolylineSafe(ride.polyline);
    const walk2Pts = decodePolylineSafe(walk2.polyline);

    const combinedPts = [
        ...walk1Pts,
        ...ridePts.slice(1),
        ...walk2Pts.slice(1),
    ];
    const combinedPolyline =
        combinedPts.length >= 2 ? encodePolyline(combinedPts) : ride.polyline;

    const waitMin = parseMinutes(next[0]) - minuteOfDay;
    const waitSec = Math.max(0, waitMin) * 60;

    const totalSec =
        waitSec + walk1.durationSec + ride.durationSec + walk2.durationSec;
    const totalMin = Math.round(totalSec / 60);

    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const durationText =
        h > 0 ? `${h}h ${m > 0 ? `${m} min` : ""}`.trim() : `${m} min`;

    const totalDistance =
        walk1.distanceMeters + ride.distanceMeters + walk2.distanceMeters;

    return {
        summary: "Concordia Shuttle",
        polyline: combinedPolyline,
        durationSec: totalSec,
        durationText,
        distanceMeters: totalDistance,
        distanceText: metersToApproxText(totalDistance),
        segmentPolylines: {
            walkToStop: walk1.polyline,
            shuttle: ride.polyline,
            walkToDestination: walk2.polyline,
        },
    };
}

function decodePolylineSafe(encoded: string): LatLng[] {
    try {
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

            coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
        }

        return coordinates;
    } catch {
        return [];
    }
}

function metersToApproxText(meters: number): string {
    if (!Number.isFinite(meters) || meters <= 0) return "";
    const km = meters / 1000;
    if (km >= 1) return `~${km.toFixed(1)} km`;
    return `~${Math.round(meters)} m`;
}

// ─── Build Navigation Steps ───────────────────────────────────────────────────

/**
 * Returns 3 simple navigation steps for the shuttle journey:
 *   1. Walk to the shuttle stop.
 *   2. Board and ride the shuttle.
 *   3. Walk from the remote stop to the destination.
 */
export function buildShuttleNavigationSteps(
    direction: ShuttleDirection,
    origin: LatLng,
    destination: LatLng,
): DirectionStep[] {
    const boardStop =
        direction === "SGW_TO_LOY" ? SGW_SHUTTLE_STOP : LOY_SHUTTLE_STOP;
    const alightStop =
        direction === "SGW_TO_LOY" ? LOY_SHUTTLE_STOP : SGW_SHUTTLE_STOP;
    const fromLabel = direction === "SGW_TO_LOY" ? "SGW" : "Loyola";
    const toLabel = direction === "SGW_TO_LOY" ? "Loyola" : "SGW";

    const next = getNextDepartures(direction, 1);
    const timeNote = next.length > 0 ? ` (next departure at ${next[0]})` : "";

    return [
        {
            instruction: `Walk to the Concordia Shuttle stop at ${fromLabel} campus${timeNote}`,
            distanceText: "",
            durationText: "",
            start: origin,
            end: boardStop,
        },
        {
            instruction: `Board the Concordia Shuttle Bus — ride ~${SHUTTLE_RIDE_MIN} min to ${toLabel} campus`,
            distanceText: `~${SHUTTLE_DISTANCE_M / 1000} km`,
            durationText: `~${SHUTTLE_RIDE_MIN} min`,
            start: boardStop,
            end: alightStop,
        },
        {
            instruction: `Arrived at ${toLabel} campus shuttle stop — walk to your destination`,
            distanceText: "",
            durationText: "",
            start: alightStop,
            end: destination,
        },
    ];
}