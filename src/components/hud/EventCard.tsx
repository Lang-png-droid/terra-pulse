'use client';

import { useState, useEffect, useRef, type ReactElement } from 'react';
import { getDisasterFeatureLngLat } from '@/types/geo';
import { DisasterFeature, DisasterType } from '@/types/disaster';
import { haversineDistance, formatDistance } from '@/lib/geoMath';
import { simulateTsunami } from '@/components/map/TsunamiSimulation';
import { PanelCorners } from './PanelCorners';

interface EventCardProps {
  feature: DisasterFeature | null;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onSimulateTsunami: (feature: DisasterFeature) => void;
  onCenterMap: (lat: number, lng: number) => void;
  isMobile: boolean;
}

const TYPE_COLORS: Record<DisasterType, string> = {
  earthquake: '#22D3EE',
  hotspot: '#EF4444',
  volcano: '#F97316',
  cyclone: '#A855F7',
  flood: '#3B82F6',
  tsunami: '#06B6D4',
  storm: '#8B5CF6',
};

const TYPE_LABELS: Record<DisasterType, string> = {
  earthquake: 'GEMPA',
  hotspot: 'HOTSPOT',
  volcano: 'GUNUNG API',
  cyclone: 'SIKLON',
  flood: 'BANJIR',
  tsunami: 'TSUNAMI',
  storm: 'BADAI',
};

// Geometric glyphs (no emoji) — colour inherited from the tinted badge
const TYPE_ICONS: Record<DisasterType, ReactElement> = {
  earthquake: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="2 13 6 13 8 7 12 19 14 13 22 13" /></svg>
  ),
  hotspot: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2c1.5 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.5-2-1-3 2.5 1.5 4 3.5 4 6a6 6 0 0 1-12 0c0-4 4-6 6-12z" /></svg>
  ),
  volcano: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 20h18L14 6h-4L3 20z" /><path d="M10 6l2-3 2 3" /></svg>
  ),
  cyclone: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 0 0 8" /></svg>
  ),
  flood: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 13c2.5-3 5.5-3 8 0s5.5 3 8 0" /><path d="M2 18.5c2.5-3 5.5-3 8 0s5.5 3 8 0" /></svg>
  ),
  tsunami: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 17c2.5-3 5.5-3 8 0s5.5 3 8 0" /><path d="M7 12c1-4 3.5-6.5 7-7" /><path d="M14 3l1.5 2.5L13 6.5" /></svg>
  ),
  storm: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 15a4 4 0 1 1 .6-8 5 5 0 0 1 9.4 1.6A3.2 3.2 0 0 1 17 15H7z" /><polyline points="13 15 11 19 14 19 12 23" /></svg>
  ),
};

export function EventCard({
  feature,
  userLocation,
  onClose,
  onSimulateTsunami,
  onCenterMap,
  isMobile,
}: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tsunamiSimulation, setTsunamiSimulation] = useState<ReturnType<typeof simulateTsunami> | null>(null);
  const [showTsunami, setShowTsunami] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);

  useEffect(() => {
    if (feature) {
      setExpanded(false);
      setTsunamiSimulation(null);
      setShowTsunami(false);
    }
  }, [feature]);

  // Mobile drag to expand/collapse
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!sheetRef.current) return;
    dragStartRef.current = {
      y: e.touches[0].clientY,
      height: sheetRef.current.offsetHeight,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStartRef.current || !sheetRef.current) return;
    const deltaY = dragStartRef.current.y - e.touches[0].clientY;
    const newHeight = Math.max(120, Math.min(window.innerHeight * 0.85, dragStartRef.current.height + deltaY));
    sheetRef.current.style.height = `${newHeight}px`;
    if (newHeight > window.innerHeight * 0.5) setExpanded(true);
  };

  const handleTouchEnd = () => {
    dragStartRef.current = null;
  };

  if (!feature) return null;

  const props = feature.properties;
  const lngLat = getDisasterFeatureLngLat(feature);
  const [lng, lat] = lngLat ?? [0, 0];
  const type = (props.type || 'earthquake') as DisasterType;
  const color = TYPE_COLORS[type] || '#22D3EE';

  // Calculate distance from user
  let distanceStr = '';
  if (userLocation && lngLat) {
    const km = haversineDistance(userLocation.lat, userLocation.lng, lat, lng);
    distanceStr = formatDistance(km);
  }

  const getMagnitudeColor = (mag?: number) => {
    if (!mag) return '#22D3EE';
    if (mag >= 6.0) return '#EF4444';
    if (mag >= 5.0) return '#F97316';
    // Cyan to violet gradient
    const t = Math.min(mag / 5.0, 1);
    const r = Math.round(34 + (168 - 34) * t);
    const g = Math.round(211 + (85 - 211) * t);
    const b = Math.round(238 + (247 - 238) * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getAlertColor = (level?: string) => {
    switch (level) {
      case 'Awas': return '#EF4444';
      case 'Siaga': return '#F97316';
      case 'Waspada': return '#EAB308';
      default: return '#22C55E';
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTsunamiSimulate = () => {
    if (type === 'earthquake' && props.magnitude && props.magnitude >= 6.5 && (props.depth || 0) <= 70) {
      onSimulateTsunami(feature);
      const sim = simulateTsunami({
        epicenterLat: lat,
        epicenterLng: lng,
        magnitude: props.magnitude,
        depth: props.depth || 0,
        maxRadiusKm: 1000,
      });
      setTsunamiSimulation(sim);
      setShowTsunami(true);
    }
  };

  return (
    <div
      ref={sheetRef}
      className={`fixed left-0 right-0 z-40 transition-all duration-300 ${
        isMobile
          ? 'bottom-[calc(env(safe-area-inset-bottom)_+_56px)] max-h-[calc(85vh_-_env(safe-area-inset-bottom)_-_56px)]'
          : 'bottom-[68px] xl:bottom-4 left-auto right-4 w-80 max-h-[70vh]'
      }`}
      style={{
        height: expanded ? undefined : isMobile ? '140px' : 'auto',
        transform: expanded ? 'translateY(0)' : isMobile ? 'translateY(0)' : 'translateY(0)',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop overlay (mobile) */}
      {isMobile && expanded && (
        <div
          className="fixed inset-0 z-[-1] bg-black/50 backdrop-blur-sm"
          onClick={() => { setExpanded(false); onClose(); }}
          aria-hidden="true"
        />
      )}

      {/* Main card */}
      <div className="tp-panel-strong relative flex flex-col overflow-hidden tabular-nums">
        <PanelCorners />
        {/* Mobile drag handle indicator */}
        {isMobile && (
          <div className="flex items-center justify-center border-b border-white/[0.09] py-2">
            <div className="h-0.5 w-10 bg-white/20" />
          </div>
        )}
        {/* Header / Drag handle */}
        <div className="flex min-h-[44px] items-center justify-between border-b border-white/[0.09] px-3 py-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[2px]"
              style={{ background: `${color}20`, color }}
            >
              {TYPE_ICONS[type]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="tp-title truncate tracking-[0.14em] text-tp-text">{TYPE_LABELS[type]}</span>
                <span
                  className="px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums"
                  style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                >
                  {type === 'earthquake' && props.magnitude ? `M${props.magnitude.toFixed(1)}` :
                   type === 'volcano' && props.alertLevel ? props.alertLevel.toUpperCase() :
                   type === 'hotspot' && props.confidence ? `${props.confidence}%` : 'AKTIF'}
                </span>
              </div>
              <span className="block truncate font-mono text-[10px] text-zinc-500">
                {props.title || `Lat: ${lat.toFixed(3)}, Lng: ${lng.toFixed(3)}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {distanceStr && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-tp-cyan">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                {distanceStr}
              </span>
            )}
            <button
              onClick={onClose}
              className="tp-touch rounded-[2px] transition-colors hover:bg-white/[0.06]"
              aria-label="Tutup detail"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tp-muted">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4" style={{ maxHeight: isMobile ? 'calc(85vh - 96px - env(safe-area-inset-bottom))' : 'calc(70vh - 120px)' }}>
          {/* Primary metrics — labels over values, no nested boxes */}
          <div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {type === 'earthquake' && props.magnitude && (
                <div className="flex flex-col">
                  <span className="tp-micro">MAGNITUDO</span>
                  <span
                    className="tp-metric leading-none"
                    style={{
                      color: getMagnitudeColor(props.magnitude),
                      textShadow: `0 0 12px ${getMagnitudeColor(props.magnitude)}80`,
                    }}
                  >
                    M{props.magnitude.toFixed(1)}
                  </span>
                </div>
              )}
              {type === 'earthquake' && props.depth && (
                <div className="flex flex-col">
                  <span className="tp-micro">KEDALAMAN</span>
                  <span className="tp-metric">{props.depth} km</span>
                </div>
              )}
              {type === 'volcano' && props.alertLevel && (
                <div className="flex flex-col">
                  <span className="tp-micro">STATUS</span>
                  <span className="tp-metric" style={{ color: getAlertColor(props.alertLevel) }}>
                    {props.alertLevel.toUpperCase()}
                  </span>
                </div>
              )}
              {type === 'volcano' && props.hazardRadiusKm && (
                <div className="flex flex-col">
                  <span className="tp-micro">RADIUS BAHAYA</span>
                  <span className="tp-metric">{props.hazardRadiusKm} km</span>
                </div>
              )}
              {type === 'hotspot' && props.brightness && (
                <div className="flex flex-col">
                  <span className="tp-micro">KECERAHAN</span>
                  <span className="tp-metric">{Math.round(props.brightness)} K</span>
                </div>
              )}
              {type === 'hotspot' && props.confidence && (
                <div className="flex flex-col">
                  <span className="tp-micro">KEPERCAYAAN</span>
                  <span className="tp-metric">{props.confidence}%</span>
                </div>
              )}
              {type === 'cyclone' && props.windSpeedKmh && (
                <div className="flex flex-col">
                  <span className="tp-micro">KECEPATAN ANGIN</span>
                  <span className="tp-metric">{props.windSpeedKmh} km/h</span>
                </div>
              )}
              {type === 'cyclone' && props.pressureHpa && (
                <div className="flex flex-col">
                  <span className="tp-micro">TEKANAN</span>
                  <span className="tp-metric">{props.pressureHpa} hPa</span>
                </div>
              )}
              {props.timestamp && (
                <div className="flex flex-col col-span-2">
                  <span className="tp-micro">WAKTU</span>
                  <span className="tp-metric text-base">{formatTime(new Date(props.timestamp).getTime())} WIB</span>
                </div>
              )}
              {distanceStr && (
                <div className="flex flex-col col-span-2">
                  <span className="tp-micro">JARAK DARI ANDA</span>
                  <span className="tp-metric text-tp-cyan">{distanceStr}</span>
                </div>
              )}
            </div>
          </div>

          {/* Coordinates */}
          <div className="border border-white/[0.09] bg-white/[0.02] p-3">
            <span className="tp-micro block">KOORDINAT</span>
            <div className="flex flex-wrap gap-2 mt-1 tabular-nums">
              <button
                onClick={() => navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)}
                className="tp-touch flex items-center gap-1 rounded-[2px] border border-white/[0.09] bg-[#050507] px-2 py-1 font-mono text-xs tabular-nums text-tp-text transition-colors hover:border-tp-cyan/40"
              >
                {lat.toFixed(6)}, {lng.toFixed(6)}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
              <button
                onClick={() => onCenterMap(lat, lng)}
                className="tp-touch flex items-center gap-1 rounded-[2px] border border-tp-cyan/30 bg-tp-cyan/10 px-2 py-1 font-mono text-xs text-tp-cyan transition-colors hover:bg-tp-cyan/20"
              >
                Center
              </button>
            </div>
          </div>

          {/* Tsunami simulation trigger */}
          {type === 'earthquake' && props.magnitude && props.magnitude >= 6.5 && (props.depth || 0) <= 70 && (
            <div className="border border-tp-cyan/30 bg-tp-cyan/[0.07] p-3">
              <span className="mb-2 flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-tp-cyan">
                SIMULASI TSUNAMI TERSEDIA
              </span>
              <button
                onClick={handleTsunamiSimulate}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[2px] border border-tp-cyan/40 bg-tp-cyan/15 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-tp-cyan transition-colors hover:bg-tp-cyan/25"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                JALANKAN SIMULASI TSUNAMI
              </button>
            </div>
          )}

          {/* Active tsunami simulation display */}
          {showTsunami && tsunamiSimulation && (
            <div className="space-y-2 border border-tp-violet/30 bg-tp-violet/[0.07] p-3">
              <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-tp-violet">
                TSUNAMI SIMULATION ACTIVE
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="tp-micro block">MAX RADIUS</span>
                  <span className="tp-metric text-lg">{tsunamiSimulation.maxRadiusKm} km</span>
                </div>
                <div>
                  <span className="tp-micro block">RINGS</span>
                  <span className="tp-metric text-lg">{tsunamiSimulation.rings.length}</span>
                </div>
                <div>
                  <span className="tp-micro block">FIRST ETA</span>
                  <span className="tp-metric text-lg">{tsunamiSimulation.rings[0]?.etaMinutes || 0} min</span>
                </div>
              </div>
              <button
                onClick={() => { setShowTsunami(false); setTsunamiSimulation(null); }}
                className="tp-touch w-full py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-tp-violet transition-colors hover:text-tp-text"
              >
                HIDE SIMULATION
              </button>
            </div>
          )}

          {/* Expand/collapse indicator (mobile) */}
          {isMobile && (
            <div className="flex items-center justify-center pt-2">
              <div
                className={`w-8 h-0.5 rounded-full transition-colors ${
                  expanded ? 'bg-tp-cyan' : 'bg-tp-border'
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}