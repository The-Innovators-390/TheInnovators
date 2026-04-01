import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import { NavigationOverlay } from "@/components/campus/NavigationOverlay";
import type { DirectionStep } from "@/components/campus/helper_methods/googleDirections";

jest.mock("@/components/ui/TopDirectionsCard", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    TopDirectionsCard: ({ visible, distanceText, streetText, onPress }: any) =>
      visible
        ? React.createElement(
            Text,
            { testID: "top-card", onPress },
            `${distanceText} | ${streetText}`,
          )
        : null,
  };
});

jest.mock("@/components/ui/StepsDropdown", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    StepsDropdown: ({ visible, steps, activeIndex, onClose }: any) =>
      visible
        ? React.createElement(
            Text,
            { testID: "steps-dd", onPress: onClose },
            `steps:${steps.length} idx:${activeIndex}`,
          )
        : null,
  };
});

jest.mock("@/components/ui/BottomNavigationBar", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    BottomNavigationBar: ({
      visible,
      arrivalTimeText,
      durationMinText,
      distanceKmText,
      onExit,
    }: any) =>
      visible
        ? React.createElement(
            Text,
            { testID: "bottom-bar", onPress: onExit },
            `${arrivalTimeText} | ${durationMinText} | ${distanceKmText}`,
          )
        : null,
  };
});

function step(i: number): DirectionStep {
  return {
    instruction: `Step ${i}`,
    distanceText: `${i}m`,
    durationText: `${i} min`,
    start: { latitude: 45, longitude: -73 },
    end: { latitude: 45.0001 + i * 0.0001, longitude: -73.0001 - i * 0.0001 },
  };
}

describe("NavigationOverlay", () => {
  it("renders nothing when not navigating", () => {
    const { queryByTestId } = render(
      <NavigationOverlay
        isNavigating={false}
        isArrived={false}
        stepsOpen={false}
        onToggleSteps={jest.fn()}
        onCloseSteps={jest.fn()}
        activeSteps={[step(1), step(2)]}
        activeStepIndex={0}
        currentStepDistanceText="10m"
        currentStepInstructionText="Turn right"
        bottomOffset={40}
        arrivalTimeText="10:10"
        durationMinText="5"
        distanceKmText="0.3"
        onExit={jest.fn()}
      />,
    );

    expect(queryByTestId("top-card")).toBeNull();
    expect(queryByTestId("steps-dd")).toBeNull();
    expect(queryByTestId("bottom-bar")).toBeNull();
  });

  it("shows bottom bar when navigating and not arrived (including before route start)", () => {
    const { getByTestId } = render(
      <NavigationOverlay
        isNavigating={true}
        isArrived={false}
        stepsOpen={false}
        onToggleSteps={jest.fn()}
        onCloseSteps={jest.fn()}
        activeSteps={[step(1), step(2)]}
        activeStepIndex={0}
        currentStepDistanceText="10m"
        currentStepInstructionText="Turn right"
        bottomOffset={40}
        arrivalTimeText="10:10"
        durationMinText="5"
        distanceKmText="0.3"
        onExit={jest.fn()}
      />,
    );

    expect(getByTestId("top-card")).toBeTruthy();
    expect(getByTestId("bottom-bar")).toBeTruthy();
  });

  it("shows arrived state in top card when arrived", () => {
    const { getByTestId, queryByTestId } = render(
      <NavigationOverlay
        isNavigating={true}
        isArrived={true}
        stepsOpen={false}
        onToggleSteps={jest.fn()}
        onCloseSteps={jest.fn()}
        activeSteps={[step(1)]}
        activeStepIndex={0}
        currentStepDistanceText="10m"
        currentStepInstructionText="Turn right"
        bottomOffset={40}
        arrivalTimeText="10:10"
        durationMinText="5"
        distanceKmText="0.3"
        onExit={jest.fn()}
      />,
    );

    expect(getByTestId("top-card").props.children).toContain("Arrived");
    expect(queryByTestId("bottom-bar")).toBeNull();
  });

  it("toggles steps and calls exit handlers", () => {
    const onToggleSteps = jest.fn();
    const onCloseSteps = jest.fn();
    const onExit = jest.fn();

    const { getByTestId, rerender } = render(
      <NavigationOverlay
        isNavigating={true}
        isArrived={false}
        stepsOpen={false}
        onToggleSteps={onToggleSteps}
        onCloseSteps={onCloseSteps}
        activeSteps={[step(1), step(2)]}
        activeStepIndex={0}
        currentStepDistanceText="10m"
        currentStepInstructionText="Turn right"
        bottomOffset={40}
        arrivalTimeText="10:10"
        durationMinText="5"
        distanceKmText="0.3"
        onExit={onExit}
      />,
    );

    fireEvent.press(getByTestId("top-card"));
    expect(onToggleSteps).toHaveBeenCalledTimes(1);

    rerender(
      <NavigationOverlay
        isNavigating={true}
        isArrived={false}
        stepsOpen={true}
        onToggleSteps={onToggleSteps}
        onCloseSteps={onCloseSteps}
        activeSteps={[step(1), step(2)]}
        activeStepIndex={0}
        currentStepDistanceText="10m"
        currentStepInstructionText="Turn right"
        bottomOffset={40}
        arrivalTimeText="10:10"
        durationMinText="5"
        distanceKmText="0.3"
        onExit={onExit}
      />,
    );

    fireEvent.press(getByTestId("steps-dd"));
    expect(onCloseSteps).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId("bottom-bar"));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
