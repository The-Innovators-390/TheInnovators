import React from "react";
import { render } from "@testing-library/react-native";
import { Image } from "react-native";
import IndoorMapViewer from "../IndoorMapViewer";

// Mock Reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.useSharedValue = (value: unknown) => ({ value });
  Reanimated.useAnimatedStyle = (updater: () => unknown) => updater();
  return Reanimated;
});

// Mock Gesture Handler
jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");

  type MockGestureChain = {
    onUpdate: jest.Mock;
    onEnd: jest.Mock;
    numberOfTaps: jest.Mock;
  };

  const createGesture = (): MockGestureChain => {
    const chain = {} as MockGestureChain;
    chain.onUpdate = jest.fn(() => chain);
    chain.onEnd = jest.fn(() => chain);
    chain.numberOfTaps = jest.fn(() => chain);
    return chain;
  };

  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    GestureDetector: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    Gesture: {
      Pinch: jest.fn(() => createGesture()),
      Pan: jest.fn(() => createGesture()),
      Tap: jest.fn(() => createGesture()),
      Simultaneous: jest.fn((...gestures) => gestures),
    },
  };
});

describe("IndoorMapViewer", () => {
  const nodes = [
    {
      id: "n1",
      type: "room",
      buildingId: "H",
      floor: 1,
      x: 100,
      y: 100,
    },
  ];

  const edges = [
    {
      source: "n1",
      target: "n1",
      type: "path",
      weight: 1,
    },
  ];

  beforeAll(() => {
    // Mock Image.resolveAssetSource to return a mock URI
    jest.spyOn(Image, "resolveAssetSource").mockReturnValue({
      uri: "mock-image-uri",
      width: 800,
      height: 600,
    } as any);

    // Mock Image.getSize to execute the success callback with dimensions
    jest.spyOn(Image, "getSize").mockImplementation((uri, success) => {
      if (success) {
        success(800, 600);
      }
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("renders placeholder when imageSource is missing", () => {
    const { getByText } = render(
      <IndoorMapViewer nodes={nodes} edges={edges} />,
    );

    expect(getByText("Image could not be loaded")).toBeTruthy();
  });

  it("renders image when imageSource is provided", () => {
    const { UNSAFE_getByType, queryByText } = render(
      <IndoorMapViewer imageSource={1} nodes={nodes} edges={edges} />,
    );

    const { Image: RNImage } = require("react-native");

    expect(UNSAFE_getByType(RNImage)).toBeTruthy();
    expect(queryByText("Image could not be loaded")).toBeNull();
  });
});
