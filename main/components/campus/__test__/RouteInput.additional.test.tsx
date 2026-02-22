/* eslint-disable import/first */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

jest.mock("@/components/Buildings/types", () => ({}));

import RouteInput from "@/components/campus/RouteInput";

describe("RouteInput – additional coverage", () => {
  const baseProps = {
    start: null,
    destination: null,
    activeField: "destination" as const,
    onFocusField: jest.fn(),
    onSwap: jest.fn(),
    startText: "",
    destText: "",
    onChangeStartText: jest.fn(),
    onChangeDestText: jest.fn(),
    disabled: false,
    onClearStart: jest.fn(),
    onClearDestination: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fires onFocusField('start') via TextInput onFocus", () => {
    const onFocusField = jest.fn();
    const { getByTestId } = render(
      <RouteInput {...baseProps} onFocusField={onFocusField} />,
    );

    fireEvent(getByTestId("routeStartInput"), "focus");
    expect(onFocusField).toHaveBeenCalledWith("start");
  });

  it("fires onFocusField('destination') via TextInput onFocus", () => {
    const onFocusField = jest.fn();
    const { getByTestId } = render(
      <RouteInput {...baseProps} onFocusField={onFocusField} />,
    );

    fireEvent(getByTestId("routeDestInput"), "focus");
    expect(onFocusField).toHaveBeenCalledWith("destination");
  });

  it("shows useMyLocation button when start is empty and onUseMyLocation is provided", () => {
    const { getByTestId } = render(
      <RouteInput {...baseProps} startText="" onUseMyLocation={jest.fn()} />,
    );

    getByTestId("useMyLocation");
  });

  it("does not show useMyLocation button when startText is non-empty", () => {
    const { queryByTestId } = render(
      <RouteInput
        {...baseProps}
        startText="some text"
        onUseMyLocation={jest.fn()}
      />,
    );

    expect(queryByTestId("useMyLocation")).toBeNull();
  });

  it("does not show useMyLocation button when onUseMyLocation is not provided", () => {
    const { queryByTestId } = render(
      <RouteInput {...baseProps} startText="" />,
    );

    expect(queryByTestId("useMyLocation")).toBeNull();
  });

  it("calls onUseMyLocation when useMyLocation button is pressed", () => {
    const onUseMyLocation = jest.fn();
    const { getByTestId } = render(
      <RouteInput
        {...baseProps}
        startText=""
        onUseMyLocation={onUseMyLocation}
      />,
    );

    fireEvent.press(getByTestId("useMyLocation"));
    expect(onUseMyLocation).toHaveBeenCalledTimes(1);
  });

  it("shows 'Your Location' label when start has id 'USER_LOCATION'", () => {
    const userLocationBuilding = {
      id: "USER_LOCATION",
      campus: "SGW",
      code: "YOU",
      name: "Current Location",
      address: "",
      latitude: 45.0,
      longitude: -73.0,
    } as any;

    const { getByTestId } = render(
      <RouteInput {...baseProps} start={userLocationBuilding} />,
    );

    expect(getByTestId("routeStartInput").props.value).toBe("Your Location");
  });
});
