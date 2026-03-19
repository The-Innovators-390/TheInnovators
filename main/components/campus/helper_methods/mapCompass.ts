import type React from "react";
import type MapView from "react-native-maps";
import type { LatLng } from "@/components/campus/helper_methods/googleDirections";

type CameraCapableMap = MapView & {
  animateCamera?: (
    camera: {
      center?: LatLng;
      heading?: number;
      pitch?: number;
    },
    options?: { duration?: number },
  ) => void;
};

export function resetMapDirectionToNorth(
  mapRef: React.RefObject<MapView | null>,
  center?: LatLng,
  duration = 350,
) {
  const map = mapRef.current as CameraCapableMap | null;

  if (!map || typeof map.animateCamera !== "function") return;

  map.animateCamera(
    {
      ...(center ? { center } : {}),
      heading: 0,
      pitch: 0,
    },
    { duration },
  );
}
