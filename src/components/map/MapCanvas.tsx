'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import maplibregl from 'maplibre-gl';
import { DisasterFeature, LayerVisibility, MapViewport } from '@/types/disaster';
import { WindGridData } from '@/lib/normalizers';
import { useDeviceCapability } from '@/hooks/useDeviceCapability';
import { MapBase } from './MapBase';
import { createAnimatedLayers, createDisasterLayers, createLockOnLayer } from './DisasterLayers';
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
  lockOnTarget?: { lat: number; lng: number; label?: string } | null;
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
    maxzoom: 6,
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

// Subset of deck.gl's PickingInfo the callout needs; avoids depending on
// @deck.gl/core directly (it is only a transitive dependency here).
interface HoverInfo {
  picked: boolean;
  object: unknown;
  x: number;
  y: number;
}

// NASA-style instrument callout: event code + metric on line 1, place on line 2.
const TYPE_CODE: Record<string, string> = {
  earthquake: 'EQ',
  volcano: 'VOL',
  hotspot: 'HOT',
  cyclone: 'CYC',
  flood: 'FLD',
  tsunami: 'TSN',
  storm: 'STM',
};

function calloutText(f: DisasterFeature): string {
  const p = f.properties;
  const code = TYPE_CODE[p.type] || 'EVT';
  let metric: string;
  switch (p.type) {
    case 'earthquake':
      metric = `M${(p.magnitude ?? 0).toFixed(1)}`;
      break;
    case 'volcano':
      metric = `RADIUS ${p.hazardRadiusKm ?? 0} km`;
      break;
    case 'hotspot':
      metric = `CONF ${Math.round(p.confidence ?? 0)}%`;
      break;
    case 'cyclone':
      metric = `WIND ${p.windSpeedKmh ?? 0} km/h`;
      break;
    default:
      metric = p.type.toUpperCase();
  }
  const place = (p.title || '').slice(0, 34).trim();
  return `${code} ${metric}\n${place}`;
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
  lockOnTarget = null,
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

  // Static layers only: animated phenomena are composed per frame in applyLayers.
  const layers = useMemo(() => {
    return [
      ...createDisasterLayers({
        earthquakes,
        hotspots,
        volcanoes,
        cyclones,
        layerVisibility,
        selectedFeatureId,
      }),
      ...createWindLayer({
        windGrid,
        layerVisibility,
        maxParticles,
        prefersReducedMotion,
        timelineTime,
      }),
      ...createTsunamiLayer({ tsunamiPolygons, layerVisibility }),
    ];
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

  // Latest animation inputs, read by the RAF tick without re-rendering.
  const animDataRef = useRef({ earthquakes, hotspots, cyclones, layerVisibility, lockOnTarget, selectedFeatureId });
  animDataRef.current = { earthquakes, hotspots, cyclones, layerVisibility, lockOnTarget, selectedFeatureId };
  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  prefersReducedMotionRef.current = prefersReducedMotion;
  const timeRef = useRef(0);

  // Latest layers, read when the overlay is created (map 'load' fires after
  // 'style.load', so the layers effect may already have run and bailed).
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // Single composition path for both the React effect and the RAF tick.
  // Under reduced motion the clock stays at 0, so phenomena render frozen.
  const applyLayers = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const d = animDataRef.current;
    const time = timeRef.current;
    const frozen = prefersReducedMotionRef.current;
    overlay.setProps({
      layers: [
        ...layersRef.current,
        ...createAnimatedLayers({
          earthquakes: d.earthquakes,
          hotspots: d.hotspots,
          cyclones: d.cyclones,
          layerVisibility: d.layerVisibility,
          time,
          selectedFeatureId: d.selectedFeatureId,
        }),
        // Live zoom: the reticle keeps a fixed pixel size across zooms.
        ...createLockOnLayer({
          target: d.lockOnTarget,
          time,
          frozen,
          zoom: mapRef.current?.getZoom() ?? 4.5,
        }),
      ],
    });
  }, []);

  // Latest click handler, attached once at map load ('load' can fire after
  // 'style.load', so a mapLoaded-driven effect may never see mapRef set).
  const clickHandlerRef = useRef<(e: maplibregl.MapMouseEvent) => void>(() => {});

  // Hover callout. Every pointer move mutates this node's style/textContent
  // directly; no React state is touched, so hovering never re-renders the tree.
  const calloutRef = useRef<HTMLDivElement>(null);
  const handleHover = useCallback((info: HoverInfo) => {
    const el = calloutRef.current;
    const map = mapRef.current;
    if (!el || !isMapUsable(map)) return;

    const feature = (info.object as { __feature?: DisasterFeature } | undefined)?.__feature;
    if (!info.picked || !feature) {
      if (el.style.display !== 'none') el.style.display = 'none';
      return;
    }

    const rect = map.getCanvas().getBoundingClientRect();
    const W = 200;
    const H = 36;
    let left = rect.left + info.x + 12;
    let top = rect.top + info.y + 12;
    // Flip to the other side of the cursor rather than clip at the edge.
    if (left + W > window.innerWidth) left = rect.left + info.x - W - 12;
    if (top + H > window.innerHeight) top = rect.top + info.y - H - 12;
    el.style.left = `${Math.max(0, left)}px`;
    el.style.top = `${Math.max(0, top)}px`;
    el.textContent = calloutText(feature);
    if (el.style.display !== 'block') el.style.display = 'block';
  }, []);

  // Handle MapBase events
  const handleMapLoad = useCallback((map: maplibregl.Map) => {
    mapRef.current = map;

    // deck.gl is driven exclusively through MapboxOverlay, which creates
    // its own Deck instance internally and synchronizes with the map's
    // view state. No standalone Deck is created here.
    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: layersRef.current,
      // Stable wrapper: a fresh closure per frame would churn the Deck instance.
      onHover: (info) => handleHover(info as HoverInfo),
      // deck.gl owns the canvas cursor; writing style.cursor ourselves loses to
      // its _updateCursor pass. Let it derive the affordance from picking state.
      getCursor: ({ isHovering, isDragging }) =>
        isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab',
    });
    map.addControl(overlay);
    overlayRef.current = overlay;
    map.on('click', (e) => clickHandlerRef.current(e));

    // Add rain radar if available
    const tiles = rainRadarTilesRef.current;
    if (isMapUsable(map) && tiles.length > 0 && rainRadarVisibleRef.current) {
      addRainRadarLayer(map, tiles[0]);
    }
  }, [handleHover]);

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

    // The tsunami layer is a deck.gl layer that only exists while the toggle is
    // on; querying a missing layer id throws, so skip the query entirely.
    const features = map.getLayer('tsunami-rings')
      ? map.queryRenderedFeatures(e.point, { layers: ['tsunami-rings'] })
      : [];

    if (features.length > 0) {
      const feature = features[0].properties as Record<string, unknown>;
      if (feature.__feature) {
        onFeatureClick(feature.__feature as DisasterFeature);
      }
    }
  }, [onFeatureClick]);

  // Push static layer changes through the same composition the RAF tick uses.
  // lockOnTarget/zoom are listed so the reticle repaints while the clock is frozen.
  useEffect(() => {
    if (!mapLoaded || !isMapUsable(mapRef.current)) return;
    applyLayers();
  }, [layers, mapLoaded, applyLayers, lockOnTarget, viewport.zoom]);

  // Animation clock: ~24fps, stopped while the tab is hidden or for reduced motion.
  useEffect(() => {
    if (!mapLoaded || prefersReducedMotion) {
      applyLayers(); // frozen at time 0, so reduced motion still renders the phenomena
      return;
    }
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 41) return; // ~24fps
      const dt = last === 0 ? 0 : Math.min(now - last, 250); // clamp tab-switch gaps
      last = now;
      timeRef.current += dt / 1000;
      applyLayers();
    };
    // visibilitychange stops the loop entirely rather than idling frames.
    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        last = 0; // resync so the clock does not jump after the pause
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (!document.hidden) raf = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
  }, [mapLoaded, prefersReducedMotion, applyLayers]);

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
    >
      {/* Fixed-position callout: mutated imperatively by handleHover. */}
      <div
        ref={calloutRef}
        aria-hidden="true"
        style={{ display: 'none' }}
        className="pointer-events-none fixed z-20 border-l-2 border-white bg-black/95 px-2 py-1 font-mono text-[10px] leading-tight whitespace-pre text-white tabular-nums"
      />
    </MapBase>
  );
}

// Re-export types for consumers
export type { ViewportState } from './MapBase';
export type { TsunamiPolygon } from './TsunamiLayer';
