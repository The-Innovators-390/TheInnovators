import React from "react";
import { render } from "@testing-library/react-native";
import IndoorRoute from "../../app/indoor";
import { useLocalSearchParams } from "expo-router";

// Mock dependencies
jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  Stack: {
    Screen: jest.fn(() => null),
  },
}));

jest.mock("@/components/indoors/IndoorScreen", () => {
  const { View, Text } = require("react-native");
  return function MockIndoorScreen({ buildingId }: any) {
    return (
      <View testID="indoor-screen">
        <Text>Building: {buildingId}</Text>
      </View>
    );
  };
});

describe("IndoorRoute", () => {
  it("renders IndoorScreen with the building parameter", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ building: "MB" });

    const { getByTestId, getByText } = render(<IndoorRoute />);

    expect(getByTestId("indoor-screen")).toBeTruthy();
    expect(getByText("Building: MB")).toBeTruthy();
  });

  it("handles missing building parameter", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    const { getByText } = render(<IndoorRoute />);

    expect(getByText("Building: ")).toBeTruthy();
  });
});
