'use client';

import { useState } from 'react';
import { LayerVisibility, DisasterType } from '@/types/disaster';

interface LayerPanelProps {
  visibility: LayerVisibility;
  onVisibilityChange: (visibility: LayerVisibility) => void;
  isMobile: boolean;
  disasterCounts: Record<DisasterType, number>;
}

const LAYER_ORDER: Array<keyof LayerVisibility> = [
  'earthquakes',
  'hotspots',
  'volcanoes',
  'cyclones',
  'tsunamiRings',
  'rainRadar',
  'floods',
];

const LAYER_DISPLAY: Record<keyof LayerVisibility, { label: string; dotClass: string }> = {
  earthquakes: { label: 'GEMPA BUMI', dotClass: 'tp-dot-earthquake' },
  hotspots: { label: 'TITIK API', dotClass: 'tp-dot-hotspot' },
  volcanoes: { label: 'GUNUNG API', dotClass: 'tp-dot-volcano' },
  cyclones: { label: 'SIKLON', dotClass: 'tp-dot-cyclone' },
  tsunamiRings: { label: 'TSUNAMI', dotClass: 'tp-dot-tsunami' },
  rainRadar: { label: 'HUJAN', dotClass: 'tp-dot-rain' },
  floods: { label: 'BANJIR', dotClass: 'tp-dot-flood' },
  windParticles: { label: 'ANGIN', dotClass: 'tp-dot-cyclone' },
};

export function LayerPanel({ visibility, onVisibilityChange, isMobile, disasterCounts }: LayerPanelProps) {
  const [expanded, setExpanded] = useState(!isMobile);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleLayer = (layer: keyof LayerVisibility) => {
    onVisibilityChange({ ...visibility, [layer]: !visibility[layer] });
  };

  const renderLayerRow = (layer: keyof LayerVisibility) => {
    const count = disasterCounts[layer as DisasterType] || 0;
    const isActive = visibility[layer];
    const { label, dotClass } = LAYER_DISPLAY[layer];

    // 44px hit area, 1px grid rule between rows, square indicator.
    return (
      <button
        key={layer}
        onClick={() => toggleLayer(layer)}
        className="group flex min-h-[44px] w-full items-center gap-2 border-b border-[#1A1A1A] pl-2 pr-2 text-left transition-colors hover:bg-[#111111]"
        aria-pressed={isActive}
      >
        <span className={`${dotClass} ${isActive ? '' : 'opacity-40'}`} aria-hidden="true" />
        <span
          className={`truncate font-mono text-[10px] uppercase tracking-[0.18em] ${
            isActive ? 'text-white' : 'text-zinc-500'
          }`}
        >
          {label}
        </span>
        <span className="ml-auto flex-shrink-0 font-mono text-[10px] tabular-nums text-zinc-500">{count}</span>
      </button>
    );
  };

  // Mobile: floating trigger button + slide-over panel
  if (isMobile) {
    const activeCount = LAYER_ORDER.filter((l) => visibility[l]).length;

    return (
      <>
        {/* Collapsed trigger button */}
        {!mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            className="tp-panel fixed top-14 left-4 z-40 flex min-h-[44px] min-w-[44px] items-center gap-2 px-3 py-2"
            aria-label="Buka kontrol layer"
            aria-expanded="false"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-tp-cyan">LAYER</span>
            <span className="font-mono text-[10px] tabular-nums text-zinc-500">{activeCount}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-white" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
        )}

        {/* Expanded mobile panel - slide over from left */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/70"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <div className="tp-panel-strong fixed bottom-0 left-0 top-0 z-50 flex w-[210px] max-w-[85vw] animate-slide-in flex-col border-y-0 border-l-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#222222] px-3">
                  <span className="tp-micro">LAYER / AKTIF</span>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="tp-touch text-white transition-colors hover:bg-white/10"
                    aria-label="Tutup panel layer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                {/* Layer list */}
                <div className="flex-1 overflow-y-auto" style={{ maxHeight: '55vh' }}>
                  {LAYER_ORDER.map(renderLayerRow)}
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // Desktop: floating panel that collapses to a 44px rail
  const activeCount = LAYER_ORDER.filter((l) => visibility[l]).length;

  return (
    <aside
      className={`tp-panel fixed top-14 left-4 z-40 overflow-hidden transition-[width] duration-300 ${
        expanded ? 'w-[210px]' : 'w-11'
      }`}
      style={{ maxHeight: '55vh' }}
    >
      {expanded ? (
        <div className="flex flex-col h-full">
          {/* Header with collapse button */}
          <div className="flex items-center justify-between border-b border-[#222222] px-3">
            <span className="tp-micro">LAYER / AKTIF</span>
            <button
              onClick={() => setExpanded(false)}
              className="tp-touch text-white transition-colors hover:bg-white/10"
              aria-label="Collapse panel"
              aria-expanded={true}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          {/* Layer list */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '55vh' }}>
            {LAYER_ORDER.map(renderLayerRow)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-1">
          <button
            onClick={() => setExpanded(true)}
            className="tp-touch text-white transition-colors hover:bg-white/10"
            aria-label="Expand panel"
            aria-expanded={false}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <span className="font-mono text-[10px] tabular-nums text-zinc-500">{activeCount}</span>
        </div>
      )}
    </aside>
  );
}
