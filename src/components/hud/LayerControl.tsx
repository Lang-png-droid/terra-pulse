'use client';

import { useState, useEffect } from 'react';
import { LayerVisibility, DEFAULT_LAYER_VISIBILITY, LAYER_LABELS, LAYER_COLORS, DisasterType } from '@/types/disaster';

interface LayerControlProps {
  visibility: LayerVisibility;
  onVisibilityChange: (visibility: LayerVisibility) => void;
  isMobile: boolean;
  disasterCounts: Record<DisasterType, number>;
}

export function LayerControl({ visibility, onVisibilityChange, isMobile, disasterCounts }: LayerControlProps) {
  const [expanded, setExpanded] = useState(!isMobile);
  const [mobileOpen, setMobileOpen] = useState(false);

  const layers: Array<keyof LayerVisibility> = [
    'earthquakes',
    'hotspots',
    'volcanoes',
    'rainRadar',
    'windParticles',
    'cyclones',
    'tsunamiRings',
    'floods',
  ];

  const toggleLayer = (layer: keyof LayerVisibility) => {
    onVisibilityChange({ ...visibility, [layer]: !visibility[layer] });
  };

  if (isMobile) {
    return (
      <>
        {/* Mobile: Floating toggle button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="fixed bottom-28 left-4 z-40 p-2.5 bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-full shadow-lg min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-200 hover:bg-zinc-800 transition-colors"
          aria-label={mobileOpen ? 'Tutup lapisan' : 'Buka lapisan'}
          aria-expanded={mobileOpen}
        >
          ðŸ—‚ï¸
        </button>

        {/* Mobile: Bottom sheet */}
        {mobileOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-700 rounded-t-2xl p-4 safe-area-inset-bottom animate-slide-up max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Lapisan Peta</h3>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
                aria-label="Tutup"
              >
                âœ•
              </button>
            </div>

            <div className="space-y-2">
              {layers.map((layer) => {
                const count = disasterCounts[layer as DisasterType] || 0;
                const isActive = visibility[layer];
                return (
                  <label
                    key={layer}
                    className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 active:scale-[0.98] transition-transform"
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => toggleLayer(layer)}
                      className="w-5 h-5 accent-blue-500 rounded border-zinc-600 bg-zinc-700 focus:ring-2 focus:ring-blue-500"
                      aria-label={LAYER_LABELS[layer]}
                    />
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: LAYER_COLORS[layer] }}
                    />
                    <span className="flex-1 text-sm font-medium text-white">{LAYER_LABELS[layer]}</span>
                    {count > 0 && (
                      <span className="text-xs text-zinc-400 bg-zinc-700 px-2 py-0.5 rounded-full">
                        {count}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-700">
              <p className="text-xs text-zinc-500 text-center">
                Data dari: BMKG, USGS, NASA FIRMS, PVMBG, RainViewer, Open-Meteo
              </p>
            </div>
          </div>
        )}

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </>
    );
  }

  // Desktop: Floating sidebar
  return (
    <aside
      className={`fixed top-16 left-4 z-40 w-64 bg-zinc-950/80 backdrop-blur-md border border-zinc-700 rounded-xl shadow-xl transition-all duration-300 ${
        expanded ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
      }`}
      style={{ maxHeight: 'calc(100vh - 180px)' }}
    >
      <div className="p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Lapisan</h3>
          <button
            onClick={() => setExpanded(false)}
            className="p-1 text-zinc-400 hover:text-white rounded md:hidden"
            aria-label="Tutup sidebar"
          >
            âœ•
          </button>
        </div>

        <div className="space-y-1.5">
          {layers.map((layer) => {
            const count = disasterCounts[layer as DisasterType] || 0;
            const isActive = visibility[layer];
            return (
              <label
                key={layer}
                className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => toggleLayer(layer)}
                  className="w-4.5 h-4.5 accent-blue-500 rounded border-zinc-600 bg-zinc-700 focus:ring-2 focus:ring-blue-500"
                  aria-label={LAYER_LABELS[layer]}
                />
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: LAYER_COLORS[layer] }}
                />
                <span className="flex-1 text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                  {LAYER_LABELS[layer]}
                </span>
                {count > 0 && (
                  <span className="text-xs text-zinc-400 bg-zinc-700 px-2 py-0.5 rounded-full group-hover:bg-zinc-600 transition-colors">
                    {count}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-700 space-y-2">
          <div className="text-xs text-zinc-500">
            <p className="font-medium text-zinc-300 mb-1">Legenda Warna Gempa:</p>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF4444' }} />
              <span>&gt; M6.0</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF8800' }} />
              <span>M5.0-6.0</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFAA00' }} />
              <span>&lt; M5.0</span>
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            <p className="font-medium text-zinc-300 mb-1">Status Gunung Api:</p>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-full bg-red-600" /> Awas
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-full bg-orange-500" /> Siaga
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-full bg-yellow-500" /> Waspada
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-3 h-3 rounded-full bg-green-500" /> Normal
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 text-center">
            Data: BMKG, USGS, NASA FIRMS, PVMBG, RainViewer, Open-Meteo
          </p>
        </div>
      </div>
    </aside>
  );
}

