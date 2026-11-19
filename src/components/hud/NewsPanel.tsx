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
      if (e.key !== 'Escape') return;
      if (rootRef.current?.closest('[hidden]')) return;
      onClose();
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
      className="fixed bottom-0 left-0 right-0 z-40 flex max-h-[70vh] flex-col overflow-hidden rounded-t-2xl tp-panel-strong safe-bottom animate-slide-up md:bottom-4 md:left-auto md:right-4 md:w-80 md:rounded-xl"
    >
      {/* Grab handle (mobile only) */}
      <div className="flex items-center justify-center py-2 md:hidden">
        <div className="w-10 h-1 rounded-full bg-tp-border" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-tp-border">
        <span className="flex items-center gap-2 min-w-0">
          <span className="tp-label tracking-widest text-tp-text">BERITA BENCANA</span>
          <span className="tp-badge tp-badge-info h-5">{articles.length}</span>
        </span>
        <button
          onClick={onClose}
          className="tp-touch rounded-lg text-tp-muted hover:text-tp-cyan transition-colors"
          aria-label="Tutup panel berita"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* List — one panel, dividers only */}
      {loading && articles.length === 0 ? (
        <ul className="flex-1 overflow-y-auto divide-y divide-tp-border" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="px-3 py-2.5 space-y-2">
              <div className="h-3 w-1/3 rounded bg-tp-surface/40 animate-pulse" />
              <div className="h-3 w-full rounded bg-tp-surface/40 animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-tp-surface/40 animate-pulse" />
            </li>
          ))}
        </ul>
      ) : articles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
          <span className="tp-label text-tp-muted">TIDAK ADA BERITA</span>
          {error && <span className="tp-badge tp-badge-watch">OFFLINE</span>}
        </div>
      ) : (
        <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-tp-border">
          {articles.map((article) => {
            const location = article.location;
            return (
              <li key={article.id} className="flex items-start">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-start gap-2.5 px-3 py-2.5 min-h-[44px] outline-none transition-colors hover:bg-tp-surface/50 focus-visible:ring-2 focus-visible:ring-tp-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-tp-bg"
                >
                  <span
                    className={TYPE_DOT[article.disasterTypes?.[0] ?? 'earthquake']}
                    style={{ width: '6px', height: '6px' }}
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="tp-badge tp-badge-info px-1.5 py-0.5 truncate">{article.source}</span>
                      <span
                        className="tp-label text-tp-dim whitespace-nowrap tabular-nums"
                        title={absolute(article.publishedAt)}
                      >
                        {timeAgo(article.publishedAt, now)}
                      </span>
                    </span>
                    <span className="tp-title text-tp-text line-clamp-2">{article.title}</span>
                    <span className="tp-body text-tp-muted text-[12px] line-clamp-2">{article.summary}</span>
                  </span>
                </a>
                {location && (
                  <button
                    onClick={() => onCenterMap(location.lat, location.lng)}
                    className="tp-touch flex-shrink-0 text-tp-muted hover:text-tp-cyan transition-colors"
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
