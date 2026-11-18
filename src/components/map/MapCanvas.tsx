'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { Deck } from '@deck.gl/core';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer } from '@deck.gl/layers';
import { IconLayer } from '@deck.gl/layers';
import { PolygonLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DisasterFeature, DisasterFeatureCollection, LayerVisibility, DEFAULT_LAYER_VISIBILITY, LAYER_COLORS } from '@/types/disaster';
import { useDeviceCapability } from '@/hooks/useDeviceCapability';
import { createWindParticleData, WindParticle } from './WindParticleLayer';
import { generateTsunamiRings, TsunamiRing } from '@/lib/geoMath';

const CARTODB_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface MapCanvasProps {
  earthquakes: DisasterFeature[];
  hotspots: DisasterFeature[];
  volcanoes: DisasterFeature[];
  cyclones: DisasterFeature[];
  rainRadarTiles: string[];
  windGrid: any;
  tsunamiRings: TsunamiRing[];
  layerVisibility: LayerVisibility;
  viewport: { latitude: number; longitude: number; zoom: number; bearing: number; pitch: number };
  onViewportChange: (viewport: any) => void;
  onFeatureClick: (feature: DisasterFeature) => void;
  selectedFeatureId: string | null;
  timelineTime: number;
}

export function MapCanvas({
  earthquakes,
  hotspots,
  volcanoes,
  cyclones,
  rainRadarTiles,
  windGrid,
  tsunamiRings,
  layerVisibility,
  viewport,
  onViewportChange,
  onFeatureClick,
  selectedFeatureId,
  timelineTime,
}: MapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Deck | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const { maxParticles, maxDpr, prefersReducedMotion } = useDeviceCapability();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: CARTODB_DARK_STYLE,
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
      bearing: viewport.bearing,
      pitch: viewport.pitch,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    map.on('load', () => {
      setMapLoaded(true);
      // Add rain radar tile layer if available
      if (rainRadarTiles.length > 0 && layerVisibility.rainRadar) {
        addRainRadarLayer(map, rainRadarTiles[0]);
      }
    });

    map.on('move', () => {
      onViewportChange({
        latitude: map.getCenter().lat,
        longitude: map.getCenter().lng,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    });

    map.on('click', (e) => {
      // Check for feature at click point
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['earthquakes', 'hotspots', 'volcanoes', 'cyclones', 'tsunami-rings'],
      });
      if (features.length > 0) {
        const feature = features[0].properties as any;
        if (feature.__feature) {
          onFeatureClick(feature.__feature);
        }
      }
    });

    mapRef.current = map;

    // Initialize DeckGL overlay
    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [],
    });
    map.addControl(overlay);
    overlayRef.current = overlay;

    const deck = new Deck({
      canvas: 'deck-canvas',
      width: '100%',
      height: '100%',
      initialViewState: {
        latitude: viewport.latitude,
        longitude: viewport.longitude,
        zoom: viewport.zoom,
        bearing: viewport.bearing,
        pitch: viewport.pitch,
      },
      controller: true,
      onViewStateChange: ({ viewState }) => {
        onViewportChange({
          latitude: viewState.latitude,
          longitude: viewState.longitude,
          zoom: viewState.zoom,
          bearing: viewState.bearing,
          pitch: viewState.pitch,
        });
      },
      layers: [],
    });
    deckRef.current = deck;

    return () => {
      overlay.onRemove();
      map.remove();
      deck.finalize();
      mapRef.current = null;
      overlayRef.current = null;
      deckRef.current = null;
    };
  }, []);

  // Update DeckGL layers when data changes
  useEffect(() => {
    if (!deckRef.current || !mapLoaded) return;

    const layers = createDeckLayers(
      earthquakes,
      hotspots,
      volcanoes,
      cyclones,
      tsunamiRings,
      windGrid,
      layerVisibility,
      selectedFeatureId,
      maxParticles,
      prefersReducedMotion,
      timelineTime,
      4
    );

    deckRef.current.setProps({ layers });
  }, [
    earthquakes,
    hotspots,
    volcanoes,
    cyclones,
    tsunamiRings,
    windGrid,
    layerVisibility,
    selectedFeatureId,
    maxParticles,
    prefersReducedMotion,
    timelineTime,
    mapLoaded,
  ]);

  // Sync map viewport with props (only for external navigation, not user panning)
  // Use a threshold to avoid infinite loop from map.on('move') -> onViewportChange -> jumpTo
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

      // Only jump if viewport changed significantly (external navigation)
      const latDiff = Math.abs(currentViewport.latitude - viewport.latitude);
      const lngDiff = Math.abs(currentViewport.longitude - viewport.longitude);
      const zoomDiff = Math.abs(currentViewport.zoom - viewport.zoom);
      const bearingDiff = Math.abs(currentViewport.bearing - viewport.bearing);
      const pitchDiff = Math.abs(currentViewport.pitch - viewport.pitch);

      const THRESHOLD = 0.0001; // ~10 meters
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

  // Update rain radar layer
  useEffect(() => {
    if (mapRef.current && mapLoaded && rainRadarTiles.length > 0) {
      updateRainRadarLayer(mapRef.current, rainRadarTiles[0], layerVisibility.rainRadar);
    }
  }, [rainRadarTiles, layerVisibility.rainRadar, mapLoaded]);

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0"
      style={{ zIndex: 0 }}
    >
      <canvas id="deck-canvas" style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
    </div>
  );
}

function createDeckLayers(
  earthquakes: DisasterFeature[],
  hotspots: DisasterFeature[],
  volcanoes: DisasterFeature[],
  cyclones: DisasterFeature[],
  tsunamiRings: TsunamiRing[],
  windGrid: any,
  layerVisibility: LayerVisibility,
  selectedFeatureId: string | null,
  maxParticles: number,
  prefersReducedMotion: boolean,
  timelineTime: number,
  particleSize: number = 4
) {
  const layers: any[] = [];

  // Earthquake layer
  if (layerVisibility.earthquakes && earthquakes.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: 'earthquakes',
        data: earthquakes.map((f) => ({
          ...f,
          radius: Math.max(8, Math.min(40, (f.properties.magnitude || 1) * 6)),
          color: f.id === selectedFeatureId ? [255, 255, 0, 255] : hexToRgba(LAYER_COLORS.earthquakes, 0.9),
          __feature: f,
        })),
        getPosition: (d: any) => d.geometry.coordinates,
        getRadius: (d: any) => d.radius,
        getFillColor: (d: any) => d.color,
        pickable: true,
        radiusMinPixels: 6,
        radiusMaxPixels: 60,
      })
    );
  }

  // Hotspot layer (ScatterplotLayer with brightness-based sizing)
  if (layerVisibility.hotspots && hotspots.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: 'hotspots-points',
        data: hotspots.map((f) => ({
          ...f,
          radius: Math.max(4, Math.min(20, (f.properties.brightness || 300) / 20)),
          color: f.id === selectedFeatureId ? [255, 255, 0, 255] : hexToRgba(LAYER_COLORS.hotspots, 0.8),
          __feature: f,
        })),
        getPosition: (d: any) => d.geometry.coordinates,
        getRadius: (d: any) => d.radius,
        getFillColor: (d: any) => d.color,
        pickable: true,
        radiusMinPixels: 4,
        radiusMaxPixels: 30,
        stroked: true,
        getLineColor: [255, 255, 255, 150],
        getLineWidth: 1,
      })
    );
  }

  // Volcano layer with alert level colors
  if (layerVisibility.volcanoes && volcanoes.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: 'volcanoes',
        data: volcanoes.map((f) => {
          const alertLevel = f.properties.alertLevel || 'Normal';
          const alertColor = getVolcanoAlertColor(alertLevel);
          return {
            ...f,
            radius: (f.properties.hazardRadiusKm || 5) * 1000 / 10, // Convert km to meters approx
            color: f.id === selectedFeatureId ? [255, 255, 0, 255] : alertColor,
            __feature: f,
          };
        }),
        getPosition: (d: any) => d.geometry.coordinates as [number, number],
        getRadius: (d: any) => d.radius,
        getFillColor: (d: any) => d.color,
        pickable: true,
        radiusMinPixels: 10,
        radiusMaxPixels: 50,
        stroked: true,
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 2,
      })
    );

    // Hazard radius polygons
    layers.push(
      new PolygonLayer({
        id: 'volcano-hazard-zones',
        data: volcanoes.map((f) => {
          const coords = f.geometry.coordinates;
          const alertLevel = f.properties.alertLevel || 'Normal';
          const [lng, lat] = (Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number')
            ? coords as [number, number]
            : [0, 0];
          return {
            ...f,
            polygon: generateCirclePolygon(lat, lng, f.properties.hazardRadiusKm || 5),
            color: [...hexToRgb(getVolcanoAlertColorHex(alertLevel)), 40],
            __feature: f,
          };
        }),
        getPolygon: (d: any) => d.polygon,
        getFillColor: (d: any) => d.color,
        pickable: false,
        filled: true,
        stroked: false,
      })
    );
  }

  // Cyclone layer
  if (layerVisibility.cyclones && cyclones.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: 'cyclones',
        data: cyclones.map((f) => ({
          ...f,
          radius: Math.max(15000, (f.properties.windSpeedKmh || 50) * 500),
          color: f.id === selectedFeatureId ? [255, 255, 0, 255] : hexToRgba(LAYER_COLORS.cyclones, 0.7),
          __feature: f,
        })),
        getPosition: (d: any) => d.geometry.coordinates as [number, number],
        getRadius: (d: any) => d.radius,
        getFillColor: (d: any) => d.color,
        pickable: true,
        radiusMinPixels: 15,
        radiusMaxPixels: 100,
        stroked: true,
        getLineColor: [255, 255, 255, 150],
        getLineWidth: 2,
      })
    );

    // Forecast track lines
    layers.push(
      new PolygonLayer({
        id: 'cyclone-tracks',
        data: cyclones.flatMap((f) => {
          const track = (f.properties as any).forecastTrack || [];
          return track.map((pt: any, i: number, arr: any[]) =>
            i < arr.length - 1
              ? {
                  polygon: [
                    [pt.lng, pt.lat],
                    [arr[i + 1].lng, arr[i + 1].lat],
                    [arr[i + 1].lng + 0.01, arr[i + 1].lat + 0.01], // Thicken line
                    [pt.lng + 0.01, pt.lat + 0.01],
                  ],
                  color: [...hexToRgb(LAYER_COLORS.cyclones), 80],
                }
              : null
          ).filter(Boolean);
        }),
        getPolygon: (d: any) => d.polygon,
        getFillColor: (d: any) => d.color,
        pickable: false,
      })
    );
  }

  // Tsunami rings
  if (layerVisibility.tsunamiRings && tsunamiRings.length > 0) {
    layers.push(
      new PolygonLayer({
        id: 'tsunami-rings',
        data: tsunamiRings.map((ring, i) => ({
          polygon: generateCirclePolygon(0, 0, ring.radiusKm), // Will be positioned via translation
          color: [...hexToRgb(ring.color), Math.round(ring.opacity * 255)],
          ringIndex: i,
        })),
        getPolygon: (d: any) => d.polygon,
        getFillColor: (d: any) => d.color,
        pickable: false,
        filled: true,
        stroked: true,
        getLineColor: (d: any) => [...hexToRgb(d.color), 180],
        getLineWidth: 2,
      })
    );
  }

  // Wind particle layer (CPU-based ScatterplotLayer)
  if (layerVisibility.windParticles && windGrid && !prefersReducedMotion) {
    const windParticles = createWindParticleData(windGrid, maxParticles, timelineTime);
    if (windParticles.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'wind-particles',
          data: windParticles,
          getPosition: (d: WindParticle) => d.position,
          getRadius: particleSize || 4,
          getFillColor: (d: WindParticle) => d.color,
          pickable: false,
          radiusMinPixels: 2,
          radiusMaxPixels: 8,
        })
      );
    }
  }

  return layers;
}

function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, Math.round(alpha * 255)];
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function getVolcanoAlertColor(alertLevel: string): [number, number, number, number] {
  switch (alertLevel) {
    case 'Awas': return [220, 20, 20, 220];
    case 'Siaga': return [255, 140, 0, 220];
    case 'Waspada': return [255, 200, 0, 220];
    default: return [100, 200, 100, 200];
  }
}

function getVolcanoAlertColorHex(alertLevel: string): string {
  switch (alertLevel) {
    case 'Awas': return '#DC1414';
    case 'Siaga': return '#FF8C00';
    case 'Waspada': return '#FFC800';
    default: return '#64C864';
  }
}

function generateCirclePolygon(lat: number, lng: number, radiusKm: number, points: number = 32): number[][][] {
  const coords: number[][] = [];
  const angularRadius = radiusKm / 6371;
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;

  for (let i = 0; i <= points; i++) {
    const bearing = (i / points) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(angularRadius) +
      Math.cos(latRad) * Math.sin(angularRadius) * Math.cos(bearing)
    );
    const lng2 = lngRad + Math.atan2(
      Math.sin(bearing) * Math.sin(angularRadius) * Math.cos(latRad),
      Math.cos(angularRadius) - Math.sin(latRad) * Math.sin(lat2)
    );
    coords.push([lng2 * 180 / Math.PI, lat2 * 180 / Math.PI]);
  }
  return [coords];
}

function addRainRadarLayer(map: maplibregl.Map, tileUrl: string) {
  if (map.getLayer('rain-radar')) return;

  map.addSource('rain-radar', {
    type: 'raster',
    tiles: [tileUrl],
    tileSize: 256,
    minzoom: 0,
    maxzoom: 10,
  });

  map.addLayer({
    id: 'rain-radar',
    type: 'raster',
    source: 'rain-radar',
    paint: {
      'raster-opacity': 0.7,
      'raster-fade-duration': 0,
    },
  });
}

function updateRainRadarLayer(map: maplibregl.Map, tileUrl: string, visible: boolean) {
  if (!map.getSource('rain-radar')) {
    if (visible) addRainRadarLayer(map, tileUrl);
    return;
  }

  const source = map.getSource('rain-radar') as any;
  if (source && source.setTiles) {
    source.setTiles([tileUrl]);
  }
  map.setLayoutProperty('rain-radar', 'visibility', visible ? 'visible' : 'none');
}