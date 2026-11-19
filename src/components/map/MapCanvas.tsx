'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import maplibregl from 'maplibre-gl';
import { DisasterFeature, LayerVisibility, MapViewport } from '@/types/disaster';
import { WindGridData } from '@/lib/normalizers';
import { useDeviceCapability } from '@/hooks/useDeviceCapability';
import { MapBase, ViewportState } from './MapBase';
import { createDisasterLayers } from './DisasterLayers';
import { createWindLayer } from './WindLayer';
import { createTsunamiLayer, TsunamiPolygon } from './TsunamiLayer';

interface MapCanvasProps {
  earthquakes: DisasterFeature[];
  hotspots: DisasterFeature[];
  volcanoes: DisasterFeature[];
  cyclones: DisasterFeature[];
  rainRadarTiles: string[];
  windGrid: WindGridData | null;
  tsunamiPolygons: TsunamiPolygon[];
  layerVisibility: LayerVisibility;
  viewport: MapViewport;
  onViewportChange: (viewport: MapViewport) => void;
  onFeatureClick: (feature: DisasterFeature) => void;
  selectedFeatureId: string | null;
  timelineTime: number;
}

// Module-level so the map-init effect in MapBase never sees a new object.
const INITIAL_VIEWPORT = {
  longitude: 118.0,
  latitude: -2.5,
  zoom: 4.5,
  bearing: 0,
  pitch: 0,
};

// A removed map has no style (maplibre drops it on remove), so this is the
// cheapest liveness check for instances handed to us before teardown.
function isMapUsable(map: maplibregl.Map | null | undefined): map is maplibregl.Map {
  return !!map && !!map.getStyle();
}

function addRainRadarLayer(map: maplibregl.Map, tileUrl: string) {
  if (map.getSource('rain-radar')) {
    (map.getSource('rain-radar') as maplibregl.RasterTileSource).setTiles([tileUrl]);
    return;
  }
  map.addSource('rain-radar', {
    type: 'raster',
    tiles: [tileUrl],
    tileSize: 256,
    maxzoom: 10,
  });
  map.addLayer({
    id: 'rain-radar-layer',
    type: 'raster',
    source: 'rain-radar',
    paint: { 'raster-opacity': 0.6, 'raster-fade-duration': 300 },
  });
}

function updateRainRadarLayer(map: maplibregl.Map, tileUrl: string, visible: boolean) {
  if (map.getSource('rain-radar')) {
    (map.getSource('rain-radar') as maplibregl.RasterTileSource).setTiles([tileUrl]);
  } else if (visible) {
    addRainRadarLayer(map, tileUrl);
  }
  if (map.getLayer('rain-radar-layer')) {
    map.setLayoutProperty('rain-radar-layer', 'visibility', visible ? 'visible' : 'none');
  }
}

export function MapCanvas({
  earthquakes,
  hotspots,
  volcanoes,
  cyclones,
  rainRadarTiles,
  windGrid,
  tsunamiPolygons,
  layerVisibility,
  viewport,
  onViewportChange,
  onFeatureClick,
  selectedFeatureId,
  timelineTime,
}: MapCanvasProps) {
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { maxParticles, prefersReducedMotion } = useDeviceCapability();
  const [mapLoaded, setMapLoaded] = useState(false);
  // Latest rain-radar inputs, read inside the stable map-load callback.
  const rainRadarTilesRef = useRef(rainRadarTiles);
  rainRadarTilesRef.current = rainRadarTiles;
  const rainRadarVisibleRef = useRef(layerVisibility.rainRadar);
  rainRadarVisibleRef.current = layerVisibility.rainRadar;

  // Create all DeckGL layers - memoized to prevent unnecessary recreation
  const layers = useMemo(() => {
    const allLayers: Array<any> = [];

    // Disaster point layers (earthquakes, hotspots, volcanoes, cyclones)
    allLayers.push(
      ...createDisasterLayers({
        earthquakes,
        hotspots,
        volcanoes,
        cyclones,
        layerVisibility,
        selectedFeatureId,
      })
    );

    // Wind particle layer
    allLayers.push(
      ...createWindLayer({
        windGrid,
        layerVisibility,
        maxParticles,
        prefersReducedMotion,
        timelineTime,
      })
    );

    // Tsunami isochrone rings
    allLayers.push(
      ...createTsunamiLayer({
        tsunamiPolygons,
        layerVisibility,
      })
    );

    return allLayers;
  }, [
    earthquakes,
    hotspots,
    volcanoes,
    cyclones,
    windGrid,
    tsunamiPolygons,
    layerVisibility,
    selectedFeatureId,
    maxParticles,
    prefersReducedMotion,
    timelineTime,
  ]);

  // Latest layers, read when the overlay is created (map 'load' fires after
  // 'style.load', so the layers effect may already have run and bailed).
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // Latest click handler, attached once at map load ('load' can fire after
  // 'style.load', so a mapLoaded-driven effect may never see mapRef set).
  const clickHandlerRef = useRef<(e: maplibregl.MapMouseEvent) => void>(() => {});

  // Handle MapBase events
  const handleMapLoad = useCallback((map: maplibregl.Map) => {
    mapRef.current = map;

    // deck.gl is driven exclusively through MapboxOverlay, which creates
    // its own Deck instance internally and synchronizes with the map's
    // view state. No standalone Deck is created here.
    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: layersRef.current,
    });
    map.addControl(overlay);
    overlayRef.current = overlay;
    map.on('click', (e) => clickHandlerRef.current(e));

    // Add rain radar if available
    const tiles = rainRadarTilesRef.current;
    if (isMapUsable(map) && tiles.length > 0 && rainRadarVisibleRef.current) {
      addRainRadarLayer(map, tiles[0]);
    }
  }, []);

  const handleStyleLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Handle feature click via MapLibre queryRenderedFeatures (since DeckGL pickable layers are handled by MapLibre)
  const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
    const map = mapRef.current;
    if (!isMapUsable(map)) return;

    // deck.gl interleaved layers are not maplibre layers, so they are not
    // reachable via queryRenderedFeatures; ask the overlay to pick instead.
    const picked = overlayRef.current?.pickObject({
      x: e.point.x,
      y: e.point.y,
      radius: 6,
    });
    const pickedFeature = (picked?.object as { __feature?: DisasterFeature } | undefined)?.__feature;
    if (pickedFeature) {
      onFeatureClick(pickedFeature);
      return;
    }

    const features = map.queryRenderedFeatures(e.point, {
      layers: ['tsunami-rings'],
    });

    if (features.length > 0) {
      const feature = features[0].properties as Record<string, unknown>;
      if (feature.__feature) {
        onFeatureClick(feature.__feature as DisasterFeature);
      }
    }
  }, [onFeatureClick]);

  // Update deck.gl layers via MapboxOverlay when data changes
  useEffect(() => {
    if (!overlayRef.current || !mapLoaded || !isMapUsable(mapRef.current)) return;

    overlayRef.current.setProps({ layers });
  }, [layers, mapLoaded]);

  // Update rain radar layer when tiles or visibility changes
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapUsable(map) || !mapLoaded || rainRadarTiles.length === 0) return;
    updateRainRadarLayer(map, rainRadarTiles[0], layerVisibility.rainRadar);
  }, [rainRadarTiles, layerVisibility.rainRadar, mapLoaded]);

  clickHandlerRef.current = handleMapClick;

  return (
    <MapBase
      viewport={viewport}
      onViewportChange={onViewportChange}
      onMapLoad={handleMapLoad}
      onStyleLoad={handleStyleLoad}
      initialViewport={INITIAL_VIEWPORT}
    />
  );
}

// Re-export types for consumers
export type { ViewportState } from './MapBase';
export type { TsunamiPolygon } from './TsunamiLayer';
