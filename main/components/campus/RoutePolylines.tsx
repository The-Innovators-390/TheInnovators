import React from "react";
import { Polyline } from "react-native-maps";
import type { RouteRenderSegment } from "@/components/campus/helper_methods/routeSegments";
import {
  colorForSegmentKind,
  dashPatternForSegmentKind,
} from "@/components/campus/helper_methods/routePolylineStyles";

type Props = {
  segments: RouteRenderSegment[];
  onPress: () => void;
  strokeWidth: number;
};

function buildSegmentKey(segment: RouteRenderSegment, index: number): string {
  const coordinatesSignature = segment.coordinates
    .map(
      (point) => `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`,
    )
    .join("|");

  return `${segment.kind}-${index}-${coordinatesSignature}`;
}

export default function RoutePolylines({
  segments,
  onPress,
  strokeWidth,
}: Readonly<Props>) {
  if (segments.length === 0) return null;

  return (
    <>
      {segments.map((segment, index) => (
        <Polyline
          key={buildSegmentKey(segment, index)}
          coordinates={segment.coordinates}
          tappable
          onPress={onPress}
          strokeWidth={strokeWidth}
          strokeColor={colorForSegmentKind(segment.kind)}
          lineDashPattern={dashPatternForSegmentKind(segment.kind)}
          lineCap="round"
          lineJoin="round"
        />
      ))}
    </>
  );
}
