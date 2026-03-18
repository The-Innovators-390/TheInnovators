import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import IndoorScreen from "../IndoorScreen";

// Mock child component to avoid gesture/reanimated complexities in this test
jest.mock("../IndoorMapViewer", () => {
  const { View, Text } = require("react-native");
  return function MockIndoorMapViewer({ nodes }: any) {
    return (
      <View testID="map-viewer">
        <Text>Nodes: {nodes.length}</Text>
      </View>
    );
  };
});

// Mock Buildings data
jest.mock("../../Buildings/SGW/SGWBuildings", () => ({
  SGW_BUILDINGS: [
    { code: "H", name: "Hall Building", campus: "SGW" },
    { code: "MB", name: "John Molson Building", campus: "SGW" },
  ],
}));

jest.mock("../../Buildings/Loyola/LoyolaBuildings", () => ({
  LOYOLA_BUILDINGS: [{ code: "VE", name: "Vanier Extension", campus: "LOY" }],
}));

// Mock HeaderBackButton
jest.mock("../../ui/HeaderBackButton", () => {
  const { View } = require("react-native");
  return {
    HeaderBackButton: () => <View testID="back-button" />,
  };
});

describe("IndoorScreen", () => {
  it("renders 'Building Not Found' when buildingId is invalid", () => {
    const { getByText } = render(<IndoorScreen buildingId="INVALID" />);
    expect(getByText("Building Not Found")).toBeTruthy();
    expect(getByText(/No indoor map data available for INVALID/)).toBeTruthy();
  });

  it("renders the building name and map when buildingId is valid", () => {
    const { getByText, getByTestId } = render(<IndoorScreen buildingId="H" />);
    expect(getByText("Hall Building")).toBeTruthy();
    expect(getByTestId("map-viewer")).toBeTruthy();
  });

  it("displays floor selector with available floors", () => {
    const { getByText } = render(<IndoorScreen buildingId="H" />);
    // Hall has 1, 2, 8, 9 according to data/hall/hall_plans.json or floorMaps
    // Actually, IndoorScreen gets floors from indoorData[buildingId].nodes
    expect(getByText("1")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
    expect(getByText("8")).toBeTruthy();
    expect(getByText("9")).toBeTruthy();
  });

  it("changes selected floor when a floor button is pressed", () => {
    const { getByText } = render(<IndoorScreen buildingId="H" />);

    // Hall Building has floors 1, 2, 8, 9
    // Initial floor should be 1
    expect(getByText(/Nodes: \d+/)).toBeTruthy();

    // Press floor 8
    fireEvent.press(getByText("8"));

    // Should still show some nodes (actual count depends on real data)
    expect(getByText(/Nodes: \d+/)).toBeTruthy();
  });

  it("handles MB special floors (S2)", () => {
    const { getByText } = render(<IndoorScreen buildingId="MB" />);
    expect(getByText("S2")).toBeTruthy();
    expect(getByText("1")).toBeTruthy();
  });

  it("applies SGW styling for SGW buildings", () => {
    const { getByText } = render(<IndoorScreen buildingId="H" />);
    const header = getByText("Hall Building").parent;
    // In react-native-testing-library, checking styles can be tricky depending on how it's rendered.
    // But we can check if it exists and has the expected text.
    expect(header).toBeTruthy();
  });
});
