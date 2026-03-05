/* eslint-disable import/first */
import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

const mockFetchDirections = jest.fn();
const mockDecodePolyline = jest.fn();
const mockPickFastestRoute = jest.fn();

jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  __esModule: true,
  fetchDirections: (...args: any[]) => mockFetchDirections(...args),
  decodePolyline: (...args: any[]) => mockDecodePolyline(...args),
  pickFastestRoute: (...args: any[]) => mockPickFastestRoute(...args),
}));

jest.mock("@/components/campus/helper_methods/shuttleSchedule", () => ({
  __esModule: true,
  isCampusToCampusRoute: jest.fn(() => false),
  getShuttleDirection: jest.fn(),
  buildShuttleInfo: jest.fn(),
  buildShuttleNavigationSteps: jest.fn(),
  buildShuttleDirectionRoute: jest.fn(),
  buildShuttleDirectionRouteFromGoogle: jest.fn(),
  SGW_SHUTTLE_STOP: { latitude: 45.4968, longitude: -73.5789 },
  LOY_SHUTTLE_STOP: { latitude: 45.458, longitude: -73.6395 },
}));

jest.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "student", loading: false }),
  isShuttleEligible: () => true,
}));

const mockNav = {
  isRouteMode: true,
  routeStart: {
    id: "sgw-h",
    code: "H",
    name: "Hall Building",
    address: "",
    latitude: 45.497,
    longitude: -73.578,
    campus: "SGW",
  },
  routeDest: {
    id: "sgw-lb",
    code: "LB",
    name: "Library Building",
    address: "",
    latitude: 45.498,
    longitude: -73.579,
    campus: "SGW",
  },
  activeField: "destination",
  routeError: null,
  toggleRouteMode: jest.fn(),
  setRouteStart: jest.fn(),
  setRouteDest: jest.fn(),
  setActiveField: jest.fn(),
  setFieldFromBuilding: jest.fn(),
  validateRouteRequest: jest.fn(() => true),
  setRouteError: jest.fn(),
};

jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: () => mockNav,
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
    startNavigation: jest.fn(),
    startNavigationWithSteps: jest.fn(),
    exitNavigation: jest.fn(),
  })),
}));

jest.mock("@/components/campus/helper_methods/locationUtils", () => ({
  LocationError: class LocationError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message ?? code);
      this.code = code;
    }
  },
  getDeviceLocation: jest.fn().mockResolvedValue({
    latitude: 45.495,
    longitude: -73.577,
  }),
}));

jest.mock("@/components/Buildings/data/SGW_data.json", () => []);
jest.mock("@/components/Buildings/data/Loyola_data.json", () => []);

jest.mock("@/components/campus/BuildingShapesLayer", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: "mock-shapes" }),
  };
});

jest.mock("@/components/campus/BuildingPopup", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: "mock-building-popup" }),
  };
});

jest.mock("@/components/campus/RoutePlanner", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: "routePlanner" }),
  };
});

jest.mock("@/components/campus/RouteInput", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: "routeInput" }),
  };
});

jest.mock("@/components/campus/CurrentLocationButton", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: "currentLocationButton" }),
  };
});

jest.mock("@/components/campus/NavigationOverlay", () => ({
  NavigationOverlay: () => null,
}));

jest.mock("@/components/layout/BrandBar", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const { View } = jest.requireActual("react-native");
  return function BrandBarMock(props: any) {
    return ReactActual.createElement(View, {
      testID: props.testID || "brandbar",
    });
  };
});

jest.mock("@/components/campus/TravelOptionsPopup", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const { View, Pressable, Text } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: ({ visible, modes, onSelectMode }: any) => {
      if (!visible) return null;

      return ReactActual.createElement(
        View,
        { testID: "travel-popup" },
        modes.map((m: any) =>
          ReactActual.createElement(
            Pressable,
            {
              key: m.mode,
              testID: `mode-${m.mode}`,
              onPress: () => onSelectMode(m.mode),
            },
            ReactActual.createElement(Text, null, m.mode),
          ),
        ),
      );
    },
  };
});

jest.mock("@/components/Styles/mapStyle", () => {
  const RN = jest.requireActual("react-native");
  return {
    styles: RN.StyleSheet.create({
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
    }),
  };
});

const mockFitToCoordinates = jest.fn();

jest.mock("react-native-maps", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const { View } = jest.requireActual("react-native");

  const MockMapView = ReactActual.forwardRef((props: any, ref: any) => {
    ReactActual.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      fitToCoordinates: mockFitToCoordinates,
      animateCamera: jest.fn(),
    }));

    return ReactActual.createElement(
      View,
      { ...props, testID: props.testID || "mapView" },
      props.children,
    );
  });

  (MockMapView as any).displayName = "MockMapView";

  const MockPolyline = (props: any) => {
    let testID = "polyline";

    if (
      props.strokeColor === "#4286f5" &&
      Array.isArray(props.lineDashPattern)
    ) {
      testID = "selected-dashed-route";
    } else if (props.strokeColor === "#4286f5") {
      testID = "selected-solid-route";
    }

    return ReactActual.createElement(View, { ...props, testID });
  };

  return {
    __esModule: true,
    default: MockMapView,
    PROVIDER_GOOGLE: "google",
    Marker: (p: any) => ReactActual.createElement(View, p),
    Polyline: MockPolyline,
  };
});

import CampusMap from "@/components/campus/CampusMap";

function makeRoute(polyline: string, durationSec = 300) {
  return {
    summary: "Route",
    polyline,
    durationSec,
    durationText: `${durationSec}s`,
    distanceMeters: 1000,
    distanceText: "1 km",
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  mockPickFastestRoute.mockImplementation(
    (routes: any[]) => routes?.[0] ?? null,
  );

  mockFetchDirections.mockImplementation(({ mode }: any) =>
    Promise.resolve([makeRoute(`${mode}-poly`, 300)]),
  );

  mockDecodePolyline.mockReturnValue([
    { latitude: 1, longitude: 1 },
    { latitude: 2, longitude: 2 },
  ]);
});

describe("CampusMap - switching route modes", () => {
  it("switches between walking and driving without keeping the previous route style", async () => {
    const { findByTestId, getByTestId, queryByTestId } = render(<CampusMap />);

    await findByTestId("travel-popup");

    await waitFor(() => {
      expect(getByTestId("selected-solid-route")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId("mode-walking"));
    });

    await waitFor(() => {
      expect(getByTestId("selected-dashed-route")).toBeTruthy();
    });

    expect(queryByTestId("selected-solid-route")).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId("mode-driving"));
    });

    await waitFor(() => {
      expect(getByTestId("selected-solid-route")).toBeTruthy();
    });

    expect(queryByTestId("selected-dashed-route")).toBeNull();
    expect(mockFitToCoordinates).toHaveBeenCalled();
  });
});
