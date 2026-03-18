import React from "react";
import { render } from "@testing-library/react-native";
import IndoorMapViewer from "../IndoorMapViewer";
import { View, Text } from "react-native";

// Mock dependencies
jest.mock("react-native-gesture-handler", () => {
  return {
    Gesture: {
      Pinch: () => ({
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      Pan: () => ({
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      Simultaneous: jest.fn(),
    },
    GestureDetector: ({ children }: any) => children,
    GestureHandlerRootView: ({ children }: any) => children,
  };
});

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (cb: any) => cb(),
  };
});

const MockSvg = (props: any) => (
  <View {...props} testID="mock-svg">
    <Text>SVG Content</Text>
  </View>
);

describe("IndoorMapViewer", () => {
  const mockNodes = [
    { id: "1", type: "room", buildingId: "H", floor: 1, x: 10, y: 10 },
  ];
  const mockEdges = [{ source: "1", target: "2", type: "path", weight: 1 }];

  it("renders the SVG component when provided", () => {
    const { getByTestId } = render(
      <IndoorMapViewer
        SvgComponent={MockSvg}
        nodes={mockNodes}
        edges={mockEdges}
      />,
    );
    expect(getByTestId("mock-svg")).toBeTruthy();
  });

  it("renders a placeholder when SvgComponent is missing", () => {
    const { getByText } = render(
      <IndoorMapViewer nodes={mockNodes} edges={mockEdges} />,
    );
    expect(getByText("SVG could not be loaded")).toBeTruthy();
  });

  it("renders a placeholder when SvgComponent is a number (invalid load)", () => {
    // Suppress console.warn for this test
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const { getByText } = render(
      <IndoorMapViewer
        SvgComponent={123 as any}
        nodes={mockNodes}
        edges={mockEdges}
      />,
    );
    expect(getByText("SVG could not be loaded")).toBeTruthy();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
