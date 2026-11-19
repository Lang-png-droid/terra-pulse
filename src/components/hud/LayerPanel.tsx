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

    return (
      <button
        key={layer}
        onClick={() => toggleLayer(layer)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm transition-colors hover:bg-tp-surface/50 tp-touch"
        aria-pressed={isActive}
      >
        <span
          className={`${dotClass} flex-shrink-0`}
          style={{ width: '6px', height: '6px' }}
          aria-hidden="true"
        />
        <span className="tp-label-sm text-tp-text truncate flex-1 text-left">{label}</span>
        {count > 0 && (
          <span className="tp-badge-info px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0 text-[9px]">
            {count}
          </span>
        )}
        <span
          className={`font-mono text-[10px] uppercase tracking-widest flex-shrink-0 ${
            isActive ? 'text-tp-cyan' : 'text-tp-dim'
          }`}
          aria-hidden="true"
        >
          {isActive ? 'ON' : 'OFF'}
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
            className="fixed top-14 left-4 z-40 px-3 py-2 bg-tp-panel/90 backdrop-blur-md border border-tp-border rounded-full shadow-lg min-h-[44px] min-w-[44px] flex items-center gap-2 tp-touch"
            aria-label="Buka kontrol layer"
            aria-expanded="false"
          >
            <span className="tp-label tracking-wider text-tp-cyan">LAYER</span>
            <span className="tp-badge-info px-2 py-0.5 rounded-full min-w-[24px] text-center">{activeCount}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tp-muted flex-shrink-0">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
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
            <div className="fixed top-0 left-0 bottom-0 z-50 w-[210px] max-w-[85vw] tp-panel-strong rounded-none border-r border-tp-border shadow-xl animate-slide-in flex flex-col">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-tp-border">
                  <span className="tp-label tracking-widest text-tp-text">LAYER KONTROL</span>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-2 rounded-lg hover:bg-tp-surface transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center tp-touch"
                    aria-label="Tutup panel layer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tp-muted">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                {/* Layer list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1" style={{ maxHeight: '55vh' }}>
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
      className={`fixed top-14 left-4 z-40 tp-panel rounded-lg shadow-xl overflow-hidden transition-[width] duration-300 ${
        expanded ? 'w-[210px]' : 'w-11'
      }`}
      style={{ maxHeight: '55vh' }}
    >
      {expanded ? (
        <div className="flex flex-col h-full">
          {/* Header with collapse button */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-tp-border">
            <span className="tp-label tracking-widest text-tp-text">LAYER KONTROL</span>
            <button
              onClick={() => setExpanded(false)}
              className="tp-touch rounded-lg hover:bg-tp-surface transition-colors"
              aria-label="Collapse panel"
              aria-expanded={true}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tp-muted" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          {/* Layer list */}
          <div className="p-3 overflow-y-auto space-y-1 flex-1" style={{ maxHeight: '55vh' }}>
            {LAYER_ORDER.map(renderLayerRow)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 py-1">
          <button
            onClick={() => setExpanded(true)}
            className="tp-touch rounded-lg hover:bg-tp-surface transition-colors"
            aria-label="Expand panel"
            aria-expanded={false}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tp-muted" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <span className="tp-badge-info px-1.5 py-0.5 rounded-full min-w-[20px] text-center text-[9px]">{activeCount}</span>
        </div>
      )}
    </aside>
  );
}