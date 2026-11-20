import { NextResponse } from 'next/server';
import { normalizeRainViewer, normalizeOpenMeteoWind, normalizeCyclones, RainViewerTileInfo, WindGridData } from '@/lib/normalizers';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export interface WeatherResponse {
  radar: RainViewerTileInfo[] | null;
  weather: WindGridData | null;
  cyclones: Record<string, unknown>;
  timestamp: string;
  status: 'ok' | 'degraded';
  errors?: string[];
}

type SourceResult<T> = { data: T } | { error: string };

/**
 * Fetch and normalize are reported separately: a normalizer throw used to be
 * swallowed into `null` and logged as "fetch failed", which hid parser bugs.
 */
async function loadRainViewer(): Promise<SourceResult<{ radar: RainViewerTileInfo[]; cyclones: any }>> {
  const res = await fetchWithTimeout(RAINVIEWER_URL, { next: { revalidate: 120 } } as RequestInit);
  if (!res) return { error: 'RainViewer fetch failed or timeout' };
  try {
    const data = await res.json();
    return { data: { radar: normalizeRainViewer(data), cyclones: data } };
  } catch {
    return { error: 'RainViewer response could not be parsed' };
  }
}

async function loadOpenMeteo(): Promise<SourceResult<WindGridData | null>> {
  const url = `${OPEN_METEO_URL}?latitude=-90&longitude=-180&hourly=wind_speed_10m,wind_direction_10m,surface_pressure&wind_speed_unit=ms&timezone=UTC&models=gfs_global&past_days=1&forecast_days=2`;
  const res = await fetchWithTimeout(url, { next: { revalidate: 120 } } as RequestInit);
  if (!res) return { error: 'Open-Meteo fetch failed or timeout' };
  try {
    return { data: normalizeOpenMeteoWind(await res.json()) };
  } catch {
    return { error: 'Open-Meteo response could not be parsed' };
  }
}

function generateMockCyclones() {
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

function buildCyclones(rainViewer: { cyclones: any } | null) {
  const cyclonesData = rainViewer?.cyclones;
  if (cyclonesData?.storms) return normalizeCyclones(cyclonesData.storms);
  const cyclones = normalizeCyclones(generateMockCyclones());
  cyclones.metadata.source = cyclonesData?.host ? 'Mock (RainViewer storms unavailable)' : 'Mock Cyclones';
  return cyclones;
}

export async function GET() {
  const errors: string[] = [];

  try {
    // Independent sources: one 3s window, not 3s each in series.
    const [rainViewer, windGrid] = await Promise.all([loadRainViewer(), loadOpenMeteo()]);

    if ('error' in rainViewer) errors.push(rainViewer.error);
    if ('error' in windGrid) errors.push(windGrid.error);

    const response: WeatherResponse = {
      radar: 'data' in rainViewer ? rainViewer.data.radar : null,
      weather: 'data' in windGrid ? windGrid.data : null,
      cyclones: buildCyclones('data' in rainViewer ? rainViewer.data : null) as unknown as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      status: errors.length > 0 ? 'degraded' : 'ok',
      errors: errors.length > 0 ? errors : undefined,
    };

    // Always 200, even degraded: the map must never lose the stream.
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    // Safety net: never return 500 from this route.
    return NextResponse.json(
      {
        radar: null,
        weather: null,
        cyclones: {},
        timestamp: new Date().toISOString(),
        status: 'degraded',
        errors: ['Weather handler error'],
      } satisfies WeatherResponse,
      { status: 200 },
    );
  }
}
