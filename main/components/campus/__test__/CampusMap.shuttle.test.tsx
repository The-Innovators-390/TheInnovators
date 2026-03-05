/* eslint-disable import/first */
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type * as ReactType from "react";
import type * as ReactNativeType from "react-native";

// IMPORTANT: adjust if your relative path differs
import CampusMap from "../CampusMap";

// ---------------------------
// Shared mock data
// ---------------------------
const MOCK_SGW_BUILDING = {
  id: "sgw-h",
  code: "H",
  name: "Henry F. Hall Building",
  address: "1455 De Maisonneuve Blvd W",
  latitude: 45.49729,
  longitude: -73.57898,
  campus: "SGW",
  zoomCategory: 2,
  aliases: ["hall", "henry hall"],
  polygon: [
    { latitude: 45.497, longitude: -73.58 },
    { latitude: 45.497, longitude: -73.579 },
    { latitude: 45.498, longitude: -73.579 },
    { latitude: 45.498, longitude: -73.58 },
  ],
};

const MOCK_LOY_BUILDING = {
  id: "loy-ad",
  code: "AD",
  name: "Administration Building",
  address: "7141 Sherbrooke St W",
  latitude: 45.45824,
  longitude: -73.64051,
  campus: "LOY",
  zoomCategory: 2,
  aliases: ["ad", "administration"],
  polygon: [
    { latitude: 45.458, longitude: -73.641 },
    { latitude: 45.458, longitude: -73.64 },
    { latitude: 45.459, longitude: -73.64 },
    { latitude: 45.459, longitude: -73.641 },
  ],
};

const MOCK_GOOGLE_DIRECTIONS_ROUTE = {
  polyline: "mock-google-polyline",
  durationSec: 1020,
  durationText: "17 min",
  distanceMeters: 8100,
  distanceText: "8.1 km",
  summary: "Fastest",
  steps: [],
};

const MOCK_SHUTTLE_ROUTE = {
  mode: "shuttle",
  coords: [
    { latitude: 45.49729, longitude: -73.57898 },
    { latitude: 45.492, longitude: -73.587 },
    { latitude: 45.465, longitude: -73.63 },
    { latitude: 45.45824, longitude: -73.64051 },
  ],
  distanceText: "6.9 km",
  durationText: "22 min",
  steps: [
    {
      instruction: "Walk to shuttle stop",
      distanceText: "300 m",
      durationText: "4 min",
      travelMode: "walking",
      coords: [
        { latitude: 45.49729, longitude: -73.57898 },
        { latitude: 45.492, longitude: -73.587 },
      ],
    },
    {
      instruction: "Take Concordia shuttle",
      distanceText: "6.0 km",
      durationText: "14 min",
      travelMode: "shuttle",
      coords: [
        { latitude: 45.492, longitude: -73.587 },
        { latitude: 45.465, longitude: -73.63 },
      ],
    },
    {
      instruction: "Walk to destination",
      distanceText: "600 m",
      durationText: "4 min",
      travelMode: "walking",
      coords: [
        { latitude: 45.465, longitude: -73.63 },
        { latitude: 45.45824, longitude: -73.64051 },
      ],
    },
  ],
  shuttleInfo: {
    status: "operating",
    nextDeparture: "5 min",
    originStop: "SGW Shuttle Stop",
    destinationStop: "Loyola Shuttle Stop",
  },
};

// ---------------------------
// Core spies
// ---------------------------
const mockFetchDirections = jest.fn() as jest.Mock<any>;
const mockDecodePolyline = jest.fn() as jest.Mock<any>;
const mockPickFastestRoute = jest.fn() as jest.Mock<any>;

const mockBuildShuttleDirectionRouteFromGoogle = jest.fn() as jest.Mock<any>;
const mockBuildShuttleNavigationSteps = jest.fn() as jest.Mock<any>;
const mockBuildShuttleInfo = jest.fn() as jest.Mock<any>;

const mockStartNavigationWithSteps = jest.fn() as jest.Mock<any>;

// Capture popup props
let lastTravelOptionsPopupProps: any = null;

// ---------------------------
// Silence noisy icon warnings
// ---------------------------
jest.mock("@expo/vector-icons", () => {
  return new Proxy(
    {},
    {
      get: () => () => null,
    },
  );
});

// ---------------------------
// Prevent missing Google API key failures in tests
// ---------------------------
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        googleMapsApiKey: "test-google-maps-key",
      },
    },
  },
}));

// ---------------------------
// Mock navigation hook (THIS IS CRITICAL)
// Forces route mode ON with SGW -> LOY buildings
// ---------------------------
jest.mock("@/hooks/useNavigation", () => ({
  __esModule: true,
  useNavigation: () => ({
    isRouteMode: true,
    routeStart: MOCK_SGW_BUILDING,
    routeDest: MOCK_LOY_BUILDING,
    activeField: "destination",
    routeError: null,

    setIsRouteMode: jest.fn(),
    setRouteStart: jest.fn(),
    setRouteDest: jest.fn(),
    setActiveField: jest.fn(),
    toggleRouteMode: jest.fn(),
    clearStart: jest.fn(),
    clearDestination: jest.fn(),
    setFieldFromBuilding: jest.fn(),
    validateRouteRequest: jest.fn(() => true),
    setRouteError: jest.fn(),
  }),
}));

// ---------------------------
// Mock react-native-maps (ref-safe)
// ---------------------------
jest.mock("react-native-maps", () => {
  const ReactActual = jest.requireActual("react") as typeof ReactType;
  const RN = jest.requireActual("react-native") as typeof ReactNativeType;

  const MockMapView = ReactActual.forwardRef(
    ({ children, testID = "mapView", ...props }: any, ref: any) => {
      ReactActual.useImperativeHandle(ref, () => ({
        animateToRegion: jest.fn(),
        fitToCoordinates: jest.fn(),
        animateCamera: jest.fn(),
      }));

      return (
        <RN.View testID={testID} {...props}>
          {children}
        </RN.View>
      );
    },
  );

  const Marker = ({ children, testID, ...props }: any) => (
    <RN.View testID={testID} {...props}>
      {children}
    </RN.View>
  );

  const Polyline = ({ children, testID, ...props }: any) => (
    <RN.View testID={testID} {...props}>
      {children}
    </RN.View>
  );

  return {
    __esModule: true,
    default: MockMapView,
    Marker,
    Polyline,
    PROVIDER_GOOGLE: "google",
  };
});

// ---------------------------
// Mock Google directions helper
// ---------------------------
jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  __esModule: true,
  fetchDirections: (...args: any[]) => mockFetchDirections(...args),
  decodePolyline: (...args: any[]) => mockDecodePolyline(...args),
  pickFastestRoute: (...args: any[]) => mockPickFastestRoute(...args),
}));

// ---------------------------
// Mock shuttle helpers
// ---------------------------
jest.mock("@/components/campus/helper_methods/shuttleSchedule", () => ({
  __esModule: true,
  isCampusToCampusRoute: (startCampus: string, destCampus: string) =>
    (startCampus === "SGW" && destCampus === "LOY") ||
    (startCampus === "LOY" && destCampus === "SGW"),
  getShuttleDirection: () => "SGW_TO_LOY",
  buildShuttleDirectionRouteFromGoogle: (...args: any[]) =>
    mockBuildShuttleDirectionRouteFromGoogle(...args),
  buildShuttleDirectionRoute: (...args: any[]) =>
    mockBuildShuttleDirectionRouteFromGoogle(...args),
  buildShuttleNavigationSteps: (...args: any[]) =>
    mockBuildShuttleNavigationSteps(...args),
  buildShuttleInfo: (...args: any[]) => mockBuildShuttleInfo(...args),
}));

// ---------------------------
// Mock user role hook => student + eligible
// ---------------------------
jest.mock("@/hooks/useUserRole", () => ({
  __esModule: true,
  useUserRole: () => ({
    role: "student",
    isStudent: true,
    loading: false,
  }),
  isShuttleEligible: (role: string) => role === "student" || role === "staff",
  default: () => ({
    role: "student",
    isStudent: true,
    loading: false,
  }),
}));

// ---------------------------
// Mock route navigation hook
// ---------------------------
jest.mock("@/hooks/useRouteNavigation", () => ({
  __esModule: true,
  useRouteNavigation: () => ({
    isNavigating: false,
    currentStepIndex: 0,
    steps: [],
    currentInstruction: null,
    remainingDistanceText: null,
    remainingDurationText: null,
    startNavigationWithSteps: (...args: any[]) =>
      mockStartNavigationWithSteps(...args),
    stopNavigation: jest.fn(),
    goToNextStep: jest.fn(),
    goToPreviousStep: jest.fn(),
    setSteps: jest.fn(),
    setCurrentStepIndex: jest.fn(),
  }),
  default: () => ({
    isNavigating: false,
    currentStepIndex: 0,
    steps: [],
    currentInstruction: null,
    remainingDistanceText: null,
    remainingDurationText: null,
    startNavigationWithSteps: (...args: any[]) =>
      mockStartNavigationWithSteps(...args),
    stopNavigation: jest.fn(),
    goToNextStep: jest.fn(),
    goToPreviousStep: jest.fn(),
    setSteps: jest.fn(),
    setCurrentStepIndex: jest.fn(),
  }),
}));

// ---------------------------
// IMPORTANT: stop device-location effect from firing polygon/building logic
// ---------------------------
jest.mock("@/components/campus/helper_methods/locationUtils", () => ({
  __esModule: true,
  getDeviceLocation: jest
    .fn()
    .mockRejectedValue(new Error("skip device location in shuttle test")),
  LocationError: class MockLocationError extends Error {},
}));

// ---------------------------
// IMPORTANT: mock building helper module to avoid polygon crash path
// ---------------------------
jest.mock("@/components/campus/helper_methods/campusMap.buildings", () => ({
  __esModule: true,
  buildAllBuildings: () => [MOCK_SGW_BUILDING, MOCK_LOY_BUILDING],
  getUserLocationBuildingId: jest.fn(() => null),
  getBuildingContainingPoint: jest.fn(() => undefined),
  makeUserLocationBuilding: jest.fn(
    (lat: number, lng: number, campus: "SGW" | "LOY") => ({
      id: "USER_LOCATION",
      code: "",
      name: "Your location",
      address: "",
      latitude: lat,
      longitude: lng,
      campus,
      zoomCategory: 2,
      aliases: [],
      polygon: [],
    }),
  ),
}));

// ---------------------------
// Mock building datasets (safe even if CampusMap imports them)
// ---------------------------
jest.mock("@/components/Buildings/SGW/SGWBuildings", () => ({
  __esModule: true,
  SGW_BUILDINGS: [MOCK_SGW_BUILDING],
}));
jest.mock("@/components/Buildings/Loyola/LoyolaBuildings", () => ({
  __esModule: true,
  LOYOLA_BUILDINGS: [MOCK_LOY_BUILDING],
}));
jest.mock("@/components/Buildings/data/SGW_data.json", () => [
  MOCK_SGW_BUILDING,
]);
jest.mock("@/components/Buildings/data/Loyola_data.json", () => [
  MOCK_LOY_BUILDING,
]);

// ---------------------------
// Mock static map constants
// ---------------------------
jest.mock("@/components/campus/helper_methods/campusMap.constants", () => ({
  __esModule: true,
  SGW_REGION: {
    latitude: 45.497,
    longitude: -73.579,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  },
  LOY_REGION: {
    latitude: 45.458,
    longitude: -73.64,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  },
  INITIAL_REGION: {
    latitude: 45.497,
    longitude: -73.579,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  },
}));

// ---------------------------
// Mock map zoom helpers
// ---------------------------
jest.mock("@/components/Buildings/mapZoom", () => ({
  __esModule: true,
  regionFromPolygon: jest.fn(() => ({
    latitude: 45.497,
    longitude: -73.579,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })),
  paddingForZoomCategory: jest.fn(() => ({
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  })),
}));

// ---------------------------
// Mock visual child components
// ---------------------------
jest.mock("@/components/campus/BuildingShapesLayer", () => {
  const RN = jest.requireActual("react-native") as typeof ReactNativeType;
  return {
    __esModule: true,
    default: () => <RN.View testID="mock-shapes" />,
  };
});
jest.mock("@/components/layout/BrandBar", () => {
  const RN = jest.requireActual("react-native") as typeof ReactNativeType;
  return {
    __esModule: true,
    default: () => <RN.View testID="brandbar" />,
  };
});
jest.mock("@/components/campus/CurrentLocationButton", () => {
  const RN = jest.requireActual("react-native") as typeof ReactNativeType;
  return {
    __esModule: true,
    default: () => <RN.View testID="currentLocationBtn" />,
  };
});

// ---------------------------
// Mock RouteInput & RoutePlanner (they can still mount, but nav is already forced)
// ---------------------------
jest.mock("@/components/campus/RouteInput", () => {
  const RN = jest.requireActual("react-native") as typeof ReactNativeType;
  return {
    __esModule: true,
    default: () => <RN.View testID="mock-route-input" />,
  };
});
jest.mock("@/components/campus/RoutePlanner", () => {
  const RN = jest.requireActual("react-native") as typeof ReactNativeType;
  return {
    __esModule: true,
    default: () => <RN.View testID="mock-route-planner" />,
  };
});

// ---------------------------
// Mock TravelOptionsPopup (FIXED: modes are objects { mode, routes })
// ---------------------------
jest.mock("@/components/campus/TravelOptionsPopup", () => {
  const ReactActual = jest.requireActual("react") as typeof ReactType;
  const RN = jest.requireActual("react-native") as typeof ReactNativeType;

  function MockTravelOptionsPopup(props: any) {
    lastTravelOptionsPopupProps = props;

    const modeItems = props.modes ?? props.availableModes ?? [];

    const initialSelectedMode =
      props.selectedMode ?? props.currentMode ?? props.activeMode ?? "driving";

    const shuttleInfo =
      props.shuttleInfo ?? props.shuttleStatus ?? props.shuttle ?? null;

    const onSelectMode =
      props.onSelectMode ??
      props.setSelectedMode ??
      props.onModeSelect ??
      (() => {});

    const onGo =
      props.onGo ??
      props.onStart ??
      props.onStartNavigation ??
      props.onConfirmMode ??
      (() => {});

    const [localSelectedMode, setLocalSelectedMode] =
      ReactActual.useState(initialSelectedMode);

    ReactActual.useEffect(() => {
      setLocalSelectedMode(initialSelectedMode);
    }, [initialSelectedMode]);

    return (
      <RN.View testID="mock-travel-options-popup">
        {Array.isArray(modeItems) &&
          modeItems.map((item: any) => {
            const modeName = item?.mode;
            if (!modeName) return null;

            return (
              <RN.Pressable
                key={`mode-${modeName}`}
                testID={`mode-${modeName}`}
                onPress={() => {
                  setLocalSelectedMode(modeName);
                  onSelectMode(modeName);
                }}
              >
                <RN.Text>{modeName}</RN.Text>
              </RN.Pressable>
            );
          })}

        <RN.Pressable
          testID={`go-${localSelectedMode}`}
          onPress={() => onGo(localSelectedMode)}
        >
          <RN.Text>{`GO ${localSelectedMode}`}</RN.Text>
        </RN.Pressable>

        {shuttleInfo ? (
          <RN.Text testID="shuttle-status">
            {shuttleInfo.status ?? "unknown"}
          </RN.Text>
        ) : null}
      </RN.View>
    );
  }

  return {
    __esModule: true,
    default: MockTravelOptionsPopup,
  };
});

// ---------------------------
// Tests
// ---------------------------
describe("CampusMap – shuttle integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastTravelOptionsPopupProps = null;

    // Google mocks
    mockFetchDirections.mockResolvedValue([MOCK_GOOGLE_DIRECTIONS_ROUTE]);
    mockDecodePolyline.mockImplementation(() => [
      { latitude: 45.49729, longitude: -73.57898 },
      { latitude: 45.49, longitude: -73.59 },
      { latitude: 45.47, longitude: -73.62 },
      { latitude: 45.45824, longitude: -73.64051 },
    ]);
    mockPickFastestRoute.mockImplementation(
      (routes: any[]) => routes?.[0] ?? null,
    );

    // Shuttle mocks
    mockBuildShuttleDirectionRouteFromGoogle.mockResolvedValue(
      MOCK_SHUTTLE_ROUTE,
    );
    mockBuildShuttleNavigationSteps.mockResolvedValue(MOCK_SHUTTLE_ROUTE.steps);

    // IMPORTANT: synchronous in CampusMap (useMemo)
    mockBuildShuttleInfo.mockReturnValue(MOCK_SHUTTLE_ROUTE.shuttleInfo);
  });

  it("includes shuttle mode chip when SGW→LOY route and user is student", async () => {
    const { findByTestId } = render(<CampusMap />);
    const shuttleChip = await findByTestId("mode-shuttle");
    expect(shuttleChip).toBeTruthy();
  });

  it("calls buildShuttleDirectionRouteFromGoogle during mode loading", async () => {
    render(<CampusMap />);
    await waitFor(() => {
      expect(mockBuildShuttleDirectionRouteFromGoogle).toHaveBeenCalled();
    });
  });

  it("passes shuttleInfo to TravelOptionsPopup (status visible)", async () => {
    const { findByTestId } = render(<CampusMap />);

    const statusEl = await findByTestId("shuttle-status");
    expect(statusEl.props.children).toBe("operating");

    expect(lastTravelOptionsPopupProps).toBeTruthy();
    const shuttleInfo =
      lastTravelOptionsPopupProps.shuttleInfo ??
      lastTravelOptionsPopupProps.shuttleStatus ??
      lastTravelOptionsPopupProps.shuttle;

    expect(shuttleInfo).toBeTruthy();
    expect(shuttleInfo.status).toBe("operating");
  });

  it("selecting shuttle mode exposes GO shuttle (mode selection path)", async () => {
    const { findByTestId } = render(<CampusMap />);

    await act(async () => {
      fireEvent.press(await findByTestId("mode-shuttle"));
    });

    const goBtn = await findByTestId("go-shuttle");
    expect(goBtn).toBeTruthy();
  });

  it("pressing GO shuttle calls startNavigationWithSteps", async () => {
    const { findByTestId } = render(<CampusMap />);

    await act(async () => {
      fireEvent.press(await findByTestId("mode-shuttle"));
    });

    await act(async () => {
      fireEvent.press(await findByTestId("go-shuttle"));
    });

    await waitFor(() => {
      expect(mockStartNavigationWithSteps).toHaveBeenCalled();
    });
  });
});
