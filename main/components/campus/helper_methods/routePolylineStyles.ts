export type RouteSegmentKind =
  | "driving"
  | "bicycling"
  | "walking"
  | "bus"
  | "metro-1"
  | "metro-2"
  | "metro-4"
  | "metro-5"
  | "metro-default"
  | "shuttle";

export const ROUTE_COLORS = {
  blue: "#4286F5",
  navy: "#003e97",
  metroGreen: "#2E7D32",
  metroOrange: "#EF6C00",
  metroBlue: "#1565C0",
  metroYellow: "#F9A825",
  shuttleBurgundy: "#912338",
} as const;

export function baseSegmentKindForMode(mode: string): RouteSegmentKind {
  switch (mode) {
    case "walking":
      return "walking";
    case "bicycling":
      return "bicycling";
    case "shuttle":
      return "shuttle";
    case "transit":
      return "bus";
    case "driving":
    default:
      return "driving";
  }
}

export function colorForSegmentKind(kind: RouteSegmentKind): string {
  switch (kind) {
    case "bus":
    case "metro-default":
      return ROUTE_COLORS.navy;
    case "metro-1":
      return ROUTE_COLORS.metroGreen;
    case "metro-2":
      return ROUTE_COLORS.metroOrange;
    case "metro-4":
      return ROUTE_COLORS.metroBlue;
    case "metro-5":
      return ROUTE_COLORS.metroYellow;
    case "shuttle":
      return ROUTE_COLORS.shuttleBurgundy;
    case "walking":
    case "bicycling":
    case "driving":
    default:
      return ROUTE_COLORS.blue;
  }
}

export function dashPatternForSegmentKind(
  kind: RouteSegmentKind,
): number[] | undefined {
  return kind === "walking" ? [10, 8] : undefined;
}
