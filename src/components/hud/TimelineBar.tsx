'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface TimelineMetrics {
  quakes: number;
  maxMag: number;
  hotspots: number;
  cyclones: number;
}

interface TimelineBarProps {
  currentTime: number;
  startTime: number;
  endTime: number;
  stepHours: number;
  isPlaying: boolean;
  speed: number;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  metrics: TimelineMetrics;
}

/**
 * Full-bleed bottom telemetry strip: metrics row (44px) + 1px rule + playback
 * row (52px) = 97px at every breakpoint, so EventCard anchors can be derived
 * arithmetically (97 + env(safe-area-inset-bottom)).
 */
export function TimelineBar({
  currentTime,
  startTime,
  endTime,
  stepHours,
  isPlaying,
  speed,
  onTimeChange,
  onPlayPause,
  onSpeedChange,
  metrics,
}: TimelineBarProps) {
  const [localTime, setLocalTime] = useState(currentTime);
  const [dragging, setDragging] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const animationTimeRef = useRef<number>(currentTime);
  const sliderRef = useRef<HTMLDivElement>(null);
  // The route is statically prerendered, so the server bakes the clock/progress at build time.
  // Rendering them only after mount keeps hydration exact without disabling SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Animation loop - runs on RAF, updates local ref for smooth display
  useEffect(() => {
    if (!isPlaying) return;
    const animate = (timestamp: number) => {
      if (lastFrameRef.current === 0) lastFrameRef.current = timestamp;
      const delta = (timestamp - lastFrameRef.current) * speed;
      lastFrameRef.current = timestamp;
      animationTimeRef.current = Math.min(animationTimeRef.current + delta, endTime);
      setLocalTime(animationTimeRef.current);
      if (animationTimeRef.current >= endTime) {
        animationTimeRef.current = startTime;
        setLocalTime(startTime);
        onTimeChange(startTime);
      } else {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = 0;
    };
  }, [isPlaying, speed, endTime, onTimeChange, startTime]);

  // Sync to parent when dragging stops
  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setDragging(false);
      onTimeChange(localTime);
    }
  }, [dragging, localTime, onTimeChange]);

  const formatTimeLabel = (ts: number): string => {
    const d = new Date(ts);
    return d.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
  };

  const updateTimeFromClientX = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = startTime + progress * (endTime - startTime);
    const stepMs = stepHours * 3600000;
    const snappedTime = Math.round(newTime / stepMs) * stepMs;
    const clampedTime = Math.max(startTime, Math.min(endTime, snappedTime));
    setLocalTime(clampedTime);
    animationTimeRef.current = clampedTime;
  }, [startTime, endTime, stepHours]);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    setDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    updateTimeFromClientX(clientX);
  }, [updateTimeFromClientX]);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging || !sliderRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    updateTimeFromClientX(clientX);
  }, [dragging, updateTimeFromClientX]);

  // Mouse/touch event listeners
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: true });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const displayTime = isPlaying ? animationTimeRef.current : localTime;
  // A zero-length window (start === end, e.g. a degraded timeline payload) would divide by
  // zero here and leak NaN into the fill width and aria-valuenow. Guard at the source.
  const span = endTime - startTime;
  const progress = span > 0 ? (displayTime - startTime) / span : 0;
  // ponytail: 2dp keeps SSR and client style strings byte-identical (Date.now() jitter otherwise
  // causes a hydration attribute mismatch). Sub-pixel on a ~400px track.
  const clampedProgress = Number.isFinite(progress)
    ? Math.round(Math.max(0, Math.min(1, progress)) * 10000) / 100
    : 0;
  // Live time only exists client-side; render neutral values until mounted so the prerendered
  // markup and the first client render agree exactly (no suppressHydrationWarning needed).
  const pct = mounted ? clampedProgress : 0;

  // Fixed markers: -24h, NOW, +24h, +48h
  const markers = [
    { offsetHours: -24, label: '-24H' },
    { offsetHours: 0, label: 'NOW' },
    { offsetHours: 24, label: '+24H' },
    { offsetHours: 48, label: '+48H' },
  ].filter((m) => {
    const markerTime = startTime + m.offsetHours * 3600000;
    return markerTime >= startTime && markerTime <= endTime;
  }).map((m) => ({
    ...m,
    position: span > 0 ? (m.offsetHours * 3600000) / span : 0,
  }));

  const cells: Array<{ label: string; value: string }> = [
    { label: 'GEMPA', value: String(metrics.quakes) },
    { label: 'MAKS M', value: Number.isFinite(metrics.maxMag) ? metrics.maxMag.toFixed(1) : '0.0' },
    { label: 'HOTSPOT', value: String(metrics.hotspots) },
    { label: 'SIKLON', value: String(metrics.cyclones) },
  ];

  return (
    <div
      className="tp-panel pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 border-t-[#222222] bg-black pb-[env(safe-area-inset-bottom)]"
      role="slider"
      aria-label="Timeline playback"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Number.isFinite(pct) ? Math.round(pct) : 0}
    >
      {/* Row 1 — metric cells, 44px, 1px grid dividers */}
      <div className="flex h-11 items-stretch border-b border-[#1A1A1A]">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={`flex min-w-0 flex-1 flex-col justify-center px-3 ${i < cells.length - 1 ? 'border-r border-[#1A1A1A]' : ''}`}
          >
            <span className="tp-micro truncate leading-none">{c.label}</span>
            <span className="tp-metric mt-1 truncate leading-none">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Row 2 — playback, 52px (44px controls + 8px vertical padding) */}
      <div className="flex items-center gap-1.5 px-2 py-1">
        <button
          onClick={onPlayPause}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center border border-[#222222] text-white transition-colors hover:border-white"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
        >
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21" /></svg>
          )}
        </button>

        <select
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="h-11 w-11 flex-shrink-0 cursor-pointer appearance-none border border-[#222222] bg-transparent p-0 text-center font-mono text-[11px] tabular-nums text-white hover:border-white focus:outline-none"
          aria-label="Playback speed"
        >
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={4}>4×</option>
        </select>

        {/* Track: 1px rule at y=14, tick marks, 10px square thumb, labels on the baseline */}
        <div
          ref={sliderRef}
          className="relative h-11 min-w-0 flex-1"
          onMouseLeave={() => setHoverProgress(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoverProgress(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
          }}
        >
          <div className="absolute inset-x-0 top-[14px] h-px bg-[#222222]">
            <div className="absolute left-0 top-0 h-px bg-white transition-all duration-75 ease-out" style={{ width: `${pct}%` }} />
          </div>

          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {markers.map((m) => (
              <div
                key={m.label}
                className="absolute top-[9px] h-[11px] w-px -translate-x-1/2 bg-[#3F3F46]"
                style={{ left: `${m.position * 100}%` }}
              />
            ))}
            {markers.map((m) => (
              <span
                key={`${m.label}-label`}
                className="absolute bottom-0.5 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500"
                style={{ left: `${m.position * 100}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div
            className={`absolute top-[14px] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center ${
              dragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ left: `${pct}%` }}
            role="slider"
            tabIndex={0}
            aria-label="Timeline scrubber"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            onKeyDown={(e) => {
              const stepMs = stepHours * 3600000;
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const newTime = Math.max(startTime, displayTime - stepMs);
                setLocalTime(newTime);
                animationTimeRef.current = newTime;
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const newTime = Math.min(endTime, displayTime + stepMs);
                setLocalTime(newTime);
                animationTimeRef.current = newTime;
              }
            }}
          >
            <div className="h-2.5 w-2.5 bg-white" />
          </div>

          {/* Hover preview */}
          {hoverProgress !== null && !dragging && (
            <div
              className="absolute bottom-full mb-1 -translate-x-1/2 whitespace-nowrap border border-[#222222] bg-black px-2 py-1 font-mono text-[10px] tabular-nums text-white"
              style={{ left: `${Math.round(hoverProgress * 10000) / 100}%` }}
            >
              {formatTimeLabel(startTime + hoverProgress * (endTime - startTime))}
            </div>
          )}
        </div>

        <span className="tp-value flex-shrink-0 whitespace-nowrap font-mono text-[10px] tabular-nums text-white">
          {mounted ? formatTimeLabel(displayTime) : null}
        </span>
      </div>
    </div>
  );
}
