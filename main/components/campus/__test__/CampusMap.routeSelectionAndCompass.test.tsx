/* eslint-disable import/first */
import React from "react";
import { render, waitFor, act } from "@testing-library/react-native";
import type {
  DirectionRoute,
  TravelMode,
} from "@/components/campus/helper_methods/googleDirections";

const mockTravelPopupState: { props: any | null } = { props: null };

const mockNavigationState = {
  isRouteMode: true,
  routeStart: {
    id: "H",
    code: "H",
    name: "Henry F. Hall Building",
    campus: "SGW",
    latitude: 45.497,
    longitude: -73.579,
    address: "1455 De Maisonneuve Blvd W",
  },
  routeDest: {
    id: "CJ",
    code: "CJ",
    name: "Communication Studies and Journalism",
    campus: "LOY",
    latitude: 45.458,
    longitude: -73.64,
    address: "7141 Sherbrooke St W",
  },
  activeField: "destination" as "start" | "destination",
  routeError: null as string | null,
  setRouteStart: jest.fn(),
  setRouteDest: jest.fn(),
  setRouteError: jest.fn(),
  setActiveField: jest.fn(),
  setFieldFromBuilding: jest.fn(),
  toggleRouteMode: jest.fn(),
  setIsRouteMode: jest.fn(),
};

const mockRouteNavigationState = {
  isNavigating: false,
  isNearStart: false,
  isArrived: false,
  activeSteps: [],
  activeStepIndex: 0,
  currentStep: null,
  activeSummary: null,
  startNavigation: jest.fn().mockResolvedValue(undefined),
  startNavigationWithSteps: jest.fn(),
  exitNavigation: jest.fn(),
};

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: jest.fn(() => mockNavigationState),
}));

jest.mock("@/hooks/useRouteNavigation", () => ({
  useRouteNavigation: jest.fn(() => mockRouteNavigationState),
}));

jest.mock("@/hooks/useUserRole", () => ({
  useUserRole: jest.fn(() => ({ role: "student" })),
  isShuttleEligible: jest.fn(() => true),
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

jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  fetchDirections: jest.fn(
    async ({ mode }: { mode: TravelMode }): Promise<DirectionRoute[]> => {
      if (mode === "driving") {
        return [
          {
            summary: "Drive Route 1",
            polyline: "drive-1",
            durationSec: 1020,
            durationText: "17 mins",
            distanceMeters: 7600,
            distanceText: "7.6 km",
          },
          {
            summary: "Drive Route 2",
            polyline: "drive-2",
            durationSec: 1380,
            durationText: "23 mins",
            distanceMeters: 6900,
            distanceText: "6.9 km",
          },
        ];
      }

      if (mode === "transit") {
        return [
          {
            summary: "Transit Route 1",
            polyline: "transit-1",
            durationSec: 2520,
            durationText: "42 mins",
            distanceMeters: 8400,
            distanceText: "8.4 km",
          },
        ];
      }

      if (mode === "walking") {
        return [
          {
            summary: "Walk Route 1",
            polyline: "walk-1",
            durationSec: 5640,
            durationText: "1 h 34 m",
            distanceMeters: 7600,
            distanceText: "7.6 km",
          },
        ];
      }

      if (mode === "bicycling") {
        return [
          {
            summary: "Bike Route 1",
            polyline: "bike-1",
            durationSec: 1740,
            durationText: "29 mins",
            distanceMeters: 7600,
            distanceText: "7.6 km",
          },
        ];
      }

      return [];
    },
  ),
  decodePolyline: jest.fn((polyline: string) => {
    switch (polyline) {
      case "drive-1":
        return [
          { latitude: 1, longitude: 1 },
          { latitude: 2, longitude: 2 },
        ];
      case "drive-2":
        return [
          { latitude: 10, longitude: 10 },
          { latitude: 20, longitude: 20 },
        ];
      case "transit-1":
        return [
          { latitude: 3, longitude: 3 },
          { latitude: 4, longitude: 4 },
        ];
      case "walk-1":
        return [
          { latitude: 5, longitude: 5 },
          { latitude: 6, longitude: 6 },
        ];
      case "bike-1":
        return [
          { latitude: 7, longitude: 7 },
          { latitude: 8, longitude: 8 },
        ];
      case "shuttle-1":
        return [
          { latitude: 9, longitude: 9 },
          { latitude: 10, longitude: 10 },
        ];
      default:
        return [];
    }
  }),
  pickFastestRoute: jest.fn((routes: DirectionRoute[]) => routes[0] ?? null),
}));

jest.mock("@/components/campus/helper_methods/shuttleSchedule", () => ({
  isCampusToCampusRoute: jest.fn(() => true),
  getShuttleDirection: jest.fn(() => "SGW_TO_LOY"),
  buildShuttleDirectionRoute: jest.fn(() => ({
    summary: "Concordia Shuttle",
    polyline: "shuttle-1",
    durationSec: 2700,
    durationText: "45 mins",
    distanceMeters: 8000,
    distanceText: "8.0 km",
  })),
  buildShuttleDirectionRouteFromGoogle: jest.fn(async () => ({
    summary: "Concordia Shuttle",
    polyline: "shuttle-1",
    durationSec: 2700,
    durationText: "45 mins",
    distanceMeters: 8000,
    distanceText: "8.0 km",
  })),
  buildShuttleNavigationSteps: jest.fn(() => []),
  buildShuttleInfo: jest.fn(() => ({
    status: "operating",
    nextDeparture: "13:45",
  })),
}));

jest.mock("@/components/campus/helper_methods/directionErrors", () => ({
  toDirectionsErrorMessage: jest.fn(() => "Directions failed"),
}));

jest.mock("@/components/campus/helper_methods/mapCompass", () => ({
  resetMapDirectionToNorth: jest.fn(),
}));

jest.mock("react-native-maps", () => {
  const ReactActual = jest.requireActual("react");
  const { View, Text } = jest.requireActual("react-native");

  const MockMapView = ReactActual.forwardRef((props: any, ref: any) => {
    ReactActual.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      fitToCoordinates: jest.fn(),
      animateCamera: jest.fn(),
    }));

    return ReactActual.createElement(
      View,
      { testID: "mock-map" },
      props.children,
    );
  });

  (MockMapView as any).displayName = "MockMapView";

  const Marker = (props: any) =>
    ReactActual.createElement(View, { testID: "marker" }, props.children);

  const Polyline = (props: any) => {
    const first = props.coordinates?.[0];
    return ReactActual.createElement(
      View,
      { testID: "polyline" },
      ReactActual.createElement(
        Text,
        { testID: "polyline-first-point" },
        first ? `${first.latitude},${first.longitude}` : "empty",
      ),
    );
  };

  return {
    __esModule: true,
    default: MockMapView,
    PROVIDER_GOOGLE: "google",
    Marker,
    Polyline,
  };
});

jest.mock("@/components/campus/TravelOptionsPopup", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: function MockTravelOptionsPopup(props: any) {
      mockTravelPopupState.props = props;
      return ReactActual.createElement(View, {
        testID: "travel-options-popup",
      });
    },
  };
});

jest.mock("@/components/campus/Compass", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: function MockCompass(props: any) {
      return props.visible
        ? ReactActual.createElement(View, { testID: "compass" })
        : null;
    },
  };
});

jest.mock("@/components/campus/BuildingShapesLayer", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: function MockBuildingShapesLayer() {
      return ReactActual.createElement(View, {
        testID: "building-shapes-layer",
      });
    },
  };
});

jest.mock("@/components/campus/ToggleButton", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: function MockToggleButton() {
      return ReactActual.createElement(View, { testID: "toggle-button" });
    },
    calculatePanValue: jest.fn(),
    determineCampusFromPan: jest.fn(),
  };
});

jest.mock("@/components/campus/BuildingPin", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: function MockBuildingPin() {
      return ReactActual.createElement(View, { testID: "building-pin" });
    },
  };
});

jest.mock("@/components/campus/CurrentLocationButton", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: function MockCurrentLocationButton() {
      return ReactActual.createElement(View, {
        testID: "current-location-button",
      });
    },
  };
});

jest.mock("@/components/campus/BuildingPopup", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: function MockBuildingPopup() {
      return ReactActual.createElement(View, { testID: "building-popup" });
    },
  };
});

jest.mock("@/components/layout/BrandBar", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: function MockBrandBar() {
      return ReactActual.createElement(View, { testID: "brand-bar" });
    },
  };
});

jest.mock("@/components/campus/RoutePlanner", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: function MockRoutePlanner() {
      return ReactActual.createElement(View, { testID: "route-planner" });
    },
  };
});

jest.mock("@/components/campus/RouteInput", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: function MockRouteInput() {
      return ReactActual.createElement(View, { testID: "route-input" });
    },
  };
});

jest.mock("../../ui/DirectionLoadError", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: function MockDirectionsLoadError() {
      return ReactActual.createElement(View, {
        testID: "directions-load-error",
      });
    },
  };
});

jest.mock("@/components/campus/NavigationOverlay", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    NavigationOverlay: () =>
      ReactActual.createElement(View, { testID: "navigation-overlay" }),
  };
});

jest.mock("@/components/campus/NextClassButton", () => {
  const ReactActual = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");

  return {
    NextClassButton: () =>
      ReactActual.createElement(View, { testID: "next-class-button" }),
  };
});

import CampusMap from "@/components/campus/CampusMap";

describe("CampusMap route selection and compass", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTravelPopupState.props = null;
    mockRouteNavigationState.isNavigating = false;
    mockRouteNavigationState.currentStep = null;
    mockRouteNavigationState.activeSummary = null;
    mockNavigationState.isRouteMode = true;
  });

  it("shows only the selected route on the map when a route card is selected", async () => {
    const screen = render(<CampusMap />);

    await waitFor(() => {
      expect(mockTravelPopupState.props).not.toBeNull();
      expect(mockTravelPopupState.props.selectedMode).toBe("driving");
    });

    await waitFor(() => {
      const polylines = screen.getAllByTestId("polyline");
      expect(polylines).toHaveLength(1);
      expect(screen.getByTestId("polyline-first-point").props.children).toBe(
        "1,1",
      );
    });

    await act(async () => {
      mockTravelPopupState.props.onSelectRouteIndex(1);
    });

    await waitFor(() => {
      expect(mockTravelPopupState.props.selectedRouteIndex).toBe(1);
      const polylines = screen.getAllByTestId("polyline");
      expect(polylines).toHaveLength(1);
      expect(screen.getByTestId("polyline-first-point").props.children).toBe(
        "10,10",
      );
    });
  });

  it("keeps the compass visible after pressing Go and entering navigation", async () => {
    const screen = render(<CampusMap />);

    await waitFor(() => {
      expect(mockTravelPopupState.props).not.toBeNull();
      expect(screen.getByTestId("compass")).toBeTruthy();
    });

    await act(async () => {
      await mockTravelPopupState.props.onGo("driving", 0);
    });

    mockRouteNavigationState.isNavigating = true;
    screen.rerender(<CampusMap />);

    await waitFor(() => {
      expect(screen.getByTestId("compass")).toBeTruthy();
    });
  });
});
