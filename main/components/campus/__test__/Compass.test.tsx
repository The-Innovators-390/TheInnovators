/* eslint-disable import/first */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { describe, it, expect, jest } from "@jest/globals";

import Compass from "../Compass";

describe("Compass", () => {
  it("renders nothing when visible is false", () => {
    const { queryByTestId } = render(
      <Compass onPress={jest.fn()} visible={false} />,
    );

    expect(queryByTestId("compassButton")).toBeNull();
  });

  it("renders and calls onPress when tapped", () => {
    const onPress = jest.fn();

    const { getByTestId } = render(<Compass onPress={onPress} />);

    fireEvent.press(getByTestId("compassButton"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders visible compass button by default", () => {
    const { getByTestId } = render(<Compass onPress={jest.fn()} />);

    expect(getByTestId("compassButton")).toBeTruthy();
  });
});
