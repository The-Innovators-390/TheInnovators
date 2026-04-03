import type { Campus } from "@/components/Buildings/types";

export interface CampusTheme {
  brand: string;
  border: string;
  closeBg: string;
  activeColor: string; // for pills, markers, etc.
}

export function useCampusTheme(campus: Campus): CampusTheme {
  if (campus === "SGW") {
    return {
      brand: "#912338",
      border: "rgba(145,35,56,0.25)",
      closeBg: "rgba(145,35,56,0.14)",
      activeColor: "#912338",
    };
  }
  return {
    brand: "#E0B100",
    border: "rgba(224,177,0,0.25)",
    closeBg: "rgba(224,177,0,0.18)",
    activeColor: "#e3ac20",
  };
}
