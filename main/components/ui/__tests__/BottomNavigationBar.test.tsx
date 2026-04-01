import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { BottomNavigationBar } from "@/components/ui/BottomNavigationBar";

describe("BottomNavigationBar", () => {
  it("renders nothing when visible=false", () => {
    const { queryByText } = render(
      <BottomNavigationBar
        visible={false}
        bottomOffset={40}
        arrivalTimeText="10:30"
        durationMinText="12"
        distanceKmText="1.2"
        onExit={jest.fn()}
      />,
    );

    expect(queryByText("10:30")).toBeNull();
    expect(queryByText("12")).toBeNull();
    expect(queryByText("1.2")).toBeNull();
    expect(queryByText("Exit")).toBeNull();
  });

  it("renders metrics and Exit when visible=true", () => {
    const { getByText } = render(
      <BottomNavigationBar
        visible={true}
        bottomOffset={40}
        arrivalTimeText="10:30"
        durationMinText="12"
        distanceKmText="1.2"
        onExit={jest.fn()}
      />,
    );

    // values
    expect(getByText("10:30")).toBeTruthy();
    expect(getByText("12")).toBeTruthy();
    expect(getByText("1.2")).toBeTruthy();

    // labels
    expect(getByText("arrival")).toBeTruthy();
    expect(getByText("min")).toBeTruthy();
    expect(getByText("km")).toBeTruthy();

    // exit
    expect(getByText("Exit")).toBeTruthy();
  });

  it("calls onExit when Exit is pressed", () => {
    const onExit = jest.fn();
    const { getByText } = render(
      <BottomNavigationBar
        visible={true}
        bottomOffset={40}
        arrivalTimeText="10:30"
        durationMinText="12"
        distanceKmText="1.2"
        onExit={onExit}
      />,
    );

    fireEvent.press(getByText("Exit"));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("renders hint when hintText is provided", () => {
    const { getByText } = render(
      <BottomNavigationBar
        visible={true}
        bottomOffset={40}
        arrivalTimeText="10:30"
        durationMinText="12"
        distanceKmText="1.2"
        hintText="Go to start to begin live navigation"
        onExit={jest.fn()}
      />,
    );

    expect(getByText("Go to start to begin live navigation")).toBeTruthy();
  });
});
