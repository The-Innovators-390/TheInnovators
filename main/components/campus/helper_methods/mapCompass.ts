import type MapView from "react-native-maps";
import type { LatLng } from "react-native-maps";

type CameraLike = {
  center?: LatLng;
  heading?: number;
  pitch?: number;
  zoom?: number;
  altitude?: number;
};

export const resetMapDirectionToNorth = (
  mapRef: React.RefObject<MapView | null>,
  animationDuration = 350,
) => {
  const map = mapRef.current;
  if (!map) return;

  map.getCamera().then((camera: CameraLike) => {
    map.animateCamera(
      {
        ...camera,
        heading: 0,
      },
      { duration: animationDuration },
    );
  });
};
