import { useState, useCallback, useRef } from "react";
import { POI_CATEGORIES, type POI, type POICategory, type POICategoryConfig } from "@/components/POI/types";

// Fixed radius around campus centre (metres)
const SEARCH_RADIUS = 800;
// Max results returned per search
const MAX_RESULTS = 10;

const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

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
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function usePOISearch() {
  const [pois, setPois] = useState<POI[]>([]);
  const [status, setStatus] = useState<POISearchStatus>("idle");
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [activeCategory, setActiveCategory] = useState<POICategory | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const searchPOIs = useCallback(
    async (
      category: POICategory,
      originLat: number,
      originLng: number,
    ) => {
      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const config = POI_CATEGORIES.find((c: POICategoryConfig) => c.key === category);
      if (!config) return;

      setStatus("loading");
      setPois([]);
      setSelectedPOI(null);

      try {
        const url =
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
          `?location=${originLat},${originLng}` +
          `&radius=${SEARCH_RADIUS}` +
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
          .slice(0, MAX_RESULTS)
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
          .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

        setPois(results);
        setStatus("success");
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("POI fetch error:", err);
        setStatus("error");
      }
    },
    [],
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
    searchPOIs,
    clearPOIs,
  };
}