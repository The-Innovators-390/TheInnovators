/* eslint-disable import/first */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Animated } from "react-native";

jest.mock("@expo/vector-icons", () => {
  return new Proxy(
    {},
    {
      get: () => () => null,
    },
  );
});

const mockAnimateToRegion = jest.fn();

// -------------------- DATASETS (CampusMap imports JSON now) --------------------
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
  {
    id: "sgw-no-poly",
    code: "NP",
    name: "No Polygon Building",
    address: "Some address",
    latitude: 45.4978,
    longitude: -73.5795,
    campus: "SGW",
    zoomCategory: 1,
    aliases: ["nop", "no polygon"],
    polygon: [],
  },
]);

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

// -------------------- UI Mocks --------------------
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

jest.mock("@/components/campus/TravelOptionsPopup", () => ({
  __esModule: true,
  default: () => null,
}));

const mockGetDeviceLocation = jest.fn(async () => null);
jest.mock("@/components/campus/helper_methods/locationUtils", () => ({
  LocationError: class LocationError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message ?? code);
      this.code = code;
    }
  },
  getDeviceLocation: () => mockGetDeviceLocation(),
}));

jest.mock("@/components/campus/BuildingPopup", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const RN = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");
  const { View, Text, Pressable } = RN;

  return {
    __esModule: true,
    default: function MockBuildingPopup(props: any) {
      return ReactActual.createElement(
        View,
        { testID: "buildingPopup" },
        ReactActual.createElement(
          Text,
          null,
          `Popup: ${props?.building?.code ?? "?"}`,
        ),
        ReactActual.createElement(
          Pressable,
          {
            testID: "popupDirections",
            onPress: () => props.onGetDirections?.(props.building),
          },
          ReactActual.createElement(Text, null, "Directions"),
        ),
        ReactActual.createElement(
          Pressable,
          { testID: "closePopup", onPress: props.onClose },
          ReactActual.createElement(Text, null, "Close"),
        ),
      );
    },
  };
});

let mockOnLocationFound:
  | ((location: { latitude: number; longitude: number }) => void)
  | null = null;

jest.mock("@/components/campus/CurrentLocationButton", () => {
  const ReactActual = jest.requireActual("react") as typeof React;
  const RN = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");
  const { Pressable, Text } = RN;

  return {
    __esModule: true,
    default: function MockCurrentLocationButton(props: {
      onLocationFound: (location: {
        latitude: number;
        longitude: number;
      }) => void;
    }) {
      mockOnLocationFound = props.onLocationFound;
      return ReactActual.createElement(
        Pressable,
        { testID: "currentLocationButton" },
        ReactActual.createElement(Text, null, "◎"),
      );
    },
  };
});

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

// -------------------- react-native-maps mock --------------------
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

  (MockMapView as any).displayName = "MockMapView";

  const MockPolygon = (props: any) => {
    const first = props.coordinates?.[0];
    const tid = first
      ? `polygon-${first.latitude}-${first.longitude}`
      : "polygon";
    return ReactActual.createElement(View, { ...props, testID: tid });
  };

  const MockMarker = (props: any) => {
    const c = props.coordinate;
    const tid = c ? `marker-${c.latitude}-${c.longitude}` : "marker";
    return ReactActual.createElement(View, { ...props, testID: tid });
  };

  return {
    __esModule: true,
    default: MockMapView,
    PROVIDER_GOOGLE: "google",
    Polygon: MockPolygon,
    Marker: MockMarker,
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

import {
  INITIAL_REGION,
  SGW_REGION,
  LOY_REGION,
} from "@/components/campus/helper_methods/campusMap.constants";

const getNodeText = (node: any): string => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.join("");
  return "";
};

const getRouteStartValue = (utils: any) => {
  const input = utils.queryByTestId("routeStartInput");
  if (input) return input.props.value;
  return getNodeText(utils.getByTestId("routeStartText").props.children);
};

const getRouteDestValue = (utils: any) => {
  const input = utils.queryByTestId("routeDestInput");
  if (input) return input.props.value;
  return getNodeText(utils.getByTestId("routeDestText").props.children);
};

// Flush microtasks so the async getDeviceLocation effect settles inside act()
async function renderCampusMap() {
  const utils = render(<CampusMap />);
  await act(async () => {
    await Promise.resolve();
  });
  return utils;
}

beforeEach(() => {
  mockAnimateToRegion.mockClear();
  mockGetDeviceLocation.mockClear();
  mockOnLocationFound = null;
  (global as any).alert = jest.fn();

  jest.spyOn(Animated, "timing").mockImplementation((): any => ({
    start: (cb?: any) => cb?.(),
  }));
  jest.spyOn(Animated, "spring").mockImplementation((): any => ({
    start: (cb?: any) => cb?.(),
  }));
  jest.spyOn(Animated, "decay").mockImplementation((): any => ({
    start: (cb?: any) => cb?.(),
  }));
});

describe("CampusMap - initial region", () => {
  it("uses INITIAL_REGION as initialRegion", async () => {
    const { getByTestId } = await renderCampusMap();
    expect(getByTestId("mapView").props.initialRegion).toEqual(INITIAL_REGION);
  });
});

describe("CampusMap - search bar", () => {
  it("updates text and clears input", async () => {
    const { getByPlaceholderText, getByTestId } = await renderCampusMap();

    act(() => {
      fireEvent.changeText(getByPlaceholderText("Where to next?"), "hall");
    });

    expect(getByPlaceholderText("Where to next?").props.value).toBe("hall");

    act(() => {
      fireEvent.press(getByTestId("clearSearch"));
    });

    expect(getByPlaceholderText("Where to next?").props.value).toBe("");
  });
});

describe("CampusMap - suggestions", () => {
  it("shows suggestions from BOTH campuses based on the query", async () => {
    const { getByPlaceholderText, findByText } = await renderCampusMap();

    act(() => {
      fireEvent.changeText(getByPlaceholderText("Where to next?"), "ad");
    });
    expect(await findByText(/AD — Administration Building/i)).toBeTruthy();

    act(() => {
      fireEvent.changeText(getByPlaceholderText("Where to next?"), "hall");
    });
    expect(await findByText(/H — Henry F\. Hall Building/i)).toBeTruthy();
  });

  it("pressing a suggestion animates and fills the input", async () => {
    const { getByPlaceholderText, getByTestId, findByText } =
      await renderCampusMap();

    act(() => {
      fireEvent.changeText(getByPlaceholderText("Where to next?"), "admin");
    });
    await findByText(/AD — Administration Building/i);

    act(() => {
      fireEvent.press(getByTestId("suggestion-LOY-loy-ad"));
    });

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
    const [regionArg, durationArg] = mockAnimateToRegion.mock.calls[0];

    expect(durationArg).toBe(600);
    expect(regionArg).toEqual(
      expect.objectContaining({
        latitude: expect.any(Number),
        longitude: expect.any(Number),
        latitudeDelta: expect.any(Number),
        longitudeDelta: expect.any(Number),
      }),
    );

    expect(getByPlaceholderText("Where to next?").props.value).toMatch(
      /^AD - Administration Building/i,
    );
  });
});

describe("CampusMap - building selection + popup", () => {
  it("pressing a building marker selects it and shows popup", async () => {
    const { getByTestId, queryByTestId } = await renderCampusMap();

    act(() => {
      fireEvent.press(getByTestId("marker-45.458--73.64"));
    });

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
    expect(queryByTestId("buildingPopup")).toBeTruthy();
  });

  it("closing popup clears the selected building", async () => {
    const { getByTestId, queryByTestId } = await renderCampusMap();

    act(() => {
      fireEvent.press(getByTestId("marker-45.458--73.64"));
    });
    expect(queryByTestId("buildingPopup")).toBeTruthy();

    act(() => {
      fireEvent.press(getByTestId("closePopup"));
    });
    expect(queryByTestId("buildingPopup")).toBeNull();
  });

  it("pressing map clears the selected building", async () => {
    const { getByTestId, queryByTestId } = await renderCampusMap();

    act(() => {
      fireEvent.press(getByTestId("marker-45.458--73.64"));
    });
    expect(queryByTestId("buildingPopup")).toBeTruthy();

    act(() => {
      fireEvent.press(getByTestId("mapView"));
    });
    expect(queryByTestId("buildingPopup")).toBeNull();
  });

  it("building with empty polygon still renders as marker and uses fixed deltas on select", async () => {
    const { getByTestId } = await renderCampusMap();

    expect(getByTestId("marker-45.4978--73.5795")).toBeTruthy();

    act(() => {
      fireEvent.press(getByTestId("marker-45.4978--73.5795"));
    });

    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      {
        latitude: 45.4978,
        longitude: -73.5795,
        latitudeDelta: 0.0025,
        longitudeDelta: 0.0025,
      },
      600,
    );
  });

  it("Directions from popup enters route mode, sets destination, auto-sets start (inside a building), and clears normal search UI", async () => {
    const utils = await renderCampusMap();
    const { getByTestId, queryByTestId, findByTestId } = utils;

    act(() => {
      fireEvent.press(getByTestId("marker-45.458--73.64"));
    });
    expect(getByTestId("buildingPopup")).toBeTruthy();

    mockGetDeviceLocation.mockResolvedValueOnce({
      latitude: 45.4975,
      longitude: -73.579,
    });

    await act(async () => {
      fireEvent.press(getByTestId("popupDirections"));
      await Promise.resolve();
    });

    expect(queryByTestId("buildingPopup")).toBeNull();

    expect(await findByTestId("routePanel")).toBeTruthy();
    expect(getRouteDestValue(utils)).toMatch(/^AD - Administration Building/i);
    expect(getRouteStartValue(utils)).toMatch(/^H - Henry F\. Hall Building/i);
  });

  it("Directions from popup shows permission alert when auto-setting start fails with PERMISSION_DENIED", async () => {
    const { getByTestId, findByTestId } = await renderCampusMap();

    act(() => {
      fireEvent.press(getByTestId("marker-45.458--73.64"));
    });

    const {
      LocationError,
    } = require("@/components/campus/helper_methods/locationUtils");
    mockGetDeviceLocation.mockRejectedValueOnce(
      new LocationError("PERMISSION_DENIED"),
    );

    await act(async () => {
      fireEvent.press(getByTestId("popupDirections"));
      await Promise.resolve();
    });

    expect(await findByTestId("routePanel")).toBeTruthy();
    expect((global as any).alert).toHaveBeenCalledWith(
      expect.stringContaining("Location Permission Required"),
    );
  });

  it("Directions from popup shows services off alert when auto-setting start fails with SERVICES_OFF", async () => {
    const { getByTestId, findByTestId } = await renderCampusMap();

    act(() => {
      fireEvent.press(getByTestId("marker-45.458--73.64"));
    });

    const {
      LocationError,
    } = require("@/components/campus/helper_methods/locationUtils");
    mockGetDeviceLocation.mockRejectedValueOnce(
      new LocationError("SERVICES_OFF"),
    );

    await act(async () => {
      fireEvent.press(getByTestId("popupDirections"));
      await Promise.resolve();
    });

    expect(await findByTestId("routePanel")).toBeTruthy();
    expect((global as any).alert).toHaveBeenCalledWith(
      expect.stringContaining("Location Services Off"),
    );
  });

  it("Directions from popup shows generic location error alert on unknown error", async () => {
    const { getByTestId, findByTestId } = await renderCampusMap();

    act(() => {
      fireEvent.press(getByTestId("marker-45.458--73.64"));
    });

    mockGetDeviceLocation.mockRejectedValueOnce(new Error("boom"));

    await act(async () => {
      fireEvent.press(getByTestId("popupDirections"));
      await Promise.resolve();
    });

    expect(await findByTestId("routePanel")).toBeTruthy();
    expect((global as any).alert).toHaveBeenCalledWith(
      expect.stringContaining("Location Error"),
    );
  });
});

describe("CampusMap - campus toggle", () => {
  it("pressing Loyola animates to LOY_REGION", async () => {
    const { getByTestId } = await renderCampusMap();

    act(() => {
      fireEvent.press(getByTestId("campusToggle-Loyola"));
    });

    expect(mockAnimateToRegion).toHaveBeenCalledWith(LOY_REGION, 500);
  });

  it("pressing SGW animates to SGW_REGION (after switching away first)", async () => {
    const { getByTestId } = await renderCampusMap();

    act(() => {
      fireEvent.press(getByTestId("campusToggle-Loyola"));
    });

    act(() => {
      fireEvent.press(getByTestId("campusToggle-SGW"));
    });

    expect(mockAnimateToRegion).toHaveBeenCalledWith(SGW_REGION, 500);
  });

  it("BrandBar backgroundColor updates with campus changes", async () => {
    const { getByTestId } = await renderCampusMap();

    expect(getByTestId("brandbar").props.backgroundColor).toBe("#912338");

    act(() => {
      fireEvent.press(getByTestId("campusToggle-Loyola"));
    });
    expect(getByTestId("brandbar").props.backgroundColor).toBe("#e3ac20");

    act(() => {
      fireEvent.press(getByTestId("campusToggle-SGW"));
    });
    expect(getByTestId("brandbar").props.backgroundColor).toBe("#912338");
  });
});

describe("CampusMap - Current Location button callback", () => {
  it("calls animateToRegion when CurrentLocationButton reports a location", async () => {
    await renderCampusMap();
    expect(mockOnLocationFound).not.toBeNull();

    act(() => {
      mockOnLocationFound!({ latitude: 45.5, longitude: -73.6 });
    });

    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 45.5,
        longitude: -73.6,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }),
      500,
    );
  });
});
