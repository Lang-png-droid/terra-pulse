'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PanelCorners } from './PanelCorners';

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
  isMobile: boolean;
  hasCycloneData: boolean;
  hasTsunamiData: boolean;
}

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
  isMobile,
  hasCycloneData,
  hasTsunamiData,
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

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    setDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    updateTimeFromClientX(clientX);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging || !sliderRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    updateTimeFromClientX(clientX);
  }, [dragging]);

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
  const progress = (displayTime - startTime) / (endTime - startTime);
  // ponytail: 2dp keeps SSR and client style strings byte-identical (Date.now() jitter otherwise
  // causes a hydration attribute mismatch). Sub-pixel on a ~400px track.
  const clampedProgress = Math.round(Math.max(0, Math.min(1, progress)) * 10000) / 100;
  // Live time only exists client-side; render neutral values until mounted so the prerendered
  // markup and the first client render agree exactly (no suppressHydrationWarning needed).
  const pct = mounted ? clampedProgress : 0;

  // Fixed markers: -24h, NOW, +24h, +48h
  const markers = [
    { offsetHours: -24, label: '-24H', isMajor: true },
    { offsetHours: 0, label: 'NOW', isMajor: true },
    { offsetHours: 24, label: '+24H', isMajor: true },
    { offsetHours: 48, label: '+48H', isMajor: true },
  ].filter((m) => {
    const markerTime = startTime + m.offsetHours * 3600000;
    return markerTime >= startTime && markerTime <= endTime;
  }).map((m) => ({
    ...m,
    time: startTime + m.offsetHours * 3600000,
    position: (m.offsetHours * 3600000) / (endTime - startTime),
  }));

  return (
    <div
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-40 px-4 pointer-events-none ${isMobile ? 'safe-bottom pb-2' : 'pb-4'}`}
      role="slider"
      aria-label="Timeline playback"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className="pointer-events-auto w-full max-w-sm lg:max-w-md">
        <div className="tp-panel relative flex items-center gap-2 px-3 py-1.5">
          <PanelCorners />

          {/* Play/Pause — 44px hit area, square hairline visual */}
          <button
            onClick={onPlayPause}
            className="tp-touch flex-shrink-0 rounded-[2px] border border-white/[0.09] bg-white/[0.04] text-tp-text transition-colors hover:border-tp-cyan/40 hover:text-tp-cyan"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            aria-pressed={isPlaying}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21" /></svg>
            )}
          </button>

          {/* Speed selector — 44x44 target on the select itself */}
          <label className="flex h-6 min-w-[44px] flex-shrink-0 cursor-pointer items-center justify-center rounded-[2px] bg-white/[0.04]">
            <select
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="h-11 min-h-[44px] min-w-[44px] cursor-pointer appearance-none border-none bg-transparent p-0 text-center font-mono text-[11px] tabular-nums text-tp-text focus:outline-none focus:ring-1 focus:ring-tp-cyan/50"
              aria-label="Playback speed"
            >
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </label>

          {/* Track column: scrubber on top, marker labels in their own row below */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Scrubber: 2px visual track inside a 40px hit area */}
            <div
              ref={sliderRef}
              className="relative flex h-10 items-center"
              onMouseLeave={() => setHoverProgress(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverProgress(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
              }}
            >
              {/* Track background + gradient progress fill (cyan to violet) */}
              <div className="relative h-[2px] w-full bg-white/10">
                <div
                  className="absolute left-0 top-0 h-full tp-gradient-track transition-all duration-75 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Ticks: -24H, NOW, +24H, +48H */}
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {markers.map((m, i) => (
                  <div
                    key={i}
                    className={`absolute bottom-1/2 -translate-x-1/2 bg-tp-cyan ${m.isMajor ? 'w-[2px]' : 'w-[1px]'}`}
                    style={{ left: `${m.position * 100}%`, height: m.isMajor ? '10px' : '6px' }}
                  />
                ))}
              </div>

              {/* Draggable handle: 12px visual, 44px hit area */}
              <div
                className={`absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center ${
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
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const stepMs = stepHours * 3600000;
                    const newTime = Math.max(startTime, displayTime - stepMs);
                    setLocalTime(newTime);
                    animationTimeRef.current = newTime;
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const stepMs = stepHours * 3600000;
                    const newTime = Math.min(endTime, displayTime + stepMs);
                    setLocalTime(newTime);
                    animationTimeRef.current = newTime;
                  }
                }}
              >
                <div
                  className={`h-3 w-3 rounded-full bg-tp-cyan border-2 border-tp-bg shadow-tp-glow-cyan transition-transform duration-100 ${
                    dragging ? 'scale-125' : ''
                  }`}
                />
              </div>

              {/* Hover preview */}
              {hoverProgress !== null && !dragging && (
                <div
                  className="absolute bottom-full mb-1 -translate-x-1/2 whitespace-nowrap rounded-[2px] border border-white/[0.09] bg-[#050507]/95 px-2 py-1 font-mono text-[10px] tabular-nums text-tp-text"
                  style={{ left: `${Math.round(hoverProgress * 10000) / 100}%` }}
                >
                  {formatTimeLabel(startTime + hoverProgress * (endTime - startTime))}
                </div>
              )}
            </div>

            {/* Marker labels — own row under the track, never over the timestamp */}
            <div className="relative h-3" aria-hidden="true">
              {markers.map((m, i) => (
                <span
                  key={i}
                  className="absolute top-0 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500"
                  style={{
                    left: `${m.position * 100}%`,
                    transform: `translateX(-${m.position * 100}%)`,
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Timestamp — own slot at the end of the row */}
          <span className="tp-value flex-shrink-0 whitespace-nowrap font-mono text-[11px] tabular-nums">
            {mounted ? formatTimeLabel(displayTime) : null}
          </span>
        </div>
      </div>
    </div>
  );
}
