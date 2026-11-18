export interface DisasterFeatureCollection {
  type: 'FeatureCollection';
  features: DisasterFeature[];
  metadata: {
    source: string;
    fetchedAt: string;
    count: number;
  };
}

export interface DisasterFeature {
  type: 'Feature';
  id: string;
  geometry: GeoJSON.Point | GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: DisasterProperties;
}

export type DisasterType =
  | 'earthquake'
  | 'tsunami'
  | 'volcano'
  | 'hotspot'
  | 'cyclone'
  | 'flood'
  | 'storm';

export interface DisasterProperties {
  type: DisasterType;
  title: string;
  description?: string;
  magnitude?: number;
  depth?: number;
  alertLevel?: 'Normal' | 'Waspada' | 'Siaga' | 'Awas';
  brightness?: number;
  confidence?: number;
  acqDate?: string;
  hazardRadiusKm?: number;
  windSpeedKmh?: number;
  pressureHpa?: number;
  etaMinutes?: number;
  distanceKm?: number;
  timestamp: string;
  source: string;
  url?: string;
}

export interface EarthquakeFeature extends DisasterFeature {
  properties: DisasterProperties & {
    type: 'earthquake';
    magnitude: number;
    depth: number;
    tsunamiAlert?: boolean;
  };
}

export interface HotspotFeature extends DisasterFeature {
  properties: DisasterProperties & {
    type: 'hotspot';
    brightness: number;
    confidence: number;
    acqDate: string;
  };
}

export interface VolcanoFeature extends DisasterFeature {
  properties: DisasterProperties & {
    type: 'volcano';
    alertLevel: 'Normal' | 'Waspada' | 'Siaga' | 'Awas';
    hazardRadiusKm: number;
  };
}

export interface CycloneFeature extends DisasterFeature {
  properties: DisasterProperties & {
    type: 'cyclone';
    windSpeedKmh: number;
    pressureHpa: number;
    forecastTrack?: Array<{ lat: number; lng: number; time: string; windSpeedKmh: number }>;
  };
}

export interface TsunamiFeature extends DisasterFeature {
  properties: DisasterProperties & {
    type: 'tsunami';
    etaMinutes: number;
    sourceEarthquakeId: string;
  };
}

export interface FloodFeature extends DisasterFeature {
  properties: DisasterProperties & {
    type: 'flood';
    riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
  };
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  disasterTypes: DisasterType[];
  location?: { lat: number; lng: number; name: string };
}

export interface DeviceCapability {
  isMobile: boolean;
  isLowEnd: boolean;
  maxParticles: number;
  maxDpr: number;
  prefersReducedMotion: boolean;
}

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface TimelineState {
  currentTime: number; // Unix timestamp
  startTime: number; // -24h from now
  endTime: number; // +48h from now
  stepHours: number; // 3 hours
  isPlaying: boolean;
  speed: number; // 1x, 2x, 4x
}

export interface LayerVisibility {
  earthquakes: boolean;
  hotspots: boolean;
  volcanoes: boolean;
  rainRadar: boolean;
  windParticles: boolean;
  tsunamiRings: boolean;
  cyclones: boolean;
  floods: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  earthquakes: true,
  hotspots: true,
  volcanoes: true,
  rainRadar: true,
  windParticles: true,
  tsunamiRings: false,
  cyclones: true,
  floods: false,
};

export const LAYER_LABELS: Record<keyof LayerVisibility, string> = {
  earthquakes: 'Gempa Bumi',
  hotspots: 'Titik Api (Karhutla)',
  volcanoes: 'Gunung Api',
  rainRadar: 'Curah Hujan',
  windParticles: 'Angin / Topan',
  tsunamiRings: 'Simulasi Tsunami',
  cyclones: 'Siklone Tropis',
  floods: 'Banjir Bandang',
};

export const LAYER_COLORS: Record<keyof LayerVisibility, string> = {
  earthquakes: '#FF4444',
  hotspots: '#FF8800',
  volcanoes: '#CC0000',
  rainRadar: '#00AAFF',
  windParticles: '#00FFAA',
  tsunamiRings: '#0088FF',
  cyclones: '#AA00FF',
  floods: '#0066CC',
};