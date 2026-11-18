'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapCanvas } from '@/components/map/MapCanvas';
import { TopBar } from '@/components/hud/TopBar';
import { LayerControl } from '@/components/hud/LayerControl';
import { EventBottomSheet } from '@/components/hud/EventBottomSheet';
import { TimelineScrubber } from '@/components/hud/TimelineScrubber';
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
  const [loading, setLoading] = useState(true);

  // UI state
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [selectedFeature, setSelectedFeature] = useState<DisasterFeature | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'news'>('map');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showNearby, setShowNearby] = useState(false);

  // Timeline state
  const [timelineState, setTimelineState] = useState<TimelineState>({
    currentTime: Date.now(),
    startTime: Date.now() - 24 * 3600000,
    endTime: Date.now() + 48 * 3600000,
    stepHours: 3,
    isPlaying: false,
    speed: 1,
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
      const [eqRes, hsRes, volRes, wxRes, newsRes] = await Promise.allSettled([
        fetch('/api/earthquakes', { signal, next: { revalidate: 60 } }),
        fetch('/api/hotspots', { signal, next: { revalidate: 300 } }),
        fetch('/api/volcanoes', { signal, next: { revalidate: 300 } }),
        fetch('/api/weather', { signal, next: { revalidate: 120 } }),
        fetch('/api/news', { signal, next: { revalidate: 300 } }),
      ]);

      if (eqRes.status === 'fulfilled' && eqRes.value.ok) {
        const data: DisasterFeatureCollection = await eqRes.value.json();
        setEarthquakes(data.features);
      }
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
        if (data.rainRadar?.length) setRainRadarTiles(data.rainRadar.map((r: any) => r.path));
        if (data.windGrid) setWindGrid(data.windGrid);
        if (data.cyclones?.features?.length) setCyclones(data.cyclones.features);
      }
      if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
        const data = await newsRes.value.json();
        setNewsArticles(data.articles || []);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Fetch error:', err);
      }
    } finally {
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
    setShowNearby(true);
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

  // Tsunami rings for map
  const tsunamiRings = showTsunami && tsunamiSimulation ? tsunamiSimulation.rings : [];

  // Check if we have time-based data
  const hasCycloneData = cyclones.length > 0;
  const hasTsunamiData = showTsunami && tsunamiSimulation !== null;

  return (
    <div className="relative w-full h-[100dvh] bg-zinc-950 overflow-hidden">
      {/* Map Canvas */}
      <MapCanvas
        earthquakes={earthquakes}
        hotspots={hotspots}
        volcanoes={volcanoes}
        cyclones={cyclones}
        rainRadarTiles={rainRadarTiles}
        windGrid={windGrid}
        tsunamiRings={tsunamiRings}
        layerVisibility={layerVisibility}
        viewport={viewport}
        onViewportChange={setViewport}
        onFeatureClick={handleFeatureClick}
        selectedFeatureId={selectedFeature?.id || null}
        timelineTime={timelineState.currentTime}
      />

      {/* Top Bar */}
      <TopBar
        activeDisasters={allDisasters}
        newsArticles={newsArticles}
        onSearch={handleSearch}
        onNearMe={handleNearMe}
        onTabChange={setActiveTab}
        activeTab={activeTab}
        userLocation={userLocation}
        loading={loading}
      />

      {/* Layer Control */}
      <LayerControl
        visibility={layerVisibility}
        onVisibilityChange={setLayerVisibility}
        isMobile={isMobile}
        disasterCounts={disasterCounts}
      />

      {/* Event Bottom Sheet */}
      <EventBottomSheet
        feature={selectedFeature}
        userLocation={userLocation}
        onClose={() => setSelectedFeature(null)}
        onSimulateTsunami={handleSimulateTsunami}
        onCenterMap={handleCenterMap}
        isMobile={isMobile}
      />

      {/* Timeline Scrubber */}
      <TimelineScrubber
        currentTime={timelineState.currentTime}
        startTime={timelineState.startTime}
        endTime={timelineState.endTime}
        stepHours={timelineState.stepHours}
        isPlaying={timelineState.isPlaying}
        speed={timelineState.speed}
        onTimeChange={handleTimeChange}
        onPlayPause={handlePlayPause}
        onSpeedChange={handleSpeedChange}
        isMobile={isMobile}
        hasCycloneData={hasCycloneData}
        hasTsunamiData={hasTsunamiData}
      />

      {/* Mobile: Show nearby toggle when not in news tab */}
      {isMobile && activeTab === 'map' && userLocation && !showNearby && allDisasters.length > 0 && (
        <button
          onClick={() => setShowNearby(true)}
          className="fixed bottom-28 right-4 z-40 px-3 py-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-full shadow-lg text-sm text-zinc-200 hover:bg-zinc-800 transition-colors min-h-[44px] flex items-center gap-1"
        >
          📍 Terdekat
        </button>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 border border-zinc-700 px-4 py-2 rounded-full text-sm text-zinc-300 flex items-center gap-2">
          <span className="animate-spin">⟳</span>
          Memuat data bencana...
        </div>
      )}

      {/* PWA Install Prompt (simple) */}
      {/* Could add beforeinstallprompt handler here */}
    </div>
  );
}