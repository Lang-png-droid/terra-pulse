/**
 * GeoJSON coordinate type helpers
 * Kanonik pattern untuk handle GeoJSON coordinates yang bisa nested
 */

import type { Position } from 'geojson';

/**
 * Tipe koordinat Point yang sudah disempitkan: [longitude, latitude]
 * GeoJSON spec: Position = [number, number] | [number, number, number]
 * Kita hanya butuh 2D untuk display/map
 */
export type LngLat = [number, number];

/**
 * Cek apakah koordinat adalah Point valid (2D atau 3D)
 */
export function isValidPoint(coords: unknown): coords is Position {
  return (
    Array.isArray(coords) &&
    coords.length >= 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number'
  );
}

/**
 * Ekstrak [lng, lat] dari GeoJSON Point coordinates
 * Return null jika bukan Point valid
 */
export function toLngLat(coords: unknown): LngLat | null {
  if (!isValidPoint(coords)) return null;
  return [coords[0], coords[1]];
}

/**
 * Ekstrak [lng, lat] dari GeoJSON Point coordinates (throw kalau invalid)
 * Pakai kalau sudah yakin valid (mis. setelah filter)
 */
export function toLngLatOrThrow(coords: unknown): LngLat {
  const result = toLngLat(coords);
  if (!result) throw new Error('Invalid Point coordinates');
  return result;
}

/**
 * Cek apakah geometry adalah Point type
 */
export function isPointGeometry(geometry: GeoJSON.Geometry | null): geometry is GeoJSON.Point {
  return geometry?.type === 'Point' && isValidPoint(geometry.coordinates);
}

/**
 * Ekstrak [lng, lat] dari geometry Point
 */
export function getPointLngLat(geometry: GeoJSON.Geometry | null): LngLat | null {
  if (!isPointGeometry(geometry)) return null;
  return toLngLat(geometry.coordinates);
}

/**
 * Helper untuk feature collection - ambil semua Point features dengan coords
 */
export interface PointFeature<P = GeoJSON.GeoJsonProperties> {
  type: 'Feature';
  geometry: GeoJSON.Point;
  properties: P;
  id?: string | number;
}

export function filterPointFeatures<P = GeoJSON.GeoJsonProperties>(
  features: GeoJSON.Feature<GeoJSON.Geometry, P>[]
): PointFeature<P>[] {
  return features.filter(f => isPointGeometry(f.geometry)) as PointFeature<P>[];
}

/**
 * Helper untuk hitung jarak ke user location (pakai haversine)
 * Import haversineDistance dari @/lib/geoMath untuk avoid circular deps
 */
export function calculateDistance(
  userLat: number,
  userLng: number,
  featureLat: number,
  featureLng: number
): number {
  // Haversine formula
  const R = 6371; // Earth radius km
  const dLat = toRad(featureLat - userLat);
  const dLng = toRad(featureLng - userLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(featureLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Type guard untuk feature dengan Point geometry (generic)
 */
export function isPointFeature<P = GeoJSON.GeoJsonProperties>(
  feature: GeoJSON.Feature<GeoJSON.Geometry, P>
): feature is GeoJSON.Feature<GeoJSON.Point, P> {
  return isPointGeometry(feature.geometry);
}

/**
 * Ekstrak [lng, lat] dari feature dengan Point geometry
 */
export function getFeatureLngLat<P = GeoJSON.GeoJsonProperties>(
  feature: GeoJSON.Feature<GeoJSON.Geometry, P>
): LngLat | null {
  if (!isPointFeature(feature)) return null;
  return toLngLat(feature.geometry.coordinates);
}

/**
 * Type guard untuk DisasterFeature Point (dari types/disaster)
 */
import type { DisasterFeature } from './disaster';

export function isDisasterPointFeature(feature: DisasterFeature): feature is DisasterFeature & {
  geometry: GeoJSON.Point;
} {
  return isPointGeometry(feature.geometry);
}

export function getDisasterFeatureLngLat(feature: DisasterFeature): LngLat | null {
  return getPointLngLat(feature.geometry);
}