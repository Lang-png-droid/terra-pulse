import { NextResponse } from 'next/server';
import { normalizeVolcanoes } from '@/lib/normalizers';

const PVMBG_URL = 'https://magma.vsi.esdm.go.id/api/volcanoes'; // May need adjustment
const SMITHSONIAN_URL = 'https://volcano.si.edu/eruption-results.cfm?format=json'; // Example

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response | null> {
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

export async function GET() {
  let data: any = null;
  let source = 'Static Fallback';

  // Try PVMBG
  const pvmbgRes = await fetchWithTimeout(PVMBG_URL);
  if (pvmbgRes) {
    try {
      data = await pvmbgRes.json();
      source = 'PVMBG';
    } catch {
      // ignore
    }
  }

  // Try Smithsonian if PVMBG failed
  if (!data) {
    const smithRes = await fetchWithTimeout(SMITHSONIAN_URL);
    if (smithRes) {
      try {
        data = await smithRes.json();
        source = 'Smithsonian GVP';
      } catch {
        // ignore
      }
    }
  }

  // Use static fallback if all failed
  if (!data) {
    data = INDONESIA_VOLCANOES;
    source = 'Static Fallback (Indonesia Major Volcanoes)';
  }

  const collection = normalizeVolcanoes(data);
  collection.metadata.source = source;

  return NextResponse.json(collection, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}