import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
} from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    Image,
    Keyboard,
    Platform,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, Marker, LatLng } from "react-native-maps";
import {
    getDeviceLocation,
    LocationError,
} from "@/components/campus/helper_methods/locationUtils";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { SGW_BUILDINGS } from "@/components/Buildings/SGW/SGWBuildings";
import { LOYOLA_BUILDINGS } from "@/components/Buildings/Loyola/LoyolaBuildings";
import {
    SGW_REGION,
    LOY_REGION,
    INITIAL_REGION,
} from "@/components/campus/helper_methods/campusMap.constants";
import type { Building, Campus } from "@/components/Buildings/types";
import {
    regionFromPolygon,
    paddingForZoomCategory,
} from "@/components/Buildings/mapZoom";
import BuildingShapesLayer from "@/components/campus/BuildingShapesLayer";
import ToggleButton from "@/components/campus/ToggleButton";
import BuildingPin from "@/components/campus/BuildingPin";
import CurrentLocationButton, {
    UserLocation,
} from "@/components/campus/CurrentLocationButton";
import BuildingPopup from "@/components/campus/BuildingPopup";
import BrandBar from "@/components/layout/BrandBar";
import { styles } from "@/components/Styles/mapStyle";
import { useNavigation } from "@/hooks/useNavigation";
import { useRouteNavigation } from "@/hooks/useRouteNavigation";
import { useUserRole, isShuttleEligible } from "@/hooks/useUserRole";
import RoutePlanner from "@/components/campus/RoutePlanner";
import RouteInput from "@/components/campus/RouteInput";
import {
    buildAllBuildings,
    getUserLocationBuildingId,
    getBuildingContainingPoint,
    makeUserLocationBuilding,
    resolveCampusFromLocation,
} from "@/components/campus/helper_methods/campusMap.buildings";
import type { Region } from "react-native-maps";
import TravelOptionsPopup from "@/components/campus/TravelOptionsPopup";
import {
    fetchDirections,
    pickFastestRoute,
    type DirectionRoute,
    type TravelMode,
} from "@/components/campus/helper_methods/googleDirections";
import {
    isCampusToCampusRoute,
    getShuttleDirection,
    buildShuttleDirectionRoute,
    buildShuttleDirectionRouteFromGoogle,
    buildShuttleNavigationSteps,
    buildShuttleInfo,
    type ShuttleDirection,
} from "@/components/campus/helper_methods/shuttleSchedule";
import DirectionsLoadError from "../ui/DirectionLoadError";
import { toDirectionsErrorMessage } from "@/components/campus/helper_methods/directionErrors";
import { NavigationOverlay } from "@/components/campus/NavigationOverlay";
import { bearingDegrees } from "@/components/campus/helper_methods/geo";
import {
    formatArrivalTimeFromNow,
    metersToKmString,
    secondsToMinutesString,
} from "@/components/campus/helper_methods/navigationFormat";
import Compass from "@/components/campus/Compass";
import { NextClassButton } from "@/components/campus/NextClassButton";
import { resetMapDirectionToNorth } from "@/components/campus/helper_methods/mapCompass";
import RoutePolylines from "@/components/campus/RoutePolylines";
import {
    buildRouteRenderSegments,
    flattenRouteSegmentCoordinates,
    type RouteRenderSegment,
} from "@/components/campus/helper_methods/routeSegments";
import {
    clearCampusMapRouteParams,
    useCampusSearchParams,
} from "@/hooks/useCampusSearchParams";
import { useCampusIndoorEffects } from "@/hooks/useCampusIndoorEffects";
import { usePOIFeature } from "@/hooks/usePOIFeature";
import POICategoryBar from "@/components/POI/POICategoryBar";
import POIMarkers from "@/components/POI/POIMarkers";
import POIBottomSheet from "@/components/POI/POIBottomSheet";
import { usePOIDirections } from "@/hooks/usePOIDirections";
import { getFloatingUiState } from "./helper_methods/campusMap.ui";
import {
    applySelectedRouteRendering,
    buildTravelModes,
} from "./helper_methods/campusMap.routes";

// Re-export for backwards compatibility with tests
export {
    calculatePanValue,
    determineCampusFromPan,
} from "@/components/campus/ToggleButton";

export type PendingTransitRender = {
    segments: RouteRenderSegment[];
    coords: LatLng[];
    fitToRoute: boolean;
};

type FloatingUiConfig = {
    navIsRouteMode: boolean;
    selected: Building | null;
    isNavigating: boolean;
    travelPopupVisible: boolean;
    popupIndex: number;
    windowHeight: number;
    poiSheetIndex: number;
};

function buildCampusMapFloatingUi({
                                      navIsRouteMode,
                                      selected,
                                      isNavigating,
                                      travelPopupVisible,
                                      popupIndex,
                                      windowHeight,
                                      poiSheetIndex,
                                  }: FloatingUiConfig) {
    const hasBuildingPopup = !navIsRouteMode && !!selected;
    const hasTravelPopup = navIsRouteMode && !isNavigating && travelPopupVisible;

    // POI bottom sheet:
    // -1 = closed
    // 0 = partial / collapsed
    // 1 = full screen
    const hasPOISheet = poiSheetIndex >= 0;
    const isPOISheetFullScreen = poiSheetIndex > 0;

    const baseFloatingUi = getFloatingUiState({
        isRouteMode: navIsRouteMode,
        selected,
        isNavigating,
        travelPopupVisible,
        popupIndex,
        windowHeight,
    });

    const shouldShowCompass =
        baseFloatingUi.shouldShowCompass && !isPOISheetFullScreen;

    const shouldHideFloatingButtons =
        baseFloatingUi.shouldHideFloatingButtons || isPOISheetFullScreen;

    const collapsedBuildingPopupHeight = Math.round(windowHeight * 0.19);
    const collapsedTravelPopupHeight = Math.max(
        260,
        Math.round(windowHeight * 0.28),
    );

    let floatingBottom = baseFloatingUi.floatingBottom;

    if (hasBuildingPopup) {
        floatingBottom = collapsedBuildingPopupHeight;
    } else if (hasTravelPopup || hasPOISheet) {
        floatingBottom = collapsedTravelPopupHeight;
    }

    return {
        shouldShowCompass,
        shouldHideFloatingButtons,
        floatingBottom,
    };
}

function SuggestionsList({
                             suggestions,
                             onPick,
                             testIdPrefix,
                             containerTestID,
                             containerStyle,
                         }: Readonly<{
    suggestions: Building[];
    onPick: (b: Building) => void;
    testIdPrefix: "suggestion" | "routeSuggestion";
    containerTestID: "suggestions" | "route-suggestions";
    containerStyle?: any;
}>) {
    if (suggestions.length === 0) return null;

    return (
        <View style={[styles.suggestions, containerStyle]} testID={containerTestID}>
            {suggestions.map((b) => (
                <Pressable
                    key={`${b.campus}-${b.id}`}
                    testID={`${testIdPrefix}-${b.campus}-${b.id}`}
                    onPress={() => onPick(b)}
                    style={styles.suggestionRow}
                >
                    <Text style={styles.suggestionTitle}>
                        {b.code} — {b.name} ({b.campus})
                    </Text>
                    <Text style={styles.suggestionSub}>{b.address}</Text>
                </Pressable>
            ))}
        </View>
    );
}

const LocationMarker = ({ location }: { location: UserLocation }) => (
    <Marker
        testID="userLocationMarker"
        coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
        }}
        anchor={{ x: 0.5, y: 0.5 }}
    >
        <View style={locationMarkerStyles.container}>
            <View style={locationMarkerStyles.marker} />
        </View>
    </Marker>
);

async function fetchAndSortRoutes(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    mode: TravelMode,
): Promise<readonly [TravelMode, DirectionRoute[]]> {
    try {
        const debugTag = Date.now().toString();
        console.log(`Fetching directions... mode=${mode} tag=${debugTag}`);

        const routes = await fetchDirections({ origin, destination, mode });

        console.log(`Directions OK (${mode}), routes:`, routes.length);

        const sorted = [...routes].sort((a, b) => a.durationSec - b.durationSec);
        return [mode, sorted] as const;
    } catch (e) {
        console.log(`❌ fetchDirections failed (${mode}):`, e);
        return [mode, []] as const;
    }
}

// Only the 4 Google-API modes are fetched in parallel; shuttle is computed locally.
const GOOGLE_MODES: TravelMode[] = [
    "driving",
    "transit",
    "walking",
    "bicycling",
];

export default function CampusMap() {
    const router = useRouter();
    const [focusedCampus, setFocusedCampus] = useState<Campus>("SGW");

    // One query drives suggestions (KEEP THIS for tests)
    const [query, setQuery] = useState("");
    // Popup selection (normal mode)
    const [selected, setSelected] = useState<Building | null>(null);
    // User location
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

    const [startText, setStartText] = useState("");
    const [destText, setDestText] = useState("");
    const [isDisabilityMode, setIsDisabilityMode] = useState(false);
    const [popupIndex, setPopupIndex] = useState(-1);

    const [directionsError, setDirectionsError] = useState<string | null>(null);
    const [directionRetryTick, setDirectionRetryTick] = useState(0);
    const [showIndoorArrivalConfirm, setShowIndoorArrivalConfirm] =
        useState(false);

    const mapRef = useRef<MapView>(null);
    const nav = useNavigation();
    const appliedRouteParamsSignatureRef = useRef<string | null>(null);

    const [region, setRegion] = useState<Region>(INITIAL_REGION);
    const [mapHeading, setMapHeading] = useState(0);
    const { height: windowHeight } = useWindowDimensions();

    const {
        destBuildingId,
        indoorStartBuildingCode,
        indoorStartBuildingId,
        indoorStartLabel,
        normalizedExternalDestRoomNodeId,
        normalizedExternalDestRoomLabel,
        normalizedExternalDestBuildingCode,
        exitMapCampus,
    } = useCampusSearchParams();

    const isSameRegion = useCallback(
        (a: Region | null | undefined, b: Region | null | undefined) => {
            if (!a || !b) return false;

            return (
                Math.abs(a.latitude - b.latitude) < 0.00001 &&
                Math.abs(a.longitude - b.longitude) < 0.00001 &&
                Math.abs(a.latitudeDelta - b.latitudeDelta) < 0.00001 &&
                Math.abs(a.longitudeDelta - b.longitudeDelta) < 0.00001
            );
        },
        [],
    );

    const routeStrokeWidth = useMemo(() => {
        const d = region?.latitudeDelta ?? 0.1;
        if (d > 0.6) return 2;
        if (d > 0.3) return 3;
        if (d > 0.15) return 4;
        if (d > 0.08) return 5;
        if (d > 0.04) return 6;
        return 7;
    }, [region?.latitudeDelta]);

    const [routesByMode, setRoutesByMode] = useState<
        Record<TravelMode, DirectionRoute[]>
    >({
        driving: [],
        transit: [],
        walking: [],
        bicycling: [],
        shuttle: [],
    });

    const [selectedMode, setSelectedMode] = useState<TravelMode>("driving");
    const selectedModeRef = useRef<TravelMode>("driving");
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
    const [travelPopupVisible, setTravelPopupVisible] = useState(false);

    const [renderedRouteSegments, setRenderedRouteSegments] = useState<
        RouteRenderSegment[]
    >([]);

    const [routePolylineMountKey, setRoutePolylineMountKey] = useState(0);
    const [pendingTransitRender, setPendingTransitRender] =
        useState<PendingTransitRender | null>(null);
    const [showRouteLayer, setShowRouteLayer] = useState(false);

    const routeOrigin = nav.routeStart
        ? {
            latitude: nav.routeStart.latitude,
            longitude: nav.routeStart.longitude,
        }
        : null;

    const routeDestination = nav.routeDest
        ? {
            latitude: nav.routeDest.latitude,
            longitude: nav.routeDest.longitude,
        }
        : null;

    const indoorOriginHandoff = useMemo(() => {
        const start = nav.routeStart;
        if (!start) return false;
        if (indoorStartBuildingCode && start.code === indoorStartBuildingCode) {
            return true;
        }
        if (indoorStartBuildingId && start.id === indoorStartBuildingId) {
            return true;
        }
        return false;
    }, [nav.routeStart, indoorStartBuildingCode, indoorStartBuildingId]);

    const routeNavigation = useRouteNavigation({
        origin: routeOrigin,
        destination: routeDestination,
        userLocation,
        indoorOriginHandoff,
        onStarted: () => setTravelPopupVisible(false),
    });

    const [stepsOpen, setStepsOpen] = useState(false);
    const [isFollowingUser, setIsFollowingUser] = useState(true);

    // Android: track whether pin images have loaded so we can stop tracksViewChanges
    const [startPinTracking, setStartPinTracking] = useState(false);
    const [destPinTracking, setDestPinTracking] = useState(false);

    const shouldTrackStartPin =
        Platform.OS === "android" ? startPinTracking : false;
    const shouldTrackDestPin =
        Platform.OS === "android" ? destPinTracking : false;

    const NORTH_ANIMATION_DURATION = 350;

    const resetCompassToNorth = useCallback(() => {
        resetMapDirectionToNorth(mapRef, NORTH_ANIMATION_DURATION);
        setMapHeading(0);
    }, []);

    useEffect(() => {
        selectedModeRef.current = selectedMode;
    }, [selectedMode]);

    useEffect(() => {
        setStartPinTracking(true);
        const t = setTimeout(() => setStartPinTracking(false), 500);
        return () => clearTimeout(t);
    }, [nav.routeStart?.id]);

    useEffect(() => {
        setDestPinTracking(true);
        const t = setTimeout(() => setDestPinTracking(false), 500);
        return () => clearTimeout(t);
    }, [nav.routeDest?.id]);

    const lastCameraUpdateRef = useRef(0);

    const [poiSheetIndex, setPoiSheetIndex] = useState(-1);

    // Auto fetch user location on mount
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const loc = await getDeviceLocation();
                if (!cancelled) setUserLocation(loc);
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const ALL_BUILDINGS = useMemo(
        () => buildAllBuildings(SGW_BUILDINGS, LOYOLA_BUILDINGS),
        [],
    );

    const indoorStartBuilding = useMemo(() => {
        if (!indoorStartBuildingCode && !indoorStartBuildingId) return null;

        return (
            ALL_BUILDINGS.find(
                (b) =>
                    b.code === indoorStartBuildingCode || b.id === indoorStartBuildingId,
            ) ?? null
        );
    }, [ALL_BUILDINGS, indoorStartBuildingCode, indoorStartBuildingId]);

    const handleLocationFound = useCallback(
        (location: UserLocation) => {
            setUserLocation(location);
            setIsFollowingUser(true);

            const resolvedCampus = resolveCampusFromLocation(
                ALL_BUILDINGS,
                location.latitude,
                location.longitude,
            );

            if (resolvedCampus) {
                setFocusedCampus(resolvedCampus);
            }

            setMapHeading(0);

            if (!routeNavigation.isNavigating) {
                mapRef.current?.animateToRegion(
                    {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    },
                    500,
                );
            }
        },
        [ALL_BUILDINGS, routeNavigation.isNavigating],
    );

    const handleCloseBuildingPopup = useCallback(() => {
        setQuery("");
        setSelected(null);
        setPopupIndex(-1);
    }, []);

    const handleCampusChange = useCallback((campus: Campus) => {
        setFocusedCampus(campus);
        setSelected(null);
        setPopupIndex(-1);
        setMapHeading(0);

        const nextRegion = campus === "SGW" ? SGW_REGION : LOY_REGION;
        mapRef.current?.animateToRegion(nextRegion, 500);
    }, []);

    const userLocationBuildingId = useMemo(
        () => getUserLocationBuildingId(ALL_BUILDINGS, userLocation),
        [ALL_BUILDINGS, userLocation],
    );

    const { role: userRole } = useUserRole();
    const shuttleEligible = isShuttleEligible(userRole);

    const shuttleDirection = useMemo<ShuttleDirection | null>(() => {
        const start = nav.routeStart;
        const dest = nav.routeDest;
        if (!start || !dest) return null;
        if (!isCampusToCampusRoute(start.campus, dest.campus)) return null;
        return getShuttleDirection(start.campus, dest.campus);
    }, [nav.routeStart, nav.routeDest]);

    const shuttleInfo = useMemo(
        () => (shuttleDirection ? buildShuttleInfo(shuttleDirection) : undefined),
        [shuttleDirection],
    );

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];

        return ALL_BUILDINGS.filter((b) => {
            const code = b.code?.toLowerCase() ?? "";
            const name = b.name?.toLowerCase() ?? "";
            const address = b.address?.toLowerCase() ?? "";
            const aliases = b.aliases ?? [];

            return (
                code.includes(q) ||
                name.includes(q) ||
                address.includes(q) ||
                aliases.some((a) => a.toLowerCase().includes(q))
            );
        }).slice(0, 6);
    }, [query, ALL_BUILDINGS]);

    const clearRouteData = useCallback(() => {
        selectedModeRef.current = "driving";
        setSelectedMode("driving");
        setPendingTransitRender(null);
        setTravelPopupVisible(false);
        setShowRouteLayer(false);
        setRenderedRouteSegments([]);
        setRoutePolylineMountKey((k) => k + 1);
        setRoutesByMode({
            driving: [],
            transit: [],
            walking: [],
            bicycling: [],
            shuttle: [],
        });
        setSelectedRouteIndex(0);
    }, []);

    const clearDisplayedRoutes = useCallback(() => {
        setPendingTransitRender(null);
        setShowRouteLayer(false);
        setRenderedRouteSegments([]);
        setRoutePolylineMountKey((k) => k + 1);
    }, []);

    /** Drop persisted URL params and reset deep-link signature so a new route is not mixed with prior handoff state. */
    const clearCampusMapUrlParams = useCallback(() => {
        clearCampusMapRouteParams(router);
        appliedRouteParamsSignatureRef.current = null;
    }, [router]);

    const showRoutesForMode = useCallback(
        (
            mode: TravelMode,
            routeIndex: number,
            options?: { fitToRoute?: boolean },
        ) => {
            const routes = routesByMode[mode] ?? [];

            setPendingTransitRender(null);

            if (routes.length === 0) {
                setSelectedMode(mode);
                setSelectedRouteIndex(0);
                setShowRouteLayer(false);
                setRenderedRouteSegments([]);
                setRoutePolylineMountKey((k) => k + 1);
                return;
            }

            const safeIndex = Math.max(0, Math.min(routeIndex, routes.length - 1));
            const selectedRoute = routes[safeIndex];
            if (!selectedRoute) return;

            const segments = buildRouteRenderSegments(mode, selectedRoute);
            const selectedCoords = flattenRouteSegmentCoordinates(segments);

            setSelectedMode(mode);
            setSelectedRouteIndex(safeIndex);

            if (mode === "transit") {
                setShowRouteLayer(false);
                setRenderedRouteSegments([]);
                setRoutePolylineMountKey((k) => k + 1);
                setPendingTransitRender({
                    segments,
                    coords: selectedCoords,
                    fitToRoute: options?.fitToRoute ?? true,
                });
                return;
            }

            setRenderedRouteSegments(segments);
            setShowRouteLayer(segments.length > 0);
            setRoutePolylineMountKey((k) => k + 1);

            if ((options?.fitToRoute ?? true) && selectedCoords.length >= 2) {
                mapRef.current?.fitToCoordinates(selectedCoords, {
                    edgePadding: { top: 90, right: 70, bottom: 260, left: 70 },
                    animated: true,
                });
            }
        },
        [routesByMode],
    );

    const focusBuilding = useCallback((b: Building) => {
        setQuery(`${b.code} - ${b.name}`);
        setFocusedCampus(b.campus);

        if (b.polygon?.length) {
            const z = b.zoomCategory ?? 2;
            const padding = paddingForZoomCategory(z);
            const r = regionFromPolygon(b.polygon, padding);
            mapRef.current?.animateToRegion(r, 600);
            return;
        }

        mapRef.current?.animateToRegion(
            {
                latitude: b.latitude,
                longitude: b.longitude,
                latitudeDelta: 0.0025,
                longitudeDelta: 0.0025,
            },
            600,
        );
    }, []);

    const showLocationAlert = useCallback((e: any) => {
        if (e instanceof LocationError) {
            if (e.code === "PERMISSION_DENIED") {
                alert(
                    "Location Permission Required\n\nEnable location permission to use your current location as the start point.",
                );
                return;
            }
            if (e.code === "SERVICES_OFF") {
                alert(
                    "Location Services Off\n\nPlease enable location services to use your current location.",
                );
                return;
            }
        }
        alert("Location Error\n\nUnable to get your current location. Try again.");
    }, []);

    const setStartToCurrentLocation = useCallback(async () => {
        try {
            const loc = await getDeviceLocation();

            const buildingInside = getBuildingContainingPoint(
                ALL_BUILDINGS,
                loc.latitude,
                loc.longitude,
            );

            const resolvedCampus =
                buildingInside?.campus ??
                resolveCampusFromLocation(ALL_BUILDINGS, loc.latitude, loc.longitude) ??
                focusedCampus;

            const startBuilding =
                buildingInside ??
                makeUserLocationBuilding(loc.latitude, loc.longitude, resolvedCampus);

            nav.setRouteStart(startBuilding);
            setStartText(
                startBuilding.id === "USER_LOCATION"
                    ? "Your location"
                    : `${startBuilding.code} - ${startBuilding.name}`,
            );
        } catch (e: any) {
            showLocationAlert(e);
        }
    }, [ALL_BUILDINGS, focusedCampus, nav, showLocationAlert]);

    useEffect(() => {
        if (!pendingTransitRender) return;
        if (showRouteLayer) return;
        if (renderedRouteSegments.length !== 0) return;

        setRenderedRouteSegments(pendingTransitRender.segments);
        setShowRouteLayer(pendingTransitRender.segments.length > 0);
        setRoutePolylineMountKey((k) => k + 1);

        if (
            pendingTransitRender.fitToRoute &&
            pendingTransitRender.coords.length >= 2
        ) {
            mapRef.current?.fitToCoordinates(pendingTransitRender.coords, {
                edgePadding: { top: 90, right: 70, bottom: 260, left: 70 },
                animated: true,
            });
        }

        setPendingTransitRender(null);
    }, [pendingTransitRender, renderedRouteSegments, showRouteLayer]);

    useEffect(() => {
        if (!destBuildingId) return;

        const routeParamsSignature = [
            destBuildingId,
            indoorStartBuildingCode ?? "",
            indoorStartBuildingId ?? "",
            indoorStartLabel ?? "",
            normalizedExternalDestRoomNodeId ?? "",
            normalizedExternalDestRoomLabel ?? "",
            normalizedExternalDestBuildingCode ?? "",
        ].join("|");

        if (appliedRouteParamsSignatureRef.current === routeParamsSignature) return;

        const targetBuilding = ALL_BUILDINGS.find((b) => b.id === destBuildingId);
        if (!targetBuilding || (indoorStartBuilding && !nav.routeStart)) return;

        appliedRouteParamsSignatureRef.current = routeParamsSignature;

        if (!nav.isRouteMode) nav.setIsRouteMode(true);

        nav.setRouteDest(targetBuilding);
        setDestText(`${targetBuilding.code} - ${targetBuilding.name}`);

        if (!indoorStartBuilding && !nav.routeStart) {
            void setStartToCurrentLocation();
        }

        setSelected(null);
        setPopupIndex(-1);
        setQuery("");
        focusBuilding(targetBuilding);
    }, [
        destBuildingId,
        ALL_BUILDINGS,
        nav,
        setStartToCurrentLocation,
        focusBuilding,
        indoorStartBuilding,
        indoorStartBuildingCode,
        indoorStartBuildingId,
        indoorStartLabel,
        normalizedExternalDestRoomNodeId,
        normalizedExternalDestRoomLabel,
        normalizedExternalDestBuildingCode,
    ]);

    const { handleContinueIndoors, resetIndoorDestinationState } =
        useCampusIndoorEffects({
            nav,
            routeNavigation,
            indoorStartBuilding,
            indoorStartLabel,
            normalizedExternalDestRoomNodeId,
            normalizedExternalDestRoomLabel,
            normalizedExternalDestBuildingCode,
            setStartText,
            setSelected,
            setPopupIndex,
            setShowIndoorArrivalConfirm,
        });

    const poi = usePOIFeature({ focusedCampus, userLocation });

    const { handlePOIGetDirections } = usePOIDirections({
        focusedCampus,
        isRouteMode: nav.isRouteMode,
        toggleRouteMode: nav.toggleRouteMode,
        setRouteDest: nav.setRouteDest,
        setDestText,
        setStartToCurrentLocation,
        closePOISheet: () => poi.poiSheetRef.current?.close(),
        setPoiSheetIndex,
        setQuery,
    });

    useEffect(() => {
        const start = nav.routeStart;
        const dest = nav.routeDest;

        if (!nav.isRouteMode || !start || !dest) {
            setTravelPopupVisible(false);
            setPendingTransitRender(null);
            setShowRouteLayer(false);
            setRenderedRouteSegments([]);
            setRoutePolylineMountKey((k) => k + 1);
            return;
        }

        setDirectionsError(null);
        clearRouteData();

        let cancelled = false;
        const origin = { latitude: start.latitude, longitude: start.longitude };
        const destination = { latitude: dest.latitude, longitude: dest.longitude };

        async function loadAllModes() {
            try {
                const results = await Promise.all(
                    GOOGLE_MODES.map((mode) =>
                        fetchAndSortRoutes(origin, destination, mode),
                    ),
                );

                if (cancelled) return;

                const next: Record<TravelMode, DirectionRoute[]> = {
                    driving: [],
                    transit: [],
                    walking: [],
                    bicycling: [],
                    shuttle: [],
                };

                for (const [mode, routes] of results) {
                    next[mode] = routes;
                }

                if (shuttleDirection && shuttleEligible) {
                    const shuttleRoute = await buildShuttleDirectionRouteFromGoogle(
                        shuttleDirection,
                        origin,
                        destination,
                    );
                    const fallback =
                        shuttleRoute ??
                        buildShuttleDirectionRoute(shuttleDirection, origin, destination);
                    next.shuttle = fallback ? [fallback] : [];
                }

                if (cancelled) return;

                setRoutesByMode(next);

                const allModes: TravelMode[] = [...GOOGLE_MODES, "shuttle"];
                const totalRoutes = allModes.reduce(
                    (sum, m) => sum + next[m].length,
                    0,
                );

                if (totalRoutes === 0) {
                    setDirectionsError(
                        "No route found for this selection. Try another mode",
                    );
                    return;
                }

                const preferredMode = selectedModeRef.current;
                const bestMode =
                    next[preferredMode].length > 0
                        ? preferredMode
                        : (allModes.find((m) => next[m].length > 0) ?? "driving");

                const fastest = pickFastestRoute(next[bestMode]);
                const fastestIndex = fastest
                    ? next[bestMode].findIndex((r) => r.polyline === fastest.polyline)
                    : 0;

                const safeIndex = Math.max(0, fastestIndex);
                const selectedRoute = next[bestMode][safeIndex];
                const selectedSegments = selectedRoute
                    ? buildRouteRenderSegments(bestMode, selectedRoute)
                    : [];
                const selectedCoords = flattenRouteSegmentCoordinates(selectedSegments);

                setSelectedMode(bestMode);
                setSelectedRouteIndex(safeIndex);
                setTravelPopupVisible(true);

                applySelectedRouteRendering({
                    bestMode,
                    selectedSegments,
                    selectedCoords,
                    setShowRouteLayer,
                    setRenderedRouteSegments,
                    setRoutePolylineMountKey,
                    setPendingTransitRender,
                    mapRef,
                });
            } catch (e) {
                if (!cancelled) {
                    setTravelPopupVisible(false);
                    setPendingTransitRender(null);
                    setShowRouteLayer(false);
                    setRenderedRouteSegments([]);
                    setRoutePolylineMountKey((k) => k + 1);
                    setDirectionsError(toDirectionsErrorMessage(e));
                }
            }
        }

        void loadAllModes();

        return () => {
            cancelled = true;
            setPendingTransitRender(null);
        };
    }, [
        nav.isRouteMode,
        nav.routeStart?.id,
        nav.routeDest?.id,
        nav.routeStart?.latitude,
        nav.routeStart?.longitude,
        nav.routeDest?.latitude,
        nav.routeDest?.longitude,
        shuttleDirection,
        shuttleEligible,
        directionRetryTick,
        clearRouteData,
    ]);

    useEffect(() => {
        if (!routeNavigation.isNavigating) return;
        if (!isFollowingUser) return;
        if (!userLocation) return;

        const now = Date.now();
        if (now - lastCameraUpdateRef.current < 900) return;
        lastCameraUpdateRef.current = now;

        const calculateCameraHeading = (
            userLoc: LatLng,
            target?: LatLng,
        ): number => (target ? bearingDegrees(userLoc, target) : 0);

        const heading = calculateCameraHeading(
            userLocation,
            routeNavigation.currentStep?.end,
        );
        setMapHeading(heading);

        mapRef.current?.animateCamera(
            {
                center: userLocation,
                zoom: 18,
                heading,
                pitch: 0,
            },
            { duration: 500 },
        );
    }, [
        routeNavigation.isNavigating,
        isFollowingUser,
        userLocation,
        routeNavigation.activeStepIndex,
        routeNavigation.currentStep?.end,
    ]);

    const handleGetDirectionsFromPopup = useCallback(
        async (destination: Building) => {
            clearCampusMapUrlParams();

            if (!nav.isRouteMode) nav.toggleRouteMode();

            nav.setRouteDest(destination);
            setDestText(`${destination.code} - ${destination.name}`);

            await setStartToCurrentLocation();

            setSelected(null);
            setPopupIndex(-1);
            setQuery("");
        },
        [nav, setStartToCurrentLocation, clearCampusMapUrlParams],
    );

    const focusRouteField = useCallback(
        (field: "start" | "destination") => {
            nav.setActiveField(field);
            setQuery(field === "start" ? startText : destText);
            nav.setRouteError(null);
        },
        [nav, startText, destText],
    );

    const handlePickBuilding = useCallback(
        (b: Building) => {
            Keyboard.dismiss();

            if (nav.isRouteMode) {
                clearCampusMapUrlParams();
                nav.setFieldFromBuilding(b);

                const label = `${b.code} - ${b.name}`;
                if (nav.activeField === "start") {
                    setStartText(label);
                    focusRouteField("destination");
                } else {
                    setDestText(label);
                }

                setQuery("");
                focusBuilding(b);
                return;
            }

            setSelected(b);
            focusBuilding(b);
        },
        [nav, focusBuilding, focusRouteField, clearCampusMapUrlParams],
    );

    const applySelection = useCallback(
        (mode: TravelMode, routeIndex: number) => {
            showRoutesForMode(mode, routeIndex);
        },
        [showRoutesForMode],
    );

    const { shouldShowCompass, shouldHideFloatingButtons, floatingBottom } =
        buildCampusMapFloatingUi({
            navIsRouteMode: nav.isRouteMode,
            selected,
            isNavigating: routeNavigation.isNavigating,
            travelPopupVisible,
            popupIndex,
            windowHeight,
            poiSheetIndex,
        });

    const travelModes = buildTravelModes(
        routesByMode,
        shuttleDirection,
        shuttleEligible,
    );

    const arrivalTimeText = routeNavigation.activeSummary
        ? formatArrivalTimeFromNow(routeNavigation.activeSummary.durationSec)
        : "--:--";

    const durationMinText = routeNavigation.activeSummary
        ? secondsToMinutesString(routeNavigation.activeSummary.durationSec)
        : "--";

    const distanceKmText = routeNavigation.activeSummary
        ? metersToKmString(routeNavigation.activeSummary.distanceMeters)
        : "--";

    const handleSelectMode = useCallback(
        (mode: TravelMode) => {
            showRoutesForMode(mode, 0);
        },
        [showRoutesForMode],
    );

    const handleGo = useCallback(
        async (mode: TravelMode, index: number) => {
            if (mode === "shuttle" && !shuttleEligible) {
                alert("Concordia Shuttle Bus is available to students and staff only.");
                return;
            }

            showRoutesForMode(mode, index, { fitToRoute: false });

            if (mode === "shuttle" && shuttleDirection) {
                const origin = nav.routeStart
                    ? {
                        latitude: nav.routeStart.latitude,
                        longitude: nav.routeStart.longitude,
                    }
                    : null;
                const destination = nav.routeDest
                    ? {
                        latitude: nav.routeDest.latitude,
                        longitude: nav.routeDest.longitude,
                    }
                    : null;

                if (origin && destination) {
                    const steps = buildShuttleNavigationSteps(
                        shuttleDirection,
                        origin,
                        destination,
                    );
                    const shuttleRoute =
                        routesByMode.shuttle[index] ?? routesByMode.shuttle[0];

                    routeNavigation.startNavigationWithSteps(steps, {
                        mode: "shuttle",
                        durationText: shuttleRoute?.durationText ?? "",
                        durationSec: shuttleRoute?.durationSec ?? 0,
                        distanceText: shuttleRoute?.distanceText ?? "",
                        distanceMeters: shuttleRoute?.distanceMeters ?? 0,
                        summary: "Concordia Shuttle",
                    });
                    setIsFollowingUser(true);
                }
                return;
            }

            await routeNavigation.startNavigation(mode, index);
            setIsFollowingUser(true);
        },
        [
            shuttleEligible,
            shuttleDirection,
            nav.routeStart,
            nav.routeDest,
            routesByMode.shuttle,
            routeNavigation,
            showRoutesForMode,
        ],
    );

    const handleToggleRoutePlanner = useCallback(() => {
        const nextMode = !nav.isRouteMode;

        setSelected(null);
        setPopupIndex(-1);

        if (nextMode) {
            nav.toggleRouteMode();
            nav.setActiveField("destination");
            setQuery(destText);
            nav.setRouteError(null);

            if (indoorStartBuilding) {
                nav.setRouteStart(indoorStartBuilding);
                setStartText(
                    indoorStartLabel
                        ? `${indoorStartLabel} (${indoorStartBuilding.code})`
                        : `${indoorStartBuilding.code} - ${indoorStartBuilding.name}`,
                );
            } else if (!nav.routeStart) {
                void setStartToCurrentLocation();
            }

            return;
        }

        clearCampusMapUrlParams();
        nav.setRouteStart(null);
        nav.setRouteDest(null);
        nav.setRouteError(null);
        setStartText("");
        setDestText("");
        setQuery("");
        clearRouteData();
        clearDisplayedRoutes();

        nav.toggleRouteMode();
    }, [
        nav,
        destText,
        setStartToCurrentLocation,
        clearRouteData,
        clearDisplayedRoutes,
        clearCampusMapUrlParams,
        indoorStartBuilding,
        indoorStartLabel,
    ]);

    useEffect(() => {
        if (!exitMapCampus) return;
        if (exitMapCampus !== "SGW" && exitMapCampus !== "LOY") {
            clearCampusMapUrlParams();
            return;
        }

        const campus = exitMapCampus as Campus;

        resetIndoorDestinationState();
        routeNavigation.exitNavigation();
        clearRouteData();
        clearDisplayedRoutes();
        setStepsOpen(false);
        nav.setIsRouteMode(false);
        nav.setRouteStart(null);
        nav.setRouteDest(null);
        nav.setRouteError(null);
        setStartText("");
        setDestText("");
        setQuery("");
        setSelected(null);
        setPopupIndex(-1);
        setDirectionsError(null);

        handleCampusChange(campus);
        clearCampusMapUrlParams();
    }, [
        exitMapCampus,
        resetIndoorDestinationState,
        routeNavigation.exitNavigation,
        clearRouteData,
        clearDisplayedRoutes,
        nav.setIsRouteMode,
        nav.setRouteStart,
        nav.setRouteDest,
        nav.setRouteError,
        handleCampusChange,
        clearCampusMapUrlParams,
    ]);

    return (
        <View style={styles.container} testID="campusMap-root">
            <StatusBar style="dark" translucent backgroundColor="transparent" />

            <MapView
                testID="mapView"
                ref={mapRef}
                provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                style={StyleSheet.absoluteFillObject}
                initialRegion={INITIAL_REGION}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={false}
                toolbarEnabled={false}
                rotateEnabled={false}
                onRegionChangeComplete={(r) => {
                    if (r?.latitude == null || r?.longitude == null) return;
                    setRegion((prev) => (isSameRegion(prev, r) ? prev : r));
                }}
                onPanDrag={() => {
                    if (routeNavigation.isNavigating) setIsFollowingUser(false);
                }}
                onPress={() => {
                    if (!nav.isRouteMode && selected) {
                        setSelected(null);
                        setPopupIndex(-1);
                    }
                }}
            >
                <BuildingShapesLayer
                    buildings={ALL_BUILDINGS}
                    selectedBuildingId={selected?.id ?? null}
                    userLocationBuildingId={userLocationBuildingId}
                    onPickBuilding={handlePickBuilding}
                    region={region}
                />

                {userLocation && !userLocationBuildingId && (
                    <LocationMarker location={userLocation} />
                )}

                {showRouteLayer && renderedRouteSegments.length > 0 && (
                    <RoutePolylines
                        key={`route-polylines-${routePolylineMountKey}`}
                        segments={renderedRouteSegments}
                        onPress={() => applySelection(selectedMode, selectedRouteIndex)}
                        strokeWidth={routeStrokeWidth}
                    />
                )}

                {nav.routeStart && (
                    <Marker
                        testID="startPin"
                        coordinate={{
                            latitude: nav.routeStart.latitude,
                            longitude: nav.routeStart.longitude,
                        }}
                        anchor={{ x: 0.5, y: 76 / 80 }}
                        tracksViewChanges={shouldTrackStartPin}
                    >
                        <BuildingPin
                            code={nav.routeStart.code}
                            campus={nav.routeStart.campus}
                            size={48}
                            variant="map"
                        />
                    </Marker>
                )}

                {nav.routeDest && (
                    <Marker
                        testID="destinationPin"
                        coordinate={{
                            latitude: nav.routeDest.latitude,
                            longitude: nav.routeDest.longitude,
                        }}
                        anchor={{ x: 0.5, y: 76 / 80 }}
                        tracksViewChanges={shouldTrackDestPin}
                    >
                        <BuildingPin
                            code={nav.routeDest.code}
                            campus={nav.routeDest.campus}
                            size={48}
                            variant="map"
                        />
                    </Marker>
                )}

                <POIMarkers
                    pois={poi.pois}
                    selectedPOI={poi.selectedPOI}
                    onPress={poi.handleSelectPOI}
                />
            </MapView>

            <View style={styles.topOverlay} testID="topOverlay">
                <Text
                    testID="focusedCampusLabel"
                    style={{ opacity: 0, position: "absolute", top: 0, left: 0 }}
                >
                    {focusedCampus}
                </Text>

                <ToggleButton
                    focusedCampus={focusedCampus}
                    onCampusChange={handleCampusChange}
                />

                {!nav.isRouteMode && (
                    <>
                        <View style={styles.searchBar} testID="searchBar">
                            <Text style={styles.searchIcon}>⌕</Text>

                            <TextInput
                                testID="searchInput"
                                value={query}
                                onChangeText={(t) => {
                                    setQuery(t);
                                    if (selected) {
                                        setSelected(null);
                                        setPopupIndex(-1);
                                    }
                                }}
                                placeholder="Where to next?"
                                placeholderTextColor={"rgba(17,17,17,0.55)"}
                                style={styles.searchInput}
                                autoCorrect={false}
                                autoCapitalize="none"
                            />

                            {query.length > 0 && (
                                <Pressable
                                    testID="clearSearch"
                                    onPress={() => {
                                        setQuery("");
                                        setSelected(null);
                                        setPopupIndex(-1);
                                    }}
                                    hitSlop={8}
                                    style={styles.clearButton}
                                >
                                    <Text style={styles.clearIcon}>✕</Text>
                                </Pressable>
                            )}
                        </View>

                        <SuggestionsList
                            suggestions={suggestions}
                            onPick={handlePickBuilding}
                            testIdPrefix="suggestion"
                            containerTestID="suggestions"
                        />

                        <POICategoryBar
                            activeCategory={poi.activeCategory}
                            onSelect={poi.handleCategorySelect}
                            disabled={suggestions.length > 0}
                            focusedCampus={focusedCampus}
                        />
                    </>
                )}

                {nav.isRouteMode && !routeNavigation.isNavigating && (
                    <View testID="routeModeContainer" style={{ gap: 0 }}>
                        <View style={routeStyles.routePanel} testID="routePanel">
                            <RouteInput
                                start={nav.routeStart}
                                destination={nav.routeDest}
                                activeField={nav.activeField}
                                onFocusField={focusRouteField}
                                onSwap={() => {
                                    clearCampusMapUrlParams();
                                    clearRouteData();
                                    clearDisplayedRoutes();

                                    const a = nav.routeStart;
                                    const b = nav.routeDest;
                                    nav.setRouteStart(b);
                                    nav.setRouteDest(a);

                                    setStartText(destText);
                                    setDestText(startText);

                                    setQuery(nav.activeField === "start" ? destText : startText);
                                }}
                                startText={startText}
                                destText={destText}
                                onChangeStartText={(t) => {
                                    clearCampusMapUrlParams();
                                    nav.setActiveField("start");
                                    setStartText(t);
                                    setQuery(t);
                                    nav.setRouteError(null);

                                    if (nav.routeStart) {
                                        nav.setRouteStart(null);
                                    }

                                    clearRouteData();
                                    clearDisplayedRoutes();
                                }}
                                onChangeDestText={(t) => {
                                    clearCampusMapUrlParams();
                                    nav.setActiveField("destination");
                                    setDestText(t);
                                    setQuery(t);
                                    nav.setRouteError(null);

                                    if (nav.routeDest) {
                                        nav.setRouteDest(null);
                                    }

                                    clearRouteData();
                                    clearDisplayedRoutes();
                                }}
                                onClearStart={() => {
                                    clearCampusMapUrlParams();
                                    setStartText("");
                                    nav.setRouteStart(null);
                                    setQuery("");
                                    nav.setRouteError(null);
                                    focusRouteField("start");
                                    clearRouteData();
                                    clearDisplayedRoutes();
                                }}
                                onClearDestination={() => {
                                    clearCampusMapUrlParams();
                                    setDestText("");
                                    nav.setRouteDest(null);
                                    setQuery("");
                                    nav.setRouteError(null);
                                    focusRouteField("destination");
                                    clearRouteData();
                                    clearDisplayedRoutes();
                                }}
                                onUseMyLocation={setStartToCurrentLocation}
                                disabilityMode={isDisabilityMode}
                            />
                        </View>

                        <SuggestionsList
                            suggestions={suggestions}
                            onPick={handlePickBuilding}
                            testIdPrefix="routeSuggestion"
                            containerTestID="route-suggestions"
                            containerStyle={routeStyles.routeSuggestions}
                        />
                    </View>
                )}
            </View>

            <Compass
                visible={shouldShowCompass}
                rotationDegrees={-mapHeading}
                onPress={resetCompassToNorth}
                style={[compassStyles.button, { bottom: floatingBottom }]}
            />

            {!shouldHideFloatingButtons && (
                <>
                    <NextClassButton
                        style={[nextClassStyles.button, { bottom: floatingBottom }]}
                    />

                    <View style={[floatingStyles.container, { bottom: floatingBottom }]}>
                        <CurrentLocationButton onLocationFound={handleLocationFound} />

                        {nav.isRouteMode && !routeNavigation.isNavigating && (
                            <Pressable
                                testID="accessibleRouteButton"
                                style={floatingStyles.accessibilityButton}
                                accessibilityRole="button"
                                accessibilityLabel="Accessibility routes"
                                accessibilityState={{ selected: isDisabilityMode }}
                                onPress={() => setIsDisabilityMode((prev) => !prev)}
                            >
                                {isDisabilityMode ? (
                                    <View style={floatingStyles.accessibilityButtonActive}>
                                        <MaterialIcons
                                            name="close"
                                            size={28}
                                            color="#FFFFFF"
                                            style={floatingStyles.accessibilityCloseIcon}
                                        />
                                    </View>
                                ) : (
                                    <Image
                                        source={require("@/assets/icons/accessibility-button.png")}
                                        style={floatingStyles.accessibilityIcon}
                                        resizeMode="cover"
                                    />
                                )}
                            </Pressable>
                        )}

                        {!routeNavigation.isNavigating && (
                            <RoutePlanner
                                isRouteMode={nav.isRouteMode}
                                onToggle={handleToggleRoutePlanner}
                            />
                        )}
                    </View>
                </>
            )}

            {!nav.isRouteMode && selected && (
                <BuildingPopup
                    building={selected}
                    campusTheme={focusedCampus}
                    onClose={handleCloseBuildingPopup}
                    onSheetChange={(index: number) => setPopupIndex(index)}
                    onGetDirections={handleGetDirectionsFromPopup}
                />
            )}

            {nav.isRouteMode && !routeNavigation.isNavigating && (
                <TravelOptionsPopup
                    campusTheme={focusedCampus}
                    visible={travelPopupVisible}
                    modes={travelModes}
                    selectedMode={selectedMode}
                    selectedRouteIndex={selectedRouteIndex}
                    onSelectMode={handleSelectMode}
                    onSelectRouteIndex={(index) => applySelection(selectedMode, index)}
                    onClose={() => {
                        setTravelPopupVisible(false);
                        setPopupIndex(-1);
                    }}
                    onSheetChange={(index: number) => setPopupIndex(index)}
                    onGo={handleGo}
                    shuttleInfo={shuttleInfo}
                />
            )}

            <DirectionsLoadError
                visible={!!directionsError}
                message={directionsError ?? ""}
                onRefresh={() => {
                    setDirectionsError(null);
                    setDirectionRetryTick((x) => x + 1);
                }}
                accentColor={focusedCampus === "SGW" ? "#912338" : "#E0B100"}
            />

            {showIndoorArrivalConfirm ? (
                <View style={indoorArrivalStyles.container}>
                    <Pressable
                        testID="confirmArrivedAtDestinationBuildingButton"
                        onPress={handleContinueIndoors}
                        style={indoorArrivalStyles.button}
                    >
                        <Text style={indoorArrivalStyles.buttonText}>
                            Confirm that you got to the building
                        </Text>
                    </Pressable>
                </View>
            ) : null}

            <NavigationOverlay
                isNavigating={routeNavigation.isNavigating}
                isArrived={routeNavigation.isArrived}
                stepsOpen={stepsOpen}
                onToggleSteps={() => setStepsOpen((v) => !v)}
                onCloseSteps={() => setStepsOpen(false)}
                activeSteps={routeNavigation.activeSteps}
                activeStepIndex={routeNavigation.activeStepIndex}
                currentStepDistanceText={
                    routeNavigation.currentStep?.distanceText ?? ""
                }
                currentStepInstructionText={
                    routeNavigation.currentStep?.instruction ?? ""
                }
                bottomOffset={40}
                arrivalTimeText={arrivalTimeText}
                durationMinText={durationMinText}
                distanceKmText={distanceKmText}
                onExit={() => {
                    resetIndoorDestinationState();
                    clearCampusMapUrlParams();
                    routeNavigation.exitNavigation();
                    clearRouteData();
                    clearDisplayedRoutes();
                }}
            />

            <POIBottomSheet
                ref={poi.poiSheetRef}
                pois={poi.pois}
                status={poi.status}
                activeCategory={poi.activeCategory}
                selectedPOI={poi.selectedPOI}
                campusTheme={focusedCampus}
                radius={poi.radius}
                onRadiusChange={poi.handleRadiusChange}
                onSelectPOI={poi.handleSelectPOI}
                onGetDirections={handlePOIGetDirections}
                onClose={poi.handleSheetClose}
                onSheetChange={(index) => setPoiSheetIndex(index)}
            />

            <BrandBar
                testID="brandbar"
                backgroundColor={focusedCampus === "SGW" ? "#912338" : "#e3ac20"}
            />
        </View>
    );
}

const routeStyles = StyleSheet.create({
    routePanel: {
        marginTop: 10,
        width: "100%",
    },
    routeSuggestions: {
        zIndex: 999,
        elevation: 999,
    },
});

const compassStyles = StyleSheet.create({
    button: {
        position: "absolute",
        right: 18,
        top: 225,
        zIndex: 998,
        elevation: 998,
    },
});

const floatingStyles = StyleSheet.create({
    container: {
        position: "absolute",
        right: 16,
        gap: 20,
        alignItems: "center",
        zIndex: 999,
        elevation: 999,
    },
    accessibilityButton: {
        width: 64,
        height: 64,
        borderRadius: 0,
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    accessibilityButtonActive: {
        width: 54,
        height: 54,
        borderRadius: 14,
        backgroundColor: "#1E90FF",
        alignItems: "center",
        justifyContent: "center",
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    accessibilityCloseIcon: {
        textAlign: "center",
    },
    accessibilityIcon: {
        width: 64,
        height: 64,
    },
});

const locationMarkerStyles = StyleSheet.create({
    container: { alignItems: "center", justifyContent: "center" },
    marker: {
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: "#6197FB",
        borderWidth: 3,
        borderColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
});

const indoorArrivalStyles = StyleSheet.create({
    container: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 180,
        zIndex: 10000,
        elevation: 10000,
    },
    button: {
        backgroundColor: "#d32f2f",
        borderRadius: 28,
        paddingVertical: 16,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
        textAlign: "center",
    },
});

const nextClassStyles = StyleSheet.create({
    button: {
        position: "absolute",
        left: 16,
        zIndex: 999,
        elevation: 999,
    },
});