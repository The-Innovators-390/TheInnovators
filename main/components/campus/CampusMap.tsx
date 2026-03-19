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
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import MapView, {
  PROVIDER_GOOGLE,
  Marker,
  Polyline,
  LatLng,
} from "react-native-maps";
import {
  getDeviceLocation,
  LocationError,
} from "@/components/campus/helper_methods/locationUtils";
import { StatusBar } from "expo-status-bar";
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
} from "@/components/campus/helper_methods/campusMap.buildings";
import type { Region } from "react-native-maps";
import TravelOptionsPopup from "@/components/campus/TravelOptionsPopup";
import {
  decodePolyline,
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

// Re-export for backwards compatibility with tests
export {
  calculatePanValue,
  determineCampusFromPan,
} from "@/components/campus/ToggleButton";

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

const RouteStroke = ({
  mode,
  coords,
  index,
  selectedRouteIndex,
  onPress,
  strokeWidth,
}: {
  mode: TravelMode;
  coords: { latitude: number; longitude: number }[];
  index: number;
  selectedRouteIndex: number;
  onPress: () => void;
  strokeWidth: number;
}) => {
  const isSelected = index === selectedRouteIndex;
  return (
    <Polyline
      key={`${mode}-${index}-${strokeWidth}`}
      coordinates={coords}
      tappable
      onPress={onPress}
      strokeWidth={isSelected ? strokeWidth : Math.max(2, strokeWidth - 2)}
      strokeColor={isSelected ? "#4286f5" : "#8FB5FF"}
      lineDashPattern={mode === "walking" ? [10, 8] : undefined}
      lineCap="round"
      lineJoin="round"
    />
  );
};

export default function CampusMap() {
  const [focusedCampus, setFocusedCampus] = useState<Campus>("SGW");

  // One query drives suggestions (KEEP THIS for tests)
  const [query, setQuery] = useState("");
  // Popup selection (normal mode)
  const [selected, setSelected] = useState<Building | null>(null);
  // User location
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const [startText, setStartText] = useState("");
  const [destText, setDestText] = useState("");
  const [popupIndex, setPopupIndex] = useState(-1);

  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [directionRetryTick, setDirectionRetryTick] = useState(0);

  const mapRef = useRef<MapView>(null);
  const nav = useNavigation();

  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [mapHeading, setMapHeading] = useState(0);
  const { height: windowHeight } = useWindowDimensions();

  const { destBuildingId } = useLocalSearchParams<{ destBuildingId: string }>();

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
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [travelPopupVisible, setTravelPopupVisible] = useState(false);

  const [allRouteCoords, setAllRouteCoords] = useState<
    { latitude: number; longitude: number }[][]
  >([]);

  const routeNavigation = useRouteNavigation({
    origin: nav.routeStart
      ? {
          latitude: nav.routeStart.latitude,
          longitude: nav.routeStart.longitude,
        }
      : null,
    destination: nav.routeDest
      ? { latitude: nav.routeDest.latitude, longitude: nav.routeDest.longitude }
      : null,
    userLocation,
    onStarted: () => setTravelPopupVisible(false),
  });
  const [stepsOpen, setStepsOpen] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  // Android: track whether pin images have loaded so we can stop tracksViewChanges
  const [startPinTracking, setStartPinTracking] = useState(true);
  const [destPinTracking, setDestPinTracking] = useState(true);

  // NEW: store decoded segment polylines for shuttle (walk dashed + shuttle solid)
  const [shuttleSegmentCoords, setShuttleSegmentCoords] = useState<null | {
    walkToStop: { latitude: number; longitude: number }[];
    shuttle: { latitude: number; longitude: number }[];
    walkToDestination: { latitude: number; longitude: number }[];
  }>(null);

  const NORTH_ANIMATION_DURATION = 350;

  const resetCompassToNorth = useCallback((center?: LatLng) => {
    resetMapDirectionToNorth(mapRef, center, NORTH_ANIMATION_DURATION);
    setMapHeading(0);
  }, []);

  const shouldShowCompass = popupIndex < 1;

  // Keep tracksViewChanges=true for 500 ms after building changes, then stop.
  // Using a timer (not onLoad) ensures the image is fully painted before we
  // stop re-capturing — onLoad fires when data is decoded, not when painted.
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

  useEffect(() => {
    if (!destBuildingId) return;

    const targetBuilding = ALL_BUILDINGS.find((b) => b.id === destBuildingId);
    if (targetBuilding) {
      if (!nav.isRouteMode) nav.setIsRouteMode(true);
      nav.setRouteDest(targetBuilding);
      setDestText(`${targetBuilding.code} - ${targetBuilding.name}`);
      setStartToCurrentLocation();
      setSelected(null);
      setPopupIndex(-1);
      setQuery("");
      focusBuilding(targetBuilding);
    }
  }, [destBuildingId, ALL_BUILDINGS]);

  const handleLocationFound = (location: UserLocation) => {
    setUserLocation(location);
    setIsFollowingUser(true);

    resetCompassToNorth({
      latitude: location.latitude,
      longitude: location.longitude,
    });

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
  };

  const handleCampusChange = (campus: Campus) => {
    setFocusedCampus(campus);
    setSelected(null);
    setPopupIndex(-1);

    const nextRegion = campus === "SGW" ? SGW_REGION : LOY_REGION;
    resetCompassToNorth({
      latitude: nextRegion.latitude,
      longitude: nextRegion.longitude,
    });
    mapRef.current?.animateToRegion(nextRegion, 500);
  };

  // Find which building user is inside
  const userLocationBuildingId = useMemo(
    () => getUserLocationBuildingId(ALL_BUILDINGS, userLocation),
    [ALL_BUILDINGS, userLocation],
  );

  // T-9.1: detect whether both endpoints are on different Concordia campuses
  // T-9.2: resolve the signed-in user's role from Firestore users/{uid}
  const { role: userRole } = useUserRole();
  // true for students and staff; false for guests and visitors
  const shuttleEligible = isShuttleEligible(userRole);

  // T-9.1: detect whether both endpoints are on different Concordia campuses
  const shuttleDirection = useMemo<ShuttleDirection | null>(() => {
    const start = nav.routeStart;
    const dest = nav.routeDest;
    if (!start || !dest) return null;
    if (!isCampusToCampusRoute(start.campus, dest.campus)) return null;
    return getShuttleDirection(start.campus, dest.campus);
  }, [nav.routeStart, nav.routeDest]);

  // T-9.5: pre-compute shuttle schedule info whenever the direction is known
  const shuttleInfo = useMemo(
    () => (shuttleDirection ? buildShuttleInfo(shuttleDirection) : undefined),
    [shuttleDirection],
  );

  // KEEP your existing suggestion memo (query-driven)
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
    setTravelPopupVisible(false);
    setAllRouteCoords([]);
    setShuttleSegmentCoords(null);
    setRoutesByMode({
      driving: [],
      transit: [],
      walking: [],
      bicycling: [],
      shuttle: [],
    });
    setSelectedRouteIndex(0);
  }, []);

  const updateShuttleSegmentCoords = useCallback((route?: DirectionRoute) => {
    const seg = route?.segmentPolylines;
    if (seg) {
      setShuttleSegmentCoords({
        walkToStop: decodePolyline(seg.walkToStop),
        shuttle: decodePolyline(seg.shuttle),
        walkToDestination: decodePolyline(seg.walkToDestination),
      });
    } else {
      setShuttleSegmentCoords(null);
    }
  }, []);

  useEffect(() => {
    const start = nav.routeStart;
    const dest = nav.routeDest;

    // Only run in route mode and only when both points exist
    if (!nav.isRouteMode || !start || !dest) {
      setTravelPopupVisible(false);
      setAllRouteCoords([]);
      setShuttleSegmentCoords(null);
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

        for (const [mode, routes] of results) next[mode] = routes;

        // T-9.6: compute shuttle route locally — only for eligible roles (T-9.2)
        if (shuttleDirection && shuttleEligible) {
          const shuttleRoute = await buildShuttleDirectionRouteFromGoogle(
            shuttleDirection,
            origin,
            destination,
          );
          const fallback =
            shuttleRoute ??
            buildShuttleDirectionRoute(shuttleDirection, origin, destination);
          next["shuttle"] = fallback ? [fallback] : [];
        }

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

        // Default mode selection: keep current mode if it has routes, else first that has routes
        const bestMode =
          next[selectedMode].length > 0
            ? selectedMode
            : (allModes.find((m) => next[m].length > 0) ?? "driving");

        const fastest = pickFastestRoute(next[bestMode]);
        const fastestIndex = fastest
          ? next[bestMode].findIndex((r) => r.polyline === fastest.polyline)
          : 0;

        setSelectedMode(bestMode);
        setSelectedRouteIndex(Math.max(0, fastestIndex));
        setTravelPopupVisible(true);

        const routesForMode = next[bestMode] ?? [];
        const decodedAll = routesForMode.map((r) => decodePolyline(r.polyline));
        setAllRouteCoords(decodedAll);

        const safeIndex = Math.max(0, fastestIndex);
        const selectedCoords = decodedAll[safeIndex] ?? [];

        if (bestMode === "shuttle") {
          updateShuttleSegmentCoords(routesForMode[safeIndex]);
        } else {
          setShuttleSegmentCoords(null);
        }

        // Fit map to route
        if (selectedCoords.length >= 2) {
          mapRef.current?.fitToCoordinates(selectedCoords, {
            edgePadding: { top: 90, right: 70, bottom: 260, left: 70 },
            animated: true,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setTravelPopupVisible(false);
          setAllRouteCoords([]);
          setShuttleSegmentCoords(null);
          setDirectionsError(toDirectionsErrorMessage(e));
        }
      }
    }

    loadAllModes();
    return () => {
      cancelled = true;
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
    updateShuttleSegmentCoords,
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
  ]);

  const focusBuilding = (b: Building) => {
    // keep your behavior
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
  };

  const showLocationAlert = (e: any) => {
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
  };

  /**
   * T-12.1: Resolves the device's current GPS position and sets it as the
   * route start point.  Reused by the RoutePlanner toggle, the building popup
   * "Get Directions" flow, and the RouteInput "my location" icon button.
   */
  const setStartToCurrentLocation = useCallback(async () => {
    try {
      const loc = await getDeviceLocation();

      const buildingInside = getBuildingContainingPoint(
        ALL_BUILDINGS,
        loc.latitude,
        loc.longitude,
      );

      const startBuilding =
        buildingInside ??
        makeUserLocationBuilding(loc.latitude, loc.longitude, focusedCampus);

      nav.setRouteStart(startBuilding);
      setStartText(
        startBuilding.id === "USER_LOCATION"
          ? "Your location"
          : `${startBuilding.code} - ${startBuilding.name}`,
      );
    } catch (e: any) {
      showLocationAlert(e);
    }
  }, [ALL_BUILDINGS, focusedCampus, nav]);

  const handleGetDirectionsFromPopup = async (destination: Building) => {
    // 1) Enter route mode immediately (UX feels instant)
    if (!nav.isRouteMode) nav.toggleRouteMode();

    // 2) Set destination
    nav.setRouteDest(destination);
    setDestText(`${destination.code} - ${destination.name}`);

    // 3) T-12.1: auto-set start from current location
    await setStartToCurrentLocation();

    // 4) Close popup and clear normal search UI state
    setSelected(null);
    setPopupIndex(-1);
    setQuery("");
  };

  const focusRouteField = (field: "start" | "destination") => {
    nav.setActiveField(field);
    setQuery(field === "start" ? startText : destText);
    nav.setRouteError(null);
  };

  const handlePickBuilding = (b: Building) => {
    if (nav.isRouteMode) {
      // set start/destination based on activeField
      nav.setFieldFromBuilding(b);

      const label = `${b.code} - ${b.name}`;
      if (nav.activeField === "start") {
        setStartText(label);
        focusRouteField("destination");
      } else {
        setDestText(label);
      }

      // hide suggestions after selecting
      setQuery("");
      focusBuilding(b);
      return;
    }

    // Normal mode: popup selection
    setSelected(b);
    focusBuilding(b);
  };

  const applySelection = useCallback(
    (mode: TravelMode, routeIndex: number) => {
      const routes = routesByMode[mode] ?? [];
      if (routes.length === 0) return;

      // Keep map routes in sync with the mode
      const decodedAll = routes.map((r) => decodePolyline(r.polyline));
      setAllRouteCoords(decodedAll);

      const chosen = routes[routeIndex];
      if (!chosen) return;

      setSelectedMode(mode);
      setSelectedRouteIndex(routeIndex);

      // NEW: for shuttle, decode segment polylines (dashed walking segments)
      if (mode === "shuttle") {
        const seg = chosen.segmentPolylines;
        if (seg) {
          setShuttleSegmentCoords({
            walkToStop: decodePolyline(seg.walkToStop),
            shuttle: decodePolyline(seg.shuttle),
            walkToDestination: decodePolyline(seg.walkToDestination),
          });
        } else {
          setShuttleSegmentCoords(null);
        }
      } else {
        setShuttleSegmentCoords(null);
      }

      const coords = decodedAll[routeIndex] ?? [];

      if (coords.length >= 2) {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 90, right: 70, bottom: 260, left: 70 },
          animated: true,
        });
      }
    },
    [routesByMode],
  );

  const hasBuildingPopup = !nav.isRouteMode && !!selected;
  const hasTravelPopup =
    nav.isRouteMode && !routeNavigation.isNavigating && travelPopupVisible;

  const collapsedBuildingPopupHeight = Math.round(windowHeight * 0.19);
  const collapsedTravelPopupHeight = Math.max(
    260,
    Math.round(windowHeight * 0.28),
  );

  const floatingBottom = useMemo(() => {
    if (hasBuildingPopup) return collapsedBuildingPopupHeight;
    if (hasTravelPopup) return collapsedTravelPopupHeight;
    return 120;
  }, [
    hasBuildingPopup,
    hasTravelPopup,
    collapsedBuildingPopupHeight,
    collapsedTravelPopupHeight,
  ]);

  const shouldHideFloatingButtons =
    (hasBuildingPopup && popupIndex > 0) || (hasTravelPopup && popupIndex > 0);

  const handleSelectMode = useCallback(
    (mode: TravelMode) => {
      if (mode === "shuttle") {
        // Allow selecting shuttle to view schedule even when no routes
        setSelectedMode("shuttle");
        setSelectedRouteIndex(0);

        const r = routesByMode.shuttle[0];
        if (routesByMode.shuttle.length > 0) {
          const decodedAll = routesByMode.shuttle.map((x) =>
            decodePolyline(x.polyline),
          );
          setAllRouteCoords(decodedAll);
          updateShuttleSegmentCoords(r);
        } else {
          setAllRouteCoords([]);
          setShuttleSegmentCoords(null);
        }
        return;
      }

      // Non-shuttle: default to fastest route (index 0)
      applySelection(mode, 0);
    },
    [routesByMode, applySelection, updateShuttleSegmentCoords],
  );

  const handleGo = useCallback(
    async (mode: TravelMode, index: number) => {
      // T-9.2: safety guard — visitors must never start shuttle navigation
      if (mode === "shuttle" && !shuttleEligible) {
        alert("Concordia Shuttle Bus is available to students and staff only.");
        return;
      }
      // T-9.6 / T-9.7: shuttle uses pre-built steps, no Google API call
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
          const shuttleRoute = routesByMode.shuttle[0];
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
    ],
  );

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
          if (r?.latitude != null && r?.longitude != null) setRegion(r);
        }}
        onPanDrag={() => {
          if (routeNavigation.isNavigating) setIsFollowingUser(false);
        }}
        onPress={() => {
          // Only clear popup in normal mode
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

        {/* NEW: Shuttle rendering (3-part polyline with dashed walking segments) */}
        {selectedMode === "shuttle" && shuttleSegmentCoords ? (
          <>
            {shuttleSegmentCoords.walkToStop.length > 0 && (
              <Polyline
                key={`shuttle-walk1-${routeStrokeWidth}`}
                coordinates={shuttleSegmentCoords.walkToStop}
                strokeWidth={routeStrokeWidth}
                strokeColor="#4286f5"
                lineDashPattern={[10, 8]}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {shuttleSegmentCoords.shuttle.length > 0 && (
              <Polyline
                key={`shuttle-ride-${routeStrokeWidth}`}
                coordinates={shuttleSegmentCoords.shuttle}
                strokeWidth={routeStrokeWidth}
                strokeColor="#912338"
                lineCap="round"
                lineJoin="round"
              />
            )}

            {shuttleSegmentCoords.walkToDestination.length > 0 && (
              <Polyline
                key={`shuttle-walk2-${routeStrokeWidth}`}
                coordinates={shuttleSegmentCoords.walkToDestination}
                strokeWidth={routeStrokeWidth}
                strokeColor="#4286f5"
                lineDashPattern={[10, 8]}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </>
        ) : (
          allRouteCoords.map((coords, index) => (
            <RouteStroke
              key={`${selectedMode}-${index}`}
              mode={selectedMode}
              coords={coords}
              index={index}
              selectedRouteIndex={selectedRouteIndex}
              onPress={() => applySelection(selectedMode, index)}
              strokeWidth={routeStrokeWidth}
            />
          ))
        )}

        {nav.routeStart && (
          <Marker
            testID="startPin"
            coordinate={{
              latitude: nav.routeStart.latitude,
              longitude: nav.routeStart.longitude,
            }}
            anchor={{ x: 0.5, y: 76 / 80 }}
            tracksViewChanges={
              Platform.OS === "android" ? startPinTracking : false
            }
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
            tracksViewChanges={
              Platform.OS === "android" ? destPinTracking : false
            }
          >
            <BuildingPin
              code={nav.routeDest.code}
              campus={nav.routeDest.campus}
              size={48}
              variant="map"
            />
          </Marker>
        )}
      </MapView>

      {/* TOP OVERLAY */}
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

        {/* NORMAL MODE SEARCH */}
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
          </>
        )}

        {/* ROUTE MODE UI */}
        {nav.isRouteMode && !routeNavigation.isNavigating && (
          <View testID="routeModeContainer" style={{ gap: 0 }}>
            <View style={routeStyles.routePanel} testID="routePanel">
              <RouteInput
                start={nav.routeStart}
                destination={nav.routeDest}
                activeField={nav.activeField}
                onFocusField={focusRouteField}
                onSwap={() => {
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
                  nav.setActiveField("start");
                  setStartText(t);
                  setQuery(t);
                  nav.setRouteError(null);
                  if (nav.routeStart) nav.setRouteStart(null);
                }}
                onChangeDestText={(t) => {
                  nav.setActiveField("destination");
                  setDestText(t);
                  setQuery(t);
                  nav.setRouteError(null);
                  if (nav.routeDest) nav.setRouteDest(null);
                }}
                onClearStart={() => {
                  setStartText("");
                  nav.setRouteStart(null);
                  setQuery("");
                  nav.setRouteError(null);
                  focusRouteField("start");
                  clearRouteData();
                }}
                onClearDestination={() => {
                  setDestText("");
                  nav.setRouteDest(null);
                  setQuery("");
                  nav.setRouteError(null);
                  focusRouteField("destination");
                  clearRouteData();
                }}
                onUseMyLocation={setStartToCurrentLocation}
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
        visible={shouldShowCompass && !shouldHideFloatingButtons}
        rotationDegrees={-mapHeading}
        onPress={() =>
          resetCompassToNorth(
            userLocation
              ? {
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                }
              : {
                  latitude: region.latitude,
                  longitude: region.longitude,
                },
          )
        }
        style={[
          compassStyles.button,
          { bottom: floatingBottom },
          shouldHideFloatingButtons && { display: "none" },
        ]}
      />

      {!shouldHideFloatingButtons && (
        <>
          <NextClassButton
            style={[nextClassStyles.button, { bottom: floatingBottom }]}
          />

          <View style={[floatingStyles.container, { bottom: floatingBottom }]}>
            <CurrentLocationButton onLocationFound={handleLocationFound} />

            {!routeNavigation.isNavigating && (
              <RoutePlanner
                isRouteMode={nav.isRouteMode}
                onToggle={() => {
                  const nextMode = !nav.isRouteMode;

                  setSelected(null);
                  setPopupIndex(-1);

                  if (nextMode) {
                    nav.toggleRouteMode();
                    nav.setActiveField("destination");
                    setQuery(destText);
                    nav.setRouteError(null);
                    setStartToCurrentLocation();
                    return;
                  }

                  nav.setRouteStart(null);
                  nav.setRouteDest(null);
                  nav.setRouteError(null);
                  setStartText("");
                  setDestText("");
                  setQuery("");
                  setAllRouteCoords([]);
                  setShuttleSegmentCoords(null);

                  resetCompassToNorth({
                    latitude: region.latitude,
                    longitude: region.longitude,
                  });

                  nav.toggleRouteMode();
                }}
              />
            )}
          </View>
        </>
      )}

      {/* Popup only in normal mode */}
      {!nav.isRouteMode && selected && (
        <BuildingPopup
          building={selected}
          campusTheme={focusedCampus}
          onClose={() => {
            setSelected(null);
            setPopupIndex(-1);
          }}
          onSheetChange={(index: number) => setPopupIndex(index)}
          onGetDirections={handleGetDirectionsFromPopup}
        />
      )}

      {/* Travel options popup only in route mode */}
      {nav.isRouteMode && !routeNavigation.isNavigating && (
        <TravelOptionsPopup
          campusTheme={focusedCampus}
          visible={travelPopupVisible}
          modes={[
            { mode: "driving", routes: routesByMode.driving },
            { mode: "transit", routes: routesByMode.transit },
            { mode: "walking", routes: routesByMode.walking },
            { mode: "bicycling", routes: routesByMode.bicycling },
            ...(shuttleDirection !== null && shuttleEligible
              ? [
                  {
                    mode: "shuttle" as TravelMode,
                    routes: routesByMode.shuttle,
                  },
                ]
              : []),
          ]}
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

      <NavigationOverlay
        isNavigating={routeNavigation.isNavigating}
        isNearStart={routeNavigation.isNearStart}
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
        arrivalTimeText={
          routeNavigation.activeSummary
            ? formatArrivalTimeFromNow(
                routeNavigation.activeSummary.durationSec,
              )
            : "--:--"
        }
        durationMinText={
          routeNavigation.activeSummary
            ? secondsToMinutesString(routeNavigation.activeSummary.durationSec)
            : "--"
        }
        distanceKmText={
          routeNavigation.activeSummary
            ? metersToKmString(routeNavigation.activeSummary.distanceMeters)
            : "--"
        }
        onExit={() => {
          routeNavigation.exitNavigation();
          setAllRouteCoords([]);
          setShuttleSegmentCoords(null);

          resetCompassToNorth(
            userLocation
              ? {
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                }
              : {
                  latitude: region.latitude,
                  longitude: region.longitude,
                },
          );
        }}
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
    gap: 30,
    alignItems: "center",
    zIndex: 999,
    elevation: 999,
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

const nextClassStyles = StyleSheet.create({
  button: {
    position: "absolute",
    left: 16,
    zIndex: 999,
    elevation: 999,
  },
});
