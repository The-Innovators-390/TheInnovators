import React from "react";
import renderer, { act } from "react-test-renderer";
import RoutePolylines from "@/components/campus/RoutePolylines";
import type { RouteRenderSegment } from "@/components/campus/helper_methods/routeSegments";

jest.mock("react-native-maps", () => {
  const React = require("react");

  return {
    Polyline: (props: any) => React.createElement("mock-polyline", props),
  };
});

jest.mock("@/components/campus/helper_methods/routePolylineStyles", () => ({
  colorForSegmentKind: jest.fn((kind: string) => `color-${kind}`),
  dashPatternForSegmentKind: jest.fn((kind: string) =>
    kind === "walking" ? [10, 8] : undefined,
  ),
}));

import {
  colorForSegmentKind,
  dashPatternForSegmentKind,
} from "@/components/campus/helper_methods/routePolylineStyles";

describe("RoutePolylines", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const segments: RouteRenderSegment[] = [
    {
      kind: "walking",
      coordinates: [
        { latitude: 45.50001, longitude: -73.60001 },
        { latitude: 45.50002, longitude: -73.60002 },
      ],
    },
    {
      kind: "bus",
      coordinates: [
        { latitude: 45.51001, longitude: -73.61001 },
        { latitude: 45.52002, longitude: -73.62002 },
        { latitude: 45.53003, longitude: -73.63003 },
      ],
    },
  ];

  it("returns null when there are no segments", () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <RoutePolylines segments={[]} onPress={jest.fn()} strokeWidth={5} />,
      );
    });

    expect(tree!.toJSON()).toBeNull();
  });

  it("renders one Polyline per segment with correct props", () => {
    const onPress = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <RoutePolylines
          segments={segments}
          onPress={onPress}
          strokeWidth={6}
        />,
      );
    });

    const polylines = tree!.root.findAllByType("mock-polyline");
    expect(polylines).toHaveLength(2);

    expect(polylines[0].props.coordinates).toEqual(segments[0].coordinates);
    expect(polylines[0].props.strokeWidth).toBe(6);
    expect(polylines[0].props.strokeColor).toBe("color-walking");
    expect(polylines[0].props.lineDashPattern).toEqual([10, 8]);
    expect(polylines[0].props.tappable).toBe(true);
    expect(polylines[0].props.lineCap).toBe("round");
    expect(polylines[0].props.lineJoin).toBe("round");

    expect(polylines[1].props.coordinates).toEqual(segments[1].coordinates);
    expect(polylines[1].props.strokeColor).toBe("color-bus");
    expect(polylines[1].props.lineDashPattern).toBeUndefined();

    expect(colorForSegmentKind).toHaveBeenNthCalledWith(1, "walking");
    expect(colorForSegmentKind).toHaveBeenNthCalledWith(2, "bus");

    expect(dashPatternForSegmentKind).toHaveBeenNthCalledWith(1, "walking");
    expect(dashPatternForSegmentKind).toHaveBeenNthCalledWith(2, "bus");
  });

  it("forwards onPress to each polyline", () => {
    const onPress = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <RoutePolylines
          segments={segments}
          onPress={onPress}
          strokeWidth={4}
        />,
      );
    });

    const polylines = tree!.root.findAllByType("mock-polyline");

    act(() => {
      polylines[0].props.onPress();
      polylines[1].props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it("renders distinct keys for distinct segments", () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <RoutePolylines
          segments={segments}
          onPress={jest.fn()}
          strokeWidth={4}
        />,
      );
    });

    const polylines = tree!.root.findAllByType("mock-polyline");
    expect(polylines).toHaveLength(2);

    expect(polylines[0].props.coordinates).not.toEqual(
      polylines[1].props.coordinates,
    );
  });
});
