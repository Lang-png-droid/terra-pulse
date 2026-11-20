import { normalizeFirmsHotspots, generateMockHotspots } from '@/lib/normalizers';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { emptyCollection, geojsonResponse } from '@/lib/geojsonResponse';
import type { DisasterFeatureCollection } from '@/types/disaster';

const FIRMS_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/geojson/{MAP_KEY}/VIIRS_SNPP_NRT/world/1';

const REVALIDATE = { next: { revalidate: 300 } } as RequestInit;

export async function GET() {
  let collection: DisasterFeatureCollection;

  try {
    const apiKey = process.env.NASA_FIRMS_MAP_KEY;
    collection = apiKey ? emptyCollection('NASA FIRMS') : emptyCollection('Mock');

    if (apiKey) {
      const res = await fetchWithTimeout(FIRMS_URL.replace('{MAP_KEY}', apiKey), REVALIDATE);
      if (res) {
        try {
          collection = normalizeFirmsHotspots(await res.json());
        } catch {
          // Malformed payload: fall through to the mock set.
        }
      }
    }

    if (collection.features.length === 0) {
      collection = generateMockHotspots();
      collection.metadata.source = 'NASA FIRMS (Mock - set NASA_FIRMS_MAP_KEY for real data)';
    }
  } catch {
    collection = emptyCollection('Unavailable');
  }

  return geojsonResponse(collection, collection.metadata.source, 300);
}
