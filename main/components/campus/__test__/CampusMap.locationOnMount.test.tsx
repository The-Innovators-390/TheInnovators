/* eslint-disable import/first */
import React from "react";
import { render, waitFor } from "@testing-library/react-native";

// Silence icon warnings
jest.mock("@expo/vector-icons", () => {
  return new Proxy(
    {},
    {
      get: () => () => null,
    },
  );
});

// Mock heavy children
jest.mock("../BuildingShapesLayer", () => () => null);
jest.mock("../BuildingPopup", () => () => null);
jest.mock("../BuildingPin", () => () => null);
jest.mock("../CurrentLocationButton", () => () => null);
jest.mock("../ToggleButton", () => () => null);
jest.mock("../RoutePlanner", () => () => null);
jest.mock("../RouteInput", () => () => null);
jest.mock("@/components/layout/BrandBar", () => () => null);

// Mock map (forwardRef MUST accept (props, ref))
jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  // eslint-disable-next-line react/display-name
  const MapView = React.forwardRef((props: any, _ref: any) => (
    <View {...props} testID={props.testID ?? "mapView"}>
      {props.children}
    </View>
  ));
  return {
    __esModule: true,
    default: MapView,
    PROVIDER_GOOGLE: "google",
    Marker: View,
    Polygon: View,
  };
});

// Mock location utils used by mount effect
const mockGetDeviceLocation = jest.fn();
jest.mock("../helper_methods/locationUtils", () => ({
  getDeviceLocation: () => mockGetDeviceLocation(),
}));

// CampusMap imports these from campusMap.buildings (must exist)
jest.mock("../helper_methods/campusMap.buildings", () => ({
  buildAllBuildings: () => [],
  getUserLocationBuildingId: () => null,
  getBuildingContainingPoint: () => null,
  makeUserLocationBuilding: () => null,
}));

jest.mock("expo-router", () => {
  const actual = jest.requireActual("expo-router");
  return {
    __esModule: true,
    ...actual,
    useLocalSearchParams: jest.fn(() => ({})),
  };
});
import CampusMap from "../CampusMap";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CampusMap - auto location on mount", () => {
  it("calls getDeviceLocation on mount", async () => {
    mockGetDeviceLocation.mockResolvedValueOnce({
      latitude: 45.49,
      longitude: -73.58,
    });

    render(<CampusMap />);

    await waitFor(() => {
      expect(mockGetDeviceLocation).toHaveBeenCalledTimes(1);
    });
  });

  it("ignores getDeviceLocation errors (no crash)", async () => {
    mockGetDeviceLocation.mockRejectedValueOnce(new Error("fail"));

    render(<CampusMap />);

    await waitFor(() => {
      expect(mockGetDeviceLocation).toHaveBeenCalledTimes(1);
    });
  });
});
