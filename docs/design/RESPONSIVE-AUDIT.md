# HUD Responsive / Accessibility Audit

Programmatic audit of the TerraPulse HUD against `docs/design/STITCH-HUD-SPEC.md` §0 (C1–C10), run by
`scripts/audit-hud.mjs` (Playwright 1.65.1, already-installed dependency, no new deps) against a
**production** build. The gate command sequence is unchanged:

```
rm -rf .next && npm run build && npx next start -p 3001
node scripts/audit-hud.mjs          # audit + screenshots
node scripts/audit-hud.mjs --shots  # screenshots only
```

Viewports: 375x812, 768x1024, 1024x768, 1280x800, 1440x900 (mobile breakpoint = `width < 768`,
matching `useDeviceCapability`). Console messages are truncated to their first line by design.
Measurement date: **2026-11-20**, at **`91c5b8f`** (`91c5b8fa9aedd114fc85e31d886eb38405cd127f`,
*"fix(map): drag cursor from maplibre dragPan, deck controller is null in interleaved mode"*).

**Overall result: all PASS.** C6, C7, C8, BERITA reachability and all three cursor states pass at
every viewport; the map renders full-viewport everywhere; the EventCard opens everywhere; and a
production load produces **0 console errors, 0 pageerrors and 0 failed requests** at every viewport.

The document describes the **brutalist** system that replaced the hairline shell: flat 1px paths,
quantised 4-step alphas, `#000000` ocean, `#111111` land, `#2E2E2E` coastline, full-bleed 97px
telemetry strip.

---

## 1. Gate results (repo-level)

| Gate | Command | Result |
| --- | --- | --- |
| Unit tests | `npm run test:unit` | **PASS** — exit 0, 4 files, 14 tests (vitest 3.2.7), 8.62s |
| Types | `npx tsc --noEmit` | **PASS** — exit 0 |
| Build | `rm -rf .next && npm run build` | **PASS** — exit 0, 77.6s, `✓ Compiled successfully`, 9/9 static pages, page **461 kB / 566 kB First Load**, 105 kB shared |
| E2E | `npx playwright test tests/app.spec.ts` | **PASS** — exit 0, 6 passed, 3 skipped, 42.4s |
| Audit | `node scripts/audit-hud.mjs` | **PASS** — exit 0, 166s, 0 step failures |

Shared chunks: `chunks/441` 50.5 kB, `chunks/fe412ec4` 52.9 kB, other 2.02 kB. Five API routes
(`/api/earthquakes`, `/api/hotspots`, `/api/news`, `/api/volcanoes`, `/api/weather`) are 148 B each;
`/_not-found` is 977 B. The build emitted four `@typescript-eslint/no-explicit-any` warnings
(`DisasterLayers.tsx:273,307,345,359`) — warnings, not errors; exit 0.

The E2E gate ran against the same production server on port 3001 (`playwright.config.ts`
`baseURL: http://localhost:3001`, `webServer: undefined`).

---

## 2. Measured rects (PETA mode, CSS pixels)

| viewport | lockup | timeline strip | layer control | telemetry strip | mobile news toggle | news panel (BERITA) |
| --- | --- | --- | --- | --- | --- | --- |
| 375x812 | not rendered (hidden <768) | 0,715 375x97 | 16,56 100x44 (trigger) | 0,0 375x44 | 265.2,56 93.8x44 | 0,249.3 375x562.8 |
| 768x1024 | 16,843 148.3x76 | 0,927 768x97 | 16,56 210x355 | 0,0 768x44 | n/a (`md:hidden`) | 432,462.3 320x545.8 |
| 1024x768 | 16,587 148.3x76 | 0,671 1024x97 | 16,56 210x355 | 0,0 1024x44 | n/a (`md:hidden`) | 688,214.4 320x537.6 |
| 1280x800 | 16,619 148.3x76 | 0,703 1280x97 | 16,56 210x355 | 0,0 1280x44 | n/a (`md:hidden`) | 944,238.3 320x545.8 |
| 1440x900 | 16,719 148.3x76 | 0,803 1440x97 | 16,56 210x355 | 0,0 1440x44 | n/a (`md:hidden`) | 1104,338.3 320x545.8 |

**The 97px strip.** `TimelineBar` renders a single `fixed inset-x-0 bottom-0` container holding two
rows: the metrics row (`h-11` = **44px**) with a 1px `border-b` rule, then the playback row
(**52px** — a `h-11` slider track plus its label baseline). 44 + 1 + 52 = **97px**, and the measured
height is **97px at all five viewports**, spanning the full viewport width (`inset-x-0`), flush to the
bottom edge. There is no pill, no horizontal centring and no per-breakpoint width.

**EventCard anchors** are derived from that constant rather than from magic numbers: mobile
`bottom-[calc(env(safe-area-inset-bottom)+97px)]` with `left-0 right-0` and
`max-h-[calc(100dvh-env(safe-area-inset-bottom)-157px)]` (97px strip + 8px gap + 52px top strip);
desktop `bottom-[105px] left-auto right-4 w-80` with `max-h-[calc(100dvh-177px)]`. 105 = 97 + 8.

The layer panel is a fixed 210x355 side panel at `top-14 left-4` on desktop and a 100x44 trigger on
mobile; it is 28px shorter than the previous 210x383 because the rows are now `min-h-[44px]` flat
rows without the hairline chrome. The telemetry strip is the full viewport width and 44px tall. The
brand lockup is 148.3x76 (was 134.6x76) and stays 76px tall at every desktop viewport, 8px above the
strip's top edge.

---

## 3. Map sizing

| viewport | `.maplibregl-canvas` | `.maplibregl-map` |
| --- | --- | --- |
| 375x812 | 0,0 375x812 | 0,0 375x812 |
| 768x1024 | 0,0 768x1024 | 0,0 768x1024 |
| 1024x768 | 0,0 1024x768 | 0,0 1024x768 |
| 1280x800 | 0,0 1280x800 | 0,0 1280x800 |
| 1440x900 | 0,0 1440x900 | 0,0 1440x900 |

Canvas == container == viewport at every size. The live style resolves 96 layers with
`background: "#111111"` and `water: "#000000"`.

**Basemap palette** (`src/components/map/MapBase.tsx:20-22`): ocean `#000000` (`GRID_OCEAN`), land
`#111111` (`GRID_LAND`), coastline / boundaries / graticule `#2E2E2E` (`GRID_LINE`, 1px lines,
`water_shadow` follows the ocean tone). `landcover`, `park_national_park`, `park_nature_reserve`,
`landuse_residential` and `landuse` all carry `fill-color: #111111`, so the land fill is uniform.

**Finding: in Carto dark-matter the `background` layer *is* the land tone.** `water` is drawn on top
of `background`, so the visible sea is the `water` fill and everything `background` shows through is
land. Setting `background` to `GRID_OCEAN` — the state before `85c8de6` — painted the land black and
collapsed it into the ocean; the map read as a blank black field with only markers on it. After the
fix the same 1280x800 viewport measures **46,652 → 157,473 non-black pixels** (3.4x), and a
`gl.readPixels` census separates a ~170k-px `#111111` region from an ~809k-px pure-black ocean.

---

## 4. Overlap assertions (spec C8)

Method: rectangle-intersection of the measured boxes (`area > 0.5px²` counts as a hit).

| pair | 375 | 768 | 1024 | 1280 | 1440 |
| --- | --- | --- | --- | --- | --- |
| lockup vs timeline | N/A (lockup not rendered) | PASS (8px clear) | PASS (8px clear) | PASS (8px clear) | PASS (8px clear) |
| lockup vs EventCard | N/A (lockup not rendered) | PASS | PASS | PASS | PASS |
| timeline vs EventCard | PASS (flush, 0px gap) | PASS (8px clear) | PASS (8px clear) | PASS (8px clear) | PASS (8px clear) |
| NewsPanel vs timeline (live BERITA rects) | N/A | N/A | N/A | N/A | N/A |
| NewsPanel vs timeline strip using the *PETA-mode* rect (cross-mode reference, not reachable live) | 36375px² | 25952px² | 25920px² | 25952px² | 25952px² |

**0 live overlaps at all five viewports.** The clearances are arithmetic consequences of the
anchors: the EventCard's bottom edge is `env(safe-area-inset-bottom)+97px` from the viewport bottom
on mobile (with `safe-area-inset-bottom = 0` in Chromium that is exactly 97px, so the card's bottom
edge at 375x812 sits at y=715, flush against the strip's top edge at y=715 — adjacent, zero
intersection) and `105px` on desktop (card bottom 919/663/695/795 against strip tops 927/671/703/803,
i.e. **8px** at every desktop viewport). The lockup clears the strip by the same 8px at
768/1024/1280/1440.

**Cross-mode note.** The `NewsPanel vs timeline (PETA rect)` row compares a rect measured in BERITA
mode with one measured in PETA mode. It cannot occur live: in BERITA mode `#panel-peta` carries
`hidden` (`petaHiddenAttr=true`, `petaDisplay=none`) and the timeline element measures `not rendered`
(0x0 box) at all five viewports. Both rectangles are never on screen together, so that pair is
reported as reference only — **it still FAILs numerically at 36375 / 25952 / 25920 / 25952 / 25952
px², and that is expected**, not a regression and not reachable.

---

## 5. Touch targets (spec C7) — **PASS**

Every `button`, `a[href]`, `input`, `[role="tab"]`, `select` inside the HUD containers
(`TelemetryStrip`, `BrandLockup`, `TimelineBar`, `LayerPanel`, mobile layer trigger, mobile news
toggle, `#panel-berita`) measured in PETA mode and again with BERITA open; requirement ≥ 44x44.
Map-library controls are excluded by design.

| viewport | violations |
| --- | --- |
| 375x812 | 0 |
| 768x1024 | 0 |
| 1024x768 | 0 |
| 1280x800 | 0 |
| 1440x900 | 0 |

Sizing is uniform by construction in the brutalist shell: strip buttons and the speed `<select>` are
`h-11 w-11` (44x44), the scrub track is `h-11`, the telemetry ticker is `min-h-[44px]` and the search
input `h-11 min-h-[44px] w-[150px]` (`md:w-52`), layer rows are `min-h-[44px]` and full-width, and the
mobile news toggle measures 93.8x44. Nothing relies on padding to reach 44px.

---

## 6. Numeric readouts (spec C6) — **PASS**

`font-variant-numeric` computed style, checked on the live elements. The set is **8 baseline + 2
conditional** readouts:

| readout | 375 | 768 | 1024 | 1280 | 1440 |
| --- | --- | --- | --- | --- | --- |
| telemetry ticker (`button`) | ok | ok | ok | ok | ok |
| timeline clock (`.tp-value`) | ok | ok | ok | ok | ok |
| timeline hover bubble | ok | ok | ok | ok | ok |
| timeline speed `<select>` | ok | ok | ok | ok | ok |
| NewsPanel relative time | ok | ok | ok | ok | ok |
| EventCard WAKTU | ok | ok | ok | ok | ok |
| EventCard KOORDINAT value | ok | ok | ok | ok | ok |
| EventCard coord copy button | ok | ok | ok | ok | ok |
| EventCard MAGNITUDO *(conditional: earthquake only)* | absent | absent | ok | absent | absent |
| EventCard KEDALAMAN *(conditional: earthquake only)* | absent | absent | ok | absent | absent |

**0 readouts failing.** MAGNITUDO and KEDALAMAN are conditional sections rendered for earthquake
features only; this run opened an earthquake card at 1024x768, so all ten were exercised there, and
the other four viewports exercised the eight baseline readouts against a non-earthquake card. No
`found: false` was recorded for any baseline readout at any viewport.

---

## 7. EventCard

| viewport | opened | how | rect |
| --- | --- | --- | --- |
| 375x812 | yes | marker pixel scan (227,397 n=59) | 0,575 375x140 |
| 768x1024 | yes | marker pixel scan (67,835 n=61) | 432,641.5 320x277.5 |
| 1024x768 | yes | marker pixel scan (901,76 n=40) | 688,385.5 320x277.5 |
| 1280x800 | yes | marker pixel scan (703,388 n=51) | 944,417.5 320x277.5 |
| 1440x900 | yes | marker pixel scan (594,433 n=58) | 1104,517.5 320x277.5 |

Opened at all five viewports. The card is 375x140 full-bleed on mobile and 320x277.5 right-anchored
on desktop. Content at 1280x800: title `GEMPA M5.5` / `Gempa 5.5 SR 169 km BaratLaut TANIMBAR`, then
`MAGNITUDO M5.5`, `KEDALAMAN 130 km`, `WAKTU Sen, 02 Nov, 00.00 WIB`, `KOORDINAT 7.080000, …`.

The harness finds markers by scanning the map canvas for bright pixels and clustering them
(`markerCandidates`), then clicking each centroid until `[aria-label="Tutup detail"]` has a non-zero
box; a telemetry-ticker recentre + rescan is the fallback. Pixel scanning replaces the earlier
Web-Mercator projection, which assumed a fixed initial viewport and broke on any recentre.

---

## 8. BERITA mode reachability

| viewport | toggle clicked | panel rect | close button ≥44 | rows (first 3) | `#panel-peta` while BERITA | timeline while BERITA | back to PETA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 375x812 | yes | 0,249.3 375x562.8 | yes | 331x94 ×3 | `hidden` / `display:none` | not rendered | true |
| 768x1024 | yes | 432,462.3 320x545.8 | yes | 276x94 ×3 | `hidden` / `display:none` | not rendered | true |
| 1024x768 | yes | 688,214.4 320x537.6 | yes | 276x94 ×3 | `hidden` / `display:none` | not rendered | true |
| 1280x800 | yes | 944,238.3 320x545.8 | yes | 276x94 ×3 | `hidden` / `display:none` | not rendered | true |
| 1440x900 | yes | 1104,338.3 320x545.8 | yes | 276x94 ×3 | `hidden` / `display:none` | not rendered | true |

PASS at all five viewports: the toggle opens the panel, rows (94px tall) and the close button are
≥44px, PETA is hidden while BERITA is open, and closing returns to PETA. The panel is 320x545.8 on
desktop (320x537.6 at 1024x768) and full-width 375x562.8 on mobile, anchored `right-4` beside the map.

---

## 9. Runtime noise — clean

Production build, per viewport load, all five viewports: **0 console errors, 0 pageerrors, 0 step
failures, 0 failed requests**. The three historical problems remain fixed:

- **Hydration mismatch `Minified React error #418`** — fixed by a mount gate in `TimelineBar`: the
  clock, progress and `aria-valuenow` render a neutral value until mounted, so server and first
  client render match.
- **Rain-radar 404 storm** — the tile template appends the radar frame colour scheme:
  `https://tilecache.rainviewer.com/v2/radar/<frame>/256/{z}/{x}/{y}/2/1_1.png`, newest frame first.
- **`The layer 'tsunami-rings' does not exist …`** — the
  `map.queryRenderedFeatures(e.point, { layers: [...] })` call is guarded against layers not yet in
  the style.

**Two defects were found and resolved in this pass (history):**

- **Land tint** (`85c8de6`). `MapBase` painted the `background` layer with `GRID_OCEAN`, but in Carto
  dark-matter `background` *is* the land tone — `water` is composited above it. Every land pixel was
  therefore painted the same `#000000` as the sea and the archipelago vanished; only deck.gl markers
  and the HUD chrome remained on a black field. The fix paints `background` with `GRID_LAND` and the
  fallback style with `#111111`, measured as 46,652 → 157,473 non-black px (§3, §12).
- **Cursor** (`85c8de6` + `91c5b8f`). Two successive errors: a manual `style.cursor` write in
  `MapCanvas` lost to deck.gl's per-frame `_updateCursor`, and then the `getCursor` callback itself
  could never return `grabbing` because `MapboxOverlay` is constructed `interleaved: true` and
  `_onAddInterleaved` builds `new Deck({...this._props, views, gl, parameters})` — with no
  `controller`, deck's `_onInteractionStateChange` is called 0 times and `cursorState.isDragging`
  stays `false` forever. `91c5b8f` sources the drag state from `map.dragPan.isActive()` instead (§11).

**No console output remains from the app or its map libraries.** Chromium still logs its own
`GPU stall due to ReadPixels` performance warnings under headless screenshot capture; those come from
the browser, not the app, and do not appear in a normal load.

---

## 10. WebGL animation

Map animation runs outside React: `MapCanvas` drives one RAF loop that calls `applyLayers()` →
`overlay.setProps()`, so no component re-renders per frame. The loop is throttled to ~24fps
(`if (now - last < 41) return`), is cancelled on `visibilitychange` while `document.hidden` and
restarted on return, and under `prefers-reduced-motion: reduce` (`useDeviceCapability` reads
`matchMedia('(prefers-reduced-motion: reduce)')`) it early-returns after a single `applyLayers()` with
every layer frozen at `time = 0` (`DisasterLayers` `frozen` pins opacity; `WindParticleLayer` takes a
static path). The scheduler and its gates are unchanged by the brutalist restyle.

Four animated phenomena, now rendered flat: seismic rings as 1px paths, a cyclogenesis vortex as a
1px dashed track, thermal hotspot stepping through the alpha ladder, and a hydrological pulse gated on
`pressureHpa < 1005`. **There is no glow.** Every phenomenon steps through four discrete alphas —
`STEPS = [235, 165, 95, 35]` — instead of fading continuously, so motion reads as printed telemetry
rather than a soft bloom; nothing uses a large low-alpha radius to fake emission.

Evidence — `readPixels` on `.maplibregl-canvas` at 1280x800, snapshots kept in-page, per-channel diff
threshold `|ΔR|+|ΔG|+|ΔB| > 12`, 9s settle before sampling. Retained from the measurement pass that
introduced the 24fps loop; the loop, the gates and the sampling method are unchanged since.

| assertion | window | result |
| --- | --- | --- |
| animating | 1200ms | **25514/1024000 px changed (2.492%)**, max Δ 330 |
| paused (`document.hidden`) | 1200ms | **0 px changed**, max Δ 0 |
| resumed | 1200ms | 11981 px changed (1.17%) |
| reduced motion | 1200ms | **0 px changed**, 13693 bright px (not blank) |

The paused and reduced-motion canvases are bit-identical to their own previous frame, so the gates are
real rather than a frame that happens to look static. Sampling has to wait for tile and radar fades to
settle; at a 3s settle a "paused" window still shows pixel change that is not animation.

---

## 11. Marker design + hover callout

**Bullseye markers** (`src/components/map/DisasterLayers.tsx:120`, `bullseyeLayers`). Three stacked
`ScatterplotLayer`s per phenomenon, all with `radiusUnits: 'pixels'` and min == max, so a marker reads
identically at any zoom and never scales with the map:

| part | layer | radius | stroke |
| --- | --- | --- | --- |
| core | `<id>` | 5px (`radiusMinPixels: 4`, `radiusMaxPixels: 6`) | filled, no stroke |
| hairline ring | `<id>-rings` | 11px (pinned) | 1.5px (`2px` when selected) |
| tick ring | `<id>-ticks` | 18px (pinned) | 1px, active events only |

The tick ring is drawn for **active** events: earthquakes `magnitude >= 6`, volcanoes whose
`alertLevel !== 'Normal'`, cyclones `windSpeedKmh >= 118`, and hotspots `brightness > 330`. Selected
features are drawn white; otherwise the phenomenon colour applies (`RED #FF4D2A` earthquake/volcano,
`AMBER #F59E0B` hotspot, `SKY #38BDF8` flood/hydrological, `WHITE` cyclone/tsunami/selection).

**Hover callout** (`src/components/map/MapCanvas.tsx:229-254, 376-381`). A single
`div[aria-hidden="true"]` with `position: fixed` and an inline `display: none`, class
`pointer-events-none fixed z-20 border-l-2 border-white bg-black/95 px-2 py-1 font-mono text-[10px]
leading-tight whitespace-pre text-white tabular-nums`. `handleHover` mutates it **imperatively** —
`style.left`, `style.top`, `textContent`, `style.display` — from deck's `onHover`; **zero React state
is touched**, so hovering never re-renders the tree. Position is `cursor + 12px`, flipping to the other
side of the cursor when `left + 200 > innerWidth` or `top + 36 > innerHeight`, then clamped to ≥ 0.

Measured on a live hover at 1280x800:

- node: `display: block`, `visible: true`, rect `[1041, 104, 205, 33]`
- computed: `background-color: rgba(0, 0, 0, 0.95)`, `border-left: 2px rgb(255, 255, 255)`,
  `font-size: 10px`, family `Fira Code`
- text: `"EQ M5.5\nGempa 5.5 SR 169 km BaratLaut TANI"`

**Cursor states.** `getCursor` is passed to `MapboxOverlay`; `getComputedStyle(canvas).cursor` is
measured at 1280x800:

| state | inline | computed | verdict |
| --- | --- | --- | --- |
| ocean (240,120), rgb `[0,0,0]` | `grab` | `grab` | PASS |
| on a marker (1029,92), callout visible | `pointer` | `pointer` | PASS |
| button held mid-drag (240,300)→(310,345), `map.dragPan.isActive() === true` | `grabbing` | `grabbing` | PASS |
| after release / at idle | `grab` | `grab` | PASS |

The drag state is sourced from **MapLibre**, not deck. Under `interleaved: true` the overlay builds
`new Deck({...this._props, views, gl, parameters})` with no `controller`, so deck's
`_onInteractionStateChange` is never called and `cursorState.isDragging` is permanently `false` — a
`getCursor` that reads deck's own state can never return `grabbing`. `91c5b8f` therefore reads
`mapRef.current?.dragPan?.isActive()` inside `getCursor`, which is evaluated per frame by deck's
`_updateCursor` and is therefore always current. A manual `style.cursor` write is not viable: deck's
`_updateCursor` runs every frame and overwrites it.

---

## 12. Screenshots

Pixel statistics are measured from the written PNG (`canvas` devDependency; non-black = `R+G+B > 24`,
bright = mean channel > 40, land = all channels in 12–24, ocean = all channels < 8):

| file | viewport | state | bytes | non-black | bright | land | ocean | colours |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `screenshots/nasa-hud-desktop.png` | 1280x800 | PETA mode, full HUD, pointer parked at 1276,796 | 140054 | 159936 | 28514 | 113777 | 863316 | 1604 |
| `screenshots/nasa-hud-hover.png` | 1280x800 | cursor on earthquake marker (1029,92), callout `display:block` | 141937 | 160225 | 28928 | 113809 | 862782 | 1618 |

Neither is blank and neither has a console error, pageerror or non-2xx response. The hover shot was
captured with the callout node verified `display: block`, `visible: true`, text
`"EQ M5.5\nGempa 5.5 SR 169 km BaratLaut TANI"` at capture time. The clock is paused by default
(`aria-label="Play"`), so the readout is identical across the baseline and the hover.

Straight off the WebGL canvas at the same viewport (`gl.readPixels`, no HUD chrome, no PNG encoding),
1024000 px total: **land 168965, ocean 801208, other 53827, non-black 221367**. Top grey levels:
`0` → 790075, **`17` → 157799** (`#111111`), `1` → 4309, `16` → 1122, `2` → 1024. The ~158k-px
`#111111` cluster is the Indonesian landmass, separable from the ~790k-px pure-black ocean.

These two files supersede `final-hud-desktop.png` and `final-hud-event.png`.
`scripts/audit-hud.mjs` still rewrites the `stitch-*` set: `stitch-desktop.png` 1280x800 PETA
(non-black 153520, bright 19572), `stitch-mobile.png` 390x844 BERITA drawer (non-black 220120/329160,
66.9%), `stitch-desktop-eventcard.png` 1280x800 with the card open (non-black 714026, bright 45083).

---

## 13. Findings

**No open findings.** Every spec assertion passes, every gate passes, and a production load is
error-free.

1. **PASS (C8)** — 0 live overlaps at all five viewports: the EventCard sits flush above the 97px
   strip on mobile (0px gap, zero intersection) and clears it by 8px at 768/1024/1280/1440, from the
   `bottom-[calc(env(safe-area-inset-bottom)+97px)]` / `bottom-[105px]` anchors (§4). The lockup
   clears the strip by 8px at every desktop viewport.
2. **PASS (runtime)** — 0 console errors, 0 pageerrors, 0 failed requests, 0 step failures at all five
   viewports (§9).
3. **PASS (C7)** — 0 touch-target violations across 5 viewports; strip controls are `h-11 w-11`,
   ticker and search `min-h-[44px]`, layer rows `min-h-[44px]` (§5).
4. **PASS (C6)** — 0 readouts failing; 8 baseline readouts at all five viewports plus MAGNITUDO and
   KEDALAMAN exercised at 1024x768 on an earthquake card (§6).
5. **PASS (BERITA)** — reachable at all five viewports, rows 94px, PETA hidden while open (§8).
6. **PASS (cursor)** — `grab` / `pointer` / `grabbing` all observed on `getComputedStyle(canvas)`
   (§11). `grabbing` was unreachable until `91c5b8f` because deck has no controller under
   `interleaved: true`; the state now comes from `map.dragPan.isActive()`.
7. **PASS (land visibility)** — the archipelago is a distinct `#111111` region against `#000000`
   ocean: 168965 land px vs 801208 ocean px on the canvas, and 159936 non-black px in the PNG against
   46652 before the fix (§3, §12).
8. **PASS (WebGL animation)** — animating, paused, resumed and reduced-motion behaviour verified by
   `readPixels` diff; paused and reduced-motion are bit-identical over a 1200ms window (§10).
9. **Resolved (map lifecycle crash, history)** — commit `112a6a5` *"fix(map): stop map lifecycle crash
   and camera corruption"* (`112a6a53f40737210d45debfe2e01b93d938e450`, plus the LF-normalisation
   commit `33d1630`), touching `src/components/map/MapBase.tsx` and
   `src/components/map/MapCanvas.tsx`, removed the StrictMode teardown race, the camera corruption and
   the broken overlay/picking wiring. Pre-fix, the production build reported a `0,0 <vw>x300` canvas in
   a 0-height container, `zoom 22`, `center {lng: 180}`, an
   `Application error: a client-side exception has occurred` page, and an EventCard that could never
   open (`opened=false via=not reached` at all five viewports). Post-fix the canvas is full-viewport at
   every size and the card opens at every size (§3, §7).
10. **Fix lineage** — each entry states what it changed:
    - `112a6a5` map lifecycle / camera / overlay / picking.
    - `47be0ea` *"fix(map): repair RainViewer tile URL and guard tsunami-rings query"* — the radar
      404 storm and the `tsunami-rings` console error.
    - `46ceaee` *"feat(hud): tactical HUD pass"* — timeline mount gate (hydration `#418`), EventCard
      bottom anchor, touch sizing, `tabular-nums`, BERITA reachability.
    - `754ec51` *"feat(map): animate seismic, cyclone, thermal and hydrological phenomena"* and
      `e20b49a` *"fix(map): restore data on the inner earthquake glow layer"* — the animated
      phenomena, PANTAU reticle lock-on, `maxzoom: 6`, cyclone alpha 35 / `radiusMaxPixels: 34`,
      `capRounded`/`jointRounded`.
    - `2325247` *"feat(hud): hairline HUD shell, retuned timeline, alert lock-on"* — the retired
      hairline shell and its 267x66 timeline pill. Kept here for lineage: it explains the 97px
      full-bleed strip and the derived EventCard anchors that replaced it.
    - `55e302b` *"fix(hud): clear C7 ticker width and C8 timeline overlap"* — ticker `min-w-[44px]`
      (was squeezed to 27.5x44 by PANTAU) and the pill/card clearance (was 10px overlap at 375x812,
      14px at 768x1024, intercepting clicks).
    - `cff13c0` *"feat(map): brutalist telemetry grid, bullseye markers and hover callout"* — replaced
      the glow system with the flat `#000000`/`#111111`/`#2E2E2E` grid, 1px paths, the 5/11/18px
      pixel-pinned bullseye and the imperative `onHover` callout.
    - `71ec3a9` *"feat(hud): brutalist dot-matrix telemetry direction"* — the full-bleed 97px
      telemetry strip (`inset-x-0 bottom-0`), `h-11` metric row + 1px rule + 52px playback row, and
      the `bottom-[calc(env(safe-area-inset-bottom)+97px)]` / `bottom-[105px]` EventCard anchors that
      replace `bottom-[88px]` / `xl:bottom-4`.
    - `27de3df` *"test(hud): point audit timeline-pill selector at the strip root"* — harness-only; the
      audit's timeline selector now resolves the strip container instead of the removed pill.
    - `85c8de6` *"fix(map): land tone from background layer, cursor from deck getCursor"* — painted
      `background` with `GRID_LAND` (`#111111`) and the fallback style likewise, and moved the cursor
      off the manual `style.cursor` write onto deck's `getCursor` callback.
    - `91c5b8f` *"fix(map): drag cursor from maplibre dragPan, deck controller is null in interleaved
      mode"* — `getCursor: ({ isHovering }) => mapRef.current?.dragPan?.isActive() ? 'grabbing' :
      isHovering ? 'pointer' : 'grab'`, closing the last cursor state (§11).
11. **Repo gates** — unit (4 files / 14 tests), `tsc --noEmit`, build (9/9 static pages, `/` 461 kB /
    566 kB First Load, 105 kB shared) and Playwright E2E (6 passed, 3 skipped) all pass (§1).
