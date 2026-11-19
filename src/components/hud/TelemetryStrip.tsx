'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DisasterFeature } from '@/types/disaster';

interface TelemetryStripProps {
  activeDisasters: DisasterFeature[];
  onCenterMap: (lat: number, lng: number) => void;
  onRefresh: () => void;
  onSearch: (query: string) => void;
  onNearMe: (lat: number, lng: number) => void;
  loading: boolean;
}

export function TelemetryStrip({
  activeDisasters,
  onCenterMap,
  onRefresh,
  onSearch,
  onNearMe,
  loading,
}: TelemetryStripProps) {
  const [tickerText, setTickerText] = useState<string>('SISTEM NORMAL — TIDAK ADA PERINGATAN AKTIF');
  const [tickerCoords, setTickerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const tickerRef = useRef<HTMLSpanElement>(null);
  const blinkRef = useRef<number | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    onSearch(query);
    // Collapse the mobile field once the search is dispatched
    if (window.matchMedia('(max-width: 767px)').matches) setSearchOpen(false);
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolokasi tidak didukung browser ini');
      return;
    }
    setGpsError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onNearMe(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocating(false);
        setGpsError('Gagal mendapatkan lokasi');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Find latest earthquake for ticker
  useEffect(() => {
    const earthquakes = activeDisasters.filter((d) => d.properties.type === 'earthquake');
    if (earthquakes.length === 0) {
      setTickerText('SISTEM NORMAL — TIDAK ADA PERINGATAN AKTIF');
      setTickerCoords(null);
      return;
    }

    // Sort by timestamp descending (latest first)
    const sorted = [...earthquakes].sort(
      (a, b) => new Date(b.properties.timestamp).getTime() - new Date(a.properties.timestamp).getTime()
    );
    const latest = sorted[0];
    const mag = latest.properties.magnitude ?? 0;
    const location = latest.properties.title || 'Lokasi tidak diketahui';
    const time = new Date(latest.properties.timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const coords = latest.geometry.coordinates;
    if (latest.geometry.type === 'Point' && Array.isArray(coords) && coords.length >= 2) {
      const [lng, lat] = coords as [number, number];
      setTickerCoords({ lat, lng });
    }

    setTickerText(`GEM M${mag.toFixed(1)} ${location} ${time}`);
  }, [activeDisasters]);

  // Handle ticker click
  const handleTickerClick = () => {
    if (tickerCoords) {
      onCenterMap(tickerCoords.lat, tickerCoords.lng);
    }
  };

  // Pulse animation for LIVE dot
  useEffect(() => {
    let visible = true;
    blinkRef.current = window.setInterval(() => {
      visible = !visible;
      if (tickerRef.current) {
        tickerRef.current.style.opacity = visible ? '1' : '0.3';
      }
    }, 1000);
    return () => {
      clearInterval(blinkRef.current);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 safe-area-inset-top pointer-events-none">
      <div className="mx-auto max-w-[1400px] px-3 pointer-events-auto">
        <div
          className="relative flex items-center justify-between gap-4 bg-tp-panel/70 backdrop-blur-md border-b border-tp-border rounded-none px-4 h-11 min-h-[44px] md:h-10 md:min-h-[40px]"
          role="region"
          aria-label="Telemetri sistem"
        >
          {/* Left: Live indicator + Ticker */}
          <div className="flex items-center gap-3 min-w-0 flex-1" aria-live="polite" aria-atomic="true">
            {/* Live indicator: pulsing cyan dot + LIVE label */}
            <div className="flex items-center gap-2 flex-shrink-0" aria-hidden="true">
              <span
                ref={tickerRef}
                className="tp-dot tp-dot-active animate-pulse-slow"
                style={{ width: '6px', height: '6px', animationDuration: '2s' }}
              />
              <span className="tp-label tracking-widest text-tp-cyan">LIVE</span>
            </div>

            {/* Ticker: clickable earthquake warning */}
            <button
              onClick={handleTickerClick}
              disabled={!tickerCoords || loading}
              className="self-stretch min-h-[44px] flex-1 min-w-0 text-left truncate tp-label-sm tabular-nums text-tp-text hover:text-tp-cyan transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tp-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-tp-bg rounded px-1 py-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={tickerCoords ? 'Klik untuk memusatkan peta ke epicentrum' : 'Tidak ada peringatan aktif'}
              title={tickerCoords ? 'Klik untuk memusatkan peta ke epicentrum' : ''}
            >
              {tickerText}
            </button>
          </div>

          {/* Right: search, GPS, refresh */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <form
              onSubmit={submitSearch}
              className={searchOpen ? 'flex items-center' : 'hidden md:flex md:items-center'}
            >
              {/* Visible chip is the label (28px); the input itself is a 44px transparent target */}
              <label className="flex items-center px-2 h-7 bg-tp-bg/50 border border-tp-border rounded-md cursor-text focus-within:ring-2 focus-within:ring-tp-cyan focus-within:ring-offset-2 focus-within:ring-offset-tp-bg">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari lokasi atau bencana"
                  className="w-[150px] md:w-52 h-11 min-h-[44px] bg-transparent border-0 p-0 m-0 tp-body text-[12px] text-tp-text placeholder:text-tp-muted focus:outline-none"
                  aria-label="Cari lokasi atau bencana"
                />
              </label>
            </form>
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="tp-touch rounded-lg text-tp-muted hover:text-tp-cyan transition-colors md:hidden"
              aria-label={searchOpen ? 'Tutup pencarian' : 'Buka pencarian'}
              aria-expanded={searchOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNearMe}
              disabled={locating}
              className="tp-touch p-1 rounded-lg bg-tp-bg/50 border border-tp-border text-tp-muted hover:text-tp-cyan hover:border-tp-cyan/50 hover:bg-tp-cyan/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Lokasi saya (GPS)"
              aria-busy={locating}
              title={locating ? 'Mencari lokasi...' : 'Lokasi saya'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={locating ? 'animate-pulse' : ''} aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="8" />
              </svg>
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="tp-touch p-1 rounded-lg bg-tp-bg/50 border border-tp-border text-tp-muted hover:text-tp-cyan hover:border-tp-cyan/50 hover:bg-tp-cyan/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Muat ulang data"
              title="Muat ulang data"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: loading ? 'rotate(360deg)' : 'rotate(0deg)' }}
                aria-hidden="true"
              >
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {loading && <span className="sr-only">Memuat...</span>}
            </button>
          </div>

          {/* Non-blocking GPS error */}
          {gpsError && (
            <span role="alert" className="absolute top-full right-3 mt-1 tp-badge tp-badge-critical flex items-center gap-2">
              {gpsError}
              <button
                type="button"
                onClick={() => setGpsError(null)}
                className="text-tp-text/70 hover:text-tp-text"
                aria-label="Tutup pesan lokasi"
              >
                ×
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}