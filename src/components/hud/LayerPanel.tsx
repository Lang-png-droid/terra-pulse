'use client';

import { useState } from 'react';
import { LayerVisibility, DisasterType } from '@/types/disaster';
import { PanelCorners } from './PanelCorners';

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

const LAYER_DISPLAY: Record<
  keyof LayerVisibility,
  { label: string; dotClass: string; accent: string }
> = {
  earthquakes: { label: 'GEMPA BUMI', dotClass: 'tp-dot-earthquake', accent: '#22D3EE' },
  hotspots: { label: 'TITIK API', dotClass: 'tp-dot-hotspot', accent: '#EAB308' },
  volcanoes: { label: 'GUNUNG API', dotClass: 'tp-dot-volcano', accent: '#F97316' },
  cyclones: { label: 'SIKLON', dotClass: 'tp-dot-cyclone', accent: '#A855F7' },
  tsunamiRings: { label: 'TSUNAMI', dotClass: 'tp-dot-tsunami', accent: '#A855F7' },
  rainRadar: { label: 'HUJAN', dotClass: 'tp-dot-rain', accent: '#22D3EE' },
  floods: { label: 'BANJIR', dotClass: 'tp-dot-flood', accent: '#22D3EE' },
  windParticles: { label: 'ANGIN', dotClass: 'tp-dot-cyclone', accent: '#A855F7' },
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
    const { label, dotClass, accent } = LAYER_DISPLAY[layer];

    // 28px visible row inside a 44px hit area (C7 keeps passing).
    return (
      <button
        key={layer}
        onClick={() => toggleLayer(layer)}
        className="group flex w-full min-h-[44px] items-center text-left"
        aria-pressed={isActive}
      >
        <span className="relative flex h-7 w-full items-center gap-2 pl-2 pr-1.5 transition-colors group-hover:bg-white/[0.04]">
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2"
            style={{
              background: isActive ? accent : 'rgba(255,255,255,0.08)',
              boxShadow: isActive ? `0 0 8px ${accent}` : 'none',
            }}
          />
          <span
            className={dotClass}
            style={{ width: '5px', height: '5px' }}
            aria-hidden="true"
          />
          <span
            className={`truncate font-mono text-[10px] uppercase tracking-[0.18em] ${
              isActive ? 'text-tp-text' : 'text-zinc-500'
            }`}
          >
            {label}
          </span>
          <span className="ml-auto flex-shrink-0 font-mono text-[10px] tabular-nums text-zinc-500">
            {count}
          </span>
        </span>
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
            className="fixed top-14 left-4 z-40 flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-[2px] border border-white/[0.09] bg-[#050507]/75 px-3 py-2 backdrop-blur-md tp-touch"
            aria-label="Buka kontrol layer"
            aria-expanded="false"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-tp-cyan">LAYER</span>
            <span className="font-mono text-[10px] tabular-nums text-zinc-500">{activeCount}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-tp-muted" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
        )}

        {/* Expanded mobile panel - slide over from left */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <div className="tp-panel-strong fixed bottom-0 left-0 top-0 z-50 flex w-[210px] max-w-[85vw] animate-slide-in flex-col border-r border-white/[0.09]">
              <PanelCorners />
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.09] px-3 py-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">
                    LAYER KONTROL
                  </span>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="tp-touch rounded-[2px] transition-colors hover:bg-white/[0.06]"
                    aria-label="Tutup panel layer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tp-muted" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                {/* Layer list */}
                <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: '55vh' }}>
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
      <PanelCorners />
      {expanded ? (
        <div className="flex flex-col h-full">
          {/* Header with collapse button */}
          <div className="flex items-center justify-between border-b border-white/[0.09] px-3 py-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">
              LAYER KONTROL
            </span>
            <button
              onClick={() => setExpanded(false)}
              className="tp-touch rounded-[2px] transition-colors hover:bg-white/[0.06]"
              aria-label="Collapse panel"
              aria-expanded={true}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tp-muted" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          {/* Layer list */}
          <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: '55vh' }}>
            {LAYER_ORDER.map(renderLayerRow)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-1">
          <button
            onClick={() => setExpanded(true)}
            className="tp-touch rounded-[2px] transition-colors hover:bg-white/[0.06]"
            aria-label="Expand panel"
            aria-expanded={false}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tp-muted" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <span className="font-mono text-[10px] tabular-nums text-zinc-500">{activeCount}</span>
        </div>
      )}
    </aside>
  );
}
