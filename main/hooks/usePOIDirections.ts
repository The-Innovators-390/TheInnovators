import { useCallback } from "react";
import type { Campus } from "@/components/Buildings/types";
import type { POI } from "@/components/POI/types";

interface UsePOIDirectionsProps {
  focusedCampus: Campus;
  isRouteMode: boolean;
  toggleRouteMode: () => void;
  setRouteDest: (b: any) => void;
  setDestText: (text: string) => void;
  setStartToCurrentLocation: () => Promise<void>;
  closePOISheet: () => void;
  setPoiSheetIndex: (index: number) => void;
  setQuery: (q: string) => void;
}

export function usePOIDirections({
  focusedCampus,
  isRouteMode,
  toggleRouteMode,
  setRouteDest,
  setDestText,
  setStartToCurrentLocation,
  closePOISheet,
  setPoiSheetIndex,
  setQuery,
}: Readonly<UsePOIDirectionsProps>) {
  const handlePOIGetDirections = useCallback(
    async (selectedPoi: POI) => {
      if (!isRouteMode) toggleRouteMode();

      const destBuilding = {
        id: selectedPoi.id,
        name: selectedPoi.name,
        code: "",
        address: selectedPoi.address ?? "",
        latitude: selectedPoi.latitude,
        longitude: selectedPoi.longitude,
        campus: focusedCampus,
        aliases: [],
        polygon: [],
        zoomCategory: 2,
      };

      setRouteDest(destBuilding);
      setDestText(selectedPoi.name);

      await setStartToCurrentLocation();

      closePOISheet();
      setPoiSheetIndex(-1);
      setQuery("");
    },
    [
      isRouteMode,
      toggleRouteMode,
      focusedCampus,
      setRouteDest,
      setDestText,
      setStartToCurrentLocation,
      closePOISheet,
      setPoiSheetIndex,
      setQuery,
    ],
  );

  return { handlePOIGetDirections };
}
