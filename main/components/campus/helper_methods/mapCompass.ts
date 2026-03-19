import type React from "react";
import type MapView from "react-native-maps";

type MapCenter = {
  latitude: number;
  longitude: number;
};

type CameraCapableMap = MapView & {
  animateCamera?: (
    camera: {
      center?: MapCenter;
      heading?: number;
      pitch?: number;
    },
    options?: { duration?: number },
  ) => void;
};

export function resetMapDirectionToNorth(
  mapRef: React.RefObject<MapView | null>,
  center?: MapCenter,
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
