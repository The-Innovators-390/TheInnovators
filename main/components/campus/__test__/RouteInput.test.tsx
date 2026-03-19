/* eslint-disable import/first */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

jest.mock("@/components/Buildings/types", () => ({}));

import RouteInput from "@/components/campus/RouteInput";

const getNodeText = (node: any): string => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.join("");
  return "";
};

const getStartValue = (utils: any) => {
  const input = utils.queryByTestId("routeStartInput");
  if (input) return input.props.value;
  return getNodeText(utils.getByTestId("routeStartText").props.children);
};

const getDestValue = (utils: any) => {
  const input = utils.queryByTestId("routeDestInput");
  if (input) return input.props.value;
  return getNodeText(utils.getByTestId("routeDestText").props.children);
};

describe("RouteInput", () => {
  const B1 = {
    id: "sgw-h",
    campus: "SGW",
    code: "H",
    name: "Henry F. Hall",
    address: "1455 De Maisonneuve",
    latitude: 45.1,
    longitude: -73.1,
  } as any;

  const B2 = {
    id: "sgw-mb",
    campus: "SGW",
    code: "MB",
    name: "John Molson",
    address: "1450 Guy",
    latitude: 45.2,
    longitude: -73.2,
  } as any;

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

  it("renders the route card + inputs + swap", () => {
    const { getByTestId } = render(<RouteInput {...baseProps} />);

    getByTestId("routeCard");
    getByTestId("routeStartInput");
    getByTestId("routeDestInput");
    getByTestId("routeSwapButton");
  });

  it("shows typed text when no buildings are selected", () => {
    const utils = render(
      <RouteInput {...baseProps} startText="start here" destText="go there" />,
    );

    expect(getStartValue(utils)).toBe("start here");
    expect(getDestValue(utils)).toBe("go there");
  });

  it("shows building label when buildings are selected", () => {
    const utils = render(
      <RouteInput
        {...baseProps}
        start={B1}
        destination={B2}
        startText="ignored"
        destText="ignored"
      />,
    );

    expect(getStartValue(utils)).toBe("H - Henry F. Hall");
    expect(getDestValue(utils)).toBe("MB - John Molson");
    expect(utils.getByTestId("routeStartText")).toBeTruthy();
    expect(utils.getByTestId("routeDestText")).toBeTruthy();
  });

  it("calls onFocusField when pressing start/destination rows", () => {
    const onFocusField = jest.fn();

    const { getByTestId } = render(
      <RouteInput {...baseProps} onFocusField={onFocusField} />,
    );

    fireEvent.press(getByTestId("routeStartRow"));
    expect(onFocusField).toHaveBeenCalledWith("start");

    fireEvent.press(getByTestId("routeDestRow"));
    expect(onFocusField).toHaveBeenCalledWith("destination");
  });

  it("calls onSwap when pressing swap button", () => {
    const onSwap = jest.fn();

    const { getByTestId } = render(
      <RouteInput {...baseProps} onSwap={onSwap} />,
    );

    fireEvent.press(getByTestId("routeSwapButton"));
    expect(onSwap).toHaveBeenCalledTimes(1);
  });

  it("shows clear buttons when text is non-empty and calls clear handlers", () => {
    const onClearStart = jest.fn();
    const onClearDestination = jest.fn();

    const { getByTestId } = render(
      <RouteInput
        {...baseProps}
        startText="aaa"
        destText="bbb"
        onClearStart={onClearStart}
        onClearDestination={onClearDestination}
      />,
    );

    fireEvent.press(getByTestId("clearStart"));
    expect(onClearStart).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId("clearDestination"));
    expect(onClearDestination).toHaveBeenCalledTimes(1);
  });

  it("does not show clear buttons when both values are empty", () => {
    const { queryByTestId } = render(
      <RouteInput {...baseProps} startText="" destText="" />,
    );

    expect(queryByTestId("clearStart")).toBeNull();
    expect(queryByTestId("clearDestination")).toBeNull();
  });

  it("disables inputs when disabled=true", () => {
    const { getByTestId } = render(<RouteInput {...baseProps} disabled />);

    expect(getByTestId("routeStartInput").props.editable).toBe(false);
    expect(getByTestId("routeDestInput").props.editable).toBe(false);
  });

  it("calls onChange handlers when typing", () => {
    const onChangeStartText = jest.fn();
    const onChangeDestText = jest.fn();

    const { getByTestId } = render(
      <RouteInput
        {...baseProps}
        onChangeStartText={onChangeStartText}
        onChangeDestText={onChangeDestText}
      />,
    );

    fireEvent.changeText(getByTestId("routeStartInput"), "abc");
    expect(onChangeStartText).toHaveBeenCalledWith("abc");

    fireEvent.changeText(getByTestId("routeDestInput"), "xyz");
    expect(onChangeDestText).toHaveBeenCalledWith("xyz");
  });
});
