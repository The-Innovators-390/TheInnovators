import { useCallback, useEffect, useRef } from "react";
import type { Campus } from "@/components/Buildings/types";
import { usePOISearch } from "@/hooks/usePOISearch";
import type { POIBottomSheetRef } from "@/components/POI/POIBottomSheet";
import type { POI, POICategory } from "@/components/POI/types";

// Campus centre coordinates
const CAMPUS_CENTRES: Record<Campus, { latitude: number; longitude: number }> =
  {
    SGW: { latitude: 45.4972, longitude: -73.5785 },
    LOY: { latitude: 45.4582, longitude: -73.6405 },
  };

interface UsePOIFeatureProps {
  focusedCampus: Campus;
  userLocation: { latitude: number; longitude: number } | null;
}

export function usePOIFeature({
  focusedCampus,
  userLocation,
}: UsePOIFeatureProps) {
  const {
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
  } = usePOISearch();

  const sheetRef = useRef<POIBottomSheetRef>(null);

  // Clear results when campus toggles
  useEffect(() => {
    clearPOIs();
  }, [focusedCampus, clearPOIs]);

  const handleCategorySelect = useCallback(
    (category: POICategory | null) => {
      if (category === null) {
        // Avoid cancelling the first search accidentally when the user taps
        // the same category again while the loading state is being shown.
        if (status === "loading") return;

        setActiveCategory(null);
        clearPOIs();
        return;
      }

      setActiveCategory(category);

      // Show the sheet immediately so the user gets instant feedback.
      sheetRef.current?.expand();

      // Prefer the real user location when available; otherwise fall back
      // to the selected campus centre.
      const origin = userLocation ?? CAMPUS_CENTRES[focusedCampus];

      searchPOIs(category, origin.latitude, origin.longitude);
    },
    [
      userLocation,
      focusedCampus,
      searchPOIs,
      clearPOIs,
      setActiveCategory,
      status,
    ],
  );

  const handleSelectPOI = useCallback(
    (poi: POI) => {
      setSelectedPOI(poi);
      // Snap sheet up so user can read details
      sheetRef.current?.expand();
    },
    [setSelectedPOI],
  );

  /** Placeholder — coworker will implement routing logic */
  const handleGetDirections = useCallback(
    (poi: POI) => {
      clearPOIs();
    },
    [clearPOIs],
  );

  const handleSheetClose = useCallback(() => {
    clearPOIs();
  }, [clearPOIs]);

  const handleRadiusChange = useCallback(
    (newRadius: number) => {
      setRadius(newRadius);

      if (!activeCategory) return;

      const origin = userLocation ?? CAMPUS_CENTRES[focusedCampus];
      searchPOIs(activeCategory, origin.latitude, origin.longitude, newRadius);
    },
    [activeCategory, focusedCampus, searchPOIs, setRadius, userLocation],
  );

  return {
    // Refs
    poiSheetRef: sheetRef,

    // State
    pois,
    status,
    selectedPOI,
    activeCategory,
    radius,

    // Handlers
    handleCategorySelect,
    handleSelectPOI,
    handleGetDirections,
    handleSheetClose,
    handleRadiusChange,
  };
}
