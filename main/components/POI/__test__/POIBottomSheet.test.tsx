import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import POIBottomSheet from "../POIBottomSheet";
import type { POI } from "../types";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    top: 20,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock("@/hooks/useCampusTheme", () => ({
  useCampusTheme: () => ({
    brand: "#7C3AED",
    border: "#D1D5DB",
    closeBg: "#F3F4F6",
  }),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const RN = require("react-native");

  const MockBottomSheet = React.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        handleComponent?: React.ComponentType<any>;
      },
      ref: React.Ref<any>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        snapToIndex: jest.fn(),
        close: jest.fn(),
      }));

      const Handle = props.handleComponent;

      return (
        <RN.View testID="mock-bottom-sheet">
          {Handle ? <Handle /> : null}
          {props.children}
        </RN.View>
      );
    },
  );

  MockBottomSheet.displayName = "MockBottomSheet";

  const BottomSheetView = ({ children }: { children?: React.ReactNode }) => (
    <RN.View>{children}</RN.View>
  );

  const BottomSheetFlatList = (props: any) => (
    <RN.FlatList
      testID="mock-bottom-sheet-flatlist"
      data={props.data}
      renderItem={props.renderItem}
      keyExtractor={props.keyExtractor}
      contentContainerStyle={props.contentContainerStyle}
      showsVerticalScrollIndicator={props.showsVerticalScrollIndicator}
      ItemSeparatorComponent={props.ItemSeparatorComponent}
      ListHeaderComponent={props.ListHeaderComponent}
    />
  );

  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetView,
    BottomSheetFlatList,
  };
});

describe("POIBottomSheet", () => {
  const mockOnSelectPOI = jest.fn();
  const mockOnGetDirections = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnSheetChange = jest.fn();
  const mockOnRadiusChange = jest.fn();

  const mockPOI: POI = {
    id: "1",
    name: "Test Cafe",
    category: "cafe",
    latitude: 45.497,
    longitude: -73.579,
    address: "123 Test St",
    distance: 120,
  };

  const baseProps = {
    pois: [] as POI[],
    status: "idle" as const,
    activeCategory: "cafe" as const,
    selectedPOI: null,
    campusTheme: "SGW" as const,
    radius: 300,
    onRadiusChange: mockOnRadiusChange,
    onSelectPOI: mockOnSelectPOI,
    onGetDirections: mockOnGetDirections,
    onClose: mockOnClose,
    onSheetChange: mockOnSheetChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the active category title", () => {
    const { getByText } = render(<POIBottomSheet {...baseProps} />);
    expect(getByText("Coffee")).toBeTruthy();
  });

  it("shows loading state", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="loading" />,
    );

    expect(getByText("Searching nearby places…")).toBeTruthy();
  });

  it("shows error state", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="error" />,
    );

    expect(getByText("Something went wrong")).toBeTruthy();
    expect(getByText(/Could not fetch nearby places/i)).toBeTruthy();
  });

  it("shows no results state", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="no_results" />,
    );

    expect(getByText("No results found")).toBeTruthy();
  });

  it("renders a POI row", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    expect(getByText("Test Cafe")).toBeTruthy();
    expect(getByText("123 Test St")).toBeTruthy();
    expect(getByText("120 m")).toBeTruthy();
  });

  it("calls onSelectPOI when a row is pressed", () => {
    const { getByTestId } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    fireEvent.press(getByTestId("poi-row-1"));
    expect(mockOnSelectPOI).toHaveBeenCalledWith(mockPOI);
  });

  it("calls onGetDirections when directions button is pressed", () => {
    const { getByTestId } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    fireEvent.press(getByTestId("poi-directions-1"));
    expect(mockOnGetDirections).toHaveBeenCalledWith(mockPOI);
  });

  it("calls onClose when close button is pressed", () => {
    const { getByTestId } = render(<POIBottomSheet {...baseProps} />);

    fireEvent.press(getByTestId("poi-sheet-close"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows the selected radius in the header", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    expect(getByText("300 m")).toBeTruthy();
  });

  it("opens the radius menu when the filter button is pressed", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    fireEvent.press(getByText("300 m"));

    expect(getByText("100 m")).toBeTruthy();
    expect(getByText("200 m")).toBeTruthy();
    expect(getByText("500 m")).toBeTruthy();
    expect(getByText("800 m")).toBeTruthy();
    expect(getByText("1.0 km")).toBeTruthy();
  });

  it("calls onRadiusChange when a radius option is selected", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    fireEvent.press(getByText("300 m"));
    fireEvent.press(getByText("500 m"));

    expect(mockOnRadiusChange).toHaveBeenCalledWith(500);
  });

  it("closes the radius menu when a POI row is pressed", () => {
    const { getByText, getByTestId, queryByText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    fireEvent.press(getByText("300 m"));
    expect(getByText("500 m")).toBeTruthy();

    fireEvent.press(getByTestId("poi-row-1"));

    expect(mockOnSelectPOI).toHaveBeenCalledWith(mockPOI);
    expect(queryByText("500 m")).toBeNull();
  });
});
