/* eslint-disable import/first */
import React from "react";
import { View } from "react-native";
import { render, act } from "@testing-library/react-native";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// -------------------- Capture props from mocked components --------------------
let lastMapViewProps: any = null;
let lastBuildingShapesLayerProps: any = null;

// -------------------- Mock react-native-maps (ONLY what we need) --------------------
jest.mock("react-native-maps", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const RN = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");
  const { View } = RN;

  const MockMapView = (props: any) => {
    lastMapViewProps = props;
    return ReactActual.createElement(
      View,
      { testID: "mockMapView" },
      props.children,
    );
  };

  const MockMarker = (props: any) =>
    ReactActual.createElement(View, { testID: "mockMarker" }, props.children);

  return {
    __esModule: true,
    default: MockMapView,
    PROVIDER_GOOGLE: "google",
    Marker: MockMarker,
  };
});

// -------------------- Mock constants (so we know INITIAL_REGION) --------------------
const MOCK_INITIAL_REGION = {
  latitude: 45.5,
  longitude: -73.6,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

jest.mock("@/components/campus/helper_methods/campusMap.constants", () => ({
  __esModule: true,
  SGW_REGION: {
    latitude: 45.497,
    longitude: -73.579,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  },
  LOY_REGION: {
    latitude: 45.458,
    longitude: -73.64,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  },
  INITIAL_REGION: MOCK_INITIAL_REGION,
}));

// -------------------- Mock data imports used by buildAllBuildings --------------------
jest.mock("@/components/Buildings/SGW/SGWBuildings", () => ({
  __esModule: true,
  SGW_BUILDINGS: [],
}));
jest.mock("@/components/Buildings/Loyola/LoyolaBuildings", () => ({
  __esModule: true,
  LOYOLA_BUILDINGS: [],
}));

// -------------------- Mock helper_methods and UI helpers --------------------
jest.mock("@/components/campus/helper_methods/locationUtils", () => ({
  __esModule: true,
  getDeviceLocation: jest.fn(async () => {
    throw new Error("ignore location in this test");
  }),
  LocationError: class LocationError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

jest.mock("@/components/campus/helper_methods/campusMap.buildings", () => ({
  __esModule: true,
  buildAllBuildings: jest.fn(() => []),
  getUserLocationBuildingId: jest.fn(() => null),
  getBuildingContainingPoint: jest.fn(() => null),
  makeUserLocationBuilding: jest.fn(() => null),
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

// -------------------- Mock heavy UI components to keep render minimal --------------------
jest.mock("expo-status-bar", () => ({
  __esModule: true,
  StatusBar: () => null,
}));

jest.mock("@/components/campus/ToggleButton", () => ({
  __esModule: true,
  default: () => null,
  calculatePanValue: jest.fn(),
  determineCampusFromPan: jest.fn(),
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

jest.mock("@/components/Styles/mapStyle", () => ({
  __esModule: true,
  styles: {
    container: {},
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
  },
}));

jest.mock("@/hooks/useNavigation", () => ({
  __esModule: true,
  useNavigation: () => ({
    isRouteMode: false,
    toggleRouteMode: jest.fn(),
    setRouteDest: jest.fn(),
    setRouteStart: jest.fn(),
    setActiveField: jest.fn(),
    setFieldFromBuilding: jest.fn(),
    setRouteError: jest.fn(),
    routeStart: null,
    routeDest: null,
    activeField: "destination",
  }),
}));

jest.mock("@/components/Buildings/mapZoom", () => ({
  __esModule: true,
  regionFromPolygon: jest.fn(() => MOCK_INITIAL_REGION),
  paddingForZoomCategory: jest.fn(() => 0),
}));

// -------------------- Mock BuildingShapesLayer to observe the NEW prop: region --------------------
jest.mock("@/components/campus/BuildingShapesLayer", () => {
  const ReactActual = require("react");
  const RN = require("react-native");

  return {
    __esModule: true,
    default: (props: any) => {
      lastBuildingShapesLayerProps = props;
      return ReactActual.createElement(RN.View, {
        testID: "mockBuildingShapesLayer",
      });
    },
  };
});

// -------------------- Import AFTER mocks --------------------
jest.mock("expo-router", () => {
  const actual = jest.requireActual("expo-router");
  return {
    __esModule: true,
    ...actual,
    useLocalSearchParams: jest.fn(() => ({})),
  };
});
import CampusMap from "../CampusMap";

describe("CampusMap - region wiring (updated code only)", () => {
  beforeEach(() => {
    lastMapViewProps = null;
    lastBuildingShapesLayerProps = null;
  });

  it("forwards INITIAL_REGION to BuildingShapesLayer after the first region change callback", () => {
    render(<CampusMap />);

    expect(lastMapViewProps).toBeTruthy();
    expect(lastBuildingShapesLayerProps).toBeTruthy();

    // In the real MapView, onRegionChangeComplete typically fires soon after mount.
    // Our mock MapView does not auto-fire callbacks, so simulate that initial callback.
    expect(typeof lastMapViewProps.onRegionChangeComplete).toBe("function");

    act(() => {
      lastMapViewProps.onRegionChangeComplete(MOCK_INITIAL_REGION);
    });

    expect(lastBuildingShapesLayerProps.region).toEqual(MOCK_INITIAL_REGION);
  });

  it("updates region state when MapView triggers onRegionChangeComplete and forwards it to BuildingShapesLayer", () => {
    render(<CampusMap />);

    const nextRegion = {
      latitude: 45.49,
      longitude: -73.58,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };

    expect(typeof lastMapViewProps.onRegionChangeComplete).toBe("function");

    act(() => {
      lastMapViewProps.onRegionChangeComplete(nextRegion);
    });

    expect(lastBuildingShapesLayerProps.region).toEqual(nextRegion);
  });
});
