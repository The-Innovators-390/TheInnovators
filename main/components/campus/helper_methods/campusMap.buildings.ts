import type { Building, Campus } from "@/components/Buildings/types";
import { isPointInPolygon } from "@/components/campus/helper_methods/pointInPolygon";

export const buildAllBuildings = (sgw: Building[], loy: Building[]) => [
  ...sgw,
  ...loy,
];

export const getBuildingContainingPoint = (
  buildings: Building[],
  lat: number,
  lng: number,
): Building | undefined => {
  return buildings.find(
    (b) =>
      b.polygon?.length &&
      isPointInPolygon({ latitude: lat, longitude: lng }, b.polygon),
  );
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const distanceInMeters = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number => {
  const earthRadiusMeters = 6_371_000;
  const latDiff = toRadians(to.latitude - from.latitude);
  const lngDiff = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDiff / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getNearestBuilding = (
  buildings: Building[],
  lat: number,
  lng: number,
): Building | undefined => {
  if (buildings.length === 0) return undefined;

  const point = { latitude: lat, longitude: lng };

  return buildings.reduce<Building | undefined>((nearest, building) => {
    if (!nearest) return building;

    const buildingDistance = distanceInMeters(point, {
      latitude: building.latitude,
      longitude: building.longitude,
    });

    const nearestDistance = distanceInMeters(point, {
      latitude: nearest.latitude,
      longitude: nearest.longitude,
    });

    return buildingDistance < nearestDistance ? building : nearest;
  }, undefined);
};

export const resolveCampusFromLocation = (
  buildings: Building[],
  lat: number,
  lng: number,
): Campus | null => {
  const containingBuilding = getBuildingContainingPoint(buildings, lat, lng);
  if (containingBuilding) return containingBuilding.campus;

  return getNearestBuilding(buildings, lat, lng)?.campus ?? null;
};

export const getUserLocationBuildingId = (
  buildings: Building[],
  userLocation: { latitude: number; longitude: number } | null,
): string | null => {
  if (!userLocation) return null;

  const b = getBuildingContainingPoint(
    buildings,
    userLocation.latitude,
    userLocation.longitude,
  );

  return b?.id ?? null;
};

export const makeUserLocationBuilding = (
  lat: number,
  lng: number,
  campus: "SGW" | "LOY",
): Building => ({
  id: "USER_LOCATION",
  campus,
  code: "",
  name: "Your location",
  address: "",
  latitude: lat,
  longitude: lng,
  aliases: [],
  polygon: [],
  zoomCategory: 2,
});
