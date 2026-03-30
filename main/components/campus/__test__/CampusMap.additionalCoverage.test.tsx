/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const mockAnimateToRegion = jest.fn();
const mockFitToCoordinates = jest.fn();
const mockAnimateCamera = jest.fn();

const mockSetIsRouteMode = jest.fn();
const mockSetRouteDest = jest.fn();
const mockSetRouteStart = jest.fn();
const mockToggleRouteMode = jest.fn();
const mockSetRouteError = jest.fn();
const mockSetActiveField = jest.fn();
const mockSetFieldFromBuilding = jest.fn();

const mockStartNavigation = jest.fn(() => Promise.resolve());
const mockStartNavigationWithSteps = jest.fn();
const mockExitNavigation = jest.fn();

const mockFetchDirections = jest.fn();
const mockPickFastestRoute = jest.fn();
const mockBuildShuttleNavigationSteps = jest.fn(() => [
  {
    instruction: "Walk to stop",
    distanceText: "100 m",
    end: { latitude: 45.5, longitude: -73.6 },
  },
]);

const mockBuildShuttleDirectionRouteFromGoogle = jest.fn(async () => null);
const mockBuildShuttleDirectionRoute = jest.fn(() => null);

const deepLinkBuilding = {
  id: "CJ",
  code: "CJ",
  name: "Communication Studies and Journalism",
  address: "7141 Sherbrooke St W",
  latitude: 45.458,
  longitude: -73.64,
  campus: "LOY",
  aliases: [],
};

let mockLocalSearchParams: Record<string, string> = {};
let mockNavState: any;
let mockRouteNavigationState: any;
let mockTravelPopupProps: any = null;

beforeEach(() => {
  jest.clearAllMocks();

  mockLocalSearchParams = {};

  mockNavState = {
    isRouteMode: false,
    routeStart: null,
    routeDest: null,
    activeField: "destination",
    routeError: null,
    toggleRouteMode: mockToggleRouteMode,
    setRouteStart: mockSetRouteStart,
    setRouteDest: mockSetRouteDest,
    setRouteError: mockSetRouteError,
    setActiveField: mockSetActiveField,
    setIsRouteMode: mockSetIsRouteMode,
    setFieldFromBuilding: mockSetFieldFromBuilding,
  };

  mockRouteNavigationState = {
    isNavigating: false,
    isNearStart: false,
    isArrived: false,
    activeSteps: [],
    activeStepIndex: 0,
    currentStep: null,
    activeSummary: null,
    startNavigation: mockStartNavigation,
    startNavigationWithSteps: mockStartNavigationWithSteps,
    exitNavigation: mockExitNavigation,
  };

  mockTravelPopupProps = null;
});

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockLocalSearchParams,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: () => mockNavState,
}));

jest.mock("@/hooks/useRouteNavigation", () => ({
  useRouteNavigation: (args: any) => {
    if (args?.onStarted) {
      mockRouteNavigationState.onStarted = args.onStarted;
    }
    return mockRouteNavigationState;
  },
}));

jest.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "student" }),
  isShuttleEligible: () => true,
}));

jest.mock("@/components/campus/helper_methods/locationUtils", () => ({
  LocationError: class MockLocationError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
  getDeviceLocation: jest.fn(async () => ({
    latitude: 45.497,
    longitude: -73.579,
  })),
}));

jest.mock("@/components/Buildings/SGW/SGWBuildings", () => ({
  SGW_BUILDINGS: [],
}));

jest.mock("@/components/Buildings/Loyola/LoyolaBuildings", () => ({
  LOYOLA_BUILDINGS: [],
}));

jest.mock("@/components/campus/helper_methods/campusMap.constants", () => ({
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
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  },
}));

jest.mock("@/components/Buildings/mapZoom", () => ({
  regionFromPolygon: jest.fn(() => ({
    latitude: 45.458,
    longitude: -73.64,
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
  })),
  paddingForZoomCategory: jest.fn(() => 0.001),
}));

jest.mock("@/components/campus/helper_methods/campusMap.buildings", () => ({
  buildAllBuildings: () => [deepLinkBuilding],
  getUserLocationBuildingId: () => null,
  getBuildingContainingPoint: () => null,
  makeUserLocationBuilding: (
    latitude: number,
    longitude: number,
    campus: string,
  ) => ({
    id: "USER_LOCATION",
    code: "ME",
    name: "Your location",
    address: "",
    latitude,
    longitude,
    campus,
    aliases: [],
  }),
  resolveCampusFromLocation: () => "SGW",
}));

jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  fetchDirections: (...args: any[]) => mockFetchDirections(...args),
  pickFastestRoute: (...args: any[]) => mockPickFastestRoute(...args),
  decodePolyline: jest.fn((polyline: string) => {
    if (polyline === "transit-poly") {
      return [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.458, longitude: -73.64 },
      ];
    }
    if (polyline === "shuttle-poly") {
      return [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.458, longitude: -73.64 },
      ];
    }
    return [
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
    ];
  }),
}));

jest.mock("@/components/campus/helper_methods/shuttleSchedule", () => ({
  isCampusToCampusRoute: jest.fn(() => true),
  getShuttleDirection: jest.fn(() => "SGW_TO_LOY"),
  buildShuttleDirectionRoute: (...args: any[]) =>
    mockBuildShuttleDirectionRoute(...args),
  buildShuttleDirectionRouteFromGoogle: (...args: any[]) =>
    mockBuildShuttleDirectionRouteFromGoogle(...args),
  buildShuttleNavigationSteps: (...args: any[]) =>
    mockBuildShuttleNavigationSteps(...args),
  buildShuttleInfo: jest.fn(() => ({
    status: "operating",
    nextDeparture: "13:45",
  })),
}));

jest.mock("@/components/campus/helper_methods/directionErrors", () => ({
  toDirectionsErrorMessage: () => "Directions failed",
}));

jest.mock("@/components/campus/helper_methods/geo", () => ({
  bearingDegrees: () => 0,
}));

jest.mock("@/components/campus/helper_methods/navigationFormat", () => ({
  formatArrivalTimeFromNow: () => "18:57",
  metersToKmString: () => "8.2",
  secondsToMinutesString: () => "47",
}));

jest.mock("@/components/campus/helper_methods/mapCompass", () => ({
  resetMapDirectionToNorth: jest.fn(),
}));

jest.mock("react-native-maps", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");

  const MockMapView = ReactActual.forwardRef((props: any, ref: any) => {
    ReactActual.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
      fitToCoordinates: mockFitToCoordinates,
      animateCamera: mockAnimateCamera,
    }));

    return ReactActual.createElement(
      View,
      { ...props, testID: props.testID || "mapView" },
      props.children,
    );
  });

  MockMapView.displayName = "MockMapView";

  return {
    __esModule: true,
    default: MockMapView,
    PROVIDER_GOOGLE: "google",
    Marker: (props: any) =>
      ReactActual.createElement(View, {
        ...props,
        testID: props.testID || "marker",
      }),
  };
});

jest.mock("@/components/Styles/mapStyle", () => ({
  styles: {
    container: { flex: 1 },
    suggestions: {},
    suggestionRow: {},
    suggestionTitle: {},
    suggestionSub: {},
    topOverlay: {},
    searchBar: {},
    searchIcon: {},
    searchInput: {},
    clearButton: {},
    clearIcon: {},
  },
}));

jest.mock("@/components/campus/BuildingShapesLayer", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: "shapes-layer" }),
  };
});

jest.mock("@/components/campus/ToggleButton", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: "toggle-button" }),
  };
});

jest.mock("@/components/campus/BuildingPin", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: "building-pin" }),
  };
});

jest.mock("@/components/campus/CurrentLocationButton", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: "current-location-button" }),
  };
});

jest.mock("@/components/campus/BuildingPopup", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: "building-popup" }),
  };
});

jest.mock("@/components/layout/BrandBar", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: any) =>
      ReactActual.createElement(View, { testID: props.testID || "brandbar" }),
  };
});

jest.mock("@/components/campus/RoutePlanner", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: "route-planner" }),
  };
});

jest.mock("@/components/campus/RouteInput", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: "route-input" }),
  };
});

jest.mock("@/components/campus/Compass", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible }: any) =>
      visible ? ReactActual.createElement(View, { testID: "compass" }) : null,
  };
});

jest.mock("@/components/campus/NextClassButton", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    NextClassButton: () =>
      ReactActual.createElement(View, { testID: "next-class-button" }),
  };
});

jest.mock("@/components/campus/RoutePolylines", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: "route-polylines" }),
  };
});

jest.mock("../../ui/DirectionLoadError", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible }: any) =>
      visible
        ? ReactActual.createElement(View, { testID: "direction-load-error" })
        : null,
  };
});

jest.mock("@/components/campus/NavigationOverlay", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    NavigationOverlay: ({ isNavigating }: any) =>
      isNavigating
        ? ReactActual.createElement(View, { testID: "navigation-overlay" })
        : null,
  };
});

jest.mock("@/components/campus/TravelOptionsPopup", () => {
  const ReactActual = require("react");
  const { View, Pressable, Text } = require("react-native");

  return {
    __esModule: true,
    default: ({ visible, modes, onGo, onSelectMode, selectedMode }: any) => {
      mockTravelPopupProps = { visible, modes, selectedMode };

      if (!visible) return null;

      return (
        <View testID="travel-popup">
          {modes.map((m: any) => (
            <Pressable
              key={m.mode}
              testID={`mode-${m.mode}`}
              onPress={() => onSelectMode(m.mode)}
            >
              <Text>{m.mode}</Text>
            </Pressable>
          ))}

          <Pressable testID="go-shuttle" onPress={() => onGo("shuttle", 0)}>
            <Text>Go shuttle</Text>
          </Pressable>
        </View>
      );
    },
  };
});

import CampusMap from "../CampusMap";

describe("CampusMap additional coverage", () => {
  it("covers the destBuildingId effect and auto-selects the deep-linked destination", async () => {
    mockLocalSearchParams = { destBuildingId: "CJ" };

    render(<CampusMap />);

    await waitFor(() => {
      expect(mockSetIsRouteMode).toHaveBeenCalledWith(true);
      expect(mockSetRouteDest).toHaveBeenCalledWith(deepLinkBuilding);
      expect(mockAnimateToRegion).toHaveBeenCalled();
    });

    expect(mockSetRouteStart).toHaveBeenCalled();
  });

  it("covers the transit branch and deferred pending transit render", async () => {
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };

    mockFetchDirections.mockImplementation(
      async ({ mode }: { mode: string }) => {
        if (mode === "transit") {
          return [
            {
              summary: "Transit Route",
              polyline: "transit-poly",
              durationSec: 2400,
              durationText: "40 min",
              distanceMeters: 8200,
              distanceText: "8.2 km",
            },
          ];
        }
        return [];
      },
    );

    mockPickFastestRoute.mockImplementation(
      (routes: any[]) => routes[0] ?? null,
    );

    render(<CampusMap />);

    await waitFor(() => {
      expect(mockFitToCoordinates).toHaveBeenCalledWith(
        [
          { latitude: 45.497, longitude: -73.579 },
          { latitude: 45.458, longitude: -73.64 },
        ],
        expect.objectContaining({
          animated: true,
        }),
      );
    });

    expect(mockTravelPopupProps?.visible).toBe(true);
    expect(
      mockTravelPopupProps?.modes?.find((m: any) => m.mode === "transit")
        ?.routes?.length,
    ).toBe(1);
  });

  it("covers shuttle fallback values when no shuttle route exists", async () => {
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };

    mockFetchDirections.mockResolvedValue([]);
    mockPickFastestRoute.mockReturnValue(null);
    mockBuildShuttleDirectionRouteFromGoogle.mockResolvedValue(null);
    mockBuildShuttleDirectionRoute.mockReturnValue(null);

    render(<CampusMap />);

    await waitFor(() => {
      expect(mockBuildShuttleDirectionRouteFromGoogle).toHaveBeenCalled();
      expect(mockBuildShuttleDirectionRoute).toHaveBeenCalled();
    });

    expect(mockStartNavigationWithSteps).not.toHaveBeenCalled();
  });
});
