'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapCanvas } from '@/components/map/MapCanvas';
import { TelemetryStrip } from '@/components/hud/TelemetryStrip';
import { LayerPanel } from '@/components/hud/LayerPanel';
import { EventCard } from '@/components/hud/EventCard';
import { TimelineBar } from '@/components/hud/TimelineBar';
import { BrandLockup, type ViewMode } from '@/components/hud/BrandLockup';
import { NewsPanel } from '@/components/hud/NewsPanel';
import { useDeviceCapability } from '@/hooks/useDeviceCapability';
import {
  DisasterFeature,
  DisasterFeatureCollection,
  LayerVisibility,
  DEFAULT_LAYER_VISIBILITY,
  TimelineState,
  NewsArticle,
  DisasterType,
} from '@/types/disaster';
import { haversineDistance } from '@/lib/geoMath';
import { simulateTsunami, TsunamiSimulationResult } from '@/components/map/TsunamiSimulation';

const INITIAL_VIEWPORT = {
  latitude: -2.5,
  longitude: 118,
  zoom: 4.5,
  bearing: 0,
  pitch: 0,
};

export default function HomePage() {
  const { isMobile, isLowEnd, maxParticles, maxDpr, prefersReducedMotion } = useDeviceCapability();

  // Data state
  const [earthquakes, setEarthquakes] = useState<DisasterFeature[]>([]);
  const [hotspots, setHotspots] = useState<DisasterFeature[]>([]);
  const [volcanoes, setVolcanoes] = useState<DisasterFeature[]>([]);
  const [cyclones, setCyclones] = useState<DisasterFeature[]>([]);
  const [rainRadarTiles, setRainRadarTiles] = useState<string[]>([]);
  const [windGrid, setWindGrid] = useState<any>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('PETA');

  // UI state
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [selectedFeature, setSelectedFeature] = useState<DisasterFeature | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lockOnTarget, setLockOnTarget] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // Timeline state — one `now` for all three so the derived progress is exactly 1/3 on both
  // server and client (separate Date.now() calls made SSR/client styles diverge → #418).
  const [timelineState, setTimelineState] = useState<TimelineState>(() => {
    const now = Date.now();
    return {
      currentTime: now,
      startTime: now - 24 * 3600000,
      endTime: now + 48 * 3600000,
      stepHours: 3,
      isPlaying: false,
      speed: 1,
    };
  });

  // Tsunami simulation
  const [tsunamiSimulation, setTsunamiSimulation] = useState<TsunamiSimulationResult | null>(null);
  const [showTsunami, setShowTsunami] = useState(false);

  // Refs
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    fetchAbortRef.current = new AbortController();
    const signal = fetchAbortRef.current.signal;

    setLoading(true);
    try {
      // Fetch earthquakes first (primary data)
      const eqRes = await fetch('/api/earthquakes', { signal, next: { revalidate: 60 } });
      if (eqRes.ok) {
        const data: DisasterFeatureCollection = await eqRes.json();
        setEarthquakes(data.features);
      }
      // Hide loading once primary data (earthquakes) loads
      setLoading(false);

      // Fetch remaining data in parallel (non-blocking)
      const [hsRes, volRes, wxRes, newsRes] = await Promise.allSettled([
        fetch('/api/hotspots', { signal, next: { revalidate: 300 } }),
        fetch('/api/volcanoes', { signal, next: { revalidate: 300 } }),
        fetch('/api/weather', { signal, next: { revalidate: 120 } }),
        fetch('/api/news', { signal, next: { revalidate: 300 } }),
      ]);

      if (hsRes.status === 'fulfilled' && hsRes.value.ok) {
        const data: DisasterFeatureCollection = await hsRes.value.json();
        setHotspots(data.features);
      }
      if (volRes.status === 'fulfilled' && volRes.value.ok) {
        const data: DisasterFeatureCollection = await volRes.value.json();
        setVolcanoes(data.features);
      }
      if (wxRes.status === 'fulfilled' && wxRes.value.ok) {
        const data = await wxRes.value.json();
        if (data.radar?.length) setRainRadarTiles(data.radar.map((r: any) => r.path));
        if (data.weather) setWindGrid(data.weather);
        if (data.cyclones?.features?.length) setCyclones(data.cyclones.features);
      }
      if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
        const data = await newsRes.value.json();
        setNewsArticles(data.articles || []);
        setNewsError(null);
      } else {
        setNewsError('Gagal memuat berita');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Fetch error:', err);
      }
      setLoading(false);
    }
  }, []);

  // Initial fetch and interval
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5 * 60 * 1000); // 5 minutes
    return () => {
      clearInterval(interval);
      fetchAbortRef.current?.abort();
    };
  }, [fetchAllData]);

  // Compute disaster counts for layer badges
  const disasterCounts = {
    earthquake: earthquakes.length,
    hotspot: hotspots.length,
    volcano: volcanoes.length,
    cyclone: cyclones.length,
    flood: 0,
    storm: 0,
    tsunami: 0,
  } as Record<DisasterType, number>;

  // All active disasters for nearby calculation
  const allDisasters = [...earthquakes, ...hotspots, ...volcanoes, ...cyclones];

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    try {
      // Simple geocoding using Nominatim (free)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=id`,
        { headers: { 'User-Agent': 'TerraPulse/1.0' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        setViewport((v) => ({ ...v, latitude: parseFloat(lat), longitude: parseFloat(lon), zoom: 8 }));
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }, []);

  // Handle Near Me
  const handleNearMe = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setViewport((v) => ({ ...v, latitude: lat, longitude: lng, zoom: 8 }));
  }, []);

  // Handle feature click
  const handleFeatureClick = useCallback((feature: DisasterFeature) => {
    setSelectedFeature(feature);
    // Center map on feature
    const coords = feature.geometry.coordinates;
    if (feature.geometry.type === 'Point' && Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number') {
      const [lng, lat] = coords as [number, number];
      setViewport((v) => ({ ...v, latitude: lat, longitude: lng, zoom: Math.max(v.zoom, 7) }));
    }
  }, []);

  // Handle tsunami simulation
  const handleSimulateTsunami = useCallback((feature: DisasterFeature) => {
    const coords = feature.geometry.coordinates;
    if (feature.geometry.type === 'Point' && Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number') {
      const [lng, lat] = coords as [number, number];
      const mag = feature.properties.magnitude || 0;
      const depth = feature.properties.depth || 0;

      const sim = simulateTsunami({
        epicenterLat: lat,
        epicenterLng: lng,
        magnitude: mag,
        depth,
        maxRadiusKm: 1000,
      });
      setTsunamiSimulation(sim);
      setShowTsunami(true);
    }
  }, []);
  // Alert lock-on (PANTAU): center the map and hand the target to MapCanvas
  const handleLockOn = useCallback((lat: number, lng: number) => {
    setViewport((v) => ({ ...v, latitude: lat, longitude: lng, zoom: Math.max(v.zoom, 7) }));
    setLockOnTarget({ lat, lng, label: 'PANTAU' });
  }, []);

  // Handle center map
  const handleCenterMap = useCallback((lat: number, lng: number) => {
    setViewport((v) => ({ ...v, latitude: lat, longitude: lng, zoom: Math.max(v.zoom, 7) }));
  }, []);

  // Timeline handlers
  const handleTimeChange = useCallback((time: number) => {
    setTimelineState((s) => ({ ...s, currentTime: time }));
  }, []);

  const handlePlayPause = useCallback(() => {
    setTimelineState((s) => ({ ...s, isPlaying: !s.isPlaying }));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setTimelineState((s) => ({ ...s, speed }));
  }, []);

  // HUD mode switch (PETA / BERITA) — opening the news drawer closes the event card
  const handleModeChange = useCallback((next: ViewMode) => {
    setViewMode(next);
    if (next === 'BERITA') {
      setSelectedFeature(null);
      setLockOnTarget(null);
    }
  }, []);

  // Tsunami polygons for map (pre-positioned at epicenter)
  const tsunamiPolygons = showTsunami && tsunamiSimulation ? tsunamiSimulation.polygons : [];

  // Bottom-strip telemetry cells
  const timelineMetrics = {
    quakes: earthquakes.length,
    maxMag: Math.max(0, ...earthquakes.map((f) => f.properties.magnitude ?? 0)),
    hotspots: hotspots.length,
    cyclones: cyclones.length,
  };

  return (
    <div className="relative w-full h-[100dvh] bg-tp-bg overflow-hidden">
      {/* Map Canvas */}
      <MapCanvas
        earthquakes={earthquakes}
        hotspots={hotspots}
        volcanoes={volcanoes}
        cyclones={cyclones}
        rainRadarTiles={rainRadarTiles}
        windGrid={windGrid}
        tsunamiPolygons={tsunamiPolygons}
        layerVisibility={layerVisibility}
        viewport={viewport}
        onViewportChange={setViewport}
        onFeatureClick={handleFeatureClick}
        selectedFeatureId={selectedFeature?.id || null}
        timelineTime={timelineState.currentTime}
        lockOnTarget={lockOnTarget}
      />

      {/* PETA HUD cluster (hidden in BERITA mode) */}
      <div id="panel-peta" role="tabpanel" aria-labelledby="tab-peta" hidden={viewMode !== 'PETA'}>
        {/* Telemetry Strip (Top) */}
        <TelemetryStrip
          activeDisasters={allDisasters}
          onCenterMap={handleCenterMap}
          onRefresh={fetchAllData}
          onSearch={handleSearch}
          onNearMe={handleNearMe}
          onLockOn={handleLockOn}
          loading={loading}
        />

        {/* Layer Panel */}
        <LayerPanel
          visibility={layerVisibility}
          onVisibilityChange={setLayerVisibility}
          isMobile={isMobile}
          disasterCounts={disasterCounts}
        />

        {/* Event Card (Bottom Sheet) */}
        <EventCard
          feature={selectedFeature}
          userLocation={userLocation}
          onClose={() => { setSelectedFeature(null); setLockOnTarget(null); }}
          onSimulateTsunami={handleSimulateTsunami}
          onCenterMap={handleCenterMap}
          isMobile={isMobile}
        />

        {/* Bottom telemetry strip (full-bleed, docked) */}
        <TimelineBar
          currentTime={timelineState.currentTime}
          startTime={timelineState.startTime}
          endTime={timelineState.endTime}
          stepHours={timelineState.stepHours}
          isPlaying={timelineState.isPlaying}
          speed={timelineState.speed}
          onTimeChange={handleTimeChange}
          onPlayPause={handlePlayPause}
          onSpeedChange={handleSpeedChange}
          metrics={timelineMetrics}
        />
      </div>

      {/* Brand Lockup + mode tabs (Bottom Left, desktop) */}
      <BrandLockup mode={viewMode} onModeChange={handleModeChange} />

      {/* News drawer (BERITA mode) — stays mounted so aria-controls resolves in both modes */}
      <div hidden={viewMode !== 'BERITA'}>
        <NewsPanel
          articles={newsArticles}
          loading={loading}
          error={newsError}
          onClose={() => handleModeChange('PETA')}
          onCenterMap={handleCenterMap}
        />
      </div>

      {/* News toggle (mobile only — BrandLockup is desktop-only) */}
      <button
        onClick={() => handleModeChange(viewMode === 'BERITA' ? 'PETA' : 'BERITA')}
        className="fixed top-14 right-4 z-40 md:hidden tp-panel tp-label flex min-h-[44px] items-center gap-2 px-3 text-tp-cyan"
        aria-label={viewMode === 'BERITA' ? 'Tutup panel berita' : 'Buka panel berita'}
        aria-expanded={viewMode === 'BERITA'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
        BERITA
      </button>

      {/* Loading indicator */}
      {loading && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 tp-panel-strong px-4 py-2 tp-label flex items-center gap-2 text-tp-text">
          <span className="animate-spin text-tp-cyan" aria-hidden="true">⟳</span>
          <span className="tp-label text-tp-text">Memuat data bencana...</span>
        </div>
      )}
    </div>
  );
}