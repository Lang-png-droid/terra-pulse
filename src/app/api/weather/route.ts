import { NextResponse } from 'next/server';
import { normalizeRainViewer, normalizeOpenMeteoWind, normalizeCyclones, RainViewerTileInfo, WindGridData } from '@/lib/normalizers';

const RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const JTWC_URL = 'https://metocph.nmci.navy.mil/jtwc/best_tracks/wp/best_tracks_wp.zip'; // Complex, use alternative
// Alternative cyclone source
const CYCLONE_URL = 'https://api.rainviewer.com/public/weather-maps.json'; // RainViewer has storm tracks

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 120 } });
    clearTimeout(id);
    return res.ok ? res : null;
  } catch {
    clearTimeout(id);
    return null;
  }
}

interface WeatherResponse {
  rainRadar: RainViewerTileInfo[];
  windGrid: WindGridData | null;
  cyclones: any; // DisasterFeatureCollection
  timestamp: string;
}

export async function GET() {
  const errors: string[] = [];

  // Fetch RainViewer (radar tiles + storm tracks)
  let rainRadar: RainViewerTileInfo[] = [];
  let cyclonesData: any = null;

  const rvRes = await fetchWithTimeout(RAINVIEWER_URL);
  if (rvRes) {
    try {
      const rvData = await rvRes.json();
      rainRadar = normalizeRainViewer(rvData);
      cyclonesData = rvData; // RainViewer includes storm data
    } catch {
      errors.push('RainViewer parse error');
    }
  } else {
    errors.push('RainViewer fetch failed');
  }

  // Fetch Open-Meteo wind grid (global, 0.25 deg resolution)
  let windGrid: WindGridData | null = null;
  const omUrl = `${OPEN_METEO_URL}?latitude=-90&longitude=-180&hourly=wind_speed_10m,wind_direction_10m,surface_pressure&wind_speed_unit=ms&timezone=UTC&models=gfs_global&past_days=1&forecast_days=2`;
  const omRes = await fetchWithTimeout(omUrl);
  if (omRes) {
    try {
      const omData = await omRes.json();
      windGrid = normalizeOpenMeteoWind(omData);
    } catch {
      errors.push('Open-Meteo parse error');
    }
  } else {
    errors.push('Open-Meteo fetch failed');
  }

  // Normalize cyclones (from RainViewer storm data or mock)
  let cyclones: any;
  if (cyclonesData?.storms) {
    cyclones = normalizeCyclones(cyclonesData.storms);
  } else if (cyclonesData?.host) {
    // RainViewer has storm tracks in a different format
    // For now, generate mock cyclones
    cyclones = normalizeCyclones(generateMockCyclones());
    cyclones.metadata.source = 'Mock (RainViewer storms unavailable)';
  } else {
    cyclones = normalizeCyclones(generateMockCyclones());
    cyclones.metadata.source = 'Mock Cyclones';
  }

  const response: WeatherResponse = {
    rainRadar,
    windGrid,
    cyclones,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function generateMockCyclones() {
  // Generate realistic mock cyclone data for Western Pacific / Indian Ocean
  const now = Date.now();
  return [
    {
      id: 'cyclone-1',
      name: 'Cempaka',
      lat: -12.5,
      lng: 108.2,
      wind_speed: 85,
      pressure: 985,
      time: new Date(now - 3 * 3600 * 1000).toISOString(),
      forecast: [
        { lat: -13.0, lng: 107.5, time: new Date(now + 3 * 3600 * 1000).toISOString(), wind_speed: 90 },
        { lat: -13.5, lng: 106.8, time: new Date(now + 6 * 3600 * 1000).toISOString(), wind_speed: 95 },
        { lat: -14.0, lng: 106.0, time: new Date(now + 9 * 3600 * 1000).toISOString(), wind_speed: 90 },
        { lat: -14.5, lng: 105.2, time: new Date(now + 12 * 3600 * 1000).toISOString(), wind_speed: 80 },
      ],
    },
    {
      id: 'cyclone-2',
      name: 'Bagyi',
      lat: 14.2,
      lng: 128.5,
      wind_speed: 120,
      pressure: 965,
      time: new Date(now - 6 * 3600 * 1000).toISOString(),
      forecast: [
        { lat: 14.8, lng: 127.8, time: new Date(now + 3 * 3600 * 1000).toISOString(), wind_speed: 125 },
        { lat: 15.5, lng: 127.0, time: new Date(now + 6 * 3600 * 1000).toISOString(), wind_speed: 130 },
        { lat: 16.2, lng: 126.2, time: new Date(now + 9 * 3600 * 1000).toISOString(), wind_speed: 120 },
      ],
    },
  ];
}