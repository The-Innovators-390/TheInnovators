/* eslint-disable import/first */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const mockAnimateCamera = jest.fn();
const mockAnimateToRegion = jest.fn();
const mockFitToCoordinates = jest.fn();

const mockExitNavigation = jest.fn();

let mockIsNavigating = false;
let mockCurrentStepEnd: { latitude: number; longitude: number } | null = null;

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
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
  regionFromPolygon: jest.fn(),
  paddingForZoomCategory: jest.fn(() => 0.001),
}));

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

jest.mock("@/components/campus/helper_methods/campusMap.buildings", () => ({
  buildAllBuildings: () => [],
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
}));

jest.mock("@/components/campus/helper_methods/campusMap.ui", () => ({
  computeFloatingBottom: () => 120,
}));

jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  decodePolyline: jest.fn(() => []),
  fetchDirections: jest.fn(async () => []),
  pickFastestRoute: jest.fn(() => null),
}));

jest.mock("@/components/campus/helper_methods/shuttleSchedule", () => ({
  isCampusToCampusRoute: jest.fn(() => false),
  getShuttleDirection: jest.fn(() => null),
  buildShuttleDirectionRoute: jest.fn(() => null),
  buildShuttleDirectionRouteFromGoogle: jest.fn(async () => null),
  buildShuttleNavigationSteps: jest.fn(() => []),
  buildShuttleInfo: jest.fn(() => undefined),
}));

jest.mock("@/components/campus/helper_methods/directionErrors", () => ({
  toDirectionsErrorMessage: () => "error",
}));

jest.mock("@/components/campus/helper_methods/geo", () => ({
  bearingDegrees: jest.fn(() => 0),
}));

jest.mock("@/components/campus/helper_methods/navigationFormat", () => ({
  formatArrivalTimeFromNow: () => "22:01",
  metersToKmString: () => "8.0",
  secondsToMinutesString: () => "45",
}));

jest.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "student" }),
  isShuttleEligible: () => true,
}));

jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: () => ({
    isRouteMode: false,
    routeStart: null,
    routeDest: null,
    activeField: "destination",
    toggleRouteMode: jest.fn(),
    setRouteStart: jest.fn(),
    setRouteDest: jest.fn(),
    setRouteError: jest.fn(),
    setActiveField: jest.fn(),
    setIsRouteMode: jest.fn(),
    setFieldFromBuilding: jest.fn(),
  }),
}));

jest.mock("@/hooks/useRouteNavigation", () => ({
  useRouteNavigation: () => ({
    isNavigating: mockIsNavigating,
    isNearStart: false,
    isArrived: false,
    activeSteps: [],
    activeStepIndex: 0,
    currentStep: mockCurrentStepEnd ? { end: mockCurrentStepEnd } : null,
    activeSummary: {
      durationSec: 2700,
      distanceMeters: 8000,
    },
    onStarted: undefined,
    exitNavigation: mockExitNavigation,
    startNavigation: jest.fn(),
    startNavigationWithSteps: jest.fn(),
  }),
}));

jest.mock("@/components/campus/BuildingShapesLayer", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/campus/ToggleButton", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/campus/BuildingPin", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/campus/CurrentLocationButton", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/campus/BuildingPopup", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/layout/BrandBar", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/campus/RoutePlanner", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/campus/RouteInput", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/campus/TravelOptionsPopup", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../ui/DirectionLoadError", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/campus/NavigationOverlay", () => {
  const ReactLib = require("react");
  const { Pressable, Text, View } = require("react-native");

  const MockNavigationOverlay = (props: any) => {
    if (!props.isNavigating) {
      return ReactLib.createElement(View, {
        testID: "navigationOverlayHidden",
      });
    }

    return ReactLib.createElement(
      Pressable,
      {
        testID: "exitNavigationButton",
        onPress: props.onExit,
      },
      ReactLib.createElement(Text, null, "Exit navigation"),
    );
  };

  return {
    __esModule: true,
    NavigationOverlay: MockNavigationOverlay,
  };
});

jest.mock("react-native-maps", () => {
  const ReactLib = require("react");
  const { View } = require("react-native");

  const MockMapView = ReactLib.forwardRef((props: any, ref: any) => {
    ReactLib.useImperativeHandle(ref, () => ({
      animateCamera: mockAnimateCamera,
      animateToRegion: mockAnimateToRegion,
      fitToCoordinates: mockFitToCoordinates,
    }));

    return ReactLib.createElement(View, { testID: "mapView" }, props.children);
  });

  const Marker = ({ children }: any) =>
    ReactLib.createElement(View, null, children);

  const Polyline = () => null;

  return {
    __esModule: true,
    default: MockMapView,
    Marker,
    Polyline,
    PROVIDER_GOOGLE: "google",
  };
});

import CampusMap from "../CampusMap";

describe("CampusMap navigation overlay integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNavigating = false;
    mockCurrentStepEnd = null;
  });

  it("keeps navigation overlay hidden when not navigating", async () => {
    const { getByTestId, queryByTestId } = render(<CampusMap />);

    await waitFor(() => {
      expect(getByTestId("navigationOverlayHidden")).toBeTruthy();
    });

    expect(queryByTestId("exitNavigationButton")).toBeNull();
  });

  it("shows exit button when navigating", async () => {
    mockIsNavigating = true;
    mockCurrentStepEnd = { latitude: 45.51, longitude: -73.61 };

    const { getByTestId } = render(<CampusMap />);

    await waitFor(() => {
      expect(getByTestId("exitNavigationButton")).toBeTruthy();
    });
  });

  it("calls exitNavigation when pressing exit", async () => {
    mockIsNavigating = true;
    mockCurrentStepEnd = { latitude: 45.51, longitude: -73.61 };

    const { getByTestId } = render(<CampusMap />);

    await waitFor(() => {
      expect(getByTestId("exitNavigationButton")).toBeTruthy();
    });

    fireEvent.press(getByTestId("exitNavigationButton"));

    expect(mockExitNavigation).toHaveBeenCalledTimes(1);
  });
});
