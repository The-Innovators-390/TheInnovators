/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
jest.mock("@/components/POI/POICategoryBar", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/POI/POIBottomSheet", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/POI/POIMarkers", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/hooks/usePOIFeature", () => ({
  usePOIFeature: () => ({
    poiSheetRef: { current: null },
    pois: [],
    status: "idle",
    selectedPOI: null,
    activeCategory: null,
    handleCategorySelect: jest.fn(),
    handleSelectPOI: jest.fn(),
    handleGetDirections: jest.fn(),
    handleSheetClose: jest.fn(),
  }),
}));
import { Platform } from "react-native";

const mockAnimateToRegion = jest.fn();
const mockFitToCoordinates = jest.fn();
const mockAnimateCamera = jest.fn();

const mockSetIsRouteMode = jest.fn();
const mockSetRouteDest = jest.fn();
const mockSetRouteStart = jest.fn();
const mockToggleRouteMode = jest.fn();
const mockSetRouteError = jest.fn();
const mockSetActiveField = jest.fn();
const mockSetFieldFromBuilding = jest.fn();

const mockStartNavigation = jest.fn(() => Promise.resolve());
const mockStartNavigationWithSteps = jest.fn();
const mockExitNavigation = jest.fn();

const mockFetchDirections: any = jest.fn();
const mockPickFastestRoute: any = jest.fn();
const mockBuildShuttleNavigationSteps: any = jest.fn(() => [
  {
    instruction: "Walk to stop",
    distanceText: "100 m",
    end: { latitude: 45.5, longitude: -73.6 },
  },
]);

const mockBuildShuttleDirectionRouteFromGoogle: any = jest.fn(async () => null);
const mockBuildShuttleDirectionRoute: any = jest.fn(() => null);

const deepLinkBuilding = {
  id: "CJ",
  code: "CJ",
  name: "Communication Studies and Journalism",
  address: "7141 Sherbrooke St W",
  latitude: 45.458,
  longitude: -73.64,
  campus: "LOY",
  aliases: [],
};

let mockLocalSearchParams: Record<string, string> = {};
let mockNavState: any;
let mockRouteNavigationState: any;
let mockTravelPopupProps: any = null;

/**
 * Single stable router object for expo-router (name prefixed with `mock`
 * so the jest.mock factory may reference it). Reassign methods after
 * `clearAllMocks()` for a fresh spy per test.
 */
const mockExpoRouterObj = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  setParams: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();

  mockExpoRouterObj.push = jest.fn();
  mockExpoRouterObj.replace = jest.fn();
  mockExpoRouterObj.back = jest.fn();
  mockExpoRouterObj.setParams = jest.fn();

  mockLocalSearchParams = {};

  mockNavState = {
    isRouteMode: false,
    routeStart: null,
    routeDest: null,
    activeField: "destination",
    routeError: null,
    toggleRouteMode: mockToggleRouteMode,
    setRouteStart: mockSetRouteStart,
    setRouteDest: mockSetRouteDest,
    setRouteError: mockSetRouteError,
    setActiveField: mockSetActiveField,
    setIsRouteMode: mockSetIsRouteMode,
    setFieldFromBuilding: mockSetFieldFromBuilding,
  };

  mockRouteNavigationState = {
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
  };

  mockTravelPopupProps = null;
});

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockLocalSearchParams,
  useRouter: () => mockExpoRouterObj,
}));

jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: () => mockNavState,
}));

jest.mock("@/hooks/useRouteNavigation", () => ({
  useRouteNavigation: (args: any) => {
    if (args?.onStarted) {
      mockRouteNavigationState.onStarted = args.onStarted;
    }
    return mockRouteNavigationState;
  },
}));

jest.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "student" }),
  isShuttleEligible: () => true,
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

jest.mock("@/components/Buildings/SGW/SGWBuildings", () => ({
  SGW_BUILDINGS: [],
}));

jest.mock("@/components/Buildings/Loyola/LoyolaBuildings", () => ({
  LOYOLA_BUILDINGS: [],
}));

jest.mock("@/components/campus/helper_methods/campusMap.constants", () => ({
  SGW_REGION: {
    latitude: 45.497,
    longitude: -73.579,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  },
  LOY_REGION: {
    latitude: 45.458,
    longitude: -73.64,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  },
  INITIAL_REGION: {
    latitude: 45.497,
    longitude: -73.579,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  },
}));

jest.mock("@/components/Buildings/mapZoom", () => ({
  regionFromPolygon: jest.fn(() => ({
    latitude: 45.458,
    longitude: -73.64,
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
  })),
  paddingForZoomCategory: jest.fn(() => 0.001),
}));

jest.mock("@/components/campus/helper_methods/campusMap.buildings", () => ({
  buildAllBuildings: () => [deepLinkBuilding],
  getUserLocationBuildingId: () => null,
  getBuildingContainingPoint: () => null,
  makeUserLocationBuilding: (
    latitude: number,
    longitude: number,
    campus: string,
  ) => ({
    id: "USER_LOCATION",
    code: "ME",
    name: "Your location",
    address: "",
    latitude,
    longitude,
    campus,
    aliases: [],
  }),
  resolveCampusFromLocation: () => "SGW",
}));

jest.mock("@/components/campus/helper_methods/googleDirections", () => ({
  fetchDirections: (...args: any[]) => mockFetchDirections(...args),
  pickFastestRoute: (...args: any[]) => mockPickFastestRoute(...args),
  decodePolyline: jest.fn((polyline: string) => {
    if (polyline === "transit-poly") {
      return [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.458, longitude: -73.64 },
      ];
    }
    if (polyline === "shuttle-poly") {
      return [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.458, longitude: -73.64 },
      ];
    }
    return [
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
    ];
  }),
}));

jest.mock("@/components/campus/helper_methods/shuttleSchedule", () => ({
  isCampusToCampusRoute: jest.fn(() => true),
  getShuttleDirection: jest.fn(() => "SGW_TO_LOY"),
  buildShuttleDirectionRoute: (...args: any[]) =>
    mockBuildShuttleDirectionRoute(...args),
  buildShuttleDirectionRouteFromGoogle: (...args: any[]) =>
    mockBuildShuttleDirectionRouteFromGoogle(...args),
  buildShuttleNavigationSteps: () => mockBuildShuttleNavigationSteps(),
  buildShuttleInfo: jest.fn(() => ({
    status: "operating",
    nextDeparture: "13:45",
  })),
}));

jest.mock("@/components/campus/helper_methods/directionErrors", () => ({
  toDirectionsErrorMessage: () => "Directions failed",
}));

jest.mock("@/components/campus/helper_methods/geo", () => ({
  bearingDegrees: () => 0,
}));

jest.mock("@/components/campus/helper_methods/navigationFormat", () => ({
  formatArrivalTimeFromNow: () => "18:57",
  metersToKmString: () => "8.2",
  secondsToMinutesString: () => "47",
}));

jest.mock("@/components/campus/helper_methods/mapCompass", () => ({
  resetMapDirectionToNorth: jest.fn(),
}));

jest.mock("react-native-maps", () => {
  const ReactActual = require("react");
  const { View, Pressable } = require("react-native");

  const MockMapView = ReactActual.forwardRef((props: any, ref: any) => {
    ReactActual.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
      fitToCoordinates: mockFitToCoordinates,
      animateCamera: mockAnimateCamera,
    }));

    return ReactActual.createElement(
      Pressable,
      { ...props, testID: props.testID || "mapView" },
      props.children,
    );
  });

  MockMapView.displayName = "MockMapView";

  return {
    __esModule: true,
    default: MockMapView,
    PROVIDER_GOOGLE: "google",
    Marker: (props: any) =>
      ReactActual.createElement(View, {
        ...props,
        testID: props.testID || "marker",
      }),
  };
});

jest.mock("@/components/Styles/mapStyle", () => ({
  styles: {
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
  },
}));

jest.mock("@/components/campus/BuildingShapesLayer", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: "shapes-layer" }),
  };
});

jest.mock("@/components/campus/ToggleButton", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: "toggle-button" }),
  };
});

jest.mock("@/components/campus/BuildingPin", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, { testID: "building-pin" }),
  };
});

jest.mock("@/components/campus/CurrentLocationButton", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: "current-location-button" }),
  };
});

jest.mock("@/components/campus/BuildingPopup", () => {
  const ReactActual = require("react");
  const { View, Pressable, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ onSheetChange }: { onSheetChange?: (index: number) => void }) =>
      ReactActual.createElement(
        View,
        { testID: "building-popup" },
        ReactActual.createElement(
          Pressable,
          {
            testID: "building-popup-sheet-change",
            onPress: () => onSheetChange?.(2),
          },
          ReactActual.createElement(Text, null, "Sheet"),
        ),
      ),
  };
});

jest.mock("@/components/layout/BrandBar", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: any) =>
      ReactActual.createElement(View, { testID: props.testID || "brandbar" }),
  };
});

jest.mock("@/components/campus/RoutePlanner", () => {
  const ReactActual = require("react");
  const { Pressable } = require("react-native");
  return {
    __esModule: true,
    default: ({ onToggle }: { onToggle: () => void }) =>
      ReactActual.createElement(Pressable, {
        testID: "route-planner",
        onPress: onToggle,
      }),
  };
});

jest.mock("@/components/campus/RouteInput", () => {
  const ReactActual = require("react");
  const { View, Pressable, Text } = require("react-native");
  return {
    __esModule: true,
    default: (props: {
      onChangeStartText: (t: string) => void;
      onChangeDestText: (t: string) => void;
      onSwap: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: "route-input" },
        ReactActual.createElement(
          Pressable,
          {
            testID: "mock-route-change-start",
            onPress: () => props.onChangeStartText("typed-start"),
          },
          ReactActual.createElement(Text, null, "ChStart"),
        ),
        ReactActual.createElement(
          Pressable,
          {
            testID: "mock-route-change-dest",
            onPress: () => props.onChangeDestText("typed-dest"),
          },
          ReactActual.createElement(Text, null, "ChDest"),
        ),
        ReactActual.createElement(
          Pressable,
          {
            testID: "mock-route-swap",
            onPress: props.onSwap,
          },
          ReactActual.createElement(Text, null, "Swap"),
        ),
      ),
  };
});

jest.mock("@/components/campus/Compass", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible }: any) =>
      visible ? ReactActual.createElement(View, { testID: "compass" }) : null,
  };
});

jest.mock("@/components/campus/NextClassButton", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    NextClassButton: () =>
      ReactActual.createElement(View, { testID: "next-class-button" }),
  };
});

jest.mock("@/components/campus/RoutePolylines", () => {
  const ReactActual = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ onPress }: { onPress?: () => void }) =>
      ReactActual.createElement(
        Pressable,
        { testID: "route-polylines", onPress },
        ReactActual.createElement(Text, null, "Polyline"),
      ),
  };
});

jest.mock("../../ui/DirectionLoadError", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible }: any) =>
      visible
        ? ReactActual.createElement(View, { testID: "direction-load-error" })
        : null,
  };
});

jest.mock("@/components/campus/NavigationOverlay", () => {
  const ReactActual = require("react");
  const { View, Pressable, Text } = require("react-native");
  return {
    NavigationOverlay: ({ isNavigating, onToggleSteps, onCloseSteps }: any) =>
      isNavigating
        ? ReactActual.createElement(
            View,
            { testID: "navigation-overlay" },
            ReactActual.createElement(
              Pressable,
              { testID: "overlay-toggle-steps", onPress: onToggleSteps },
              ReactActual.createElement(Text, null, "Toggle"),
            ),
            ReactActual.createElement(
              Pressable,
              { testID: "overlay-close-steps", onPress: onCloseSteps },
              ReactActual.createElement(Text, null, "Close"),
            ),
          )
        : null,
  };
});

jest.mock("@/components/campus/TravelOptionsPopup", () => {
  const { View, Pressable, Text } = require("react-native");

  return {
    __esModule: true,
    default: ({
      visible,
      modes,
      onGo,
      onSelectMode,
      selectedMode,
      onClose,
      onSheetChange,
    }: any) => {
      mockTravelPopupProps = { visible, modes, selectedMode };

      if (!visible) return null;

      return (
        <View testID="travel-popup">
          {modes.map((m: any) => (
            <Pressable
              key={m.mode}
              testID={`mode-${m.mode}`}
              onPress={() => onSelectMode(m.mode)}
            >
              <Text>{m.mode}</Text>
            </Pressable>
          ))}

          <Pressable testID="go-shuttle" onPress={() => onGo("shuttle", 0)}>
            <Text>Go shuttle</Text>
          </Pressable>
          <Pressable testID="close-travel-popup" onPress={onClose}>
            <Text>Close</Text>
          </Pressable>
          <Pressable
            testID="travel-popup-sheet-change"
            onPress={() => onSheetChange?.(1)}
          >
            <Text>Sheet</Text>
          </Pressable>
        </View>
      );
    },
  };
});

import CampusMap from "../CampusMap";

describe("CampusMap additional coverage", () => {
  it("covers the destBuildingId effect and auto-selects the deep-linked destination", async () => {
    mockLocalSearchParams = { destBuildingId: "CJ" };

    render(<CampusMap />);

    await waitFor(() => {
      expect(mockSetIsRouteMode).toHaveBeenCalledWith(true);
      expect(mockSetRouteDest).toHaveBeenCalledWith(deepLinkBuilding);
      expect(mockAnimateToRegion).toHaveBeenCalled();
    });

    expect(mockSetRouteStart).toHaveBeenCalled();
  });

  it("covers the transit branch and deferred pending transit render", async () => {
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };

    mockFetchDirections.mockImplementation(async (...args: any[]) => {
      const mode = args[0]?.mode;
      if (mode === "transit") {
        return [
          {
            summary: "Transit Route",
            polyline: "transit-poly",
            durationSec: 2400,
            durationText: "40 min",
            distanceMeters: 8200,
            distanceText: "8.2 km",
          },
        ];
      }
      return [];
    });

    mockPickFastestRoute.mockImplementation(
      (...args: any[]) => args[0]?.[0] ?? null,
    );

    render(<CampusMap />);

    await waitFor(() => {
      expect(mockFitToCoordinates).toHaveBeenCalledWith(
        [
          { latitude: 45.497, longitude: -73.579 },
          { latitude: 45.458, longitude: -73.64 },
        ],
        expect.objectContaining({
          animated: true,
        }),
      );
    });

    expect(mockTravelPopupProps?.visible).toBe(true);
    expect(
      mockTravelPopupProps?.modes?.find((m: any) => m.mode === "transit")
        ?.routes?.length,
    ).toBe(1);
  });

  it("covers shuttle fallback values when no shuttle route exists", async () => {
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };

    mockFetchDirections.mockResolvedValue([]);
    mockPickFastestRoute.mockReturnValue(null);
    mockBuildShuttleDirectionRouteFromGoogle.mockResolvedValue(null);
    mockBuildShuttleDirectionRoute.mockReturnValue(null);

    render(<CampusMap />);

    await waitFor(() => {
      expect(mockBuildShuttleDirectionRouteFromGoogle).toHaveBeenCalled();
      expect(mockBuildShuttleDirectionRoute).toHaveBeenCalled();
    });

    expect(mockStartNavigationWithSteps).not.toHaveBeenCalled();
  });

  it("covers travel popup close callback", async () => {
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };
    mockFetchDirections.mockResolvedValue([
      {
        summary: "Transit Route",
        polyline: "transit-poly",
        durationSec: 2400,
        durationText: "40 min",
        distanceMeters: 8200,
        distanceText: "8.2 km",
      },
    ]);
    mockPickFastestRoute.mockImplementation(
      (...args: any[]) => args[0]?.[0] ?? null,
    );

    const { getByTestId, queryByTestId } = render(<CampusMap />);

    await waitFor(() => {
      expect(getByTestId("travel-popup")).toBeTruthy();
    });

    fireEvent.press(getByTestId("close-travel-popup"));

    await waitFor(() => {
      expect(queryByTestId("travel-popup")).toBeNull();
    });
  });

  it("covers navigation overlay step toggle callbacks", async () => {
    mockRouteNavigationState = {
      ...mockRouteNavigationState,
      isNavigating: true,
      activeSummary: { durationSec: 120, distanceMeters: 2000 },
      currentStep: { instruction: "Walk ahead", distanceText: "50 m" },
      activeSteps: [{ instruction: "Walk ahead", distanceText: "50 m" }],
    };

    const { getByTestId } = render(<CampusMap />);

    await waitFor(() => {
      expect(getByTestId("navigation-overlay")).toBeTruthy();
    });

    fireEvent.press(getByTestId("overlay-toggle-steps"));
    fireEvent.press(getByTestId("overlay-close-steps"));
  });

  it("shows building popup after picking a search suggestion in browse mode", async () => {
    const { getByTestId } = render(<CampusMap />);

    fireEvent.changeText(getByTestId("searchInput"), "cj");
    fireEvent.press(getByTestId("suggestion-LOY-CJ"));

    expect(getByTestId("building-popup")).toBeTruthy();
  });

  it("covers TravelOptionsPopup onSheetChange updating popup index", async () => {
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };
    mockFetchDirections.mockResolvedValue([
      {
        summary: "Driving",
        polyline: "ab",
        durationSec: 600,
        durationText: "10 min",
        distanceMeters: 2000,
        distanceText: "2 km",
      },
    ]);
    mockPickFastestRoute.mockImplementation(
      (...args: any[]) => args[0]?.[0] ?? null,
    );

    const { getByTestId, queryByTestId } = render(<CampusMap />);

    await waitFor(() => {
      expect(getByTestId("travel-popup")).toBeTruthy();
    });

    expect(queryByTestId("accessibleRouteButton")).toBeTruthy();

    fireEvent.press(getByTestId("travel-popup-sheet-change"));

    await waitFor(() => {
      expect(queryByTestId("accessibleRouteButton")).toBeNull();
    });
  });

  it("toggles accessible route mode while planning a campus route", async () => {
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };
    mockFetchDirections.mockResolvedValue([
      {
        summary: "Driving",
        polyline: "ab",
        durationSec: 600,
        durationText: "10 min",
        distanceMeters: 2000,
        distanceText: "2 km",
      },
    ]);
    mockPickFastestRoute.mockImplementation(
      (...args: any[]) => args[0]?.[0] ?? null,
    );

    const { getByTestId } = render(<CampusMap />);

    await waitFor(() => {
      expect(getByTestId("travel-popup")).toBeTruthy();
    });

    const a11yBtn = getByTestId("accessibleRouteButton");
    fireEvent.press(a11yBtn);
    fireEvent.press(a11yBtn);
  });

  it("exitMapCampus effect resets navigation and focuses campus", async () => {
    mockLocalSearchParams = { exitMapCampus: "LOY" };
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };

    render(<CampusMap />);

    await waitFor(() => {
      expect(mockExitNavigation).toHaveBeenCalled();
      expect(mockSetIsRouteMode).toHaveBeenCalledWith(false);
      expect(mockSetRouteStart).toHaveBeenCalledWith(null);
      expect(mockSetRouteDest).toHaveBeenCalledWith(null);
    });

    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 45.458,
        longitude: -73.64,
      }),
      500,
    );
    await waitFor(() => {
      expect(mockExpoRouterObj.setParams).toHaveBeenCalled();
    });
  });

  it("shows indoor arrival confirm after navigation starts with external room params", async () => {
    mockLocalSearchParams = {
      externalDestRoomNodeId: "room-node-1",
      externalDestBuildingCode: "CJ",
    };
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };
    mockRouteNavigationState = {
      ...mockRouteNavigationState,
      isNavigating: false,
    };

    const { rerender, getByTestId, queryByText } = render(<CampusMap />);

    expect(queryByText("Confirm that you got to the building")).toBeNull();

    mockRouteNavigationState.isNavigating = true;
    rerender(<CampusMap />);

    await waitFor(() => {
      expect(queryByText("Confirm that you got to the building")).toBeTruthy();
    });

    fireEvent.press(getByTestId("confirmArrivedAtDestinationBuildingButton"));

    expect(mockExpoRouterObj.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/(tabs)/indoorscreen",
        params: expect.objectContaining({
          buildingCode: "CJ",
          destinationNodeId: "room-node-1",
        }),
      }),
    );
  });

  it("invokes BuildingPopup onSheetChange", async () => {
    const { getByTestId } = render(<CampusMap />);

    fireEvent.changeText(getByTestId("searchInput"), "cj");
    fireEvent.press(getByTestId("suggestion-LOY-CJ"));
    fireEvent.press(getByTestId("building-popup-sheet-change"));

    expect(getByTestId("building-popup")).toBeTruthy();
  });

  it("clears selected building when search text changes", async () => {
    const { getByTestId, queryByTestId } = render(<CampusMap />);

    fireEvent.changeText(getByTestId("searchInput"), "cj");
    fireEvent.press(getByTestId("suggestion-LOY-CJ"));
    expect(getByTestId("building-popup")).toBeTruthy();

    fireEvent.changeText(getByTestId("searchInput"), "cjx");
    expect(queryByTestId("building-popup")).toBeNull();
  });

  it("MapView onPress clears browse selection", async () => {
    const { getByTestId, queryByTestId } = render(<CampusMap />);

    fireEvent.changeText(getByTestId("searchInput"), "cj");
    fireEvent.press(getByTestId("suggestion-LOY-CJ"));
    expect(getByTestId("building-popup")).toBeTruthy();

    fireEvent.press(getByTestId("mapView"));

    expect(queryByTestId("building-popup")).toBeNull();
  });

  it("MapView onRegionChangeComplete ignores null coords and updates region", () => {
    const { getByTestId } = render(<CampusMap />);
    const map = getByTestId("mapView");

    map.props.onRegionChangeComplete?.({
      latitude: null,
      longitude: -73,
    });
    map.props.onRegionChangeComplete?.({
      latitude: 45.5,
      longitude: -73.6,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
    map.props.onRegionChangeComplete?.({
      latitude: 45.5,
      longitude: -73.6,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  });

  it("MapView onPanDrag stops following user while navigating", () => {
    mockRouteNavigationState = {
      ...mockRouteNavigationState,
      isNavigating: true,
    };

    const { getByTestId } = render(<CampusMap />);
    getByTestId("mapView").props.onPanDrag?.();
  });

  it("uses PROVIDER_GOOGLE on Android", () => {
    const originalOs = Platform.OS;
    try {
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: "android",
      });
      const { getByTestId } = render(<CampusMap />);
      expect(getByTestId("mapView").props.provider).toBe("google");
    } finally {
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: originalOs,
      });
    }
  });

  it("pressing route polylines calls applySelection", async () => {
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };
    mockFetchDirections.mockResolvedValue([
      {
        summary: "Drive",
        polyline: "ab",
        durationSec: 600,
        durationText: "10 min",
        distanceMeters: 2000,
        distanceText: "2 km",
      },
    ]);
    mockPickFastestRoute.mockImplementation(
      (...args: any[]) => args[0]?.[0] ?? null,
    );

    const { getByTestId } = render(<CampusMap />);

    await waitFor(() => {
      expect(getByTestId("route-polylines")).toBeTruthy();
    });

    fireEvent.press(getByTestId("route-polylines"));
  });

  it("entering route mode with indoor start sets route start from handoff building", () => {
    mockLocalSearchParams = { indoorStartBuildingCode: "CJ" };

    const { getByTestId } = render(<CampusMap />);

    fireEvent.press(getByTestId("route-planner"));

    expect(mockSetRouteStart).toHaveBeenCalledWith(deepLinkBuilding);
  });

  it("entering route mode with indoor start uses indoorStartLabel in start text", () => {
    mockLocalSearchParams = {
      indoorStartBuildingCode: "CJ",
      indoorStartLabel: "Room 101",
    };

    const { getByTestId } = render(<CampusMap />);

    fireEvent.press(getByTestId("route-planner"));

    expect(mockSetRouteStart).toHaveBeenCalledWith(deepLinkBuilding);
  });

  it("route text changes clear pinned start or destination", () => {
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };

    const { getByTestId } = render(<CampusMap />);

    fireEvent.press(getByTestId("mock-route-change-start"));
    expect(mockSetRouteStart).toHaveBeenCalledWith(null);

    fireEvent.press(getByTestId("mock-route-change-dest"));
    expect(mockSetRouteDest).toHaveBeenCalledWith(null);
  });

  it("route swap uses destText for setQuery when activeField is start", () => {
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      activeField: "start",
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };

    const { getByTestId } = render(<CampusMap />);
    fireEvent.press(getByTestId("mock-route-swap"));
  });

  it("route swap uses startText for setQuery when activeField is destination", () => {
    mockNavState = {
      ...mockNavState,
      isRouteMode: true,
      activeField: "destination",
      routeStart: {
        id: "H",
        code: "H",
        name: "Hall",
        address: "",
        latitude: 45.497,
        longitude: -73.579,
        campus: "SGW",
      },
      routeDest: deepLinkBuilding,
    };

    const { getByTestId } = render(<CampusMap />);
    fireEvent.press(getByTestId("mock-route-swap"));
  });
});
