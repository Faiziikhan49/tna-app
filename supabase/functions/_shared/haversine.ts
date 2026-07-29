export interface Coords {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two lat/lng points. */
export function haversineMeters(a: Coords, b: Coords): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isWithinGeofence(
  device: Coords,
  center: Coords,
  radiusMeters: number,
): { allowed: boolean; distance: number } {
  const distance = haversineMeters(device, center);
  return { allowed: distance <= radiusMeters, distance };
}
