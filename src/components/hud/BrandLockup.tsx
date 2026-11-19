'use client';

export type ViewMode = 'PETA' | 'BERITA';

interface BrandLockupProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

const MODE_TABS: Array<{ id: string; panel: string; label: string; mode: ViewMode; title: string }> = [
  { id: 'tab-peta', panel: 'panel-peta', label: 'PETA', mode: 'PETA', title: 'Mode Peta' },
  { id: 'tab-berita', panel: 'panel-berita', label: 'BERITA', mode: 'BERITA', title: 'Mode Berita' },
];

export function BrandLockup({ mode, onModeChange }: BrandLockupProps) {
  return (
    <div
      className="fixed bottom-[105px] left-4 safe-left z-40 pointer-events-auto select-none hidden md:block"
      aria-label="TerraPulse brand"
    >
      <div className="flex flex-col items-start gap-2">
        {/* Brand lockup: radar icon + TERRA // PULSE */}
        <div className="flex items-center gap-2">
          {/* Geometric radar icon (SVG, 24x24) */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-tp-cyan"
            aria-hidden="true"
          >
            {/* Outer circle */}
            <circle cx="12" cy="12" r="10" opacity="0.3" />
            {/* Inner circle */}
            <circle cx="12" cy="12" r="6" opacity="0.5" />
            {/* Center dot */}
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            {/* Sweep line */}
            <line x1="12" y1="12" x2="12" y2="2" strokeWidth="2" />
            {/* Cardinal markers */}
            <line x1="12" y1="10" x2="12" y2="8" opacity="0.4" />
            <line x1="12" y1="14" x2="12" y2="16" opacity="0.4" />
            <line x1="10" y1="12" x2="8" y2="12" opacity="0.4" />
            <line x1="14" y1="12" x2="16" y2="12" opacity="0.4" />
          </svg>
          <span className="tp-label tracking-widest text-tp-text">TERRA // PULSE</span>
        </div>

        {/* Mode switcher: [ PETA · BERITA ] - minimal underline style, 44x44 hit area */}
        <div className="flex items-center gap-1" role="tablist" aria-label="Mode tampilan">
          {MODE_TABS.map((tab, index) => (
            <div key={tab.id} className="flex items-center gap-1">
              {index > 0 && (
                <span className="tp-label-sm text-tp-dim" aria-hidden="true">
                  ·
                </span>
              )}
              <button
                role="tab"
                id={tab.id}
                aria-selected={mode === tab.mode}
                aria-controls={tab.panel}
                onClick={() => onModeChange(tab.mode)}
                className={`tp-label-sm tp-touch border px-3 transition-colors ${
                  mode === tab.mode
                    ? 'border-white bg-white text-black'
                    : 'border-[#222222] text-zinc-500 hover:border-white hover:text-white'
                }`}
                title={tab.title}
              >
                {tab.label}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
