import React from "react";
import { Text, Pressable, View } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import CampusMap from "@/components/campus/CampusMap";

const mockAnimateToRegion = jest.fn();
const mockAnimateCamera = jest.fn();
const mockFitToCoordinates = jest.fn();

const mockStartNavigation = jest.fn();
const mockStartNavigationWithSteps = jest.fn();
const mockExitNavigation = jest.fn();

const mockSetRouteStart = jest.fn();
const mockSetRouteDest = jest.fn();
const mockSetRouteError = jest.fn();
const mockSetActiveField = jest.fn();
const mockToggleRouteMode = jest.fn();
const mockSetFieldFromBuilding = jest.fn();
const mockSetIsRouteMode = jest.fn();

const mockAlert = jest.fn();

global.alert = mockAlert;

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
      animateCamera: mockAnimateCamera,
      fitToCoordinates: mockFitToCoordinates,
    }));
    return <View testID={props.testID || "mapView"}>{props.children}</View>;
  });

  const Dummy = (props: any) => <View {...props}>{props.children}</View>;

  return {
    __esModule: true,
    default: MapView,
    PROVIDER_GOOGLE: "google",
    Marker: Dummy,
    Polyline: Dummy,
  };
});

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@/components/campus/BuildingShapesLayer", () => () => null);
jest.mock("@/components/campus/ToggleButton", () => () => null);
jest.mock("@/components/campus/BuildingPin", () => () => null);
jest.mock("@/components/campus/CurrentLocationButton", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/campus/BuildingPopup", () => () => null);
jest.mock("@/components/layout/BrandBar", () => () => null);
jest.mock("@/components/campus/RoutePlanner", () => () => null);
jest.mock("@/components/campus/RouteInput", () => () => null);
jest.mock("@/components/campus/NavigationOverlay", () => ({
  NavigationOverlay: () => null,
}));

let travelPopupProps: any = null;
jest.mock("@/components/campus/TravelOptionsPopup", () => {
  const React = require("react");
  const { View, Pressable, Text } = require("react-native");

  return function MockTravelOptionsPopup(props: any) {
    travelPopupProps = props;

    if (!props.visible) return null;

    return (
      <View testID="travel-popup">
        <Pressable
          testID="select-shuttle"
          onPress={() => props.onSelectMode("shuttle")}
        >
          <Text>Select shuttle</Text>
        </Pressable>

        <Pressable testID="go-shuttle" onPress={() => props.onGo("shuttle", 0)}>
          <Text>Go shuttle</Text>
        </Pressable>
      </View>
    );
  };
});

let directionsErrorProps: any = null;
jest.mock("@/components/ui/DirectionLoadError", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");

  return function MockDirectionsLoadError(props: any) {
    directionsErrorProps = props;
    if (!props.visible) return null;

    return (
      <Pressable testID="refresh-directions-error" onPress={props.onRefresh}>
        <Text>{props.message}</Text>
      </Pressable>
    );
  };
});

jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: jest.fn(() => ({
    isRouteMode: true,
    routeStart: {
      id: "HALL",
      code: "H",
      name: "Hall Building",
      campus: "SGW",
      latitude: 45.497,
      longitude: -73.579,
    },
    routeDest: {
      id: "VL",
      code: "VL",
      name: "Vanier Library",
      campus: "LOY",
      latitude: 45.458,
      longitude: -73.64,
    },
    activeField: "destination",
    setRouteStart: mockSetRouteStart,
    setRouteDest: mockSetRouteDest,
    setRouteError: mockSetRouteError,
    setActiveField: mockSetActiveField,
    toggleRouteMode: mockToggleRouteMode,
    setFieldFromBuilding: mockSetFieldFromBuilding,
    setIsRouteMode: mockSetIsRouteMode,
  })),
}));

jest.mock("@/hooks/useRouteNavigation", () => ({
  useRouteNavigation: jest.fn(() => ({
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
  })),
}));

jest.mock("@/hooks/useUserRole", () => ({
  useUserRole: jest.fn(),
  isShuttleEligible: jest.fn(),
}));

jest.mock("@/components/campus/helper_methods/locationUtils", () => ({
  getDeviceLocation: jest.fn(async () => ({
    latitude: 45.497,
    longitude: -73.579,
  })),
  LocationError: class LocationError extends Error {},
}));

jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  decodePolyline: jest.fn((polyline: string) => {
    if (polyline === "bad-polyline") throw new Error("decode failed");
    return [
      { latitude: 45.497, longitude: -73.579 },
      { latitude: 45.498, longitude: -73.58 },
    ];
  }),
  fetchDirections: jest.fn(),
  pickFastestRoute: jest.fn((routes) => routes[0]),
}));

jest.mock("@/components/campus/helper_methods/shuttleSchedule", () => ({
  isCampusToCampusRoute: jest.fn(() => true),
  getShuttleDirection: jest.fn(() => "SGW_TO_LOY"),
  buildShuttleDirectionRoute: jest.fn(() => ({
    polyline: "shuttle-polyline",
    durationSec: 1000,
    durationText: "17 min",
    distanceMeters: 5000,
    distanceText: "5 km",
    segmentPolylines: {
      walkToStop: "walk-1",
      shuttle: "ride-1",
      walkToDestination: "walk-2",
    },
  })),
  buildShuttleDirectionRouteFromGoogle: jest.fn(),
  buildShuttleNavigationSteps: jest.fn(() => [
    { instruction: "Take shuttle", distanceText: "1 km" },
  ]),
  buildShuttleInfo: jest.fn(() => ({ nextDeparture: "10:00" })),
}));

jest.mock("@/components/campus/helper_methods/directionErrors", () => ({
  toDirectionsErrorMessage: jest.fn(() => "Directions failed"),
}));

const {
  fetchDirections,
} = require("@/components/campus/helper_methods/googleDirections");
const { useUserRole, isShuttleEligible } = require("@/hooks/useUserRole");
const {
  buildShuttleDirectionRouteFromGoogle,
  buildShuttleDirectionRoute,
} = require("@/components/campus/helper_methods/shuttleSchedule");

beforeEach(() => {
  jest.clearAllMocks();
  travelPopupProps = null;
  directionsErrorProps = null;

  useUserRole.mockReturnValue({ role: "student" });
  isShuttleEligible.mockReturnValue(true);

  fetchDirections.mockImplementation(async ({ mode }: any) => [
    {
      polyline: `${mode}-polyline`,
      durationSec: mode === "walking" ? 300 : 100,
      durationText: "10 min",
      distanceMeters: 1000,
      distanceText: "1 km",
    },
  ]);

  buildShuttleDirectionRouteFromGoogle.mockResolvedValue({
    polyline: "shuttle-polyline",
    durationSec: 900,
    durationText: "15 min",
    distanceMeters: 4000,
    distanceText: "4 km",
    segmentPolylines: {
      walkToStop: "walk-1",
      shuttle: "ride-1",
      walkToDestination: "walk-2",
    },
  });

  buildShuttleDirectionRoute.mockReturnValue({
    polyline: "shuttle-polyline",
    durationSec: 1000,
    durationText: "17 min",
    distanceMeters: 5000,
    distanceText: "5 km",
    segmentPolylines: {
      walkToStop: "walk-1",
      shuttle: "ride-1",
      walkToDestination: "walk-2",
    },
  });
});

describe("CampusMap refactor coverage", () => {
  it("covers non-shuttle route load branch", async () => {
    render(<CampusMap />);

    await waitFor(() => {
      expect(fetchDirections).toHaveBeenCalled();
    });

    expect(travelPopupProps).toBeTruthy();
    expect(travelPopupProps.selectedMode).toBe("driving");
  });

  it("covers loadAllModes catch block when shuttle google build fails", async () => {
    buildShuttleDirectionRouteFromGoogle.mockRejectedValueOnce(
      new Error("shuttle failed"),
    );

    render(<CampusMap />);

    await waitFor(() => {
      expect(directionsErrorProps).toBeTruthy();
      expect(directionsErrorProps.visible).toBe(true);
      expect(directionsErrorProps.message).toBe("Directions failed");
    });
  });

  it("covers handleSelectMode shuttle branch when shuttle routes are empty", async () => {
    buildShuttleDirectionRouteFromGoogle.mockResolvedValueOnce(null);
    buildShuttleDirectionRoute.mockReturnValueOnce(null);

    const { findByTestId } = render(<CampusMap />);

    const shuttleButton = await findByTestId("select-shuttle");
    fireEvent.press(shuttleButton);

    expect(travelPopupProps).toBeTruthy();
  });

  it("covers handleGo shuttle ineligible alert branch", async () => {
    useUserRole.mockReturnValue({ role: "guest" });
    isShuttleEligible.mockReturnValue(false);

    const { findByTestId } = render(<CampusMap />);

    const goShuttleButton = await findByTestId("go-shuttle");
    fireEvent.press(goShuttleButton);

    expect(mockAlert).toHaveBeenCalledWith(
      "Concordia Shuttle Bus is available to students and staff only.",
    );
    expect(mockStartNavigationWithSteps).not.toHaveBeenCalled();
  });

  it("covers DirectionsLoadError onRefresh", async () => {
    buildShuttleDirectionRouteFromGoogle.mockRejectedValueOnce(
      new Error("shuttle failed"),
    );

    const { findByTestId } = render(<CampusMap />);

    const refreshButton = await findByTestId("refresh-directions-error");
    fireEvent.press(refreshButton);

    await waitFor(() => {
      expect(fetchDirections).toHaveBeenCalled();
    });
  });
});
