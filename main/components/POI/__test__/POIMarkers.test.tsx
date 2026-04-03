import React from "react";
import { Text } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import POIMarkers from "../POIMarkers";
import type { POI } from "@/components/POI/types";

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { Pressable } = require("react-native");

  return {
    Marker: ({ children, onPress, testID, ...props }: any) => (
      <Pressable testID={testID} onPress={onPress} {...props}>
        {children}
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

  it("renders one marker for each POI", () => {
    const { getByTestId } = render(
      <POIMarkers pois={mockPois} selectedPOI={null} onPress={mockOnPress} />,
    );

    expect(getByTestId("poi-marker-poi-1")).toBeTruthy();
    expect(getByTestId("poi-marker-poi-2")).toBeTruthy();
  });

  it("calls onPress with the correct POI when a marker is pressed", () => {
    const { getByTestId } = render(
      <POIMarkers pois={mockPois} selectedPOI={null} onPress={mockOnPress} />,
    );

    fireEvent.press(getByTestId("poi-marker-poi-1"));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockPois[0]);
  });

  it("passes the correct coordinates to each marker", () => {
    const { getByTestId } = render(
      <POIMarkers pois={mockPois} selectedPOI={null} onPress={mockOnPress} />,
    );

    expect(getByTestId("poi-marker-poi-1").props.coordinate).toEqual({
      latitude: 45.4971,
      longitude: -73.5788,
    });

    expect(getByTestId("poi-marker-poi-2").props.coordinate).toEqual({
      latitude: 45.4975,
      longitude: -73.5792,
    });
  });

  it("sets tracksViewChanges to false when the marker is not selected", () => {
    const { getByTestId } = render(
      <POIMarkers pois={mockPois} selectedPOI={null} onPress={mockOnPress} />,
    );

    expect(getByTestId("poi-marker-poi-1").props.tracksViewChanges).toBe(false);
    expect(getByTestId("poi-marker-poi-2").props.tracksViewChanges).toBe(false);
  });

  it("sets tracksViewChanges to true only for the selected marker", () => {
    const { getByTestId } = render(
      <POIMarkers
        pois={mockPois}
        selectedPOI={mockPois[1]}
        onPress={mockOnPress}
      />,
    );

    expect(getByTestId("poi-marker-poi-1").props.tracksViewChanges).toBe(false);
    expect(getByTestId("poi-marker-poi-2").props.tracksViewChanges).toBe(true);
  });

  it("renders category emoji for each POI", () => {
    const { getByText } = render(
      <POIMarkers pois={mockPois} selectedPOI={null} onPress={mockOnPress} />,
    );

    expect(getByText("🍴")).toBeTruthy();
    expect(getByText("🅿️")).toBeTruthy();
  });

  it("falls back to the default pin emoji when the category is unknown", () => {
    const unknownCategoryPoi = {
      id: "poi-3",
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

  it("uses the correct anchor for all markers", () => {
    const { getByTestId } = render(
      <POIMarkers pois={mockPois} selectedPOI={null} onPress={mockOnPress} />,
    );

    expect(getByTestId("poi-marker-poi-1").props.anchor).toEqual({
      x: 0.5,
      y: 1,
    });
  });
});
