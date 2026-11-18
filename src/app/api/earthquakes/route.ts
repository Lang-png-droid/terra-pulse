import { NextResponse } from 'next/server';
import { normalizeBmkgEarthquakes, normalizeUsgsEarthquakes } from '@/lib/normalizers';

const BMKG_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json';
const BMKG_AUTOGEMPA_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json';
const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson';

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 60 } });
    clearTimeout(id);
    return res.ok ? res : null;
  } catch {
    clearTimeout(id);
    return null;
  }
}

export async function GET() {
  const errors: string[] = [];

  // Try BMKG primary
  let bmkgData: any = null;
  const bmkgRes = await fetchWithTimeout(BMKG_URL);
  if (bmkgRes) {
    try {
      bmkgData = await bmkgRes.json();
    } catch (e) {
      errors.push('BMKG parse error');
    }
  } else {
    errors.push('BMKG fetch failed');
  }

  // Try BMKG autogempa for latest
  let autogempaData: any = null;
  const autoRes = await fetchWithTimeout(BMKG_AUTOGEMPA_URL);
  if (autoRes) {
    try {
      autogempaData = await autoRes.json();
    } catch {
      errors.push('BMKG autogempa parse error');
    }
  }

  // Normalize BMKG
  let collection = normalizeBmkgEarthquakes(bmkgData || { Infogempa: { gempa: [] } });
  if (autogempaData?.Infogempa?.gempa) {
    const autoCollection = normalizeBmkgEarthquakes({ Infogempa: { gempa: [autogempaData.Infogempa.gempa] } });
    // Merge, deduplicate by coordinates
    const seen = new Set<string>();
    const merged = [...collection.features, ...autoCollection.features].filter((f) => {
      const key = `${f.geometry.coordinates[0]},${f.geometry.coordinates[1]}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    collection = { ...collection, features: merged, metadata: { ...collection.metadata, count: merged.length } };
  }

  // If BMKG returns empty, fallback to USGS
  if (collection.features.length === 0) {
    const usgsRes = await fetchWithTimeout(USGS_URL);
    if (usgsRes) {
      try {
        const usgsData = await usgsRes.json();
        collection = normalizeUsgsEarthquakes(usgsData);
      } catch {
        errors.push('USGS parse error');
      }
    } else {
      errors.push('USGS fetch failed');
    }
  }

  // Final fallback: empty collection with metadata
  if (collection.features.length === 0 && errors.length > 0) {
    collection = {
      type: 'FeatureCollection',
      features: [],
      metadata: { source: 'Fallback (all sources failed)', fetchedAt: new Date().toISOString(), count: 0 },
    };
  }

  return NextResponse.json(collection, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      'Access-Control-Allow-Origin': '*',
    },
  });
}