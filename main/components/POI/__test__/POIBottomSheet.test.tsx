import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import POIBottomSheet from "../POIBottomSheet";
import type { POI } from "../types";

const mockSnapToIndex = jest.fn();
const mockCloseSheet = jest.fn();

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
    activeColor: "#7C3AED",
  }),
}));

jest.mock("react-native-gesture-handler", () => ({
  GestureDetector: ({ children }: { children?: React.ReactNode }) => children,
  Gesture: {
    Pinch: () => ({
      onUpdate() {
        return this;
      },
      onEnd() {
        return this;
      },
    }),
  },
}));

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: {
      Image: React.forwardRef((props: any, ref: any) => {
        const RN = require("react-native");
        return <RN.Image ref={ref} {...props} />;
      }),
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => any) => fn(),
  };
});

jest.mock("@react-native-community/slider", () => {
  const React = require("react");
  const RN = require("react-native");

  return function MockSlider(props: any) {
    return (
      <RN.View>
        <RN.Text testID="mock-slider-value">{String(props.value)}</RN.Text>
        <RN.Pressable
          testID="mock-slider"
          onPress={() => props.onSlidingComplete?.(500)}
        >
          <RN.Text>Mock Slider</RN.Text>
        </RN.Pressable>
      </RN.View>
    );
  };
});

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const RN = require("react-native");

  const MockBottomSheet = React.forwardRef(
    (props: any, ref: React.Ref<any>) => {
      React.useImperativeHandle(ref, () => ({
        snapToIndex: mockSnapToIndex,
        close: mockCloseSheet,
      }));

      const Handle = props.handleComponent;

      return (
        <RN.View testID="mock-bottom-sheet">
          {Handle ? <Handle /> : null}

          <RN.Pressable
            testID="mock-sheet-trigger-close"
            onPress={() => props.onClose?.()}
          >
            <RN.Text>Trigger Close</RN.Text>
          </RN.Pressable>

          <RN.Pressable
            testID="mock-sheet-change-1"
            onPress={() => props.onChange?.(1)}
          >
            <RN.Text>Trigger Change 1</RN.Text>
          </RN.Pressable>

          <RN.Pressable
            testID="mock-sheet-change-minus-1"
            onPress={() => props.onChange?.(-1)}
          >
            <RN.Text>Trigger Change -1</RN.Text>
          </RN.Pressable>

          {props.children}
        </RN.View>
      );
    },
  );

  MockBottomSheet.displayName = "MockBottomSheet";

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

  const mockPOIWithPhoto: POI = {
    ...mockPOI,
    id: "2",
    name: "Photo Cafe",
    photoReference: "photo-ref-123",
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

  it("renders fallback title when no active category exists", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} activeCategory={null} />,
    );

    expect(getByText("Nearby Places")).toBeTruthy();
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

  it("shows no results state with category label", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="no_results" />,
    );

    expect(getByText("No results found")).toBeTruthy();
    expect(getByText(/No coffee found near this campus/i)).toBeTruthy();
  });

  it("shows no results state with generic places label when category is null", () => {
    const { getByText } = render(
      <POIBottomSheet
        {...baseProps}
        status="no_results"
        activeCategory={null}
      />,
    );

    expect(getByText(/No places found near this campus/i)).toBeTruthy();
  });

  it("renders a POI row", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    expect(getByText("Test Cafe")).toBeTruthy();
    expect(getByText("123 Test St")).toBeTruthy();
    expect(getByText("120 m")).toBeTruthy();
  });

  it("renders km distance formatting", () => {
    const poiKm: POI = {
      ...mockPOI,
      id: "3",
      distance: 1500,
    };

    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[poiKm]} />,
    );

    expect(getByText("1.5 km")).toBeTruthy();
  });

  it("renders generic accessibility label when distance is missing", () => {
    const poiNoDistance: POI = {
      ...mockPOI,
      id: "4",
      distance: undefined,
    };

    const { getByLabelText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[poiNoDistance]} />,
    );

    expect(getByLabelText("Test Cafe, 0 m away")).toBeTruthy();
  });

  it("does not render address when it is missing", () => {
    const poiNoAddress: POI = {
      ...mockPOI,
      id: "5",
      address: undefined,
    };

    const { queryByText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[poiNoAddress]} />,
    );

    expect(queryByText("123 Test St")).toBeNull();
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

  it("calls onClose when bottom sheet onClose fires", () => {
    const { getByTestId } = render(<POIBottomSheet {...baseProps} />);

    fireEvent.press(getByTestId("mock-sheet-trigger-close"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onSheetChange with positive index", () => {
    const { getByTestId } = render(<POIBottomSheet {...baseProps} />);

    fireEvent.press(getByTestId("mock-sheet-change-1"));
    expect(mockOnSheetChange).toHaveBeenCalledWith(1);
  });

  it("calls onSheetChange with -1", () => {
    const { getByTestId } = render(<POIBottomSheet {...baseProps} />);

    fireEvent.press(getByTestId("mock-sheet-change-minus-1"));
    expect(mockOnSheetChange).toHaveBeenCalledWith(-1);
  });

  it("shows the selected radius in the header", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    expect(getByText("300 m")).toBeTruthy();
  });

  it("shows km radius formatting", () => {
    const { getByText } = render(
      <POIBottomSheet
        {...baseProps}
        status="success"
        pois={[mockPOI]}
        radius={1000}
      />,
    );

    expect(getByText("1.0 km")).toBeTruthy();
  });

  it("shows the clearer radius hint text", () => {
    const { getByText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    expect(
      getByText("Filter places by distance from the selected campus"),
    ).toBeTruthy();
  });

  it("renders the slider with the current radius value", () => {
    const { getByTestId } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    expect(getByTestId("mock-slider-value").props.children).toBe("300");
  });

  it("calls onRadiusChange when the slider changes", () => {
    const { getByTestId } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    fireEvent.press(getByTestId("mock-slider"));
    expect(mockOnRadiusChange).toHaveBeenCalledWith(500);
  });

  it("renders slider labels", () => {
    const { getByText, getAllByText } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    expect(getByText("0")).toBeTruthy();
    expect(getByText("100")).toBeTruthy();
    expect(getAllByText("300").length).toBeGreaterThan(0);
    expect(getByText("1k")).toBeTruthy();
  });

  it("opens image viewer when a POI image is pressed", () => {
    const { getByTestId, getByLabelText } = render(
      <POIBottomSheet
        {...baseProps}
        status="success"
        pois={[mockPOIWithPhoto]}
      />,
    );

    fireEvent.press(getByTestId("poi-image-2"));

    expect(getByLabelText("Close image overlay")).toBeTruthy();
  });

  it("closes image viewer when overlay is pressed", () => {
    const { getByTestId, getByLabelText, queryByLabelText } = render(
      <POIBottomSheet
        {...baseProps}
        status="success"
        pois={[mockPOIWithPhoto]}
      />,
    );

    fireEvent.press(getByTestId("poi-image-2"));
    fireEvent.press(getByLabelText("Close image overlay"));

    expect(queryByLabelText("Close image overlay")).toBeNull();
  });

  it("does not render image press target when there is no photo", () => {
    const { queryByTestId } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    expect(queryByTestId("poi-image-1")).toBeNull();
  });

  it("renders fallback content when success has empty POIs", () => {
    const { getByTestId } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[]} />,
    );

    expect(getByTestId("mock-bottom-sheet-flatlist")).toBeTruthy();
  });

  it("exposes expand and close through ref", () => {
    const ref = React.createRef<{ expand: () => void; close: () => void }>();

    render(<POIBottomSheet {...baseProps} ref={ref} />);

    ref.current?.expand();
    expect(mockSnapToIndex).toHaveBeenCalledWith(0);

    ref.current?.close();
    expect(mockCloseSheet).toHaveBeenCalled();
  });

  it("closes the sheet when status becomes idle", () => {
    const { rerender } = render(
      <POIBottomSheet {...baseProps} status="success" pois={[mockPOI]} />,
    );

    rerender(<POIBottomSheet {...baseProps} status="idle" pois={[mockPOI]} />);

    expect(mockCloseSheet).toHaveBeenCalled();
  });

  it("reopens the sheet when status changes from idle to loading", () => {
    const { rerender } = render(
      <POIBottomSheet {...baseProps} status="idle" />,
    );

    rerender(<POIBottomSheet {...baseProps} status="loading" />);

    expect(mockSnapToIndex).toHaveBeenCalledWith(0);
  });

  it("opens handle tap area to expanded index", () => {
    const { getByTestId } = render(<POIBottomSheet {...baseProps} />);

    fireEvent.press(getByTestId("poiSheet-handle"));
    expect(mockSnapToIndex).toHaveBeenCalledWith(1);
  });
});
