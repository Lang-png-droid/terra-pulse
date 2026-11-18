'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TimelineState } from '@/types/disaster';

interface TimelineScrubberProps {
  state: TimelineState;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  isMobile: boolean;
  hasCycloneData: boolean;
  hasTsunamiData: boolean;
}

export function TimelineScrubber({
  state,
  onTimeChange,
  onPlayPause,
  onSpeedChange,
  isMobile,
  hasCycloneData,
  hasTsunamiData,
}: TimelineScrubberProps) {
  const [localTime, setLocalTime] = useState(state.currentTime);
  const [dragging, setDragging] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const animationTimeRef = useRef<number>(state.currentTime);
  const lastSyncRef = useRef<number>(0);

  // Sync with external state (when not dragging or animating)
  useEffect(() => {
    if (!dragging && !state.isPlaying) {
      setLocalTime(state.currentTime);
      animationTimeRef.current = state.currentTime;
    }
  }, [state.currentTime, dragging, state.isPlaying]);

  // Animation loop - runs on RAF but only syncs to parent periodically
  useEffect(() => {
    if (!state.isPlaying) return;

    // Initialize animation time
    animationTimeRef.current = state.currentTime;
    lastFrameRef.current = 0;

    const animate = (timestamp: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const delta = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;

      // Calculate time advance based on speed
      // 1x = 1 hour per second, so 3600000 ms per second
      const timeAdvance = (delta / 1000) * state.speed * 3600000; // ms

      animationTimeRef.current += timeAdvance;

      // Check if we've reached the end
      if (animationTimeRef.current >= state.endTime) {
        animationTimeRef.current = state.endTime;
        onTimeChange(state.endTime);
        // Stop animation
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        return;
      }

      // Update local UI state immediately for smooth animation
      setLocalTime(animationTimeRef.current);

      // Throttle parent sync to max 5fps (200ms) to avoid render storms
      const now = performance.now();
      if (now - lastSyncRef.current >= 200) {
        onTimeChange(animationTimeRef.current);
        lastSyncRef.current = now;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state.isPlaying, state.speed, state.endTime, onTimeChange]);

  // Sync to parent when dragging stops
  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setDragging(false);
      onTimeChange(localTime);
    }
  }, [dragging, localTime, onTimeChange]);

  const formatTime = (ts: number): string => {
    const date = new Date(ts);
    const now = new Date();
    const diffHours = (ts - now.getTime()) / 3600000;

    if (Math.abs(diffHours) < 1) {
      return 'Now';
    } else if (diffHours > 0) {
      return `+${Math.round(diffHours)}h`;
    } else {
      return `${Math.round(diffHours)}h`;
    }
  };

  const formatFullTime = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleString('id-ID', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setDragging(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    updateTimeFromClientX(clientX);
  }, [dragging]);

  const updateTimeFromClientX = useCallback((clientX: number) => {
    const scrubberRect = document.querySelector('.timeline-scrubber')?.getBoundingClientRect();
    if (!scrubberRect) return;
    const progress = Math.max(0, Math.min(1, (clientX - scrubberRect.left) / scrubberRect.width));
    const newTime = state.startTime + progress * (state.endTime - state.startTime);
    setLocalTime(newTime);
    animationTimeRef.current = newTime;
  }, [state.startTime, state.endTime]);

  // Mouse/touch event listeners
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: true });
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);
  if (!hasCycloneData && !hasTsunamiData) {
    return null; // Don't show if no time-based data
  }

  const progress = (localTime - state.startTime) / (state.endTime - state.startTime);
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <div
      className="timeline-scrubber fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 md:pb-8"
      style={{ paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 1rem)' : '2rem' }}
    >
      <div className="bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 rounded-t-2xl p-4 md:p-6 max-w-6xl mx-auto shadow-2xl">
        {/* Time display */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
              {formatFullTime(state.startTime)}
            </span>
            <span className="text-sm font-medium text-white whitespace-nowrap" id="current-time-display">
              {formatFullTime(localTime)}
            </span>
            <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
              {formatFullTime(state.endTime)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">{formatTime(localTime)}</span>
            <select
              value={state.speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="bg-zinc-800 border-zinc-700 text-white text-xs px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
              aria-label="Playback speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
            <button
              onClick={onPlayPause}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors touch-target"
              aria-label={state.isPlaying ? 'Pause' : 'Play'}
              aria-pressed={state.isPlaying}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                {state.isPlaying ? (
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Scrubber track */}
        <div
          className="relative h-2 bg-zinc-800 rounded-full cursor-pointer touch-target"
          style={{ minHeight: '44px' }}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clampedProgress * 100)}
          aria-label="Timeline playback"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          tabIndex={0}
          ref={(el) => { if (el) el.classList.add('timeline-scrubber'); }}
        >
          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 h-full bg-cyan-500/80 rounded-full transition-opacity"
            style={{ width: `${clampedProgress * 100}%` }}
          />
          {/* Scrubber handle */}
          <div
            className="absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-cyan-500 rounded-full shadow-lg transition-transform duration-75"
            style={{ left: `${clampedProgress * 100}%`, transform: `translate(-50%, -50%) ${dragging ? 'scale(1.3)' : ''}` }}
            aria-hidden="true"
          />
        </div>

        {/* Key time markers */}
        <div className="flex justify-between mt-3 text-xs text-zinc-500">
          <span>-24h</span>
          <span>Now</span>
          <span>+24h</span>
          <span>+48h</span>
        </div>
      </div>
    </div>
  );
}