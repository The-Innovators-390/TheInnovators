import type { MaterialCommunityIcons } from "@expo/vector-icons";

export type POICategory = "restaurant" | "cafe" | "gym" | "parking" | "library";

export interface POICategoryConfig {
  key: POICategory;
  label: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  placeType: string; // Google Places API type
}

export const POI_CATEGORIES: POICategoryConfig[] = [
  {
    key: "restaurant",
    label: "Restaurants",
    iconName: "silverware-fork-knife",
    placeType: "restaurant",
  },
  { key: "cafe", label: "Coffee", iconName: "coffee", placeType: "cafe" },
  { key: "gym", label: "Gym", iconName: "dumbbell", placeType: "gym" },
  {
    key: "parking",
    label: "Parking",
    iconName: "parking",
    placeType: "parking",
  },
  {
    key: "library",
    label: "Library",
    iconName: "bookshelf",
    placeType: "library",
  },
];

export interface POI {
  id: string;
  name: string;
  category: POICategory;
  latitude: number;
  longitude: number;
  address?: string;
  distance?: number; // metres from campus centre
  photoReference?: string;
  openNow?: boolean;
  rating?: number;
}
