import { normalizeBmkgEarthquakes, normalizeUsgsEarthquakes } from '@/lib/normalizers';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { emptyCollection, geojsonResponse } from '@/lib/geojsonResponse';
import type { DisasterFeatureCollection } from '@/types/disaster';

const BMKG_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json';
const BMKG_AUTOGEMPA_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json';
const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson';

const REVALIDATE = { next: { revalidate: 60 } } as RequestInit;

async function fetchJson(url: string): Promise<any | null> {
  const res = await fetchWithTimeout(url, REVALIDATE);
  if (!res) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  let collection: DisasterFeatureCollection;
  let source = 'BMKG';

  try {
    // Independent feeds: one 3s window total, not one per source.
    const [bmkgData, autogempaData, usgsData] = await Promise.all([
      fetchJson(BMKG_URL),
      fetchJson(BMKG_AUTOGEMPA_URL),
      fetchJson(USGS_URL),
    ]);

    collection = normalizeBmkgEarthquakes(bmkgData || { Infogempa: { gempa: [] } });
    if (autogempaData?.Infogempa?.gempa) {
      const autoCollection = normalizeBmkgEarthquakes({ Infogempa: { gempa: [autogempaData.Infogempa.gempa] } });
      const seen = new Set<string>();
      const merged = [...collection.features, ...autoCollection.features].filter((f) => {
        const key = `${f.geometry.coordinates[0]},${f.geometry.coordinates[1]}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      collection = { ...collection, features: merged, metadata: { ...collection.metadata, count: merged.length } };
    }

    if (collection.features.length === 0) {
      source = 'USGS';
      collection = normalizeUsgsEarthquakes(usgsData ?? {});
    }
  } catch {
    collection = emptyCollection('Unavailable');
    source = 'Unavailable';
  }

  return geojsonResponse(collection, source, 60);
}
