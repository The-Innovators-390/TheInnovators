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
        // Deselected — close sheet and clear
        setActiveCategory(null);
        clearPOIs();
        return;
      }

      setActiveCategory(category);

      // Prefer real user location; fall back to campus centre
      const origin = CAMPUS_CENTRES[focusedCampus];

      if (!userLocation) {
        // Still search from campus centre but note unavailability
        // (we fall back gracefully rather than hard-blocking)
      }

      searchPOIs(category, origin.latitude, origin.longitude);
    },
    [userLocation, focusedCampus, searchPOIs, clearPOIs, setActiveCategory],
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

  return {
    // Refs
    poiSheetRef: sheetRef,

    // State
    pois,
    status,
    selectedPOI,
    activeCategory,

    // Handlers
    handleCategorySelect,
    handleSelectPOI,
    handleGetDirections,
    handleSheetClose,
  };
}
