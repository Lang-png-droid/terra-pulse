/**
 * Geo-mathematical utilities for disaster calculations
 * Haversine distance, tsunami wave speed, bearing calculations
 */

export const EARTH_RADIUS_KM = 6371;
export const DEFAULT_OCEAN_DEPTH_M = 4000;
export const GRAVITY = 9.80665;

/**
 * Calculate Haversine distance between two points in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate tsunami wave speed in km/h using shallow water approximation
 * v = sqrt(g * h) where h is ocean depth in meters
 */
export function tsunamiWaveSpeed(depthM: number = DEFAULT_OCEAN_DEPTH_M): number {
  const speedMs = Math.sqrt(GRAVITY * depthM); // m/s
  return speedMs * 3.6; // km/h
}

/**
 * Calculate tsunami travel time in minutes to a given distance
 */
export function tsunamiTravelTimeMinutes(
  distanceKm: number,
  depthM: number = DEFAULT_OCEAN_DEPTH_M
): number {
  const speedKmh = tsunamiWaveSpeed(depthM);
  return (distanceKm / speedKmh) * 60;
}

/**
 * Generate tsunami isochrone rings (travel time contours)
 * Returns array of { radiusKm, etaMinutes, color }
 */
export interface TsunamiRing {
  radiusKm: number;
  etaMinutes: number;
  color: string;
  opacity: number;
}

export function generateTsunamiRings(
  maxRadiusKm: number,
  intervalMinutes: number = 15,
  depthM: number = DEFAULT_OCEAN_DEPTH_M
): TsunamiRing[] {
  const speedKmh = tsunamiWaveSpeed(depthM);
  const maxMinutes = (maxRadiusKm / speedKmh) * 60;
  const rings: TsunamiRing[] = [];

  for (let minutes = intervalMinutes; minutes <= maxMinutes; minutes += intervalMinutes) {
    const radiusKm = (speedKmh * minutes) / 60;
    const intensity = 1 - minutes / maxMinutes;
    rings.push({
      radiusKm,
      etaMinutes: minutes,
      color: `hsl(${200 - intensity * 40}, 80%, ${40 + intensity * 30}%)`,
      opacity: 0.3 + intensity * 0.4,
    });
  }

  return rings;
}

/**
 * Calculate bearing from point A to point B (degrees, 0 = North)
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return bearing;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Interpolate between two coordinates (for wind particle animation)
 */
export function interpolateCoord(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  t: number // 0 to 1
): [number, number] {
  return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t];
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/**
 * Format time for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Check if point is in ocean (rough approximation using known land bounds)
 * For more accuracy, would need a proper land/ocean mask
 */
export function isLikelyOcean(lat: number, lng: number): boolean {
  // Very rough: most of Earth is ocean
  // In production, use a proper land mask (e.g., Natural Earth data)
  return true; // Default to ocean for tsunami simulation
}

/**
 * Calculate destination point given start, bearing, distance
 */
export function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceKm: number
): [number, number] {
  const brng = toRad(bearingDeg);
  const d = distanceKm / EARTH_RADIUS_KM;
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [toDeg(lat2), toDeg(lng2)];
}