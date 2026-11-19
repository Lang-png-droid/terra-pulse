'use client';

import React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';


import maplibregl, { Map as MapLibreMap, StyleSpecification, MapOptions } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Feature, Polygon, MultiPolygon, LineString } from 'geojson';

// Primary CartoDB dark-matter style URL
const CARTODB_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Simplified Indonesia archipelago GeoJSON (coastline polygons)
const INDONESIA_GEOJSON: FeatureCollection<Polygon | MultiPolygon> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Sumatra' }, geometry: { type: 'Polygon', coordinates: [[[95.0, 6.0], [106.0, 6.0], [106.0, -6.0], [95.0, -6.0], [95.0, 6.0]]] } },
    { type: 'Feature', properties: { name: 'Java' }, geometry: { type: 'Polygon', coordinates: [[[105.0, -6.0], [115.0, -6.0], [115.0, -9.0], [105.0, -9.0], [105.0, -6.0]]] } },
    { type: 'Feature', properties: { name: 'Kalimantan' }, geometry: { type: 'Polygon', coordinates: [[[108.0, 4.0], [119.0, 4.0], [119.0, -4.0], [108.0, -4.0], [108.0, 4.0]]] } },
    { type: 'Feature', properties: { name: 'Sulawesi' }, geometry: { type: 'Polygon', coordinates: [[[119.0, 2.0], [125.0, 2.0], [125.0, -6.0], [119.0, -6.0], [119.0, 2.0]]] } },
    { type: 'Feature', properties: { name: 'Papua' }, geometry: { type: 'Polygon', coordinates: [[[130.0, 1.0], [141.0, 1.0], [141.0, -10.0], [130.0, -10.0], [130.0, 1.0]]] } },
    { type: 'Feature', properties: { name: 'Nusa Tenggara' }, geometry: { type: 'MultiPolygon', coordinates: [
      [[[115.0, -8.0], [120.0, -8.0], [120.0, -11.0], [115.0, -11.0], [115.0, -8.0]]],
      [[[120.0, -8.0], [124.0, -8.0], [124.0, -11.0], [120.0, -11.0], [120.0, -8.0]]]
    ] } },
    { type: 'Feature', properties: { name: 'Maluku' }, geometry: { type: 'MultiPolygon', coordinates: [
      [[[126.0, -2.0], [132.0, -2.0], [132.0, -8.0], [126.0, -8.0], [126.0, -2.0]]]
    ] } }
  ]
};

// Scanline grid GeoJSON for ambient orbital grid coordinates
const SCANLINE_GEOJSON: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: Array.from({ length: 180 }, (_, i) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[-180, -90 + i], [180, -90 + i]] },
    properties: { lineType: 'horizontal' }
  } as Feature<LineString>)).concat(Array.from({ length: 360 }, (_, i) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[-180 + i, -90], [-180 + i, 90]] },
    properties: { lineType: 'vertical' }
  } as Feature<LineString>)))
};

// Fallback custom style spec with #050507 ocean, #16181D land, #2E323D coastlines/boundaries
const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  name: 'TerraPulse Monochrome Dark',
  metadata: { 'mapbox:type': 'template' },
  sources: {
    'osm': {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-streets-v8',
    },
    'indonesia-boundaries': {
      type: 'geojson',
      data: INDONESIA_GEOJSON,
    },
    'scanline-grid': {
      type: 'geojson',
      data: SCANLINE_GEOJSON,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#050507' },
    },
    // Ambient orbital scanline grid (very subtle)
    {
      id: 'scanline-grid',
      type: 'line',
      source: 'scanline-grid',
      paint: {
        'line-color': '#1A1D24',
        'line-width': 0.5,
        'line-opacity': 0.15,
      },
      filter: ['==', ['get', 'lineType'], 'horizontal'],
    },
    {
      id: 'scanline-grid-vertical',
      type: 'line',
      source: 'scanline-grid',
      paint: {
        'line-color': '#1A1D24',
        'line-width': 0.5,
        'line-opacity': 0.08,
      },
      filter: ['==', ['get', 'lineType'], 'vertical'],
    },
    // Indonesia land fallback (always visible)
    {
      id: 'indonesia-land-fallback',
      type: 'fill',
      source: 'indonesia-boundaries',
      paint: {
        'fill-color': '#16181D',
        'fill-opacity': 1,
        'fill-antialias': true,
      },
    },
    {
      id: 'indonesia-coastline-fallback',
      type: 'line',
      source: 'indonesia-boundaries',
      paint: {
        'line-color': '#2E323D',
        'line-width': 2,
        'line-opacity': 0.9,
      },
    },
    // OSM layers
    {
      id: 'land',
      type: 'fill',
      source: 'osm',
      'source-layer': 'landuse',
      filter: ['in', 'class', 'park', 'wood', 'forest', 'nature_reserve'],
      paint: { 'fill-color': '#16181D', 'fill-opacity': 1 },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'osm',
      'source-layer': 'water',
      paint: { 'fill-color': '#050507', 'fill-opacity': 1 },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'osm',
      'source-layer': 'waterway',
      paint: { 'line-color': '#2E323D', 'line-width': 1 },
    },
    {
      id: 'coastline',
      type: 'line',
      source: 'osm',
      'source-layer': 'coastline',
      paint: { 'line-color': '#2E323D', 'line-width': 1.5 },
    },
    {
      id: 'admin-boundaries',
      type: 'line',
      source: 'osm',
      'source-layer': 'admin',
      paint: { 'line-color': '#2E323D', 'line-width': 1, 'line-opacity': 0.5 },
    },
    {
      id: 'country-label',
      type: 'symbol',
      source: 'osm',
      'source-layer': 'country_label',
      layout: {
        'text-field': ['get', 'name_en'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
      },
      paint: { 'text-color': '#71717A', 'text-halo-color': '#050507', 'text-halo-width': 1 },
    },
  ],
};

export interface ViewportState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface MapBaseProps {
  viewport: ViewportState;
  onViewportChange: (viewport: ViewportState) => void;
  onMapLoad?: (map: MapLibreMap) => void;
  onStyleLoad?: () => void;
  onStyleError?: () => void;
  children?: React.ReactNode;
  initialViewport?: ViewportState;
}

const DEFAULT_VIEWPORT: ViewportState = {
  longitude: 118.0,
  latitude: -2.5,
  zoom: 4.5,
  bearing: 0,
  pitch: 0,
};

export function MapBase({
  viewport,
  onViewportChange,
  onMapLoad,
  onStyleLoad,
  onStyleError,
  children,
  initialViewport = DEFAULT_VIEWPORT,
}: MapBaseProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [styleError, setStyleError] = useState(false);

  // Latest props for the mount-once map effect: the map instance must never be
  // re-created because a callback prop changed identity.
  const initialViewportRef = useRef(initialViewport);
  const callbacksRef = useRef({ onViewportChange, onMapLoad, onStyleLoad, onStyleError });
  callbacksRef.current = { onViewportChange, onMapLoad, onStyleLoad, onStyleError };

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const initial = initialViewportRef.current;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: CARTODB_DARK_STYLE,
      center: [initial.longitude, initial.latitude],
      zoom: initial.zoom,
      bearing: initial.bearing,
      pitch: initial.pitch,
      antialias: true,
      preserveDrawingBuffer: true,
      // No maxBounds: [-180..180] degenerates the longitude range to zero
      // width and maplibre's constrain snaps the camera to lng 180 / maxZoom.
    } as MapOptions);

    const handleStyleLoad = () => {
      setStyleLoaded(true);
      setMapLoaded(true);
      callbacksRef.current.onStyleLoad?.();
    };

    const handleStyleError = (e: ErrorEvent) => {
      console.warn('[MapBase] CartoDB style failed, using fallback:', e);
      setStyleError(true);
      map.setStyle(FALLBACK_STYLE);
      callbacksRef.current.onStyleError?.();
    };

    const handleLoad = () => {
      callbacksRef.current.onMapLoad?.(map);
    };

    const handleMove = () => {
      callbacksRef.current.onViewportChange({
        latitude: map.getCenter().lat,
        longitude: map.getCenter().lng,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    };

    map.on('load', handleLoad);
    map.on('style.load', handleStyleLoad);
    map.on('style.error', handleStyleError);
    map.on('move', handleMove);

    mapRef.current = map;

    return () => {
      const map = mapRef.current;
      // Null the ref up-front: a map whose remove() throws mid-teardown is
      // gone regardless, and must never be handed back out by the guard above.
      mapRef.current = null;
      if (!map) return;

      try {
        map.off('load', handleLoad);
        map.off('style.load', handleStyleLoad);
        map.off('style.error', handleStyleError);
        map.off('move', handleMove);
        map.remove();
      } catch (error) {
        // DOMException (AbortError) is not always an instanceof Error in jsdom;
        // check name directly so Strict Mode unmount races never throw.
        if ((error as Error).name === 'AbortError') {
          return;
        }
        throw error;
      }
    };
  }, []);

  // Sync map viewport with props (external navigation only)
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      const map = mapRef.current;
      const center = map.getCenter();
      const currentViewport = {
        latitude: center.lat,
        longitude: center.lng,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      };

      const latDiff = Math.abs(currentViewport.latitude - viewport.latitude);
      const lngDiff = Math.abs(currentViewport.longitude - viewport.longitude);
      const zoomDiff = Math.abs(currentViewport.zoom - viewport.zoom);
      const bearingDiff = Math.abs(currentViewport.bearing - viewport.bearing);
      const pitchDiff = Math.abs(currentViewport.pitch - viewport.pitch);

      const THRESHOLD = 0.0001;
      const ZOOM_THRESHOLD = 0.01;
      const BEARING_THRESHOLD = 0.1;
      const PITCH_THRESHOLD = 0.1;

      if (
        latDiff > THRESHOLD ||
        lngDiff > THRESHOLD ||
        zoomDiff > ZOOM_THRESHOLD ||
        bearingDiff > BEARING_THRESHOLD ||
        pitchDiff > PITCH_THRESHOLD
      ) {
        map.jumpTo({
          center: [viewport.longitude, viewport.latitude],
          zoom: viewport.zoom,
          bearing: viewport.bearing,
          pitch: viewport.pitch,
        });
      }
    }
  }, [viewport, mapLoaded]);

  // Expose map instance for advanced operations
  const getMap = useCallback(() => mapRef.current, []);

  // maplibre-gl.css sets .maplibregl-map{position:relative}, which overrides
  // Tailwind .fixed; inline position keeps the container full-viewport.
  return (
    <div
      ref={mapContainerRef}
      className="fixed inset-0"
      style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'transparent' }}
    >
      {children}
      {styleError && !styleLoaded && (
        <div className="fixed inset-0 flex items-center justify-center z-10 bg-tp-bg" style={{ zIndex: 2 }}>
          <div className="text-center p-8">
            <div className="animate-spin-slow text-tp-cyan text-6xl mb-4">◷</div>
            <p className="tp-label">LOADING BASEMAP...</p>
          </div>
        </div>
      )}
    </div>
  );
}
