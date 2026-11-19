'use client';

import { useEffect, useRef, useState } from 'react';
import type { DisasterType, NewsArticle } from '@/types/disaster';
import { timeAgo } from '@/lib/timeAgo';

interface NewsPanelProps {
  articles: NewsArticle[];
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onCenterMap: (lat: number, lng: number) => void;
}

const TYPE_DOT: Record<DisasterType, string> = {
  earthquake: 'tp-dot tp-dot-earthquake',
  tsunami: 'tp-dot tp-dot-tsunami',
  volcano: 'tp-dot tp-dot-volcano',
  hotspot: 'tp-dot tp-dot-hotspot',
  cyclone: 'tp-dot tp-dot-cyclone',
  storm: 'tp-dot tp-dot-cyclone',
  flood: 'tp-dot tp-dot-flood',
};

// SUMBER / LAPORAN KEJADIAN / WAKTU share one grid template across header and rows.
const ROW = 'grid grid-cols-[62px_minmax(0,1fr)_54px] items-start gap-2';

export function NewsPanel({ articles, loading, error = null, onClose, onCenterMap }: NewsPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  // Keep relative timestamps fresh without re-rendering the map.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Esc closes — only while the panel is actually shown (parent toggles `hidden`).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const absolute = (iso: string) =>
    Number.isNaN(Date.parse(iso)) ? undefined : new Date(iso).toLocaleString('id-ID');

  return (
    <div
      ref={rootRef}
      id="panel-berita"
      role="tabpanel"
      aria-labelledby="tab-berita"
      aria-label="Berita bencana"
      className="tp-panel-strong fixed bottom-0 left-0 right-0 z-40 flex max-h-[70vh] flex-col overflow-hidden border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] animate-slide-up md:bottom-4 md:left-auto md:right-4 md:w-80 md:border-b md:pb-0"
    >
      {/* Grab handle (mobile only) */}
      <div className="flex items-center justify-center border-b border-[#1A1A1A] py-2 md:hidden">
        <div className="h-px w-10 bg-[#3F3F46]" />
      </div>

      {/* Header */}
      <div className="flex min-h-[44px] items-center justify-between border-b border-[#222222] px-3">
        <span className="flex items-center gap-2 min-w-0">
          <span className="tp-micro">BERITA BENCANA</span>
          <span className="font-mono text-[10px] tabular-nums text-white">{articles.length}</span>
        </span>
        <button
          onClick={onClose}
          className="tp-touch text-white transition-colors hover:bg-white/10"
          aria-label="Tutup panel berita"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Column header */}
      <div className={`${ROW} border-b border-[#222222] px-3 py-1`}>
        <span className="tp-micro">SUMBER</span>
        <span className="tp-micro">LAPORAN KEJADIAN</span>
        <span className="tp-micro border-l border-[#222222] pl-2 text-right">WAKTU</span>
      </div>

      {/* Rows — one flat table, 1px rules only */}
      {loading && articles.length === 0 ? (
        <ul className="flex-1 overflow-y-auto" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className={`${ROW} border-b border-[#1A1A1A] px-3 py-3`}>
              <div className="h-2 w-full bg-[#111111]" />
              <div className="space-y-2">
                <div className="h-2 w-full bg-[#111111]" />
                <div className="h-2 w-4/5 bg-[#111111]" />
              </div>
              <div className="h-2 w-full bg-[#111111]" />
            </li>
          ))}
        </ul>
      ) : articles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
          <span className="tp-micro">TIDAK ADA BERITA</span>
          {error && <span className="tp-badge tp-badge-watch">OFFLINE</span>}
        </div>
      ) : (
        <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {articles.map((article) => {
            const location = article.location;
            return (
              <li key={article.id} className="flex items-stretch border-b border-[#1A1A1A]">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${ROW} min-h-[44px] flex-1 px-3 py-2 outline-none transition-colors hover:bg-[#111111] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={`${TYPE_DOT[article.disasterTypes?.[0] ?? 'earthquake']} flex-shrink-0`}
                      aria-hidden="true"
                    />
                    <span className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white">
                      {article.source}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="line-clamp-2 font-geo text-sm leading-snug text-white">{article.title}</span>
                    <span className="line-clamp-2 font-mono text-[11px] leading-relaxed text-zinc-500">{article.summary}</span>
                  </span>
                  <span
                    className="tp-label text-tp-dim whitespace-nowrap border-l border-[#222222] pl-2 text-right tabular-nums"
                    title={absolute(article.publishedAt)}
                  >
                    {timeAgo(article.publishedAt, now)}
                  </span>
                </a>
                {location && (
                  <button
                    onClick={() => onCenterMap(location.lat, location.lng)}
                    className="tp-touch flex-shrink-0 border-l border-[#1A1A1A] text-white transition-colors hover:bg-white/10"
                    aria-label="Tampilkan di peta"
                    title={`Tampilkan ${location.name} di peta`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
