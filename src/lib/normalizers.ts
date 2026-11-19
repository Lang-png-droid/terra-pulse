/**
 * Normalizers: transform external API responses to unified DisasterFeatureCollection
 */

import {
  DisasterFeatureCollection,
  DisasterFeature,
  DisasterProperties,
  EarthquakeFeature,
  HotspotFeature,
  VolcanoFeature,
  CycloneFeature,
  TsunamiFeature,
  FloodFeature,
  NewsArticle,
} from '@/types/disaster';
import { haversineDistance, generateTsunamiRings } from './geoMath';

// Re-export NewsArticle for API routes
export type { NewsArticle } from '@/types/disaster';

/**
 * Generate mock hotspot data when NASA FIRMS API key not available
 */
export function generateMockHotspots(centerLat: number = -2.5, centerLng: number = 118): DisasterFeatureCollection {
  const features: HotspotFeature[] = [];
  const regions = [
    { name: 'Sumatera', lat: -0.5, lng: 101.5 },
    { name: 'Kalimantan', lat: -1.5, lng: 113.5 },
    { name: 'Sulawesi', lat: -2.5, lng: 119.5 },
    { name: 'Papua', lat: -4.5, lng: 138.5 },
  ];

  let id = 0;
  for (const region of regions) {
    const count = Math.floor(Math.random() * 8) + 3;
    for (let i = 0; i < count; i++) {
      const lat = region.lat + (Math.random() - 0.5) * 3;
      const lng = region.lng + (Math.random() - 0.5) * 3;
      const brightness = 300 + Math.random() * 150;
      const confidence = Math.floor(Math.random() * 30) + 70;
      const daysAgo = Math.floor(Math.random() * 7);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      features.push({
        type: 'Feature',
        id: `hotspot-mock-${id++}`,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          type: 'hotspot',
          title: `Titik Api: ${region.name}`,
          brightness,
          confidence,
          acqDate: date.toISOString().split('T')[0],
          timestamp: date.toISOString(),
          source: 'NASA FIRMS (Mock)',
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
    metadata: { source: 'NASA FIRMS (Mock)', fetchedAt: new Date().toISOString(), count: features.length },
  };
}

/**
 * Normalize BMKG earthquake data (gempaterkini.json & autogempa.json)
 */
export function normalizeBmkgEarthquakes(data: any): DisasterFeatureCollection {
  const features: EarthquakeFeature[] = [];

  // Handle gempaterkini.json format (array of earthquakes)
  const quakes = Array.isArray(data) ? data : data?.Infogempa?.gempa || [];

  for (const eq of quakes) {
    const mag = parseFloat(eq.Magnitude || eq.mag || '0');
    const depth = parseFloat(eq.Kedalaman?.replace(' km', '') || eq.depth || '0');
    const lat = parseFloat(eq.Lintang || eq.lat || '0');
    const lng = parseFloat(eq.Bujur || eq.lon || '0');
    const timeStr = eq.Tanggal || eq.DateTime || eq.time || new Date().toISOString();

    if (!lat || !lng || mag < 1) continue;

    const tsunamiAlert = mag >= 6.5 && depth <= 70;

    // Parse BMKG date format: "18 Nov 2026" or "2026-11-18T04:41:32+00:00"
    let timestamp: string;
    try {
      const parsed = new Date(timeStr);
      if (isNaN(parsed.getTime())) {
        // Try parsing "18 Nov 2026" format
        const parts = timeStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
        if (parts) {
          const monthMap: Record<string, number> = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          const day = parseInt(parts[1], 10);
          const month = monthMap[parts[2]] || 0;
          const year = parseInt(parts[3], 10);
          timestamp = new Date(year, month, day).toISOString();
        } else {
          timestamp = new Date().toISOString();
        }
      } else {
        timestamp = parsed.toISOString();
      }
    } catch {
      timestamp = new Date().toISOString();
    }

    features.push({
      type: 'Feature',
      id: `eq-bmkg-${eq.Waktu || Date.now()}-${lat}-${lng}`,
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        type: 'earthquake',
        title: `Gempa ${mag} SR ${eq.Wilayah || ''}`,
        magnitude: mag,
        depth,
        tsunamiAlert,
        timestamp,
        source: 'BMKG',
        url: 'https://bmkg.go.id',
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
    metadata: { source: 'BMKG', fetchedAt: new Date().toISOString(), count: features.length },
  };
}

/**
 * Normalize USGS earthquake GeoJSON
 */
export function normalizeUsgsEarthquakes(data: any): DisasterFeatureCollection {
  const features: EarthquakeFeature[] = [];

  for (const feat of data.features || []) {
    const props = feat.properties;
    const coords = feat.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    const mag = props.mag || 0;
    if (mag < 4.5) continue; // Filter per spec

    const [lng, lat, depth] = coords;
    const tsunamiAlert = mag >= 6.5 && (depth || 0) <= 70;

    features.push({
      type: 'Feature',
      id: `eq-usgs-${feat.id}`,
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        type: 'earthquake',
        title: `Gempa ${mag} Mw ${props.place || ''}`,
        magnitude: mag,
        depth: depth || 0,
        tsunamiAlert,
        timestamp: new Date(props.time).toISOString(),
        source: 'USGS',
        url: props.url,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
    metadata: { source: 'USGS', fetchedAt: new Date().toISOString(), count: features.length },
  };
}

/**
 * Normalize NASA FIRMS hotspots (CSV or GeoJSON)
 */
export function normalizeFirmsHotspots(data: any): DisasterFeatureCollection {
  const features: HotspotFeature[] = [];

  // Handle GeoJSON format
  if (data.type === 'FeatureCollection') {
    for (const feat of data.features || []) {
      const props = feat.properties;
      const coords = feat.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;

      const [lng, lat] = coords;
      features.push({
        type: 'Feature',
        id: `hotspot-firms-${props.FRP || Date.now()}-${lat}-${lng}`,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          type: 'hotspot',
          title: `Hotspot ${props.confidence || ''}%`,
          brightness: props.brightness || props.bright_t31 || 300,
          confidence: props.confidence || 80,
          acqDate: props.acq_date || new Date().toISOString().split('T')[0],
          timestamp: new Date(`${props.acq_date}T${props.acq_time || '00:00'}`).toISOString(),
          source: 'NASA FIRMS',
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
    metadata: { source: 'NASA FIRMS', fetchedAt: new Date().toISOString(), count: features.length },
  };
}

/**
 * Normalize PVMBG/Smithsonian volcano data
 */
export function normalizeVolcanoes(data: any): DisasterFeatureCollection {
  const features: VolcanoFeature[] = [];

  // Handle various formats
  const volcanoes = Array.isArray(data) ? data : data?.volcanoes || data?.features || [];

  for (const vol of volcanoes) {
    const lat = parseFloat(vol.latitude || vol.lat || vol.Lintang || '0');
    const lng = parseFloat(vol.longitude || vol.lon || vol.Bujur || '0');
    if (!lat || !lng) continue;

    let alertLevel: 'Normal' | 'Waspada' | 'Siaga' | 'Awas' = 'Normal';
    const status = (vol.status || vol.alert_level || vol.level || '').toLowerCase();
    if (status.includes('awas') || status.includes('red')) alertLevel = 'Awas';
    else if (status.includes('siaga') || status.includes('orange')) alertLevel = 'Siaga';
    else if (status.includes('waspada') || status.includes('yellow')) alertLevel = 'Waspada';

    const hazardRadius = alertLevel === 'Awas' ? 7 : alertLevel === 'Siaga' ? 5 : alertLevel === 'Waspada' ? 3 : 1;

    features.push({
      type: 'Feature',
      id: `volcano-${vol.name || vol.nama || Date.now()}-${lat}-${lng}`,
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        type: 'volcano',
        title: `${vol.name || vol.nama || 'Gunung Api'} (${alertLevel})`,
        alertLevel,
        hazardRadiusKm: hazardRadius,
        timestamp: new Date(vol.last_eruption || vol.updated_at || Date.now()).toISOString(),
        source: 'PVMBG / GVP',
        url: vol.url,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
    metadata: { source: 'PVMBG / GVP', fetchedAt: new Date().toISOString(), count: features.length },
  };
}

/**
 * Normalize RainViewer radar tiles metadata
 */
export interface RainViewerTileInfo {
  timestamp: number;
  path: string;
  bounds: [[number, number], [number, number]];
}

export function normalizeRainViewer(data: any): RainViewerTileInfo[] {
  const tiles: RainViewerTileInfo[] = [];

  // RainViewer returns { version, generated, host, radar: { past: [...], nowcast: [...] } }
  const past = data?.radar?.past || [];
  const nowcast = data?.radar?.nowcast || [];

  // RainViewer's tile URL is {host}{path}/{size}/{z}/{x}/{y}/{color}/{smooth}_{snow}.png;
  // omitting the trailing color/smooth/snow segments makes every tile 404.
  // Newest frame first, so consumers that use [0] get a frame that is still live.
  for (const frame of [...nowcast].reverse().concat([...past].reverse())) {
    if (!frame.path) continue;
    tiles.push({
      timestamp: frame.time * 1000,
      path: `${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
      bounds: [[-90, -180], [90, 180]], // Global coverage
    });
  }

  return tiles;
}

/**
 * Normalize Open-Meteo wind/pressure data to wind particle grid
 */
export interface WindGridData {
  uComponent: number[][]; // [lat][lng] m/s
  vComponent: number[][]; // [lat][lng] m/s
  pressure: number[][]; // [lat][lng] hPa
  lats: number[];
  lngs: number[];
  time: number;
}

export function normalizeOpenMeteoWind(data: any): WindGridData | null {
  const hourly = data?.hourly;
  if (!hourly) return null;

  // Open-Meteo returns 1D arrays for each variable at each lat/lng
  // We need to reshape based on the grid dimensions
  const lats = data?.latitudes || [];
  const lngs = data?.longitudes || [];

  if (!lats.length || !lngs.length) return null;

  const uComp = hourly.wind_speed_10m || hourly.u_component || [];
  const vComp = hourly.wind_speed_10m || hourly.v_component || []; // Fallback
  const pressure = hourly.surface_pressure || [];

  // For simplicity, return first timestep as grid
  // In production, interpolate across time
  return {
    uComponent: reshapeToGrid(uComp[0] || [], lats.length, lngs.length),
    vComponent: reshapeToGrid(vComp[0] || [], lats.length, lngs.length),
    pressure: reshapeToGrid(pressure[0] || [], lats.length, lngs.length),
    lats,
    lngs,
    time: (hourly.time?.[0] || Date.now() / 1000) * 1000,
  };
}

function reshapeToGrid(arr: number[], rows: number, cols: number): number[][] {
  const grid: number[][] = [];
  for (let i = 0; i < rows; i++) {
    grid.push(arr.slice(i * cols, (i + 1) * cols));
  }
  return grid;
}

/**
 * Normalize JTWC/NOAA cyclone track data
 */
export function normalizeCyclones(data: any): DisasterFeatureCollection {
  const features: CycloneFeature[] = [];

  const storms = Array.isArray(data) ? data : data?.storms || data?.features || [];

  for (const storm of storms) {
    const lat = parseFloat(storm.lat || storm.latitude || '0');
    const lng = parseFloat(storm.lng || storm.longitude || '0');
    if (!lat || !lng) continue;

    const windSpeed = parseFloat(storm.wind_speed || storm.max_wind || '0');
    const pressure = parseFloat(storm.pressure || storm.min_pressure || '1010');

    // Parse forecast track if available
    const forecastTrack = (storm.forecast || storm.track || []).map((pt: any) => ({
      lat: parseFloat(pt.lat),
      lng: parseFloat(pt.lng),
      time: pt.time || pt.valid_time,
      windSpeedKmh: parseFloat(pt.wind_speed || pt.max_wind || '0'),
    }));

    features.push({
      type: 'Feature',
      id: `cyclone-${storm.id || storm.name || Date.now()}`,
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        type: 'cyclone',
        title: `${storm.name || 'Siklone'} ${windSpeed} km/h`,
        windSpeedKmh: windSpeed,
        pressureHpa: pressure,
        forecastTrack,
        timestamp: new Date(storm.time || storm.updated_at || Date.now()).toISOString(),
        source: 'JTWC / NOAA',
        url: storm.url,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
    metadata: { source: 'JTWC / NOAA', fetchedAt: new Date().toISOString(), count: features.length },
  };
}

/**
 * Generate tsunami simulation rings from earthquake
 */
export interface TsunamiSimulationParams {
  lat: number;
  lng: number;
  magnitude: number;
  depth: number;
  maxRadiusKm?: number;
}

export function generateTsunamiSimulation(params: TsunamiSimulationParams): DisasterFeatureCollection {
  const { lat, lng, magnitude, depth, maxRadiusKm = 1000 } = params;

  if (magnitude < 6.5 || depth > 70) {
    return { type: 'FeatureCollection', features: [], metadata: { source: 'Simulation', fetchedAt: new Date().toISOString(), count: 0 } };
  }

  const features: TsunamiFeature[] = [];
  const rings = generateTsunamiRings(maxRadiusKm);

  for (const ring of rings) {
    features.push({
      type: 'Feature',
      id: `tsunami-ring-${ring.etaMinutes}-${lat}-${lng}`,
      geometry: {
        type: 'Polygon',
        coordinates: [generateCircleCoordinates(lat, lng, ring.radiusKm)],
      },
      properties: {
        type: 'tsunami',
        title: `Tsunami ETA ${ring.etaMinutes} min`,
        etaMinutes: ring.etaMinutes,
        sourceEarthquakeId: `eq-${lat}-${lng}`,
        timestamp: new Date().toISOString(),
        source: 'Simulation',
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
    metadata: { source: 'Tsunami Simulation', fetchedAt: new Date().toISOString(), count: features.length },
  };
}

export function generateCircleCoordinates(centerLat: number, centerLng: number, radiusKm: number, points: number = 64): number[][] {
  const coords: number[][] = [];
  const angularRadius = radiusKm / 6371; // radians

  for (let i = 0; i <= points; i++) {
    const bearing = (i / points) * 2 * Math.PI;
    const latRad = Math.asin(
      Math.sin(centerLat * Math.PI / 180) * Math.cos(angularRadius) +
      Math.cos(centerLat * Math.PI / 180) * Math.sin(angularRadius) * Math.cos(bearing)
    );
    const lngRad = (centerLng * Math.PI / 180) + Math.atan2(
      Math.sin(bearing) * Math.sin(angularRadius) * Math.cos(centerLat * Math.PI / 180),
      Math.cos(angularRadius) - Math.sin(centerLat * Math.PI / 180) * Math.sin(latRad)
    );
    coords.push([lngRad * 180 / Math.PI, latRad * 180 / Math.PI]);
  }
  return coords;
}

/**
 * Mock news articles for disasters (replace with real RSS/API later)
 */
export function generateMockNews(): NewsArticle[] {
  const articles: NewsArticle[] = [
    {
      id: 'news-1',
      title: 'Gempa Magnitudo 6.2 Guncang Jawa Barat, Dirasa Hingga Jakarta',
      summary: 'Gempa bumi berkekuatan 6,2 Magnitudo mengguncang wilayah Jawa Barat pada hari ini. Pusat gempa berada di daratan dengan kedalaman 10 km. Belum ada laporan kerusakan besar.',
      url: 'https://bmkg.go.id',
      source: 'BMKG',
      publishedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      disasterTypes: ['earthquake'],
      location: { lat: -6.5, lng: 106.8, name: 'Jawa Barat' },
    },
    {
      id: 'news-2',
      title: 'Kebakaran Hutan Lintas Batas di Kalimantan Tengah Memperluas',
      summary: 'Titik api satelit terdetek meningkat signifikan di kawasan hutan gambut Kalimantan Tengah. BPBD mengeluarkan status darurat kebakaran hutan.',
      url: 'https://bnpb.go.id',
      source: 'BNPB',
      publishedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      disasterTypes: ['hotspot'],
      location: { lat: -2.2, lng: 113.9, name: 'Kalimantan Tengah' },
    },
    {
      id: 'news-3',
      title: 'Gunung Merapi Status Naik ke Siaga, Radius Bahaya 5 KM',
      summary: 'PVMBG menaikkan status Gunung Merapi dari Waspada ke Siaga mulai hari ini. Masyarakat dilarang mendaki dalam radius 5 km dari puncak.',
      url: 'https://magma.vsi.esdm.go.id',
      source: 'PVMBG',
      publishedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      disasterTypes: ['volcano'],
      location: { lat: -7.54, lng: 110.44, name: 'Gunung Merapi' },
    },
    {
      id: 'news-4',
      title: 'Siklone Tropis "Cempaka" Terbentuk di Selatan Jawa, Berpotensi Hujan Lebat',
      summary: 'Siklone tropis Cempaka teramati di Laut India selatan Jawa. BMKG memperingatkan potensi hujan intensitas tinggi dan angin kencang di Pulau Jawa 3 hari ke depan.',
      url: 'https://bmkg.go.id',
      source: 'BMKG',
      publishedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      disasterTypes: ['cyclone', 'storm'],
      location: { lat: -12.5, lng: 108.2, name: 'Laut India Selatan' },
    },
    {
      id: 'news-5',
      title: 'Banjir Bandang Sumedang Menelan 3 Korban Jiwa',
      summary: 'Hujan deras mengguyur Sumedang memicu banjir bandang di tiga kecamatan. Tim SAR masih mencari korban hilang.',
      url: 'https://bnpb.go.id',
      source: 'BNPB',
      publishedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      disasterTypes: ['flood'],
      location: { lat: -6.85, lng: 107.92, name: 'Sumedang' },
    },
  ];

  return articles;
}

/**
 * Calculate distance from user location to all disaster features
 */
export function addDistanceToFeatures(
  features: DisasterFeature[],
  userLat: number,
  userLng: number
): DisasterFeature[] {
  return features.map((feature) => {
    const coords = feature.geometry.coordinates;
    if (feature.geometry.type === 'Point' && Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number') {
      const [lng, lat] = coords as [number, number];
      const distance = haversineDistance(userLat, userLng, lat, lng);
      return {
        ...feature,
        properties: { ...feature.properties, distanceKm: Math.round(distance * 10) / 10 },
      };
    }
    return feature;
  });
}

/**
 * Filter features by type and visibility
 */
export function filterFeaturesByType(
  features: DisasterFeature[],
  types: string[],
  visibility: Record<string, boolean>
): DisasterFeature[] {
  return features.filter((f) => {
    const type = f.properties.type;
    return types.includes(type) && visibility[type] !== false;
  });
}

/**
 * Sort features by distance (nearest first) or magnitude (largest first)
 */
export function sortFeatures(
  features: DisasterFeature[],
  by: 'distance' | 'magnitude' | 'time' = 'time'
): DisasterFeature[] {
  return [...features].sort((a, b) => {
    switch (by) {
      case 'distance':
        return (a.properties.distanceKm || Infinity) - (b.properties.distanceKm || Infinity);
      case 'magnitude':
        return (b.properties.magnitude || 0) - (a.properties.magnitude || 0);
      case 'time':
      default:
        return new Date(b.properties.timestamp).getTime() - new Date(a.properties.timestamp).getTime();
    }
  });
}