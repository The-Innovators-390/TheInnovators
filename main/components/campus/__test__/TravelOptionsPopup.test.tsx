import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import type {
  DirectionRoute,
  TravelMode,
} from "@/components/campus/helper_methods/googleDirections";
import { RouteStrategyFactory } from "@/components/campus/helper_methods/RouteStrategyFactory";

// Mock PNG requires used inside TravelOptionsPopup
jest.mock("../../../assets/icons/icon-subway.png", () => 1);
jest.mock("../../../assets/icons/icon-bus.png", () => 1);

// Optional: reduces noisy act warnings from icon internals in tests
jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock("@/components/campus/helper_methods/RouteStrategyFactory", () => ({
  RouteStrategyFactory: {
    create: jest.fn(),
  },
}));

const TravelOptionsPopup =
  require("@/components/campus/TravelOptionsPopup").default;

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

function makeRoute(
  durationText: string,
  distanceText: string,
  summary = "",
  durationSec = 60,
  distanceMeters = 100,
  polyline = "abc123",
  transitLines?: any[],
): DirectionRoute {
  return {
    summary,
    polyline,
    durationSec,
    durationText,
    distanceMeters,
    distanceText,
    transitLines,
  };
}

type ModeData = { mode: TravelMode; routes: DirectionRoute[] };

function buildModes(): ModeData[] {
  return [
    {
      mode: "driving",
      routes: [makeRoute("4 mins", "0.8 km", "Rue Mackay", 240)],
    },
    {
      mode: "transit",
      routes: [
        makeRoute(
          "5 mins",
          "1.0 km",
          "Transit route",
          300,
          1000,
          "poly-transit",
          [
            { name: "105", vehicleType: "BUS" },
            { name: "2", vehicleType: "SUBWAY" },
          ],
        ),
      ],
    },
    {
      mode: "walking",
      routes: [
        makeRoute("5 mins", "0.7 km", "Boulevard", 300),
        makeRoute("6 mins", "0.9 km", "Alternative walk", 360),
      ],
    },
    {
      mode: "bicycling",
      routes: [makeRoute("4 mins", "0.9 km", "Bike path", 240)],
    },
  ];
}

describe("TravelOptionsPopup", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (RouteStrategyFactory.create as jest.Mock).mockImplementation((mode) => ({
      getChips: (route: DirectionRoute) => {
        if (mode !== "transit") return [];

        const chips = [];
        for (const line of route.transitLines ?? []) {
          const vehicleType = line.vehicleType?.toLowerCase();
          if (vehicleType === "bus") {
            chips.push({ kind: "bus", label: line.name });
          } else if (vehicleType === "subway" || vehicleType === "metro") {
            chips.push({ kind: "metro", label: line.name, lineColor: "#000" });
          }
        }
        return chips;
      },
    }));
  });

  it("renders bus + metro chips when selectedMode is transit", () => {
    const { getByText } = render(
      <TravelOptionsPopup
        campusTheme="SGW"
        visible
        modes={buildModes()}
        selectedMode="transit"
        selectedRouteIndex={0}
        onSelectMode={jest.fn()}
        onSelectRouteIndex={jest.fn()}
        onClose={jest.fn()}
        onGo={jest.fn()}
      />,
    );

    getByText("105");
    getByText("2");
  });

  it("does not render when visible is false", () => {
    const { queryByTestId } = render(
      <TravelOptionsPopup
        campusTheme="SGW"
        visible={false}
        modes={buildModes()}
        selectedMode="walking"
        selectedRouteIndex={0}
        onSelectMode={jest.fn()}
        onSelectRouteIndex={jest.fn()}
        onClose={jest.fn()}
        onGo={jest.fn()}
      />,
    );

    expect(queryByTestId("mock-bottom-sheet")).toBeNull();
  });

  it("renders when visible is true", () => {
    const { getByTestId, getByText } = render(
      <TravelOptionsPopup
        campusTheme="SGW"
        visible
        modes={buildModes()}
        selectedMode="walking"
        selectedRouteIndex={0}
        onSelectMode={jest.fn()}
        onSelectRouteIndex={jest.fn()}
        onClose={jest.fn()}
        onGo={jest.fn()}
      />,
    );

    getByTestId("mock-bottom-sheet");
    getByText("Directions");
  });

  it("calls onSelectMode when a mode is pressed", () => {
    const onSelectMode = jest.fn();

    const { getByTestId } = render(
      <TravelOptionsPopup
        campusTheme="SGW"
        visible
        modes={buildModes()}
        selectedMode="walking"
        selectedRouteIndex={0}
        onSelectMode={onSelectMode}
        onSelectRouteIndex={jest.fn()}
        onClose={jest.fn()}
        onGo={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("mode-driving"));
    expect(onSelectMode).toHaveBeenCalledTimes(1);
    expect(onSelectMode).toHaveBeenCalledWith("driving");
  });

  it("calls onSelectRouteIndex when a route is pressed", () => {
    const onSelectRouteIndex = jest.fn();

    const { getByTestId } = render(
      <TravelOptionsPopup
        campusTheme="SGW"
        visible
        modes={buildModes()}
        selectedMode="walking"
        selectedRouteIndex={0}
        onSelectMode={jest.fn()}
        onSelectRouteIndex={onSelectRouteIndex}
        onClose={jest.fn()}
        onGo={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("route-walking-1"));
    expect(onSelectRouteIndex).toHaveBeenCalledTimes(1);
    expect(onSelectRouteIndex).toHaveBeenCalledWith(1);
  });

  it("pressing GO does not trigger route selection", () => {
    const onSelectRouteIndex = jest.fn();
    const onGo = jest.fn();

    const { getByTestId } = render(
      <TravelOptionsPopup
        campusTheme="SGW"
        visible
        modes={buildModes()}
        selectedMode="walking"
        selectedRouteIndex={0}
        onSelectMode={jest.fn()}
        onSelectRouteIndex={onSelectRouteIndex}
        onClose={jest.fn()}
        onGo={onGo}
      />,
    );

    fireEvent.press(getByTestId("go-walking-1"));

    expect(onSelectRouteIndex).not.toHaveBeenCalled();
    expect(onGo).toHaveBeenCalledTimes(1);
    expect(onGo).toHaveBeenCalledWith("walking", 1);
  });

  it("pressing close calls onClose", () => {
    const onClose = jest.fn();

    const { getByTestId } = render(
      <TravelOptionsPopup
        campusTheme="SGW"
        visible
        modes={buildModes()}
        selectedMode="walking"
        selectedRouteIndex={0}
        onSelectMode={jest.fn()}
        onSelectRouteIndex={jest.fn()}
        onClose={onClose}
        onGo={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("travelPopup-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});