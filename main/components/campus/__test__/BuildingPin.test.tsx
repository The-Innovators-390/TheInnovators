import React from "react";
import { render } from "@testing-library/react-native";
import { StyleSheet, Text, View } from "react-native";
import BuildingPin from "@/components/campus/BuildingPin";

describe("BuildingPin", () => {
  it("uses default size=44 and renders SGW pin", () => {
    const { getByText, UNSAFE_getAllByType } = render(
      <BuildingPin code="H" campus="SGW" />,
    );

    // Code label renders
    getByText("H");

    // Root View has correct default sizing
    const views = UNSAFE_getAllByType(View);
    const flat = StyleSheet.flatten(views[0].props.style);

    // Component adds PAD=4 on each side for Android Marker bitmap clipping
    expect(flat).toMatchObject({
      width: 44 + 4 * 2,
      height: 44 * 1.5 + 4 * 2,
    });
  });

  it("uses provided size and renders LOY pin branch", () => {
    const { getByText, UNSAFE_getAllByType } = render(
      <BuildingPin code="AD" campus="LOY" size={60} />,
    );

    getByText("AD");

    const views = UNSAFE_getAllByType(View);
    const flat = StyleSheet.flatten(views[0].props.style);

    // Component adds PAD=4 on each side for Android Marker bitmap clipping
    expect(flat).toMatchObject({
      width: 60 + 4 * 2,
      height: 60 * 1.5 + 4 * 2,
    });
  });

  it("uses smaller fontSize when label is provided", () => {
    const size = 50;
    const { getByText, UNSAFE_getAllByType } = render(
      <BuildingPin code="H" campus="SGW" size={size} label="Henry Hall" />,
    );

    getByText("Henry Hall");

    const texts = UNSAFE_getAllByType(Text);
    const textStyle = StyleSheet.flatten(texts[0].props.style);
    expect(textStyle.fontSize).toBe(Math.round(size * 0.22));
  });
});
