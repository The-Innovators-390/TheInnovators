/* eslint-disable import/first */
import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
jest.mock("@/components/POI/POICategoryBar", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/POI/POIBottomSheet", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/POI/POIMarkers", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/hooks/usePOIFeature", () => ({
  usePOIFeature: () => ({
    poiSheetRef: { current: null },
    pois: [],
    status: "idle",
    selectedPOI: null,
    activeCategory: null,
    handleCategorySelect: jest.fn(),
    handleSelectPOI: jest.fn(),
    handleGetDirections: jest.fn(),
    handleSheetClose: jest.fn(),
  }),
}));

type CameraArg = {
  center?: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  pitch?: number;
  zoom?: number;
};

type AnimateCameraCall = [CameraArg, { duration?: number }?];

const mockAnimateCamera = jest.fn<void, AnimateCameraCall>();
const mockAnimateToRegion = jest.fn();
const mockFitToCoordinates = jest.fn();

const mockUserLocation = {
  latitude: 45.4973,
  longitude: -73.5789,
};

let now = 1000;

let mockRouteNavigationValue: {
  isNavigating: boolean;
  isNearStart: boolean;
  isArrived: boolean;
  activeSteps: unknown[];
  activeStepIndex: number;
  currentStep: { end: { latitude: number; longitude: number } } | null;
  activeSummary: unknown;
  onStarted: undefined;
  exitNavigation: jest.Mock;
  startNavigation: jest.Mock;
  startNavigationWithSteps: jest.Mock;
} = {
  isNavigating: false,
  isNearStart: false,
  isArrived: false,
  activeSteps: [],
  activeStepIndex: 0,
  currentStep: null,
  activeSummary: null,
  onStarted: undefined,
  exitNavigation: jest.fn(),
  startNavigation: jest.fn(),
  startNavigationWithSteps: jest.fn(),
};

jest.spyOn(Date, "now").mockImplementation(() => now);

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

const mockGetDeviceLocation = jest.fn(async () => mockUserLocation);

jest.mock("@/components/campus/helper_methods/locationUtils", () => ({
  LocationError: class MockLocationError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
  getDeviceLocation: () => mockGetDeviceLocation(),
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
  getFloatingUiState: () => ({
    hasBuildingPopup: false,
    hasTravelPopup: false,
    floatingBottom: 120,
    shouldShowCompass: true,
    shouldHideFloatingButtons: false,
  }),
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

const mockBearingDegrees = jest.fn(() => 77);

jest.mock("@/components/campus/helper_methods/geo", () => ({
  bearingDegrees: (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
  ) => mockBearingDegrees(from, to),
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

const mockUseRouteNavigation = jest.fn(() => mockRouteNavigationValue);

jest.mock("@/hooks/useRouteNavigation", () => ({
  useRouteNavigation: () => mockUseRouteNavigation(),
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

jest.mock("@/components/campus/NavigationOverlay", () => ({
  __esModule: true,
  NavigationOverlay: () => null,
}));

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

describe("CampusMap camera-follow useEffect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    now = 1000;

    mockRouteNavigationValue = {
      isNavigating: false,
      isNearStart: false,
      isArrived: false,
      activeSteps: [],
      activeStepIndex: 0,
      currentStep: null,
      activeSummary: null,
      onStarted: undefined,
      exitNavigation: jest.fn(),
      startNavigation: jest.fn(),
      startNavigationWithSteps: jest.fn(),
    };
  });

  const getFollowCalls = (): AnimateCameraCall[] =>
    mockAnimateCamera.mock.calls.filter(([camera]) => {
      return (
        camera?.center?.latitude === mockUserLocation.latitude &&
        camera?.center?.longitude === mockUserLocation.longitude &&
        camera?.pitch === 0 &&
        camera?.zoom === 18
      );
    });

  it("does not trigger follow-camera behavior when not navigating", async () => {
    render(<CampusMap />);

    await waitFor(() => {
      expect(mockGetDeviceLocation).toHaveBeenCalled();
    });

    expect(getFollowCalls()).toHaveLength(0);
  });

  it("animates camera when navigating and current step end exists", async () => {
    mockRouteNavigationValue = {
      ...mockRouteNavigationValue,
      isNavigating: true,
      currentStep: {
        end: { latitude: 45.501, longitude: -73.571 },
      },
    };

    render(<CampusMap />);

    await waitFor(() => {
      expect(getFollowCalls()).toHaveLength(1);
    });

    const [camera, options] = getFollowCalls()[0];

    expect(camera.heading).toBe(77);
    expect(camera.zoom).toBe(18);
    expect(camera.pitch).toBe(0);
    expect(options).toEqual({ duration: 500 });

    expect(mockBearingDegrees).toHaveBeenCalledWith(mockUserLocation, {
      latitude: 45.501,
      longitude: -73.571,
    });
  });

  it("uses heading 0 when navigating but there is no current step target", async () => {
    mockRouteNavigationValue = {
      ...mockRouteNavigationValue,
      isNavigating: true,
      currentStep: null,
    };

    render(<CampusMap />);

    await waitFor(() => {
      expect(getFollowCalls()).toHaveLength(1);
    });

    const [camera] = getFollowCalls()[0];
    expect(camera.heading).toBe(0);
  });

  it("throttles follow-camera updates with the 900ms rule", async () => {
    mockRouteNavigationValue = {
      ...mockRouteNavigationValue,
      isNavigating: true,
      activeStepIndex: 0,
      currentStep: {
        end: { latitude: 45.501, longitude: -73.571 },
      },
    };

    const screen = render(<CampusMap />);

    await waitFor(() => {
      expect(getFollowCalls()).toHaveLength(1);
    });

    now += 500;
    mockRouteNavigationValue = {
      ...mockRouteNavigationValue,
      activeStepIndex: 1,
    };
    screen.rerender(<CampusMap />);

    expect(getFollowCalls()).toHaveLength(1);

    now += 1000;
    mockRouteNavigationValue = {
      ...mockRouteNavigationValue,
      activeStepIndex: 2,
    };
    screen.rerender(<CampusMap />);

    await waitFor(() => {
      expect(getFollowCalls()).toHaveLength(2);
    });
  });
});
