import { TsunamiRing, generateTsunamiRings } from '@/lib/geoMath';
import { generateCircleCoordinates } from '@/lib/normalizers';

export interface TsunamiSimulationOptions {
  epicenterLat: number;
  epicenterLng: number;
  magnitude: number;
  depth: number;
  maxRadiusKm?: number;
  intervalMinutes?: number;
  oceanDepthM?: number;
}

export interface TsunamiSimulationResult {
  rings: TsunamiRing[];
  polygons: Array<{
    coordinates: number[][][];
    etaMinutes: number;
    color: string;
    opacity: number;
  }>;
  arrivalTimes: Array<{ location: string; lat: number; lng: number; etaMinutes: number }>;
  maxRadiusKm: number;
  waveSpeedKmh: number;
}

const DEFAULT_OCEAN_DEPTH_M = 4000;
const GRAVITY = 9.80665;
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate shallow water wave speed: v = sqrt(g * h)
 */
export function calculateWaveSpeed(depthM: number = DEFAULT_OCEAN_DEPTH_M): number {
  return Math.sqrt(GRAVITY * depthM) * 3.6; // km/h
}

/**
 * Check if tsunami simulation should trigger
 * Criteria: magnitude >= 6.5 AND depth <= 70 km (submarine earthquake)
 */
export function shouldSimulateTsunami(magnitude: number, depth: number): boolean {
  return magnitude >= 6.5 && depth <= 70;
}

/**
 * Generate full tsunami simulation with polygons for rendering
 */
export function simulateTsunami(options: TsunamiSimulationOptions): TsunamiSimulationResult {
  const {
    epicenterLat,
    epicenterLng,
    magnitude,
    depth,
    maxRadiusKm = 1000,
    intervalMinutes = 15,
    oceanDepthM = DEFAULT_OCEAN_DEPTH_M,
  } = options;

  const waveSpeedKmh = calculateWaveSpeed(oceanDepthM);
  const rings = generateTsunamiRings(maxRadiusKm, intervalMinutes, oceanDepthM);

  // Convert rings to polygons for DeckGL PolygonLayer
  const polygons = rings.map((ring) => ({
    coordinates: [generateCircleCoordinates(epicenterLat, epicenterLng, ring.radiusKm)],
    etaMinutes: ring.etaMinutes,
    color: ring.color,
    opacity: ring.opacity,
  }));

  // Calculate arrival times for major coastal cities
  const arrivalTimes = calculateArrivalTimes(epicenterLat, epicenterLng, waveSpeedKmh);

  return {
    rings,
    polygons,
    arrivalTimes,
    maxRadiusKm,
    waveSpeedKmh,
  };
}

/**
 * Major coastal cities in Indonesia for ETA calculation
 */
const INDONESIAN_COASTAL_CITIES = [
  { name: 'Banda Aceh', lat: 5.55, lng: 95.32 },
  { name: 'Medan', lat: 3.59, lng: 98.67 },
  { name: 'Padang', lat: -0.95, lng: 100.35 },
  { name: 'Pekanbaru', lat: 0.51, lng: 101.45 },
  { name: 'Jambi', lat: -1.59, lng: 103.61 },
  { name: 'Bengkulu', lat: -3.80, lng: 102.26 },
  { name: 'Palembang', lat: -2.99, lng: 104.75 },
  { name: 'Bandar Lampung', lat: -5.40, lng: 105.27 },
  { name: 'Jakarta', lat: -6.21, lng: 106.85 },
  { name: 'Bandung', lat: -6.92, lng: 107.61 },
  { name: 'Semarang', lat: -6.99, lng: 110.42 },
  { name: 'Yogyakarta', lat: -7.80, lng: 110.36 },
  { name: 'Surabaya', lat: -7.25, lng: 112.75 },
  { name: 'Denpasar', lat: -8.65, lng: 115.22 },
  { name: 'Mataram', lat: -8.58, lng: 116.11 },
  { name: 'Kupang', lat: -10.17, lng: 123.61 },
  { name: 'Makassar', lat: -5.15, lng: 119.41 },
  { name: 'Palu', lat: -0.89, lng: 119.87 },
  { name: 'Manado', lat: 1.47, lng: 124.84 },
  { name: 'Gorontalo', lat: 0.54, lng: 123.06 },
  { name: 'Ambon', lat: -3.70, lng: 128.17 },
  { name: 'Jayapura', lat: -2.53, lng: 140.72 },
  { name: 'Merauke', lat: -8.48, lng: 140.40 },
];

function calculateArrivalTimes(
  epicenterLat: number,
  epicenterLng: number,
  waveSpeedKmh: number
): Array<{ location: string; lat: number; lng: number; etaMinutes: number }> {
  const arrivals: Array<{ location: string; lat: number; lng: number; etaMinutes: number }> = [];

  for (const city of INDONESIAN_COASTAL_CITIES) {
    const distanceKm = haversineDistance(epicenterLat, epicenterLng, city.lat, city.lng);
    const etaMinutes = (distanceKm / waveSpeedKmh) * 60;

    // Only include if within reasonable range (e.g., 12 hours)
    if (etaMinutes <= 720) {
      arrivals.push({
        location: city.name,
        lat: city.lat,
        lng: city.lng,
        etaMinutes: Math.round(etaMinutes),
      });
    }
  }

  // Sort by ETA
  arrivals.sort((a, b) => a.etaMinutes - b.etaMinutes);
  return arrivals.slice(0, 10); // Top 10 closest
}

/**
 * Haversine distance calculation
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format ETA for display
 */
export function formatEta(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} jam`;
  return `${hours} jam ${mins} menit`;
}

/**
 * Get tsunami alert level based on magnitude
 */
export function getTsunamiAlertLevel(magnitude: number): 'none' | 'watch' | 'advisory' | 'warning' {
  if (magnitude >= 8.0) return 'warning';
  if (magnitude >= 7.5) return 'advisory';
  if (magnitude >= 6.5) return 'watch';
  return 'none';
}

/**
 * Generate mock tsunami simulation for testing
 */
export function generateMockTsunami(): TsunamiSimulationResult {
  // Mock: 2004 Aceh earthquake epicenter
  return simulateTsunami({
    epicenterLat: 3.3,
    epicenterLng: 95.95,
    magnitude: 9.1,
    depth: 30,
    maxRadiusKm: 2000,
  });
}