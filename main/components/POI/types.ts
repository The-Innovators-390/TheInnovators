import type { MaterialCommunityIcons } from "@expo/vector-icons";

export type POICategory = "restaurant" | "cafe" | "gym" | "parking" | "library";

export interface POICategoryConfig {
  key: POICategory;
  label: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  emoji: string;
  placeType: string; // Google Places API type
}

export const POI_CATEGORIES: POICategoryConfig[] = [
  {
    key: "restaurant",
    label: "Restaurants",
    iconName: "silverware-fork-knife",
    emoji: "🍴",
    placeType: "restaurant",
  },
  {
    key: "cafe",
    label: "Coffee",
    iconName: "coffee",
    emoji: "☕",
    placeType: "cafe",
  },
  {
    key: "gym",
    label: "Gym",
    iconName: "dumbbell",
    emoji: "🏋️",
    placeType: "gym",
  },
  {
    key: "parking",
    label: "Parking",
    iconName: "parking",
    emoji: "🅿️",
    placeType: "parking",
  },
  {
    key: "library",
    label: "Library",
    iconName: "bookshelf",
    emoji: "📚",
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
