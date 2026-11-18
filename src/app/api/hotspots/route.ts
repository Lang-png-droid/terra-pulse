import { NextResponse } from 'next/server';
import { normalizeFirmsHotspots, generateMockHotspots } from '@/lib/normalizers';

const FIRMS_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/world/1';
// Alternative: GeoJSON format
const FIRMS_GEOJSON_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/geojson/{MAP_KEY}/VIIRS_SNPP_NRT/world/1';

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 300 } });
    clearTimeout(id);
    return res.ok ? res : null;
  } catch {
    clearTimeout(id);
    return null;
  }
}

export async function GET() {
  const apiKey = process.env.NASA_FIRMS_MAP_KEY;
  let collection = { type: 'FeatureCollection', features: [] as any[], metadata: { source: '', fetchedAt: new Date().toISOString(), count: 0 } };
  let usedMock = false;

  if (apiKey) {
    const url = FIRMS_GEOJSON_URL.replace('{MAP_KEY}', apiKey);
    const res = await fetchWithTimeout(url);
    if (res) {
      try {
        const data = await res.json();
        collection = normalizeFirmsHotspots(data);
      } catch {
        // Fall through to mock
      }
    }
  }

  if (collection.features.length === 0) {
    usedMock = true;
    collection = generateMockHotspots();
    collection.metadata.source = 'NASA FIRMS (Mock - set NASA_FIRMS_MAP_KEY for real data)';
  }

  return NextResponse.json(collection, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}