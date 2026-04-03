import { useCallback } from "react";
import type { Campus } from "@/components/Buildings/types";
import type { POI } from "@/components/POI/types";

type RoutePoint = {
    id: string;
    name: string;
    code: string;
    address: string;
    latitude: number;
    longitude: number;
    campus: Campus;
    aliases: string[];
    polygon: [];
    zoomCategory: number;
};

interface UsePOIDirectionsProps {
    focusedCampus: Campus;
    isRouteMode: boolean;
    toggleRouteMode: () => void;
    setRouteStart: (point: RoutePoint) => void;
    setRouteDest: (point: RoutePoint) => void;
    setStartText: (text: string) => void;
    setDestText: (text: string) => void;
    userLocation: { latitude: number; longitude: number } | null;
    setStartToCurrentLocation: () => Promise<void>;
    closePOISheet: () => void;
    setPoiSheetIndex: (index: number) => void;
    setQuery: (q: string) => void;
}

export function usePOIDirections({
                                     focusedCampus,
                                     isRouteMode,
                                     toggleRouteMode,
                                     setRouteStart,
                                     setRouteDest,
                                     setStartText,
                                     setDestText,
                                     userLocation,
                                     setStartToCurrentLocation,
                                     closePOISheet,
                                     setPoiSheetIndex,
                                     setQuery,
                                 }: Readonly<UsePOIDirectionsProps>) {
    const handlePOIGetDirections = useCallback(
        async (selectedPoi: POI) => {
            if (!isRouteMode) {
                toggleRouteMode();
            }

            if (userLocation) {
                setRouteStart({
                    id: "USER_LOCATION",
                    name: "Your location",
                    code: "",
                    address: "",
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    campus: focusedCampus,
                    aliases: [],
                    polygon: [],
                    zoomCategory: 2,
                });

                setStartText("Your location");
            } else {
                await setStartToCurrentLocation();
            }

            setRouteDest({
                id: `POI-${selectedPoi.id}`,
                name: selectedPoi.name,
                code: "",
                address: selectedPoi.address ?? "",
                latitude: selectedPoi.latitude,
                longitude: selectedPoi.longitude,
                campus: focusedCampus,
                aliases: [],
                polygon: [],
                zoomCategory: 2,
            });

            setDestText(selectedPoi.name);

            closePOISheet();
            setPoiSheetIndex(-1);
            setQuery("");
        },
        [
            isRouteMode,
            toggleRouteMode,
            setRouteStart,
            setRouteDest,
            setStartText,
            setDestText,
            userLocation,
            focusedCampus,
            setStartToCurrentLocation,
            closePOISheet,
            setPoiSheetIndex,
            setQuery,
        ],
    );

    return { handlePOIGetDirections };
}