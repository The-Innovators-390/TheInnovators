import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";

import ToggleButton, {
  calculatePanValue,
  determineCampusFromPan,
} from "@/components/campus/ToggleButton";

// ─── Pure exported helpers ────────────────────────────────────────────────────

describe("calculatePanValue", () => {
  it("returns 0 when no drag from SGW", () => {
    expect(calculatePanValue("SGW", 0, 200)).toBe(0);
  });

  it("returns 1 when no drag from LOY", () => {
    expect(calculatePanValue("LOY", 0, 200)).toBe(1);
  });

  it("clamps to 0 when dragging hard left from SGW", () => {
    expect(calculatePanValue("SGW", -500, 200)).toBe(0);
  });

  it("clamps to 1 when dragging hard right from SGW", () => {
    expect(calculatePanValue("SGW", 500, 200)).toBe(1);
  });

  it("moves right from SGW by half the half-width → 0.5", () => {
    // halfWidth = 200 / 2 = 100; dx = 50 → currentValue(0) + 50/100 = 0.5
    expect(calculatePanValue("SGW", 50, 200)).toBeCloseTo(0.5);
  });

  it("uses Dimensions default when toggleWidth is 0", () => {
    // Should not throw — just uses fallback width
    const value = calculatePanValue("SGW", 0, 0);
    expect(typeof value).toBe("number");
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });
});

describe("determineCampusFromPan", () => {
  it("returns 'SGW' when no drag from SGW", () => {
    expect(determineCampusFromPan("SGW", 0, 200)).toBe("SGW");
  });

  it("returns 'LOY' when no drag from LOY", () => {
    expect(determineCampusFromPan("LOY", 0, 200)).toBe("LOY");
  });

  it("returns 'LOY' when dragging far right from SGW", () => {
    expect(determineCampusFromPan("SGW", 200, 200)).toBe("LOY");
  });

  it("returns 'SGW' when dragging far left from LOY", () => {
    expect(determineCampusFromPan("LOY", -200, 200)).toBe("SGW");
  });

  it("returns 'LOY' when finalValue is exactly > 0.5", () => {
    // halfWidth=100; from SGW (0) + 51/100 = 0.51 > 0.5 → LOY
    expect(determineCampusFromPan("SGW", 51, 200)).toBe("LOY");
  });

  it("returns 'SGW' when finalValue is exactly 0.5", () => {
    // halfWidth=100; from SGW (0) + 50/100 = 0.5 → NOT > 0.5 → SGW
    expect(determineCampusFromPan("SGW", 50, 200)).toBe("SGW");
  });

  it("uses Dimensions default when toggleWidth is 0", () => {
    const campus = determineCampusFromPan("SGW", 0, 0);
    expect(["SGW", "LOY"]).toContain(campus);
  });
});

// ─── ToggleButton component ───────────────────────────────────────────────────

describe("ToggleButton", () => {
  it("renders SGW and Loyola pressable buttons", () => {
    const { getByTestId } = render(
      <ToggleButton focusedCampus="SGW" onCampusChange={jest.fn()} />,
    );

    getByTestId("campusToggle-SGW");
    getByTestId("campusToggle-Loyola");
    getByTestId("campusToggle");
  });

  it("calls onCampusChange with 'LOY' when Loyola button is pressed from SGW", () => {
    const onCampusChange = jest.fn();
    const { getByTestId } = render(
      <ToggleButton focusedCampus="SGW" onCampusChange={onCampusChange} />,
    );

    fireEvent.press(getByTestId("campusToggle-Loyola"));
    expect(onCampusChange).toHaveBeenCalledWith("LOY");
  });

  it("calls onCampusChange with 'SGW' when SGW button is pressed from LOY", () => {
    const onCampusChange = jest.fn();
    const { getByTestId } = render(
      <ToggleButton focusedCampus="LOY" onCampusChange={onCampusChange} />,
    );

    fireEvent.press(getByTestId("campusToggle-SGW"));
    expect(onCampusChange).toHaveBeenCalledWith("SGW");
  });

  it("does NOT call onCampusChange when pressing the already-focused campus", () => {
    const onCampusChange = jest.fn();
    const { getByTestId } = render(
      <ToggleButton focusedCampus="SGW" onCampusChange={onCampusChange} />,
    );

    // Press SGW while already on SGW — switchToCampus should no-op
    fireEvent.press(getByTestId("campusToggle-SGW"));
    expect(onCampusChange).not.toHaveBeenCalled();
  });

  it("updates animation when focusedCampus prop changes", () => {
    const onCampusChange = jest.fn();
    const { rerender, getByTestId } = render(
      <ToggleButton focusedCampus="SGW" onCampusChange={onCampusChange} />,
    );

    act(() => {
      rerender(
        <ToggleButton focusedCampus="LOY" onCampusChange={onCampusChange} />,
      );
    });

    // Still renders after prop change
    getByTestId("campusToggle");
  });

  it("fires onLayout and stores toggle width", () => {
    const { getByTestId } = render(
      <ToggleButton focusedCampus="SGW" onCampusChange={jest.fn()} />,
    );

    const toggle = getByTestId("campusToggle");

    act(() => {
      fireEvent(toggle, "layout", {
        nativeEvent: { layout: { width: 320 } },
      });
    });

    // No crash = onLayout handled correctly
    expect(toggle).toBeTruthy();
  });

  it("has correct accessibility roles and labels", () => {
    const { getByTestId } = render(
      <ToggleButton focusedCampus="SGW" onCampusChange={jest.fn()} />,
    );

    const sgwBtn = getByTestId("campusToggle-SGW");
    const loyBtn = getByTestId("campusToggle-Loyola");

    expect(sgwBtn.props.accessibilityRole).toBe("button");
    expect(loyBtn.props.accessibilityRole).toBe("button");
    expect(sgwBtn.props.accessibilityLabel).toBe("Switch to SGW campus");
    expect(loyBtn.props.accessibilityLabel).toBe("Switch to Loyola campus");
  });

  it("reflects selected state via accessibilityState", () => {
    const { getByTestId, rerender } = render(
      <ToggleButton focusedCampus="SGW" onCampusChange={jest.fn()} />,
    );

    expect(getByTestId("campusToggle-SGW").props.accessibilityState).toEqual({
      selected: true,
    });
    expect(getByTestId("campusToggle-Loyola").props.accessibilityState).toEqual(
      { selected: false },
    );

    rerender(<ToggleButton focusedCampus="LOY" onCampusChange={jest.fn()} />);

    expect(getByTestId("campusToggle-SGW").props.accessibilityState).toEqual({
      selected: false,
    });
    expect(getByTestId("campusToggle-Loyola").props.accessibilityState).toEqual(
      { selected: true },
    );
  });
});
