/* eslint-disable import/first */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const mockAnimateToRegion = jest.fn();

jest.mock("@/components/Buildings/data/SGW_data.json", () => [
  {
    id: "sgw-h",
    code: "H",
    name: "Henry F. Hall Building",
    address: "1455 De Maisonneuve Blvd W, Montreal, QC",
    latitude: 45.49729,
    longitude: -73.57898,
    campus: "SGW",
    zoomCategory: 2,
    aliases: ["hall", "henry hall"],
    polygon: [
      { latitude: 45.497, longitude: -73.58 },
      { latitude: 45.497, longitude: -73.578 },
      { latitude: 45.498, longitude: -73.578 },
      { latitude: 45.498, longitude: -73.58 },
    ],
  },
]);

jest.mock("@/components/campus/TravelOptionsPopup", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Buildings/data/Loyola_data.json", () => [
  {
    id: "loy-ad",
    code: "AD",
    name: "Administration Building",
    address: "7141 Sherbrooke St W, Montreal, QC",
    latitude: 45.458,
    longitude: -73.64,
    campus: "LOY",
    zoomCategory: 1,
    aliases: ["admin", "administration"],
    polygon: [
      { latitude: 45.4581, longitude: -73.6401 },
      { latitude: 45.4582, longitude: -73.6402 },
      { latitude: 45.4583, longitude: -73.6403 },
    ],
  },
]);

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

jest.mock("@/components/layout/BrandBar", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const RN = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");
  const { View } = RN;

  return function BrandBarMock(props: any) {
    return ReactActual.createElement(View, {
      testID: props.testID || "brandbar",
      ...props,
    });
  };
});

jest.mock("@/components/campus/BuildingPopup", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const RN = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");
  const { View } = RN;

  return {
    __esModule: true,
    default: function MockBuildingPopup() {
      return ReactActual.createElement(View, { testID: "buildingPopup" });
    },
  };
});

const mockLocRequestPermissions = jest.fn(() =>
  Promise.resolve({ status: "denied" }),
);
const mockLocGetCurrent = jest.fn(() =>
  Promise.resolve({ coords: { latitude: 0, longitude: 0 } }),
);
const mockLocGetLastKnown = jest.fn(() => Promise.resolve(null));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: () => mockLocRequestPermissions(),
  getCurrentPositionAsync: () => mockLocGetCurrent(),
  getLastKnownPositionAsync: () => mockLocGetLastKnown(),
  Accuracy: { Low: 2, Balanced: 3 },
}));

jest.mock("@/components/campus/CurrentLocationButton", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const RN = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");
  const { View } = RN;

  return {
    __esModule: true,
    default: function MockCurrentLocationButton() {
      return ReactActual.createElement(View, {
        testID: "currentLocationButton",
      });
    },
  };
});

jest.mock("@/components/Styles/mapStyle", () => {
  const RN = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");
  return {
    styles: RN.StyleSheet.create({
      container: { flex: 1 },
      topOverlay: {},
      searchBar: {},
      searchIcon: {},
      searchInput: {},
      clearButton: {},
      clearIcon: {},
      suggestions: {},
      suggestionRow: {},
      suggestionTitle: {},
      suggestionSub: {},
      campusToggleContainer: {},
      campusToggleButton: {},
      campusToggleButtonLeft: {},
      campusToggleButtonRight: {},
      campusToggleSlider: {},
      campusToggleText: {},
      campusToggleTextActive: {},
      map: {},
    }),
  };
});

jest.mock("react-native-maps", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const RN = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");
  const { View } = RN;

  const MockMapView = ReactActual.forwardRef((props: any, ref: any) => {
    ReactActual.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
    }));

    return ReactActual.createElement(
      View,
      { ...props, testID: props.testID || "mapView" },
      props.children,
    );
  });

  const MockPolygon = (props: any) =>
    ReactActual.createElement(View, { ...props, testID: "polygon" });

  const MockMarker = (props: any) =>
    ReactActual.createElement(View, { ...props, testID: "marker" });

  (MockMapView as any).displayName = "MockMapView";

  return {
    __esModule: true,
    default: MockMapView,
    PROVIDER_GOOGLE: "google",
    Polygon: MockPolygon,
    Marker: MockMarker,
  };
});

//  Import AFTER mocks
jest.mock("expo-router", () => ({
  __esModule: true,
  useLocalSearchParams: jest.fn(() => ({})),
}));
import CampusMap from "../CampusMap";

beforeEach(() => {
  mockAnimateToRegion.mockClear();
});

describe("CampusMap - Route mode integration", () => {
  const SGW_H = "routeSuggestion-SGW-sgw-h";
  const LOY_AD = "routeSuggestion-LOY-loy-ad";

  it("toggles route mode and renders route panel", () => {
    const { getByTestId, queryByTestId } = render(<CampusMap />);

    expect(queryByTestId("routePanel")).toBeNull();

    fireEvent.press(getByTestId("routeModeButton"));

    expect(getByTestId("routePanel")).toBeTruthy();
    expect(getByTestId("routeCard")).toBeTruthy();
  });

  it("focus switching + typing shows route suggestions for the active field", async () => {
    const { getByTestId, queryByTestId, findByText } = render(<CampusMap />);

    fireEvent.press(getByTestId("routeModeButton"));

    // Type into START -> suggestions should appear
    fireEvent.changeText(getByTestId("routeStartInput"), "hall");
    expect(await findByText(/H — Henry F\. Hall Building/i)).toBeTruthy();
    expect(getByTestId("route-suggestions")).toBeTruthy();

    fireEvent.press(getByTestId("routeDestRow"));
    expect(queryByTestId("route-suggestions")).toBeNull();

    // Type into DEST -> Loyola suggestion appears
    fireEvent.changeText(getByTestId("routeDestInput"), "admin");
    expect(await findByText(/AD — Administration Building/i)).toBeTruthy();
    expect(getByTestId("route-suggestions")).toBeTruthy();
  });

  it("picking buildings in route mode sets start/destination and hides suggestions", async () => {
    const { getByTestId, queryByTestId, findByText } = render(<CampusMap />);

    fireEvent.press(getByTestId("routeModeButton"));

    // ---- Pick START (SGW H) ----
    fireEvent.changeText(getByTestId("routeStartInput"), "hall");
    await findByText(/H — Henry F\. Hall Building/i);

    fireEvent.press(getByTestId(SGW_H));

    // Your current implementation animates when picking in route mode.
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: expect.any(Number),
        longitude: expect.any(Number),
        latitudeDelta: expect.any(Number),
        longitudeDelta: expect.any(Number),
      }),
      600,
    );

    expect(queryByTestId("route-suggestions")).toBeNull();

    expect(getByTestId("routeStartInput").props.value).toMatch(
      /^H - Henry F\. Hall Building/i,
    );

    mockAnimateToRegion.mockClear();

    // ---- Pick DESTINATION (LOY AD) ----
    fireEvent.changeText(getByTestId("routeDestInput"), "admin");
    await findByText(/AD — Administration Building/i);

    fireEvent.press(getByTestId(LOY_AD));

    expect(queryByTestId("route-suggestions")).toBeNull();

    expect(getByTestId("routeDestInput").props.value).toMatch(
      /^AD - Administration Building/i,
    );
  });

  it("swap button swaps start and destination values", async () => {
    const { getByTestId, findByText } = render(<CampusMap />);

    fireEvent.press(getByTestId("routeModeButton"));

    // pick START = H
    fireEvent.changeText(getByTestId("routeStartInput"), "hall");
    await findByText(/H — Henry F\. Hall Building/i);
    fireEvent.press(getByTestId(SGW_H));

    // pick DEST = AD
    fireEvent.changeText(getByTestId("routeDestInput"), "admin");
    await findByText(/AD — Administration Building/i);
    fireEvent.press(getByTestId(LOY_AD));

    const startBefore = getByTestId("routeStartInput").props.value;
    const destBefore = getByTestId("routeDestInput").props.value;

    fireEvent.press(getByTestId("routeSwapButton"));

    expect(getByTestId("routeStartInput").props.value).toBe(destBefore);
    expect(getByTestId("routeDestInput").props.value).toBe(startBefore);
  });

  it("clear buttons reset start/destination and hide their clear buttons", async () => {
    const { getByTestId, queryByTestId, findByText } = render(<CampusMap />);

    fireEvent.press(getByTestId("routeModeButton"));

    // Set START
    fireEvent.changeText(getByTestId("routeStartInput"), "hall");
    await findByText(/H — Henry F\. Hall Building/i);
    fireEvent.press(getByTestId(SGW_H));
    expect(getByTestId("routeStartInput").props.value).toMatch(
      /^H - Henry F\. Hall Building/i,
    );
    expect(getByTestId("clearStart")).toBeTruthy();

    // Set DESTINATION
    fireEvent.changeText(getByTestId("routeDestInput"), "admin");
    await findByText(/AD — Administration Building/i);
    fireEvent.press(getByTestId(LOY_AD));
    expect(getByTestId("routeDestInput").props.value).toMatch(
      /^AD - Administration Building/i,
    );
    expect(getByTestId("clearDestination")).toBeTruthy();

    // Clear START
    fireEvent.press(getByTestId("clearStart"));
    expect(getByTestId("routeStartInput").props.value).toBe("");
    expect(queryByTestId("clearStart")).toBeNull();

    // Clear DESTINATION
    fireEvent.press(getByTestId("clearDestination"));
    expect(getByTestId("routeDestInput").props.value).toBe("");
    expect(queryByTestId("clearDestination")).toBeNull();
  });

  it("turning off route mode while in route mode clears start and destination", async () => {
    const { getByTestId, queryByTestId, findByText } = render(<CampusMap />);

    fireEvent.press(getByTestId("routeModeButton"));
    expect(getByTestId("routePanel")).toBeTruthy();

    fireEvent.changeText(getByTestId("routeStartInput"), "hall");
    await findByText(/H — Henry F\. Hall Building/i);
    fireEvent.press(getByTestId(SGW_H));

    fireEvent.changeText(getByTestId("routeDestInput"), "admin");
    await findByText(/AD — Administration Building/i);
    fireEvent.press(getByTestId(LOY_AD));

    expect(getByTestId("routeStartInput").props.value).toMatch(
      /^H - Henry F\. Hall Building/i,
    );
    expect(getByTestId("routeDestInput").props.value).toMatch(
      /^AD - Administration Building/i,
    );

    fireEvent.press(getByTestId("routeModeButton"));
    expect(queryByTestId("routePanel")).toBeNull();

    fireEvent.press(getByTestId("routeModeButton"));
    expect(getByTestId("routePanel")).toBeTruthy();
    expect(getByTestId("routeStartInput").props.value).toBe("");
    expect(getByTestId("routeDestInput").props.value).toBe("");
  });
});
