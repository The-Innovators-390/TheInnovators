import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import POICategoryBar from "../POICategoryBar";

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock("@/hooks/useCampusTheme", () => ({
  useCampusTheme: () => ({
    activeColor: "#912338",
  }),
}));

describe("POICategoryBar", () => {
  const mockOnSelect = jest.fn();

  const baseProps = {
    activeCategory: null,
    onSelect: mockOnSelect,
    focusedCampus: "SGW" as const,
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all POI categories", () => {
    const { getByText } = render(<POICategoryBar {...baseProps} />);

    expect(getByText("Restaurants")).toBeTruthy();
    expect(getByText("Coffee")).toBeTruthy();
    expect(getByText("Gym")).toBeTruthy();
    expect(getByText("Parking")).toBeTruthy();
    expect(getByText("Library")).toBeTruthy();
  });

  it("calls onSelect with category key when a category is pressed", () => {
    const { getByTestId } = render(<POICategoryBar {...baseProps} />);

    fireEvent.press(getByTestId("poi-category-cafe"));

    expect(mockOnSelect).toHaveBeenCalledWith("cafe");
  });

  it("calls onSelect with null when pressing the already active category", () => {
    const { getByTestId } = render(
      <POICategoryBar {...baseProps} activeCategory="gym" />,
    );

    fireEvent.press(getByTestId("poi-category-gym"));

    expect(mockOnSelect).toHaveBeenCalledWith(null);
  });

  it("calls onSelect with a new category when switching from one active category to another", () => {
    const { getByTestId } = render(
      <POICategoryBar {...baseProps} activeCategory="restaurant" />,
    );

    fireEvent.press(getByTestId("poi-category-parking"));

    expect(mockOnSelect).toHaveBeenCalledWith("parking");
  });

  it("disables all category buttons when disabled is true", () => {
    const { getByTestId } = render(<POICategoryBar {...baseProps} disabled />);

    fireEvent.press(getByTestId("poi-category-restaurant"));
    fireEvent.press(getByTestId("poi-category-cafe"));

    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it("marks the active category as selected for accessibility", () => {
    const { getByTestId } = render(
      <POICategoryBar {...baseProps} activeCategory="parking" />,
    );

    expect(
      getByTestId("poi-category-parking").props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });

    expect(
      getByTestId("poi-category-restaurant").props.accessibilityState,
    ).toMatchObject({
      selected: false,
    });
  });

  it("uses the correct accessibility label for a category", () => {
    const { getByTestId } = render(<POICategoryBar {...baseProps} />);

    expect(getByTestId("poi-category-library").props.accessibilityLabel).toBe(
      "Library points of interest",
    );
  });
});
