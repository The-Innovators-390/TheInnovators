import React from "react";
import { render } from "@testing-library/react-native";
import IndoorMapViewer from "../IndoorMapViewer";

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");

  Reanimated.useSharedValue = (value: unknown) => ({ value });
  Reanimated.useAnimatedStyle = (updater: () => unknown) => updater();

  return Reanimated;
});

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
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

    const { Image } = require("react-native");

    expect(UNSAFE_getByType(Image)).toBeTruthy();
    expect(queryByText("Image could not be loaded")).toBeNull();
  });
});
