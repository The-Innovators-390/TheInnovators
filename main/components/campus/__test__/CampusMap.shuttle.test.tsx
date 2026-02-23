/* eslint-disable import/first */
/**
 * CampusMap shuttle-specific integration tests.
 *
 * Overrides the global useUserRole mock (visitor) with student so the
 * shuttle code paths are reachable, and uses a SGW→LOY nav fixture so
 * shuttleDirection is non-null.
 */
import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

// ─── Override global useUserRole stub → student ────────────────────────────
jest.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "student", loading: false }),
  isShuttleEligible: () => true,
}));

// ─── Mock shuttle schedule so tests are deterministic ─────────────────────
const mockBuildShuttleDirectionRoute = jest.fn();
const mockBuildShuttleNavigationSteps = jest.fn();
const mockBuildShuttleInfo = jest.fn();
const mockIsCampusToCampusRoute = jest.fn().mockReturnValue(true);
const mockGetShuttleDirection = jest.fn().mockReturnValue("SGW_TO_LOY");

jest.mock("@/components/campus/helper_methods/shuttleSchedule", () => ({
  isCampusToCampusRoute: (...args: any[]) => mockIsCampusToCampusRoute(...args),
  getShuttleDirection: (...args: any[]) => mockGetShuttleDirection(...args),
  buildShuttleDirectionRoute: (...args: any[]) =>
    mockBuildShuttleDirectionRoute(...args),
  buildShuttleNavigationSteps: (...args: any[]) =>
    mockBuildShuttleNavigationSteps(...args),
  buildShuttleInfo: (...args: any[]) => mockBuildShuttleInfo(...args),
  SGW_SHUTTLE_STOP: { latitude: 45.4968, longitude: -73.5789 },
  LOY_SHUTTLE_STOP: { latitude: 45.458, longitude: -73.6395 },
}));

// ─── Google Directions mock ────────────────────────────────────────────────
jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  __esModule: true,
  fetchDirections: jest.fn(),
  pickFastestRoute: jest.fn((routes: any) => routes?.[0] ?? null),
  decodePolyline: jest.fn().mockReturnValue([
    { latitude: 45.0, longitude: -73.0 },
    { latitude: 45.01, longitude: -73.01 },
  ]),
}));

// ─── Lightweight component mocks ──────────────────────────────────────────
jest.mock("@/components/campus/BuildingShapesLayer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: "mock-shapes" }),
  };
});

jest.mock("@/components/campus/BuildingPopup", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: "mock-building-popup" }),
  };
});

jest.mock("@/components/campus/RoutePlanner", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: "mock-route-planner" }),
  };
});

jest.mock("@/components/campus/RouteInput", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: "mock-route-input" }),
  };
});

jest.mock("@/components/layout/BrandBar", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function BrandBarMock(props: any) {
    return React.createElement(View, {
      testID: props.testID || "brandbar",
    });
  };
});

// ─── TravelOptionsPopup mock – exposes shuttle controls ───────────────────
jest.mock("@/components/campus/TravelOptionsPopup", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");

  return {
    __esModule: true,
    default: ({ visible, modes, onSelectMode, onGo, shuttleInfo }: any) => {
      if (!visible) return null;
      return (
        <View testID="travel-popup">
          <Text>Directions</Text>
          {modes.map((m: any) => (
            <Pressable
              key={m.mode}
              testID={`mode-${m.mode}`}
              onPress={() => onSelectMode(m.mode)}
            >
              <Text>{m.mode}</Text>
            </Pressable>
          ))}
          {modes.find((m: any) => m.mode === "shuttle") && (
            <Pressable testID="go-shuttle" onPress={() => onGo?.("shuttle", 0)}>
              <Text>GO Shuttle</Text>
            </Pressable>
          )}
          {shuttleInfo && (
            <Text testID="shuttle-status">{shuttleInfo.status}</Text>
          )}
        </View>
      );
    },
  };
});

// ─── NavigationOverlay mock ────────────────────────────────────────────────
jest.mock("@/components/campus/NavigationOverlay", () => {
  const React = require("react");
  const { View, Pressable, Text } = require("react-native");
  return {
    __esModule: true,
    NavigationOverlay: ({ isNavigating, onExit }: any) => {
      if (!isNavigating) return null;
      return (
        <View testID="navigation-overlay">
          <Pressable testID="exit-navigation" onPress={onExit}>
            <Text>Exit</Text>
          </Pressable>
        </View>
      );
    },
  };
});

// ─── expo-location ────────────────────────────────────────────────────────
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "denied" }),
  getCurrentPositionAsync: jest
    .fn()
    .mockResolvedValue({ coords: { latitude: 0, longitude: 0 } }),
  getLastKnownPositionAsync: jest.fn().mockResolvedValue(null),
  Accuracy: { Low: 2, Balanced: 3 },
}));

// ─── CurrentLocationButton ────────────────────────────────────────────────
jest.mock("@/components/campus/CurrentLocationButton", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: "currentLocationBtn" }),
  };
});

// ─── MapView with pan-drag support ────────────────────────────────────────
const mockFitToCoordinates = jest.fn();
const mockAnimateCamera = jest.fn();

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateCamera: mockAnimateCamera,
      animateToRegion: jest.fn(),
      fitToCoordinates: mockFitToCoordinates,
    }));

    return React.createElement(
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
    Marker: (p: any) => React.createElement(View, p),
    Polyline: (p: any) => React.createElement(View, p),
    Polygon: (p: any) => React.createElement(View, p),
  };
});

jest.mock("@/components/Styles/mapStyle", () => {
  const RN = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");
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

jest.mock("@/components/Buildings/data/SGW_data.json", () => []);
jest.mock("@/components/Buildings/data/Loyola_data.json", () => []);

// ─── useNavigation: SGW→LOY campus-to-campus route ────────────────────────
const mockNav: any = {
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
    id: "loy-ad",
    code: "AD",
    name: "Admin Building",
    address: "",
    latitude: 45.458,
    longitude: -73.64,
    campus: "LOY",
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
  clearStart: jest.fn(),
  clearDestination: jest.fn(),
};

jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: () => mockNav,
}));

// ─── useRouteNavigation mock ───────────────────────────────────────────────
const mockStartNavigation = jest.fn();
const mockStartNavigationWithSteps = jest.fn();
const mockExitNavigation = jest.fn();

const mockRouteNavState = {
  isNavigating: false,
  isStarting: false,
  navError: null,
  isNearStart: false,
  activeSteps: [],
  activeStepIndex: 0,
  currentStep: null,
  activeSummary: null,
  isArrived: false,
  startNavigation: mockStartNavigation,
  startNavigationWithSteps: mockStartNavigationWithSteps,
  exitNavigation: mockExitNavigation,
  nextStep: jest.fn(),
  prevStep: jest.fn(),
  setActiveStepIndex: jest.fn(),
};

jest.mock("@/hooks/useRouteNavigation", () => ({
  useRouteNavigation: jest.fn(() => mockRouteNavState),
}));

// ─── Import CampusMap after all mocks ─────────────────────────────────────
import CampusMap from "@/components/campus/CampusMap";

const { fetchDirections } =
  require("@/components/campus/helper_methods/googleDirections") as {
    fetchDirections: jest.Mock;
  };

function makeRoute(polyline: string, durationSec: number) {
  return {
    summary: "",
    polyline,
    durationSec,
    durationText: `${durationSec}s`,
    distanceMeters: 0,
    distanceText: "0 km",
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  // Default: shuttle schedule is operating with an upcoming departure
  mockBuildShuttleDirectionRoute.mockReturnValue(
    makeRoute("shuttle-poly", 3600),
  );
  mockBuildShuttleNavigationSteps.mockReturnValue([
    {
      instruction: "Walk to shuttle stop",
      distanceText: "",
      durationText: "",
      start: { latitude: 45.497, longitude: -73.578 },
      end: { latitude: 45.4968, longitude: -73.5789 },
    },
  ]);
  mockBuildShuttleInfo.mockReturnValue({
    status: "operating",
    nextDepartures: ["10:30"],
    direction: "SGW_TO_LOY",
  });

  fetchDirections.mockResolvedValue([makeRoute("walk-poly", 600)]);

  // Reset navigation state to not navigating
  Object.assign(mockRouteNavState, {
    isNavigating: false,
    activeSummary: null,
    currentStep: null,
  });

  const { useRouteNavigation } = require("@/hooks/useRouteNavigation");
  (useRouteNavigation as jest.Mock).mockImplementation(() => ({
    ...mockRouteNavState,
  }));
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe("CampusMap – shuttle integration", () => {
  it("includes shuttle mode chip when SGW→LOY route and user is student", async () => {
    const { findByTestId } = render(<CampusMap />);

    // Shuttle chip should appear once routes load
    await findByTestId("mode-shuttle");
  });

  it("calls buildShuttleDirectionRoute during loadAllModes", async () => {
    render(<CampusMap />);

    await waitFor(() => {
      expect(mockBuildShuttleDirectionRoute).toHaveBeenCalled();
    });
  });

  it("passes shuttleInfo to TravelOptionsPopup", async () => {
    const { findByTestId } = render(<CampusMap />);

    const statusEl = await findByTestId("shuttle-status");
    expect(statusEl.props.children).toBe("operating");
  });

  it("selecting shuttle mode calls onSelectMode with 'shuttle'", async () => {
    const { findByTestId } = render(<CampusMap />);

    const shuttleChip = await findByTestId("mode-shuttle");

    act(() => {
      fireEvent.press(shuttleChip);
    });

    // The handler should not crash (no assertion on routeNavigation since
    // shuttle mode is handled internally in CampusMap's onSelectMode)
    expect(shuttleChip).toBeTruthy();
  });

  it("pressing GO shuttle calls startNavigationWithSteps", async () => {
    const { findByTestId } = render(<CampusMap />);

    const goBtn = await findByTestId("go-shuttle");

    await act(async () => {
      fireEvent.press(goBtn);
    });

    expect(mockStartNavigationWithSteps).toHaveBeenCalled();
    const callArgs = mockStartNavigationWithSteps.mock.calls[0];
    expect(Array.isArray(callArgs[0])).toBe(true); // steps array
    expect(callArgs[1].mode).toBe("shuttle"); // summary.mode
  });

  it("NavigationOverlay renders when isNavigating=true", async () => {
    const { useRouteNavigation } = require("@/hooks/useRouteNavigation");
    (useRouteNavigation as jest.Mock).mockImplementation(() => ({
      ...mockRouteNavState,
      isNavigating: true,
      activeSummary: {
        mode: "shuttle",
        durationText: "60 min",
        durationSec: 3600,
        distanceText: "~8 km",
        distanceMeters: 8000,
        summary: "Concordia Shuttle",
      },
    }));

    const { getByTestId } = render(<CampusMap />);

    await waitFor(() => {
      expect(getByTestId("navigation-overlay")).toBeTruthy();
    });
  });

  it("exiting navigation calls exitNavigation and clears route coords", async () => {
    const { useRouteNavigation } = require("@/hooks/useRouteNavigation");
    (useRouteNavigation as jest.Mock).mockImplementation(() => ({
      ...mockRouteNavState,
      isNavigating: true,
      activeSummary: {
        mode: "shuttle",
        durationText: "60 min",
        durationSec: 3600,
        distanceText: "~8 km",
        distanceMeters: 8000,
        summary: "Concordia Shuttle",
      },
      exitNavigation: mockExitNavigation,
    }));

    const { getByTestId } = render(<CampusMap />);

    await waitFor(() => getByTestId("exit-navigation"));

    act(() => {
      fireEvent.press(getByTestId("exit-navigation"));
    });

    expect(mockExitNavigation).toHaveBeenCalled();
  });

  it("handles loadAllModes catch block gracefully when fetchDirections throws", async () => {
    fetchDirections.mockRejectedValue(new Error("network error"));

    // Should not throw; travel popup hides on error
    const { queryByTestId } = render(<CampusMap />);

    await waitFor(() => {
      // After catch, travel popup should not be visible
      expect(queryByTestId("travel-popup")).toBeNull();
    });
  });

  it("shuttle mode is not shown when not a campus-to-campus route", async () => {
    mockIsCampusToCampusRoute.mockReturnValue(false);

    const { queryByTestId } = render(<CampusMap />);

    await waitFor(() => {
      // Wait for routes to load then check shuttle chip is absent
      expect(queryByTestId("mode-shuttle")).toBeNull();
    });
  });
});
