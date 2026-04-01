import {
  searchSGWBuildings,
  searchLoyolaBuildings,
} from "@/components/Buildings/search";

import type { Building } from "@/components/Buildings/types";

export function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function parseISO(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function dateKey(startISO?: string) {
  const d = parseISO(startISO);
  if (!d) return "unknown";
  return dateKeyFromDate(d);
}

export function formatDayHeader(d: Date) {
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const day = d.getDate();
  let suffix = "th";

  if (day % 10 == 1 && day !== 11) {
    suffix = "st";
  } else if (day % 10 === 2 && day !== 12) {
    suffix = "nd";
  } else if (day % 10 ===  3 && day !== 13) {
    suffix = "rd";
  }

  return `${weekdays[d.getDay()]} ${months[d.getMonth()]} ${day}${suffix} ${d.getFullYear()}`;
}

export function formatTimeRange(startISO?: string, endISO?: string) {
  const s = parseISO(startISO);
  const e = parseISO(endISO);

  if (!s || !e) return "All day";
  const startHasTime = startISO?.includes("T");
  const endHasTime = endISO?.includes("T");
  if (!startHasTime || !endHasTime) return "All day";

  const to12 = (d: Date) => {
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${pad2(m)} ${ampm}`;
  };

  return `${to12(s)} - ${to12(e)}`;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function monthTitle(d: Date) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export type Campus = "SGW" | "LOY";

export type LocationDetails = {
  room?: string;
  campus?: Campus;
  building?: Building;
};

function extractBetweenCampusAndRm(raw: string): string | undefined {
  const lower = raw.toLowerCase();

  const campusIdx = lower.indexOf("campus");
  if (campusIdx === -1) return undefined;

  const dashIdx = lower.indexOf("-", campusIdx);
  if (dashIdx === -1) return undefined;

  const rmIdx = lower.indexOf("rm", dashIdx + 1);
  if (rmIdx === -1) return undefined;

  const between = raw.slice(dashIdx + 1, rmIdx).trim();
  return between || undefined;
}

function removeParenthesizedText(input: string): string {
  let result = "";
  let depth = 0;

  for (const ch of input) {
    if (ch === "(") {
      depth += 1;
      continue;
    }

    if (ch === ")") {
      if (depth > 0) depth -= 1;
      continue;
    }

    if (depth === 0) {
      result += ch;
    }
  }

  return result;
}

function extractFirstParenthesizedText(input: string): string | undefined {
  const start = input.indexOf("(");
  if (start === -1) return undefined;

  const end = input.indexOf(")", start + 1);
  if (end === -1) return undefined;

  const value = input.slice(start + 1, end).trim();
  return value || undefined;
}

export function parseLocationDetails(location?: string): LocationDetails {
  if (!location?.trim()) return {};

  const raw = location.trim();
  const lower = raw.toLowerCase();

  // 1) Detect Campus
  let campus: Campus | undefined;
  if (lower.includes("loyola")) campus = "LOY";
  else if (lower.includes("sir george") || lower.includes("sgw")) {
    campus = "SGW";
  }

  // 2) Extract Room
  const roomMatch = new RegExp(/\bRm\s*([A-Za-z0-9.-]+)\b/i).exec(raw);
  const room = roomMatch?.[1];

  // 3) Extract building candidate text
  const between = extractBetweenCampusAndRm(raw);

  const baseQuery = removeParenthesizedText(between ?? raw)
    .replace(/\bRm\b.*$/i, "")
    .replace(/\broom\b.*$/i, "")
    .replaceAll(/\s+/g, " ")
    .trim();

  const cleaned = baseQuery
    .replaceAll(/\b(campus|sir george|sgw|loyola)\b/gi, "")
    .trim();

  // Build a list of queries to try (most → least likely)
  const queriesToTry = Array.from(
    new Set(
      [
        cleaned,
        cleaned.toLowerCase().includes("building")
          ? null
          : `${cleaned} building`,
        raw,
        raw.toLowerCase().includes("building") ? null : `${raw} building`,
        between ?? null,
        between && !between.toLowerCase().includes("building")
          ? `${between} building`
          : null,
      ].filter(Boolean) as string[],
    ),
  );

  const runSearch = (q: string) => {
    if (!q.trim()) return undefined;
    if (campus === "LOY") return searchLoyolaBuildings(q, 1)[0];
    if (campus === "SGW") return searchSGWBuildings(q, 1)[0];
    return searchSGWBuildings(q, 1)[0] ?? searchLoyolaBuildings(q, 1)[0];
  };

  let building: Building | undefined;

  // 4) Try all query variants
  for (const q of queriesToTry) {
    building = runSearch(q);
    if (building) break;
  }

  // 5) Fallback: building code in parentheses (MB)
  if (!building) {
    const code = extractFirstParenthesizedText(raw);
    if (code) {
      building = runSearch(code);
    }
  }

  const finalCampus = building?.campus ?? campus;
  return { room, campus: finalCampus, building };
}
