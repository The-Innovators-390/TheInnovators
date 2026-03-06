/* eslint-disable import/first */
import React from "react";
import { render, act } from "@testing-library/react-native";

const mockAnimateCamera = jest.fn();
const mockAnimateToRegion = jest.fn();

jest.mock("expo-router", () => ({
  __esModule: true,
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock("react-native-maps", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");

  const MapView = ReactActual.forwardRef(function MockMapView(
    props: any,
    ref: any,
  ) {
    ReactActual.useImperativeHandle(ref, () => ({
      animateCamera: mockAnimateCamera,
      animateToRegion: mockAnimateToRegion,
      fitToCoordinates: jest.fn(),
    }));
    return <View testID={props.testID || "map"}>{props.children}</View>;
  });

  function Dummy(props: any) {
    return <View {...props}>{props.children}</View>;
  }

  return {
    __esModule: true,
    default: MapView,
    Marker: Dummy,
    Polyline: Dummy,
    Polygon: Dummy,
    Circle: Dummy,
    Callout: Dummy,
    Overlay: Dummy,
    Heatmap: Dummy,
    Geojson: Dummy,
    PROVIDER_GOOGLE: "google",
  };
});

// Prevent unrelated hook crashes
jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: () => ({
    isRouteMode: false,
    routeStart: null,
    routeDest: null,
    activeField: "destination",
    routeError: null,
    toggleRouteMode: jest.fn(),
    setRouteStart: jest.fn(),
    setRouteDest: jest.fn(),
    setActiveField: jest.fn(),
    setFieldFromBuilding: jest.fn(),
    validateRouteRequest: jest.fn(() => true),
    setRouteError: jest.fn(),
    clearStart: jest.fn(),
    clearDestination: jest.fn(),
    setIsRouteMode: jest.fn(),
  }),
}));

jest.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "visitor", loading: false }),
  isShuttleEligible: () => false,
}));

jest.mock("@/components/campus/BuildingShapesLayer", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/campus/BuildingPopup", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/campus/BuildingPin", () => ({
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
jest.mock("@/components/campus/NavigationOverlay", () => ({
  __esModule: true,
  NavigationOverlay: () => null,
}));
jest.mock("@/components/layout/BrandBar", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/campus/ToggleButton", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/ui/DirectionLoadError", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Styles/mapStyle", () => {
  const RN = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");
  return {
    styles: RN.StyleSheet.create({
      container: { flex: 1 },
      topOverlay: {},
      suggestions: {},
      suggestionRow: {},
      suggestionTitle: {},
      suggestionSub: {},
      searchBar: {},
      searchIcon: {},
      searchInput: {},
      clearButton: {},
      clearIcon: {},
    }),
  };
});

jest.mock("@/components/campus/helper_methods/locationUtils", () => ({
  getDeviceLocation: jest.fn(() => Promise.resolve(null)),
  LocationError: class LocationError extends Error {},
}));

jest.mock("@/components/campus/helper_methods/campusMap.buildings", () => ({
  buildAllBuildings: () => [],
  getUserLocationBuildingId: () => null,
  getBuildingContainingPoint: () => null,
  makeUserLocationBuilding: () => null,
}));

// ---- Navigation mock ----
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(),
  }),
}));

const mockUseRouteNavigation = jest.fn();

jest.mock("@/hooks/useRouteNavigation", () => ({
  __esModule: true,
  useRouteNavigation: (...args: any[]) => mockUseRouteNavigation(...args),
}));

// ---- CurrentLocationButton mock (so userLocation becomes non-null) ----
const mockUserLocation = { latitude: 45.4973, longitude: -73.5789 };

jest.mock("@/components/campus/CurrentLocationButton", () => ({
  __esModule: true,
  default: function MockCurrentLocationButton(props: any) {
    props.onLocationFound(mockUserLocation);
    return null;
  },
}));

// Import AFTER mocks
import CampusMap from "@/components/campus/CampusMap";

describe("CampusMap camera-follow useEffect", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouteNavigation.mockReturnValue({
      isNavigating: false,
      isStarting: false,
      navError: null,
      isNearStart: false,
      activeSteps: [],
      activeStepIndex: 0,
      currentStep: undefined,
      activeSummary: null,
      isArrived: false,
      startNavigation: jest.fn(),
      startNavigationWithSteps: jest.fn(),
      exitNavigation: jest.fn(),
      nextStep: jest.fn(),
      prevStep: jest.fn(),
      setActiveStepIndex: jest.fn(),
    });
  });

  it("does NOT animate when not navigating", () => {
    mockUseRouteNavigation.mockReturnValue({
      isNavigating: false,
      isStarting: false,
      navError: null,
      isNearStart: false,
      activeSteps: [],
      activeStepIndex: 0,
      currentStep: undefined,
      activeSummary: null,
      isArrived: false,
      startNavigation: jest.fn(),
      startNavigationWithSteps: jest.fn(),
      exitNavigation: jest.fn(),
      nextStep: jest.fn(),
      prevStep: jest.fn(),
      setActiveStepIndex: jest.fn(),
    });

    render(<CampusMap />);

    expect(mockAnimateCamera).not.toHaveBeenCalled();
  });

  it("animates camera when navigating + has target (heading is a number)", () => {
    let now = 10_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);

    mockUseRouteNavigation.mockReturnValue({
      isNavigating: true,
      isStarting: false,
      navError: null,
      isNearStart: false,
      activeSteps: [],
      activeStepIndex: 0,
      currentStep: { end: { latitude: 45.5019, longitude: -73.5674 } },
      activeSummary: null,
      isArrived: false,
      startNavigation: jest.fn(),
      startNavigationWithSteps: jest.fn(),
      exitNavigation: jest.fn(),
      nextStep: jest.fn(),
      prevStep: jest.fn(),
      setActiveStepIndex: jest.fn(),
    });

    render(<CampusMap />);

    expect(mockAnimateCamera).toHaveBeenCalledTimes(1);
    expect(mockAnimateCamera).toHaveBeenCalledWith(
      {
        center: mockUserLocation,
        zoom: 18,
        heading: expect.any(Number),
        pitch: 0,
      },
      { duration: 500 },
    );

    const heading = mockAnimateCamera.mock.calls[0][0].heading;
    expect(Number.isNaN(heading)).toBe(false);
  });

  it("uses heading=0 when there is no target (no currentStep end)", () => {
    let now = 10_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);

    mockUseRouteNavigation.mockReturnValue({
      isNavigating: true,
      isStarting: false,
      navError: null,
      isNearStart: false,
      activeSteps: [],
      activeStepIndex: 0,
      currentStep: undefined,
      activeSummary: null,
      isArrived: false,
      startNavigation: jest.fn(),
      startNavigationWithSteps: jest.fn(),
      exitNavigation: jest.fn(),
      nextStep: jest.fn(),
      prevStep: jest.fn(),
      setActiveStepIndex: jest.fn(),
    });

    render(<CampusMap />);

    expect(mockAnimateCamera).toHaveBeenCalledTimes(1);
    expect(mockAnimateCamera).toHaveBeenCalledWith(
      {
        center: mockUserLocation,
        zoom: 18,
        heading: 0,
        pitch: 0,
      },
      { duration: 500 },
    );
  });

  it("throttles camera updates (900ms rule)", () => {
    let now = 10_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);

    mockUseRouteNavigation.mockReturnValue({
      isNavigating: true,
      isStarting: false,
      navError: null,
      isNearStart: false,
      activeSteps: [],
      activeStepIndex: 0,
      currentStep: { end: { latitude: 45.5019, longitude: -73.5674 } },
      activeSummary: null,
      isArrived: false,
      startNavigation: jest.fn(),
      startNavigationWithSteps: jest.fn(),
      exitNavigation: jest.fn(),
      nextStep: jest.fn(),
      prevStep: jest.fn(),
      setActiveStepIndex: jest.fn(),
    });

    const screen = render(<CampusMap />);
    expect(mockAnimateCamera).toHaveBeenCalledTimes(1);

    now += 500;
    mockUseRouteNavigation.mockReturnValue({
      isNavigating: true,
      isStarting: false,
      navError: null,
      isNearStart: false,
      activeSteps: [],
      activeStepIndex: 1,
      currentStep: { end: { latitude: 45.5019, longitude: -73.5674 } },
      activeSummary: null,
      isArrived: false,
      startNavigation: jest.fn(),
      startNavigationWithSteps: jest.fn(),
      exitNavigation: jest.fn(),
      nextStep: jest.fn(),
      prevStep: jest.fn(),
      setActiveStepIndex: jest.fn(),
    });

    act(() => {
      screen.rerender(<CampusMap />);
    });

    expect(mockAnimateCamera).toHaveBeenCalledTimes(1);

    now += 901;
    mockUseRouteNavigation.mockReturnValue({
      isNavigating: true,
      isStarting: false,
      navError: null,
      isNearStart: false,
      activeSteps: [],
      activeStepIndex: 2,
      currentStep: { end: { latitude: 45.5019, longitude: -73.5674 } },
      activeSummary: null,
      isArrived: false,
      startNavigation: jest.fn(),
      startNavigationWithSteps: jest.fn(),
      exitNavigation: jest.fn(),
      nextStep: jest.fn(),
      prevStep: jest.fn(),
      setActiveStepIndex: jest.fn(),
    });

    act(() => {
      screen.rerender(<CampusMap />);
    });

    expect(mockAnimateCamera).toHaveBeenCalledTimes(2);
  });
});
