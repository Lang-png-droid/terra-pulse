import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const MAX_QUERY_LENGTH = 200;

export interface GeocodeResult {
  lat: number;
  lon: number;
  name: string;
}

export interface GeocodeResponse {
  results: GeocodeResult[];
}

/**
 * Nominatim proxy. AGENTS.md §2 forbids client-side external fetches prone to CORS
 * and rate limits; a blackholed network must still answer 200 with an empty result.
 */
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);
  const empty: GeocodeResponse = { results: [] };

  if (!query) return NextResponse.json(empty, { status: 200 });

  try {
    const res = await fetchWithTimeout(
      `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=id`,
      { headers: { 'User-Agent': 'TerraPulse/1.0' } },
    );
    if (!res) return NextResponse.json(empty, { status: 200 });

    const data: unknown = await res.json();
    const first = Array.isArray(data) ? data[0] : undefined;
    const lat = Number(first?.lat);
    const lon = Number(first?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json(empty, { status: 200 });

    return NextResponse.json(
      { results: [{ lat, lon, name: String(first?.display_name ?? query) }] } satisfies GeocodeResponse,
      { status: 200 },
    );
  } catch {
    return NextResponse.json(empty, { status: 200 });
  }
}
