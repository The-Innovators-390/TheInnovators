import { useState, useCallback, useRef } from "react";
import {
  POI_CATEGORIES,
  type POI,
  type POICategory,
  type POICategoryConfig,
} from "@/components/POI/types";

const DEFAULT_SEARCH_RADIUS = 800;
// Max results returned per search
const MAX_RESULTS = 20;

const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export type POISearchStatus =
  | "idle"
  | "loading"
  | "success"
  | "no_results"
  | "error"
  | "location_unavailable";

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function usePOISearch() {
  const [pois, setPois] = useState<POI[]>([]);
  const [status, setStatus] = useState<POISearchStatus>("idle");
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [activeCategory, setActiveCategory] = useState<POICategory | null>(
    null,
  );
  const [radius, setRadius] = useState<number>(DEFAULT_SEARCH_RADIUS);
  const abortRef = useRef<AbortController | null>(null);

  const searchPOIs = useCallback(
    async (
      category: POICategory,
      originLat: number,
      originLng: number,
      searchRadius: number = radius,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const config = POI_CATEGORIES.find(
        (c: POICategoryConfig) => c.key === category,
      );
      if (!config) return;

      setStatus("loading");
      setPois([]);
      setSelectedPOI(null);

      try {
        const url =
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
          `?location=${originLat},${originLng}` +
          `&radius=${searchRadius}` +
          `&type=${config.placeType}` +
          `&key=${PLACES_API_KEY}`;

        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();

        if (data.status === "ZERO_RESULTS" || data.results?.length === 0) {
          setStatus("no_results");
          return;
        }

        if (data.status !== "OK") {
          console.error("Places API error:", data.status, data.error_message);
          setStatus("error");
          return;
        }

        const results: POI[] = (data.results as any[])
          .map((place: any) => ({
            id: place.place_id,
            name: place.name,
            category,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            address: place.vicinity,
            distance: Math.round(
              haversineDistance(
                originLat,
                originLng,
                place.geometry.location.lat,
                place.geometry.location.lng,
              ),
            ),
            photoReference: place.photos?.[0]?.photo_reference,
            openNow: place.opening_hours?.open_now,
            rating: place.rating,
          }))
          .filter((place) => (place.distance ?? 0) <= searchRadius)
          .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
          .slice(0, MAX_RESULTS);
        if (results.length === 0) {
          setStatus("no_results");
          return;
        }

        setPois(results);
        setStatus("success");
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("POI fetch error:", err);
        setStatus("error");
      }
    },
    [radius],
  );

  const clearPOIs = useCallback(() => {
    abortRef.current?.abort();
    setPois([]);
    setStatus("idle");
    setSelectedPOI(null);
    setActiveCategory(null);
  }, []);

  return {
    pois,
    status,
    selectedPOI,
    setSelectedPOI,
    activeCategory,
    setActiveCategory,
    radius,
    setRadius,
    searchPOIs,
    clearPOIs,
  };
}
