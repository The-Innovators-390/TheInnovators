import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorRouteInput from "../IndoorRouteInput";

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

describe("IndoorRouteInput", () => {
  const baseProps = {
    start: null,
    destination: null,
    activeField: "start" as const,
    onFocusField: jest.fn(),
    onSwap: jest.fn(),
    startText: "",
    destText: "",
    onChangeStartText: jest.fn(),
    onChangeDestText: jest.fn(),
    onClearStart: jest.fn(),
    onClearDestination: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders typed values and handlers work", () => {
    const { getByTestId } = render(<IndoorRouteInput {...baseProps} />);

    fireEvent.changeText(getByTestId("indoorRouteStartInput"), "H-110");
    fireEvent.changeText(getByTestId("indoorRouteDestInput"), "H-920");

    expect(baseProps.onChangeStartText).toHaveBeenCalledWith("H-110");
    expect(baseProps.onChangeDestText).toHaveBeenCalledWith("H-920");

    fireEvent(getByTestId("indoorRouteStartInput"), "focus");
    fireEvent(getByTestId("indoorRouteDestInput"), "focus");
    expect(baseProps.onFocusField).toHaveBeenNthCalledWith(1, "start");
    expect(baseProps.onFocusField).toHaveBeenNthCalledWith(2, "destination");

    fireEvent.press(getByTestId("indoorRouteSwapButton"));
    expect(baseProps.onSwap).toHaveBeenCalledTimes(1);
  });

  it("uses node labels over text and clears fields", () => {
    const onClearStart = jest.fn();
    const onClearDestination = jest.fn();

    const { getByTestId, getByDisplayValue } = render(
      <IndoorRouteInput
        {...baseProps}
        start={{ id: "a", label: "Room A" } as any}
        destination={{ id: "b", label: "Room B" } as any}
        startText="typed start"
        destText="typed dest"
        onClearStart={onClearStart}
        onClearDestination={onClearDestination}
      />,
    );

    expect(getByDisplayValue("Room A")).toBeTruthy();
    expect(getByDisplayValue("Room B")).toBeTruthy();

    fireEvent.press(getByTestId("clearIndoorStart"));
    fireEvent.press(getByTestId("clearIndoorDestination"));
    expect(onClearStart).toHaveBeenCalledTimes(1);
    expect(onClearDestination).toHaveBeenCalledTimes(1);
  });

  it("hides clear buttons when values are empty", () => {
    const { queryByTestId } = render(<IndoorRouteInput {...baseProps} />);
    expect(queryByTestId("clearIndoorStart")).toBeNull();
    expect(queryByTestId("clearIndoorDestination")).toBeNull();
  });

  it("covers accessible mode with destination focused", () => {
    const { getByTestId } = render(
      <IndoorRouteInput
        {...baseProps}
        activeField="destination"
        accessible
        startText="A"
        destText="B"
      />,
    );

    expect(getByTestId("indoorRouteCard")).toBeTruthy();
    expect(getByTestId("indoorRouteStartRow")).toBeTruthy();
    expect(getByTestId("indoorRouteDestRow")).toBeTruthy();
  });

  it("does not clear when component is disabled", () => {
    const onClearStart = jest.fn();
    const onClearDestination = jest.fn();

    const { getByTestId } = render(
      <IndoorRouteInput
        {...baseProps}
        startText="Room A"
        destText="Room B"
        disabled
        onClearStart={onClearStart}
        onClearDestination={onClearDestination}
      />,
    );

    expect(getByTestId("indoorRouteStartInput").props.editable).toBe(false);
    expect(getByTestId("indoorRouteDestInput").props.editable).toBe(false);

    fireEvent.press(getByTestId("clearIndoorStart"));
    fireEvent.press(getByTestId("clearIndoorDestination"));

    expect(onClearStart).not.toHaveBeenCalled();
    expect(onClearDestination).not.toHaveBeenCalled();
  });
});
