import { normalizeVolcanoes } from '@/lib/normalizers';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { emptyCollection, geojsonResponse } from '@/lib/geojsonResponse';
import type { DisasterFeatureCollection } from '@/types/disaster';

const PVMBG_URL = 'https://magma.vsi.esdm.go.id/api/volcanoes'; // May need adjustment
const SMITHSONIAN_URL = 'https://volcano.si.edu/eruption-results.cfm?format=json'; // Example

const REVALIDATE = { next: { revalidate: 300 } } as RequestInit;

// Fallback static volcano data for Indonesia (major volcanoes)
const INDONESIA_VOLCANOES = [
  { name: 'Merapi', lat: -7.5407, lng: 110.4453, status: 'Siaga' },
  { name: 'Sinabung', lat: 3.1711, lng: 98.392, status: 'Siaga' },
  { name: 'Semeru', lat: -8.108, lng: 112.922, status: 'Waspada' },
  { name: 'Krakatau', lat: -6.102, lng: 105.423, status: 'Waspada' },
  { name: 'Agung', lat: -8.343, lng: 115.508, status: 'Normal' },
  { name: 'Rinjani', lat: -8.42, lng: 116.47, status: 'Normal' },
  { name: 'Bromo', lat: -7.942, lng: 112.95, status: 'Waspada' },
  { name: 'Ibu', lat: 1.488, lng: 127.63, status: 'Siaga' },
  { name: 'Dukono', lat: 1.693, lng: 127.894, status: 'Waspada' },
  { name: 'Lewotolok', lat: -8.274, lng: 123.508, status: 'Siaga' },
  { name: 'Ruang', lat: 2.3, lng: 125.37, status: 'Awas' },
  { name: 'Marapi', lat: -0.38, lng: 100.474, status: 'Siaga' },
];

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
  let source = 'Static Fallback (Indonesia Major Volcanoes)';

  try {
    // Both feeds are optional; query them concurrently so a dead network costs 3s once.
    const [pvmbgData, smithsonianData] = await Promise.all([fetchJson(PVMBG_URL), fetchJson(SMITHSONIAN_URL)]);
    const data = pvmbgData ?? smithsonianData;

    if (data) {
      source = pvmbgData ? 'PVMBG' : 'Smithsonian GVP';
      collection = normalizeVolcanoes(data);
    } else {
      collection = normalizeVolcanoes(INDONESIA_VOLCANOES);
    }
  } catch {
    collection = emptyCollection('Unavailable');
    source = 'Unavailable';
  }

  return geojsonResponse(collection, source, 300);
}
