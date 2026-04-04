import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import POIMarkers from "../POIMarkers";
import type { POI } from "@/components/POI/types";

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");

  return {
    Marker: ({ children, onPress }: any) => (
      <Pressable onPress={onPress}>
        <View>{children}</View>
      </Pressable>
    ),
  };
});

describe("POIMarkers", () => {
  const mockOnPress = jest.fn();

  const mockPois: POI[] = [
    {
      id: "poi-1",
      name: "Restaurant One",
      category: "restaurant",
      latitude: 45.4971,
      longitude: -73.5788,
      address: "123 Test St",
    },
    {
      id: "poi-2",
      name: "Parking Lot A",
      category: "parking",
      latitude: 45.4975,
      longitude: -73.5792,
      address: "456 Test Ave",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders one marker icon for each POI", () => {
    const { getByText } = render(
      <POIMarkers pois={mockPois} selectedPOI={null} onPress={mockOnPress} />,
    );

    expect(getByText("🍽️")).toBeTruthy();
    expect(getByText("🅿️")).toBeTruthy();
  });

  it("calls onPress with the correct POI when a marker is pressed", () => {
    const { getByText } = render(
      <POIMarkers pois={mockPois} selectedPOI={null} onPress={mockOnPress} />,
    );

    fireEvent.press(getByText("🍽️"));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockPois[0]);
  });

  it("calls onPress with the parking POI when its marker is pressed", () => {
    const { getByText } = render(
      <POIMarkers pois={mockPois} selectedPOI={null} onPress={mockOnPress} />,
    );

    fireEvent.press(getByText("🅿️"));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockPois[1]);
  });

  it("renders cafe emoji correctly", () => {
    const cafePoi: POI = {
      id: "poi-3",
      name: "Cafe Test",
      category: "cafe",
      latitude: 45.49,
      longitude: -73.57,
      address: "789 Coffee St",
    };

    const { getByText } = render(
      <POIMarkers pois={[cafePoi]} selectedPOI={null} onPress={mockOnPress} />,
    );

    expect(getByText("☕")).toBeTruthy();
  });

  it("falls back to the default pin emoji when the category is unknown", () => {
    const unknownCategoryPoi = {
      id: "poi-4",
      name: "Unknown Place",
      category: "unknown-category",
      latitude: 45.498,
      longitude: -73.58,
      address: "789 Test Blvd",
    } as unknown as POI;

    const { getByText } = render(
      <POIMarkers
        pois={[unknownCategoryPoi]}
        selectedPOI={null}
        onPress={mockOnPress}
      />,
    );

    expect(getByText("📍")).toBeTruthy();
  });

  it("renders both markers even when one is selected", () => {
    const { getByText } = render(
      <POIMarkers
        pois={mockPois}
        selectedPOI={mockPois[1]}
        onPress={mockOnPress}
      />,
    );

    expect(getByText("🍽️")).toBeTruthy();
    expect(getByText("🅿️")).toBeTruthy();
  });

  it("renders correctly when no marker is selected", () => {
    const { getByText } = render(
      <POIMarkers pois={mockPois} selectedPOI={null} onPress={mockOnPress} />,
    );

    expect(getByText("🍽️")).toBeTruthy();
    expect(getByText("🅿️")).toBeTruthy();
  });
});
