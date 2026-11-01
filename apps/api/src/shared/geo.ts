/**
 * Great-circle distance (Haversine). The search query computes the same formula in SQL;
 * this TypeScript version is used by the seed's integrity checks and unit tests.
 *
 * Fine for a ~60-worker demo. At marketplace scale, geographic search belongs in an indexed
 * geospatial engine such as PostGIS (ST_DWithin on a geography column with a GiST index).
 */
export const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
