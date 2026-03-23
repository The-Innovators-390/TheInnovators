/* eslint-disable import/first */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Image } from "react-native";
import { router } from "expo-router";

// ---- Mocks ----

const mockSnapToIndex = jest.fn();
const mockClose = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock("@/components/campus/BuildingPin", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return function MockBuildingPin(props: any) {
    return React.createElement(
      Text,
      { testID: "buildingPin" },
      `Pin-${props.code}-${props.campus}-${props.variant}`,
    );
  };
});

jest.mock("@/components/Buildings/details/buildingImages", () => ({
  BUILDING_IMAGES: {
    H: 123,
  },
}));

jest.mock("@/components/Buildings/details/buildingIcons", () => ({
  BUILDING_ICONS: {
    metro: 1,
    connectedBuildings: 2,
    entry: 3,
    wifi: 4,
    elevator: 5,
    ramp: 6,
    accessibility: 7,
    coffee: 8,
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 10, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const ReactActual = jest.requireActual("react");
  const RN = jest.requireActual("react-native");
  const { View: RNView, ScrollView } = RN;

  const BottomSheet = ReactActual.forwardRef((props: any, ref: any) => {
    ReactActual.useImperativeHandle(ref, () => ({
      snapToIndex: (i: number) => {
        mockSnapToIndex(i);
        props.onChange?.(i);
      },
      close: () => {
        mockClose();
        props.onClose?.();
      },
    }));

    const Handle = props.handleComponent ? props.handleComponent({}) : null;

    return ReactActual.createElement(
      RNView,
      { testID: "bottomSheet" },
      Handle,
      props.children,
    );
  });

  const BottomSheetScrollView = ({ children, ...rest }: any) =>
    ReactActual.createElement(
      ScrollView,
      { testID: "bottomSheetScrollView", ...rest },
      children,
    );

  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetScrollView,
  };
});

import BuildingPopup from "@/components/campus/BuildingPopup";

describe("BuildingPopup", () => {
  const baseBuilding = {
    id: "sgw-h",
    campus: "SGW",
    code: "H",
    name: "Henry F. Hall",
    address: "1455 De Maisonneuve",
    latitude: 45.1,
    longitude: -73.1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders fallback UI when details are missing and uses image thumbnail branch", () => {
    const { getByText, getByTestId, UNSAFE_queryAllByType } = render(
      <BuildingPopup
        building={{ ...baseBuilding, details: undefined } as any}
        campusTheme="SGW"
        onClose={jest.fn()}
        onGetDirections={jest.fn()}
      />,
    );

    expect(getByTestId("buildingPin")).toBeTruthy();
    getByText("Henry F. Hall");
    getByText("1455 De Maisonneuve");
    getByText("Details coming soon");
    getByText("We’ll add the expanded info for this building next.");

    const images = UNSAFE_queryAllByType(Image);
    expect(images.length).toBeGreaterThan(0);
  });

  it("renders placeholder branch when no building image exists", () => {
    const { getByText, UNSAFE_queryAllByType } = render(
      <BuildingPopup
        building={
          {
            ...baseBuilding,
            id: "sgw-x",
            code: "X",
            name: "Unknown Building",
            details: undefined,
          } as any
        }
        campusTheme="SGW"
        onClose={jest.fn()}
        onGetDirections={jest.fn()}
      />,
    );

    getByText("Unknown Building");
    getByText("Details coming soon");

    const images = UNSAFE_queryAllByType(Image);
    expect(images.length).toBe(0);
  });

  it("pressing handle expands sheet and triggers onSheetChange", () => {
    const onSheetChange = jest.fn();

    const { getByTestId } = render(
      <BuildingPopup
        building={{ ...baseBuilding, details: undefined } as any}
        campusTheme="SGW"
        onClose={jest.fn()}
        onSheetChange={onSheetChange}
        onGetDirections={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("buildingPopup-handle"));

    expect(mockSnapToIndex).toHaveBeenCalledWith(1);
    expect(onSheetChange).toHaveBeenCalledWith(1);
  });

  it("pressing close calls BottomSheet.close and onClose", () => {
    const onClose = jest.fn();

    const { getByTestId } = render(
      <BuildingPopup
        building={{ ...baseBuilding, details: undefined } as any}
        campusTheme="SGW"
        onClose={onClose}
        onGetDirections={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("buildingPopup-close"));

    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pressing Get Directions calls onGetDirections with building", () => {
    const onGetDirections = jest.fn();

    const { getByTestId } = render(
      <BuildingPopup
        building={{ ...baseBuilding, details: undefined } as any}
        campusTheme="SGW"
        onClose={jest.fn()}
        onGetDirections={onGetDirections}
      />,
    );

    fireEvent.press(getByTestId("directionsButton"));

    expect(onGetDirections).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sgw-h",
        code: "H",
        campus: "SGW",
      }),
    );
  });

  it("pressing Indoor Map navigates to the indoor screen with building code", () => {
    const { getByTestId } = render(
      <BuildingPopup
        building={{ ...baseBuilding, details: undefined } as any}
        campusTheme="SGW"
        onClose={jest.fn()}
        onGetDirections={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("indoorMapButton"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/indoor",
      params: { building: "H" },
    });
  });

  it("renders accessibility empty branch and keeps Metro/Connectivity cards when provided as empty objects", () => {
    const buildingWithDetails = {
      ...baseBuilding,
      id: "sgw-h-empty-details",
      details: {
        accessibility: [],
        metro: {},
        connectivity: {},
        entries: [],
        otherServices: [],
        overview: ["Paragraph 1"],
        venues: ["Cafeteria"],
        departments: ["Engineering"],
        services: ["Information desk"],
      },
    };

    const { getByText, queryByText } = render(
      <BuildingPopup
        building={buildingWithDetails as any}
        campusTheme="LOY"
        onClose={jest.fn()}
        onGetDirections={jest.fn()}
      />,
    );

    getByText("Building Accessibility");
    getByText(
      "This building is not accessible. It is not equipped with an accessibility ramp, automated door, elevator or wheelchair lift.",
    );

    getByText("Metro Accessibility");
    getByText("Building Connectivity");

    expect(queryByText("Number of Entries")).toBeNull();
    expect(queryByText("Other services")).toBeNull();

    getByText("Building Overview");
    getByText("Paragraph 1");

    getByText("Venues");
    getByText("Cafeteria");

    getByText("Departments");
    getByText("Engineering");

    getByText("Services");
    getByText("Information desk");
  });

  it("renders accessibility items branch including description and no-description variants", () => {
    const buildingWithAccessibility = {
      ...baseBuilding,
      id: "sgw-h-accessibility",
      details: {
        accessibility: [
          { icon: "elevator", title: "Elevator", description: "" },
          { icon: "wifi", title: "Wi-Fi", description: "Available" },
        ],
      },
    };

    const { getByText, queryByText } = render(
      <BuildingPopup
        building={buildingWithAccessibility as any}
        campusTheme="SGW"
        onClose={jest.fn()}
        onGetDirections={jest.fn()}
      />,
    );

    getByText("Building Accessibility");
    getByText("Elevator");
    getByText("Wi-Fi");
    getByText("Available");

    expect(
      queryByText(
        "This building is not accessible. It is not equipped with an accessibility ramp, automated door, elevator or wheelchair lift.",
      ),
    ).toBeNull();
  });

  it("renders metro, connectivity, entries, other services, overview, venues, departments, and services when populated", () => {
    const buildingWithFullDetails = {
      ...baseBuilding,
      id: "sgw-h-full-details",
      details: {
        accessibility: [
          {
            icon: "ramp",
            title: "Ramp",
            description: "Ramp at main entrance",
          },
        ],
        metro: {
          title: "Guy-Concordia",
          description: "Connected by metro",
        },
        connectivity: {
          title: "Connected Buildings",
          description: "Linked to EV and LB",
        },
        entries: [
          { title: "Main entrance", description: "Front door" },
          { title: "Side entrance", description: "South side" },
        ],
        otherServices: [
          { icon: "coffee", title: "Coffee shop", description: "Level 1" },
        ],
        overview: ["Paragraph 1", "Paragraph 2"],
        venues: ["Auditorium"],
        departments: ["Computer Science"],
        services: ["Help desk"],
      },
    };

    const { getByText, queryAllByText } = render(
      <BuildingPopup
        building={buildingWithFullDetails as any}
        campusTheme="SGW"
        onClose={jest.fn()}
        onGetDirections={jest.fn()}
      />,
    );

    getByText("Building Accessibility");
    getByText("Ramp");
    getByText("Ramp at main entrance");

    getByText("Metro Accessibility");
    getByText("Guy-Concordia");
    getByText("Connected by metro");

    getByText("Building Connectivity");
    getByText("Connected Buildings");
    getByText("Linked to EV and LB");

    getByText("Number of Entries");
    getByText("Main entrance");
    getByText("Front door");
    getByText("Side entrance");
    getByText("South side");

    getByText("Other services");
    getByText("Coffee shop");
    getByText("Level 1");

    getByText("Building Overview");
    getByText("Paragraph 1");
    getByText("Paragraph 2");

    getByText("Venues");
    getByText("Auditorium");

    getByText("Departments");
    getByText("Computer Science");

    getByText("Services");
    getByText("Help desk");

    expect(queryAllByText(/Paragraph/)).toHaveLength(2);
  });

  it("calls snapToIndex(0) on mount and when building id changes", () => {
    const { rerender } = render(
      <BuildingPopup
        building={{ ...baseBuilding, id: "b1", details: undefined } as any}
        campusTheme="SGW"
        onClose={jest.fn()}
        onGetDirections={jest.fn()}
      />,
    );

    expect(mockSnapToIndex).toHaveBeenCalledWith(0);

    rerender(
      <BuildingPopup
        building={{ ...baseBuilding, id: "b2", details: undefined } as any}
        campusTheme="SGW"
        onClose={jest.fn()}
        onGetDirections={jest.fn()}
      />,
    );

    expect(mockSnapToIndex).toHaveBeenCalledWith(0);
    expect(mockSnapToIndex).toHaveBeenCalledTimes(2);
  });

  it("renders Loyola theme variant without crashing", () => {
    const { getByText } = render(
      <BuildingPopup
        building={
          {
            ...baseBuilding,
            id: "loy-h",
            campus: "LOY",
            details: undefined,
          } as any
        }
        campusTheme="LOY"
        onClose={jest.fn()}
        onGetDirections={jest.fn()}
      />,
    );

    getByText("Henry F. Hall");
    getByText("Indoor Map");
    getByText("Get Directions");
  });

  it("renders close button accessibility props", () => {
    const { getByTestId } = render(
      <BuildingPopup
        building={{ ...baseBuilding, details: undefined } as any}
        campusTheme="SGW"
        onClose={jest.fn()}
        onGetDirections={jest.fn()}
      />,
    );

    const closeButton = getByTestId("buildingPopup-close");

    expect(closeButton.props.accessibilityRole).toBe("button");
    expect(closeButton.props.accessibilityLabel).toBe("Close building popup");
  });

  it("renders the scroll view and drag handle", () => {
    const { getByTestId } = render(
      <BuildingPopup
        building={{ ...baseBuilding, details: undefined } as any}
        campusTheme="SGW"
        onClose={jest.fn()}
        onGetDirections={jest.fn()}
      />,
    );

    expect(getByTestId("bottomSheet")).toBeTruthy();
    expect(getByTestId("bottomSheetScrollView")).toBeTruthy();
    expect(getByTestId("buildingPopup-handle")).toBeTruthy();
  });
});
