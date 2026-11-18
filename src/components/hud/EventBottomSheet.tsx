'use client';

import { useState, useEffect, useRef } from 'react';
import { getDisasterFeatureLngLat, isDisasterPointFeature } from '@/types/geo';
import { DisasterFeature, DisasterType } from '@/types/disaster';
import { haversineDistance, formatDistance, formatDuration, tsunamiWaveSpeed, tsunamiTravelTimeMinutes } from '@/lib/geoMath';
import { simulateTsunami, formatEta } from '@/components/map/TsunamiSimulation';

interface EventBottomSheetProps {
  feature: DisasterFeature | null;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onSimulateTsunami: (feature: DisasterFeature) => void;
  onCenterMap: (lat: number, lng: number) => void;
  isMobile: boolean;
}

export function EventBottomSheet({
  feature,
  userLocation,
  onClose,
  onSimulateTsunami,
  onCenterMap,
  isMobile,
}: EventBottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [tsunamiSimulation, setTsunamiSimulation] = useState<ReturnType<typeof simulateTsunami> | null>(null);
  const [showTsunami, setShowTsunami] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);

  useEffect(() => {
    if (feature) {
      setExpanded(true);
      setShowTsunami(false);
      setTsunamiSimulation(null);
    } else {
      setExpanded(false);
    }
  }, [feature]);

  // Mobile drag to expand/collapse
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    dragStartRef.current = { y: e.touches[0].clientY, height: sheetRef.current?.offsetHeight || 0 };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStartRef.current || !isMobile) return;
    const deltaY = dragStartRef.current.y - e.touches[0].clientY;
    // Could implement drag height adjustment here
  };

  const handleTouchEnd = () => {
    dragStartRef.current = null;
  };

  if (!feature) return null;

  const props = feature.properties;
  const lngLat = getDisasterFeatureLngLat(feature);
  const [lng, lat] = lngLat ?? [0, 0];

  // Calculate distance from user
  let distanceStr = '';
  if (userLocation && lngLat) {
    const distance = haversineDistance(userLocation.lat, userLocation.lng, lat, lng);
    distanceStr = formatDistance(distance);
  }

  const getIcon = (type: DisasterType) => {
    switch (type) {
      case 'earthquake': return '🌍';
      case 'tsunami': return '🌊';
      case 'volcano': return '🌋';
      case 'hotspot': return '🔥';
      case 'cyclone': return '🌀';
      case 'flood': return '🌊';
      case 'storm': return '⛈️';
    }
  };

  const getMagnitudeColor = (mag?: number) => {
    if (!mag) return 'text-zinc-400';
    if (mag >= 7) return 'text-red-400';
    if (mag >= 6) return 'text-orange-400';
    if (mag >= 5) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getAlertColor = (level?: string) => {
    switch (level) {
      case 'Awas': return 'bg-red-600 text-white';
      case 'Siaga': return 'bg-orange-500 text-white';
      case 'Waspada': return 'bg-yellow-500 text-zinc-900';
      default: return 'bg-green-500 text-white';
    }
  };

  return (
    <div
      ref={sheetRef}
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
        isMobile
          ? expanded
            ? 'max-h-[85vh]'
            : 'max-h-[120px]'
          : 'max-h-[60vh] w-96 right-4 bottom-4 rounded-xl shadow-2xl'
      } bg-zinc-950/95 backdrop-blur-md border-t border-zinc-700 rounded-t-2xl overflow-hidden`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-title"
    >
      {/* Drag Handle */}
      <div className="flex items-center justify-center p-3 cursor-pointer select-none">
        <div className="w-10 h-1 bg-zinc-600 rounded-full" />
      </div>

      {isMobile && !expanded ? (
        // Collapsed mobile view
        <div className="px-4 pb-3" onClick={() => setExpanded(true)}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getIcon(props.type)}</span>
            <div className="flex-1 min-w-0">
              <p id="event-title" className="font-semibold text-white truncate">{props.title}</p>
              <p className="text-sm text-zinc-400 flex items-center gap-2">
                {distanceStr && <span>📍 {distanceStr}</span>}
                {props.magnitude && <span className={getMagnitudeColor(props.magnitude)}>M{props.magnitude}</span>}
                {props.alertLevel && <span className={`px-1.5 py-0.5 rounded text-xs ${getAlertColor(props.alertLevel)}`}>{props.alertLevel}</span>}
                <time className="text-[11px]">{new Date(props.timestamp).toLocaleString('id-ID')}</time>
              </p>
            </div>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">✕</button>
          </div>
        </div>
      ) : (
        // Expanded view
        <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: isMobile ? '70vh' : '50vh' }}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-3xl flex-shrink-0">{getIcon(props.type)}</span>
              <div className="min-w-0">
                <h3 id="event-title" className="font-semibold text-white truncate">{props.title}</h3>
                <p className="text-sm text-zinc-400 flex items-center gap-2 flex-wrap">
                  {distanceStr && <span>📍 {distanceStr} dari Anda</span>}
                  {props.magnitude && <span className={getMagnitudeColor(props.magnitude)} font-mono>M{props.magnitude}</span>}
                  {props.depth && <span>📏 {props.depth} km</span>}
                  {props.alertLevel && <span className={`px-2 py-0.5 rounded text-xs ${getAlertColor(props.alertLevel)}`}>{props.alertLevel}</span>}
                  <time className="text-[11px]">{new Date(props.timestamp).toLocaleString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg flex-shrink-0" aria-label="Tutup">✕</button>
          </div>

          {/* Description */}
          {props.description && (
            <div className="mb-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <p className="text-sm text-zinc-300">{props.description}</p>
            </div>
          )}

          {/* Detail Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {props.magnitude && (
              <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
                <p className="text-[11px] text-zinc-500">Magnitudo</p>
                <p className="font-mono text-lg font-semibold {getMagnitudeColor(props.magnitude)}">M{props.magnitude}</p>
              </div>
            )}
            {props.depth && (
              <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
                <p className="text-[11px] text-zinc-500">Kedalaman</p>
                <p className="font-mono text-lg font-semibold text-white">{props.depth} km</p>
              </div>
            )}
            {props.windSpeedKmh && (
              <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
                <p className="text-[11px] text-zinc-500">Kecepatan Angin</p>
                <p className="font-mono text-lg font-semibold text-white">{props.windSpeedKmh} km/jam</p>
              </div>
            )}
            {props.pressureHpa && (
              <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
                <p className="text-[11px] text-zinc-500">Tekanan</p>
                <p className="font-mono text-lg font-semibold text-white">{props.pressureHpa} hPa</p>
              </div>
            )}
            {props.brightness && (
              <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
                <p className="text-[11px] text-zinc-500">Kecerahan</p>
                <p className="font-mono text-lg font-semibold text-white">{Math.round(props.brightness)} K</p>
              </div>
            )}
            {props.confidence && (
              <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
                <p className="text-[11px] text-zinc-500">Kepercayaan</p>
                <p className="font-mono text-lg font-semibold text-white">{props.confidence}%</p>
              </div>
            )}
            {props.hazardRadiusKm && (
              <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
                <p className="text-[11px] text-zinc-500">Radius Bahaya</p>
                <p className="font-mono text-lg font-semibold text-white">{props.hazardRadiusKm} km</p>
              </div>
            )}
            {props.etaMinutes && (
              <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
                <p className="text-[11px] text-zinc-500">ETA Tsunami</p>
                <p className="font-mono text-lg font-semibold text-blue-400">{formatEta(props.etaMinutes)}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => onCenterMap(lat, lng)}
              className="flex-1 min-w-[120px] py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
            >
              🎯 Fokus ke Peta
            </button>

            {/* Tsunami Simulation Button */}
            {props.type === 'earthquake' && props.magnitude && props.magnitude >= 6.5 && props.depth && props.depth <= 70 && !showTsunami && (
              <button
                onClick={() => onSimulateTsunami(feature)}
                className="flex-1 min-w-[120px] py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                🌊 Simulasi Tsunami
              </button>
            )}

            {props.url && (
              <a
                href={props.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[120px] py-2 px-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 text-center"
              >
                🔗 Sumber
              </a>
            )}
          </div>

          {/* Tsunami Simulation Results */}
          {showTsunami && tsunamiSimulation && (
            <div className="border-t border-zinc-700 pt-3 mt-3 animate-fade-in">
              <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                🌊 Simulasi Tsunami
              </h4>
              <p className="text-sm text-zinc-400 mb-3">
                Kecepatan gelombang: ~{Math.round(tsunamiSimulation.waveSpeedKmh)} km/jam (rata-rata lautan {4000}m)
              </p>

              <div className="space-y-1 max-h-40 overflow-y-auto">
                {tsunamiSimulation.arrivalTimes.slice(0, 8).map((arrival, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded border border-zinc-700">
                    <span className="text-sm text-white truncate pr-2">{arrival.location}</span>
                    <span className="text-sm font-mono text-blue-400 whitespace-nowrap">{formatEta(arrival.etaMinutes)}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowTsunami(false)}
                className="mt-2 w-full py-2 px-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Tutup Simulasi
              </button>
            </div>
          )}

          {/* Source */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-700">
            <span>Sumber: {props.source}</span>
            <span>{new Date(props.timestamp).toLocaleString('id-ID')}</span>
          </div>
        </div>
      )}
    </div>
  );
}