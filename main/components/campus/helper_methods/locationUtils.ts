import * as Location from "expo-location";

export type LatLng = { latitude: number; longitude: number };

export type LocationErrorCode =
  | "PERMISSION_DENIED"
  | "SERVICES_OFF"
  | "TIMEOUT"
  | "UNKNOWN";

export class LocationError extends Error {
  code: LocationErrorCode;

  constructor(code: LocationErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export async function ensureLocationReady(): Promise<void> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) throw new LocationError("SERVICES_OFF");
}

export async function requestForegroundPermission(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new LocationError("PERMISSION_DENIED");
}

export async function getDeviceLocation(): Promise<LatLng> {
  await ensureLocationReady();
  await requestForegroundPermission();

  // Try last-known first (fast), but reject stale Android cache (max 60 s old)
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
  if (last?.coords?.latitude && last?.coords?.longitude) {
    return {
      latitude: last.coords.latitude,
      longitude: last.coords.longitude,
    };
  }

  // Fallback to a fresh GPS read
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch {
    throw new LocationError("UNKNOWN");
  }
}
