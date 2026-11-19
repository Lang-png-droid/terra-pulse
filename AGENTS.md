# AGENTS.md - Real-Time Disaster & Weather Radar Web App

## 1. Project Identity & Core Objective

- **Project Name:** TerraPulse
- **Mission:** Build an ultra-lightweight, real-time interactive disaster & weather radar web application (inspired by Zoom Earth) engineered for seamless performance on both mobile smartphones (PWA) and desktop browsers.
- **Key Capabilities:** Real-time tracking of earthquakes, tsunami propagation simulations, volcanic eruptions, forest fire hotspots (Karhutla), flash flood risk zones, and tropical cyclone/typhoon genesis playback.

## 2. Strict Tech Stack & Zero-Cost Constraints

- **Framework:** Next.js 15+ (App Router), TypeScript (strict mode), Tailwind CSS.
- **Map & WebGL Engine:** `maplibre-gl` + `@deck.gl/core` + `@deck.gl/layers` + `@deck.gl/mapbox` (or custom WebGL overlay).
- **Basemap Provider:** Free dark-mode vector/raster tiles ONLY (`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`).
- **STRICT PROHIBITIONS:**
  - NEVER use Google Maps API, Mapbox GL JS proprietary tokens, or paid tile APIs.
  - NEVER use Leaflet or render large datasets (>50 points) as individual DOM/HTML markers; all spatial points, heatmaps, wind particles, and tsunami rings MUST render inside WebGL layers (`deck.gl`).
  - NEVER expose external API fetches directly from client components if prone to CORS or rate-limiting; route through Next.js API Route Handlers with caching.

## 3. Mobile-First & PWA Architecture Rules

- **Viewport & Safe Areas:** Always use `h-[100dvh]` for full-screen map containers to prevent mobile browser URL-bar clipping. Respect `env(safe-area-inset-bottom)` on bottom drawers/bars.
- **Touch Targets:** Every interactive button, pill, and slider thumb MUST have a minimum touch area of `44x44px`.
- **Adaptive HUD Layout:**
  - **Mobile (`< 768px`):** Compact floating top search/GPS bar + horizontal scrollable layer filter pills + swipeable/collapsible bottom sheet for event details and timeline playback.
  - **Desktop (`>= 768px`):** Floating translucent glassmorphic sidebar (`backdrop-blur-md bg-zinc-950/80 border-zinc-800`) on the left + bottom centered timeline scrubber.
- **Adaptive WebGL Throttling (`useDeviceCapability` hook):**
  - Automatically detect mobile viewport (`innerWidth < 768`) or low CPU core count (`navigator.hardwareConcurrency <= 4`).
  - On mobile/low-tier devices: cap cyclone wind particle count to `1500` (vs `5000` on desktop), cap `devicePixelRatio` to `Math.min(window.devicePixelRatio, 2)`, and throttle animation frame updates if needed to prevent thermal throttling.
- **PWA & Geolocation:**
  - Include `public/manifest.json` (`"display": "standalone"`, dark theme `#09090B`) and lightweight service worker caching for app shell assets.
  - Implement a "Near Me" GPS button (`navigator.geolocation`) calculating Haversine distance (km) from the user to active disasters.

## 4. Data Sources & Backend Normalization (`/src/app/api/...`)

All external feeds MUST be normalized into a unified `DisasterFeatureCollection` (GeoJSON) schema with Next.js `revalidate` caching (`60s` to `300s`):

1. **Earthquakes & Tsunami Alerts (`/api/earthquakes`):**
   - Primary (Indonesia): BMKG Open Data (`https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json` & `autogempa.json`).
   - Global Fallback: USGS Earthquake API (`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson`).
2. **Forest Fire Hotspots / Karhutla (`/api/hotspots`):**
   - NASA FIRMS (VIIRS/MODIS active fire feed) normalized to GeoJSON points with `brightness`, `confidence`, and `acq_date`. Include a realistic mock/fallback GeoJSON generator if NASA FIRMS API key is not set in `.env.local`.
3. **Volcanic Activity (`/api/volcanoes`):**
   - PVMBG MAGMA Indonesia / Smithsonian Global Volcanism Program feed normalized with `alert_level` (Normal, Waspada, Siaga, Awas) and hazard radius (km).
4. **Weather Radar, Flood Risk & Cyclone Genesis (`/api/weather`):**
   - Precipitation radar timestamps & tiles: RainViewer Public Weather Maps API (`https://api.rainviewer.com/public/weather-maps.json`).
   - Wind vector grid (U/V components) & surface pressure: Open-Meteo Forecast API (`https://api.open-meteo.com/v1/forecast`) + active storm track feed (JTWC / NOAA).

## 5. Simulation Engines (Client-Side Lightweight Math)

- **Typhoon / Cyclone Genesis Playback:**
  - Use a bottom Timeline Scrubber (`-24h` historical to `+48h` forecast in 3-hour steps).
  - Animate wind particles along interpolated U/V wind vector grids, highlighting low-pressure convergence zones (`< 1005 hPa`) with spiral trajectory paths.
- **Tsunami Wave Propagation Simulation:**
  - Trigger automatically when a submarine earthquake has `magnitude >= 6.5` and `depth <= 70 km` (or via manual "Simulate Tsunami" test toggle in Event Detail Card).
  - Render concentric isochrone travel-time rings expanding from the epicenter using shallow-water wave speed approximation `v = sqrt(g * h)` (default average ocean depth `h = 4000 m` -> `v ~ 713 km/h`), displaying estimated time of arrival (ETA) rings in 15-minute intervals.

## 6. Directory Structure Standard

```
src/
├── app/
│   ├── api/
│   │   ├── earthquakes/route.ts
│   │   ├── hotspots/route.ts
│   │   ├── volcanoes/route.ts
│   │   └── weather/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── map/
│   │   ├── MapCanvas.tsx          # MapLibre + DeckGL WebGL container
│   │   ├── WindParticleLayer.ts   # Custom/DeckGL wind vector animation
│   │   └── TsunamiSimulation.ts   # Isochrone ring generator
│   └── hud/
│       ├── LayerPanel.tsx         # Layer toggles (desktop panel / mobile drawer)
│       ├── EventCard.tsx          # Event detail card / mobile bottom sheet
│       └── NewsPanel.tsx          # BERITA mode news drawer
├── hooks/
│   └── useDeviceCapability.ts     # Mobile/GPU throttling & viewport detection
├── lib/
│   ├── geoMath.ts                 # Haversine distance & tsunami wave velocity math
│   └── normalizers.ts             # BMKG/USGS/NASA/Open-Meteo to GeoJSON parsers
└── types/
    └── disaster.ts                # Unified TypeScript interfaces
```

## 7. Agent Workflow, Coding Standards & Verification

- **Autonomous Execution:** Build incrementally milestone-by-milestone. Do not leave `TODO` placeholders in core data fetchers or map rendering logic.
- **Error Resilience:** Every `/api/*` route MUST implement `try/catch` with graceful fallback data so the map never crashes if an external government/agency endpoint times out.
- **Remote & Mobile Verification (Playwright MCP):**
  - After completing UI or map milestones, run the dev server and inspect the app using Playwright at BOTH desktop (`1280x800`) and mobile (`390x844`, touch enabled) viewports.
  - Verify zero console/WebGL errors, confirm `100dvh` layout integrity, and verify that HUD controls do not overlap critical map interactions.

---

## 8. Phase 4 Verification Results (2026-11-19)

| Check | Status |
|-------|--------|
| `npm run build` | ✅ Passed (warnings only, no errors) |
| Dev server startup | ✅ Port 3001 |
| Desktop screenshot (1280x800) | ✅ `./screenshots/desktop-final.png` |
| Mobile screenshot (390x844 iPhone 14) | ✅ `./screenshots/mobile-final.png` |
| Console errors | ✅ 0 |
| Uncaught page errors | ✅ 0 |
| Map canvas renders (Indonesia centered, zoom 4.5) | ✅ Verified |
| Earthquake markers with crosshair reticles | ✅ Visible |
| Loading indicator disappears after load | ✅ Verified |
| HUD elements present (TelemetryStrip, LayerPanel, TimelineBar, BrandLockup, EventCard) | ✅ Verified |

---

## 9. Architecture Summary (Updated)

### Vertical Slice Structure
```
src/
├── app/
│   ├── api/
│   │   ├── earthquakes/route.ts     # BMKG + USGS fallback
│   │   ├── hotspots/route.ts        # NASA FIRMS + mock fallback
│   │   ├── volcanoes/route.ts       # PVMBG + Smithsonian
│   │   ├── weather/route.ts         # RainViewer + Open-Meteo
│   │   └── news/route.ts            # News API
│   ├── layout.tsx                   # Root layout, PWA manifest
│   └── page.tsx                     # Main page, composes all HUD + Map
├── components/
│   ├── map/
│   │   ├── MapCanvas.tsx            # MapLibre + DeckGL integration
│   │   ├── MapBase.tsx              # MapLibre setup, basemap, controls
│   │   ├── DisasterLayers.tsx       # Earthquake/Volcano/Hotspot/Flood layers
│   │   ├── WindLayer.tsx            # Wind vector grid (DeckGL)
│   │   ├── WindParticleLayer.ts     # Wind particle animation
│   │   ├── TsunamiLayer.tsx         # Tsunami isochrone rings
│   │   └── TsunamiSimulation.ts     # Shallow-water wave math
│   └── hud/
│       ├── LayerPanel.tsx           # Layer toggles (desktop panel / mobile drawer)
│       ├── EventCard.tsx            # Event detail card / mobile bottom sheet
│       ├── NewsPanel.tsx            # BERITA news drawer
│       ├── TelemetryStrip.tsx       # Live stats (top-left)
│       ├── TimelineBar.tsx          # Bottom timeline (desktop)
│       └── BrandLockup.tsx          # Logo + tagline
├── hooks/
│   ├── useDeviceCapability.ts       # Mobile/low-tier throttling
│   ├── useDisasters.ts              # SWR data fetching
│   └── useMapViewport.ts            # Viewport state
├── lib/
│   ├── geoMath.ts                   # Haversine, tsunami velocity
│   ├── normalizers.ts               # All API → GeoJSON parsers
│   └── utils.ts                     # Helpers
└── types/
    └── disaster.ts                  # Unified GeoJSON interfaces
```

### Data Flow
1. **Client** → `useDisasters` hook fetches from `/api/*` routes (SWR, 60-300s revalidate)
2. **API Routes** → Normalize external feeds (BMKG, USGS, FIRMS, Open-Meteo, RainViewer) → `DisasterFeatureCollection`
3. **MapCanvas** → Receives GeoJSON → Passes to `DisasterLayers` + `WindLayer` + `TsunamiLayer`
4. **DeckGL Layers** → `ScatterplotLayer` (earthquakes/volcanoes/hotspots) + `PathLayer` (tsunami rings) + `WindParticleLayer`

---

## 10. Reference: DESIGN.md

See [`DESIGN.md`](./DESIGN.md) for:
- Color system & design tokens (CSS variables, Tailwind theme)
- Typography scale (Space Grotesk + Fira Code + Share Tech Mono)
- Component specifications (HUD panels, buttons, badges, dots)
- Responsive breakpoints (mobile < 768px, desktop >= 768px)
- Animation keyframes (radar sweep, slide, fade, pulse)
- Accessibility standards (focus-visible, ARIA, contrast)

---

## 11. deck.gl v9 ScatterplotLayer Usage Rules

### Import Pattern
```typescript
import { ScatterplotLayer } from '@deck.gl/layers';
```

### Required Props (Strict)
```typescript
<ScatterplotLayer
  id="earthquakes"
  data={earthquakeFeatures}           // GeoJSON Feature[]
  getPosition={f => [f.geometry.coordinates[0], f.geometry.coordinates[1]]}
  getRadius={f => Math.max(8, Math.pow(10, f.properties.mag / 2))}  // Magnitude-based
  getFillColor={f => getQuakeColor(f.properties.mag, f.properties.depth)}
  getLineColor={[255, 255, 255, 180]}
  getLineWidth={1.5}
  radiusMinPixels={3}
  radiusMaxPixels={50}
  pickable={true}
  onHover={handleHover}
  onClick={handleClick}
  updateTriggers={{
    getFillColor: [colorScheme],      // Re-render on theme change
    getRadius: [radiusScale],
  }}
/>
```

### Anti-Patterns (Forbidden)
- Rendering >500 features as individual DOM markers (use `ScatterplotLayer` or `IconLayer`)
- Missing `radiusMinPixels`/`radiusMaxPixels` (causes zoom flicker)
- Using `getPosition` that mutates input data
- No `updateTriggers` for dynamic props (causes stale renders)

### Performance
- Use `radiusMinPixels: 3` + `radiusMaxPixels: 50` for consistent visual scale
- Cap data points: earthquakes ≤ 200, hotspots ≤ 500 (server-side pagination)
- Enable `gpuAggregation` for heatmap layers (v9+)

---

## 12. Weather API Fallback Behavior

### RainViewer (Precipitation Radar)
```typescript
// Primary
const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');

// Fallback chain
1. Try RainViewer API (30s timeout)
2. On 4xx/5xx/timeout → Use cached response (Next.js `revalidate: 300`)
3. If no cache → Return empty `frameTimes: []` + `radar: { past: [], nowcast: [] }`
4. Client renders "Radar unavailable" toast (non-blocking)
```

### Open-Meteo (Wind Vectors + Cyclone Tracks)
```typescript
// Primary
const response = await fetch('https://api.open-meteo.com/v1/forecast?...');

// Fallback chain
1. Try Open-Meteo (30s timeout)
2. On 4xx/5xx/timeout → Use cached response (Next.js `revalidate: 600`)
3. If no cache → Generate mock wind grid (Perlin noise) centered on Indonesia
4. Client renders particles from mock grid (visual continuity)
```

### NASA FIRMS (Hotspots)
```typescript
// Primary (requires MAP_KEY in .env.local)
const response = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/VIIRS_SNPP_NRT/...`);

// Fallback chain
1. If MAP_KEY missing → Generate realistic mock hotspots (Indonesia region)
2. If API fails → Use cached CSV (revalidate: 300)
3. If no cache → Return empty FeatureCollection
4. Client shows "Hotspots: using simulated data" badge
```

### BMKG / USGS (Earthquakes)
```typescript
// Primary (BMKG Indonesia)
const bmkg = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json');

// Fallback chain
1. Try BMKG (15s timeout)
2. On fail → Try USGS (https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson)
3. On USGS fail → Use cached response (revalidate: 60)
4. If both fail → Return last known good data + `stale: true` flag
5. Client shows "Live data delayed" indicator
```

### Key Principle
**Never crash the map.** Every `/api/*` route returns valid `DisasterFeatureCollection` (possibly empty or stale) with `meta: { source, cached, stale, timestamp }` so the UI can render gracefully.