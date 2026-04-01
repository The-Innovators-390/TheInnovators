import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { FloorSelector } from "../FloorSelector";

const theme = {
  headerBackgroundColor: "#000",
  headerTextColor: "#fff",
  selectedButtonColor: "#123456",
};

describe("FloorSelector", () => {
  it("renders floors and selects a floor", () => {
    const onSelectFloor = jest.fn();
    const { getByTestId, getByText } = render(
      <FloorSelector
        floors={[-2, 1, 2]}
        selectedFloor={1}
        onSelectFloor={onSelectFloor}
        campusTheme={theme}
      />,
    );

    expect(getByText("S2")).toBeTruthy();
    expect(getByText("1")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();

    fireEvent.press(getByTestId("indoor-floor-S2"));
    expect(onSelectFloor).toHaveBeenCalledWith(-2);
  });

  it("renders accessibility pressable and toggles callback", () => {
    const onPressAccessible = jest.fn();
    const { getByTestId } = render(
      <FloorSelector
        floors={[1]}
        selectedFloor={1}
        onSelectFloor={jest.fn()}
        campusTheme={theme}
        accessible
        onPressAccessible={onPressAccessible}
      />,
    );

    fireEvent.press(getByTestId("indoor-floor-accessible-icon"));
    expect(onPressAccessible).toHaveBeenCalledTimes(1);
  });

  it("renders non-interactive accessibility icon when callback is missing", () => {
    const { queryByTestId } = render(
      <FloorSelector
        floors={[1]}
        selectedFloor={1}
        onSelectFloor={jest.fn()}
        campusTheme={theme}
      />,
    );

    expect(queryByTestId("indoor-floor-accessible-icon")).toBeNull();
  });
});
