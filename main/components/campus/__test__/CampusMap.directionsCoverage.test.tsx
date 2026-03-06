/* eslint-disable import/first */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// --- Mocks ---
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  __esModule: true,
  fetchDirections: jest.fn(),
  pickFastestRoute: jest.fn(),
  decodePolyline: jest.fn(),
}));

// Simplify heavy UI components
jest.mock("@/components/campus/BuildingShapesLayer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: "mock-shapes" }),
  };
});

jest.mock("@/components/campus/TravelOptionsPopup", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");

  return {
    __esModule: true,
    default: ({
      visible,
      modes,
      selectedMode,
      onSelectMode,
      onSelectRouteIndex,
    }: any) => {
      if (!visible) return null;

      const selected =
        modes.find((m: any) => m.mode === selectedMode) ?? modes[0];

      return (
        <View testID="travel-popup">
          <Text>Directions</Text>

          {/* mode buttons */}
          {modes.map((m: any) => (
            <Pressable
              key={m.mode}
              testID={`mode-${m.mode}`}
              onPress={() => onSelectMode(m.mode)}
            >
              <Text testID={`mode-${m.mode}-time`}>
                {m.routes?.[0]?.durationText ?? "--"}
              </Text>
            </Pressable>
          ))}

          {/* route cards for the selected mode */}
          {selected.routes.map((r: any, idx: number) => (
            <Pressable
              key={`${selectedMode}-${idx}`}
              testID={`route-${selectedMode}-${idx}`}
              onPress={() => onSelectRouteIndex(idx)}
            >
              <Text>{r.durationText}</Text>
            </Pressable>
          ))}
        </View>
      );
    },
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

jest.mock("@/components/layout/BrandBar", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function BrandBarMock(props: any) {
    return React.createElement(View, { testID: props.testID || "brandbar" });
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

// BottomSheet used by TravelOptionsPopup
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockBottomSheet = React.forwardRef((props: any, _ref: any) => (
    <View testID="mock-bottom-sheet">
      {props.handleComponent?.({} as any)}
      {props.children}
    </View>
  ));
  MockBottomSheet.displayName = "MockBottomSheet";

  const BottomSheetScrollView = (props: any) => (
    <View testID="mock-bottom-sheet-scroll">{props.children}</View>
  );
  BottomSheetScrollView.displayName = "BottomSheetScrollView";

  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetScrollView,
  };
});

// Keep styles minimal so render doesn't crash
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

// Mock buildings datasets to keep CampusMap deterministic
jest.mock("@/components/Buildings/data/SGW_data.json", () => []);
jest.mock("@/components/Buildings/data/Loyola_data.json", () => []);

// Mock navigation hook to force route mode with fixed start+dest
const mockNav: any = {
  isRouteMode: true,
  routeStart: {
    id: "A",
    code: "A",
    name: "Start",
    address: "",
    latitude: 45.0,
    longitude: -73.0,
    campus: "SGW",
  },
  routeDest: {
    id: "B",
    code: "B",
    name: "Dest",
    address: "",
    latitude: 45.01,
    longitude: -73.01,
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
  clearStart: jest.fn(),
  clearDestination: jest.fn(),
};

jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: () => mockNav,
}));

// MapView mock with fitToCoordinates support
const mockAnimateToRegion = jest.fn();
const mockFitToCoordinates = jest.fn();

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
      fitToCoordinates: mockFitToCoordinates,
    }));

    return React.createElement(
      View,
      { ...props, testID: props.testID || "mapView" },
      props.children,
    );
  });
  MockMapView.displayName = "MockMapView";

  const Marker = (props: any) =>
    React.createElement(View, { ...props, testID: props.testID || "marker" });

  const Polyline = (props: any) =>
    React.createElement(View, { ...props, testID: "routePolyline" });

  return {
    __esModule: true,
    default: MockMapView,
    PROVIDER_GOOGLE: "google",
    Marker,
    Polyline,
  };
});

// Import AFTER mocks
jest.mock("expo-router", () => {
  const actual = jest.requireActual("expo-router");
  return {
    __esModule: true,
    ...actual,
    useLocalSearchParams: jest.fn(() => ({})),
  };
});
import CampusMap from "../CampusMap";

const googleDirections =
  require("@/components/campus/helper_methods/googleDirections") as {
    fetchDirections: jest.Mock;
    pickFastestRoute: jest.Mock;
    decodePolyline: jest.Mock;
  };

const mockFetchDirections = googleDirections.fetchDirections;
const mockPickFastestRoute = googleDirections.pickFastestRoute;
const mockDecodePolyline = googleDirections.decodePolyline;

function makeRoute(
  polyline: string,
  durationSec: number,
  durationText = "",
  distanceText = "",
) {
  return {
    summary: "",
    polyline,
    durationSec,
    durationText: durationText || `${durationSec}s`,
    distanceMeters: 0,
    distanceText: distanceText || "0 km",
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDecodePolyline.mockReturnValue([
    { latitude: 45.0, longitude: -73.0 },
    { latitude: 45.01, longitude: -73.01 },
  ]);
});

describe("CampusMap - directions effect coverage", () => {
  it("fetches + sorts routes for all modes, selects fastest, and fits map", async () => {
    mockFetchDirections.mockImplementation(({ mode }: any) => {
      if (mode === "driving") {
        // Unsorted: fast should end up first after sort
        return Promise.resolve([
          makeRoute("slow", 500),
          makeRoute("fast", 200),
        ]);
      }
      // other modes empty, but still fetched
      return Promise.resolve([]);
    });

    mockPickFastestRoute.mockImplementation((routes: any) => routes[0]);

    const { getByText } = render(<CampusMap />);

    // Travel popup becomes visible after effect finishes
    await waitFor(() => {
      expect(getByText("Directions")).toBeTruthy();
    });

    // Called for each mode via Promise.all
    expect(mockFetchDirections).toHaveBeenCalledTimes(4);

    // Verify the array passed into pickFastestRoute is sorted ascending (fastest first)
    const passed = mockPickFastestRoute.mock.calls[0][0] as any[];
    expect(passed[0].polyline).toBe("fast");
    expect(passed[0].durationSec).toBe(200);

    // Polyline decoded from chosen fastest route
    expect(mockDecodePolyline).toHaveBeenCalledWith("fast");

    // Fits map to decoded coords
    expect(mockFitToCoordinates).toHaveBeenCalled();
  });

  it("switches bestMode when current mode has no routes", async () => {
    mockFetchDirections.mockImplementation(({ mode }: any) => {
      if (mode === "walking") {
        return Promise.resolve([makeRoute("walk-fast", 100)]);
      }
      // driving empty, so effect should pick walking as first available
      return Promise.resolve([]);
    });

    mockPickFastestRoute.mockImplementation((routes: any) => routes[0]);

    const { findByTestId } = render(<CampusMap />);

    // When bestMode is walking, route cards are keyed with walking
    expect(await findByTestId("route-walking-0")).toBeTruthy();
    expect(mockDecodePolyline).toHaveBeenCalledWith("walk-fast");
  });

  it("applySelection runs when user picks a different route", async () => {
    mockFetchDirections.mockImplementation(({ mode }: any) => {
      if (mode === "driving") {
        return Promise.resolve([
          makeRoute("d0", 120, "2 mins"),
          makeRoute("d1", 180, "3 mins"),
        ]);
      }
      return Promise.resolve([]);
    });

    mockPickFastestRoute.mockImplementation((routes: any) => routes[0]);

    const { findByTestId } = render(<CampusMap />);

    // wait for popup
    await findByTestId("route-driving-0");

    // pick 2nd driving route -> triggers applySelection in CampusMap
    fireEvent.press(await findByTestId("route-driving-1"));

    expect(mockDecodePolyline).toHaveBeenLastCalledWith("d1");
    expect(mockFitToCoordinates).toHaveBeenCalled();
  });
});
