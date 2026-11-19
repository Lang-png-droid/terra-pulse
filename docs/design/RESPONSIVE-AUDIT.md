# HUD Responsive / Accessibility Audit

Programmatic audit of the TerraPulse HUD against `docs/design/STITCH-HUD-SPEC.md` §0 (C1–C10), run by
`scripts/audit-hud.mjs` (Playwright 1.65.1, already-installed dependency, no new deps) against a
**production** build:

```
rm -rf .next && npm run build && npx next start -p 3001
node scripts/audit-hud.mjs          # audit + screenshots
node scripts/audit-hud.mjs --shots  # screenshots only
```

Viewports: 375x812, 768x1024, 1024x768, 1280x800, 1440x900 (mobile breakpoint = `width < 768`,
matching `useDeviceCapability`). Console messages are truncated to their first line by design;
measured values below are copied verbatim from the run that produced the three screenshots.
Measurement date: **2026-11-19**, at `55e302b`.

**Overall result: all PASS.** C6, C7, C8 and BERITA reachability pass at all five viewports; the map
renders full-viewport everywhere; the EventCard opens everywhere; and a production load produces
**0 console errors, 0 pageerrors and 0 failed requests** at every viewport. No console output remains
from the app or its map libraries (§9).

---

## 1. Gate results (repo-level)

| Gate | Command | Result |
| --- | --- | --- |
| Build | `npm run build` | **PASS** — exit 0, 89s, `✓ Compiled successfully`, 9/9 static pages, page 461 kB / 566 kB First Load, 105 kB shared |
| Unit tests | `npm run test:unit` | **PASS** — 4 files, 14 tests (vitest 3.2.7), 11.7s |
| Types | `npx tsc --noEmit` | **PASS** — exit 0 |
| E2E | `npx playwright test tests/app.spec.ts` | **PASS** — 6 passed, 3 skipped (49.1s), exit 0 |

The E2E gate ran against the same production server on port 3001 (`playwright.config.ts`
`baseURL: http://localhost:3001`, `webServer: undefined`).

---

## 2. Measured rects (PETA mode, CSS pixels)

| viewport | lockup | timeline pill | layer control | telemetry strip | mobile news toggle | news panel (BERITA) |
| --- | --- | --- | --- | --- | --- | --- |
| 375x812 | not rendered (hidden <768) | 54,746 267x66 | 16,56 100x44 (trigger) | 12,0 351x44 | 270,56 89x44 | 0,243.6 375x568.4 |
| 768x1024 | 16,932 134.6x76 | 250.5,942 267x66 | 16,56 210x383 | 12,0 744x40 | n/a (`md:hidden`) | 432,332.3 320x675.8 |
| 1024x768 | 16,676 134.6x76 | 378.5,686 267x66 | 16,56 210x383 | 12,0 1000x40 | n/a (`md:hidden`) | 688,214.4 320x537.6 |
| 1280x800 | 16,708 134.6x76 | 506.5,718 267x66 | 16,56 210x383 | 12,0 1256x40 | n/a (`md:hidden`) | 944,224 320x560 |
| 1440x900 | 16,808 134.6x76 | 586.5,818 267x66 | 16,56 210x383 | 32,0 1376x40 | n/a (`md:hidden`) | 1104,254 320x630 |

Observations: the timeline pill is **267x66** — the 40px track plus a separate marker-label row above it
(`py-1.5` shell, label absolutely positioned at `bottom-full`), not the older 286x40 single row. It is
horizontally centred at 54/250.5/378.5/506.5/586.5, i.e. `(vw-267)/2`, with tops at
746/942/686/718/818. The layer panel is a fixed 210x383 side panel at `top-14 left-4` on desktop and a
100x44 trigger on mobile. The telemetry strip spans the viewport width minus a 12px gutter (32px at
1440) and is 40–44px tall; it now carries the PANTAU lock-on button and a 1px alert pulse line, and the
LIVE wordmark is hidden below `md`. The EventCard clears the pill at every viewport (§4).

## 3. Map sizing

| viewport | `.maplibregl-canvas` | `.maplibregl-map` |
| --- | --- | --- |
| 375x812 | 0,0 375x812 | 0,0 375x812 |
| 768x1024 | 0,0 768x1024 | 0,0 768x1024 |
| 1024x768 | 0,0 1024x768 | 0,0 1024x768 |
| 1280x800 | 0,0 1280x800 | 0,0 1280x800 |
| 1440x900 | 0,0 1440x900 | 0,0 1440x900 |

Canvas == container == viewport at every size (previously `0,0 <vw>x300` with a 0-height container).
An independent canvas probe at 1280x800 reads `buffer [1280,800]`, and the marker clustering used to
open cards finds its largest cluster at n=107, CSS `444,185`. The rain-radar layer paints: 40 of 40
`tilecache.rainviewer.com/v2/radar/<frame>/256/{z}/{x}/{y}/2/1_1.png` requests return 200, 0 non-200.
The map renders, tiles load, and deck.gl markers are pickable.

## 4. Overlap assertions (spec C8)

Method: rectangle-intersection of the measured boxes (`area > 0.5px²` counts as a hit).

| pair | 375 | 768 | 1024 | 1280 | 1440 |
| --- | --- | --- | --- | --- | --- |
| lockup vs timeline | N/A | PASS | PASS | PASS | PASS |
| lockup vs EventCard | N/A | PASS | PASS | PASS | PASS |
| timeline vs EventCard | PASS (14px clear) | PASS (6px clear) | PASS (6px clear) | PASS (x-disjoint) | PASS (x-disjoint) |
| NewsPanel vs timeline (live BERITA rects) | N/A | N/A | N/A | N/A | N/A |
| NewsPanel vs timeline pill using the *PETA-mode* rect (cross-mode reference, not reachable live) | 17622px² | 5643px² | PASS | PASS | PASS |

**0 live overlaps at all five viewports.** `timeline vs EventCard` clears everywhere: the card's bottom
edge sits above the pill's top edge by 14px at 375x812 (732 vs 746), 6px at 768x1024 (936 vs 942) and
6px at 1024x768 (680 vs 686); at 1280/1440 the card is right-anchored and its x-range misses the
centred pill entirely. The anchors that produce this are `bottom-[calc(env(safe-area-inset-bottom)+80px)]`
on mobile, `bottom-[88px]` on desktop and `xl:bottom-4` at 1280 and up.

Before `55e302b` the retuned pill (`267x66`, replacing the older `286x40`) intersected the card by
2670px² at 375x812 (10px) and 1197px² at 768x1024 (14px), and `elementFromPoint` at the overlap
returned the timeline bar, so the pill painted over the card's bottom edge and swallowed clicks there.
Both pairs now measure 0.

**Cross-mode note.** The `NewsPanel vs timeline (PETA rect)` row compares a rect measured in BERITA
mode with one measured in PETA mode. It cannot occur live: in BERITA mode `#panel-peta` carries
`hidden` (`petaHiddenAttr=true`, `petaDisplay=none`) and the timeline element measures `not rendered`
(0x0 box) at all five viewports. Both rectangles are never on screen together, so that pair is
reported as reference only.

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

16 visible interactive elements at 1280x800, all ≥44px in both axes: telemetry ticker 44px tall
(`min-h-[44px]`), timeline `<select>` and buttons `44x44`, layer-panel collapse `44x44`, layer rows
`184x44`, brand buttons `52.6x44` / `66.9x44`. The ticker now also carries `min-w-[44px]`, so the
PANTAU button can no longer squeeze it: it measured 27.5x44 at 375x812 before `55e302b` and 44x44
after. The previously reported 20.5px ticker, 28px search input and 21x20.5 speed select still do not
reproduce — the `tp-touch` sizing is applied to the interactive element itself.

## 6. Numeric readouts (spec C6) — **PASS**

`font-variant-numeric` computed style, checked on the live elements:

| readout | 375 | 768 | 1024 | 1280 | 1440 |
| --- | --- | --- | --- | --- | --- |
| telemetry ticker (`button`) | ok | ok | ok | ok | ok |
| timeline clock (`.tp-value`) | ok | ok | ok | ok | ok |
| timeline speed `<select>` | ok | ok | ok | ok | ok |
| news panel relative time | ok | ok | ok | ok | ok |
| EventCard MAGNITUDO | ok | ok | ok | ok | ok |
| EventCard KEDALAMAN | ok | ok | ok | ok | ok |
| EventCard WAKTU | ok | ok | ok | ok | ok |
| EventCard KOORDINAT value | ok | ok | ok | ok | ok |
| EventCard coord copy button | ok | ok | ok | ok | ok |

0 readouts failing — 9 readouts × 5 viewports, all `ok`. The earlier hypothesis that the KOORDINAT
value lacks `tabular-nums` is **wrong** for this build: the card shell carries `tabular-nums` and both
the value and the copy button compute `tabular-nums`. MAGNITUDO/KEDALAMAN are conditional sections
(earthquake features only); this run opened an earthquake card at every viewport, so all nine readouts
were present everywhere.

## 7. EventCard

| viewport | opened | how | rect |
| --- | --- | --- | --- |
| 375x812 | yes | marker pixel scan (269,61 n=50) | 0,592 375x140 |
| 768x1024 | yes | marker pixel scan (731,238 n=63) | 432,654.5 320x281.5 |
| 1024x768 | yes | marker pixel scan (914,45 n=62) | 688,398.5 320x281.5 |
| 1280x800 | yes | marker pixel scan (1027,90 n=74) | 944,502.5 320x281.5 |
| 1440x900 | yes | marker pixel scan (1110,141 n=67) | 1104,602.5 320x281.5 |

Opened at all five viewports. Content at 1280x800: title `GEMPA M5.5` / `Gempa 5.5 SR 169 km
BaratLaut TANIMBAR`, then `MAGNITUDO M5.5`, `KEDALAMAN 130 km`, `WAKTU Sen, 02 Nov, 00.00 WIB`,
`KOORDINAT 7.080000, …`.

The harness finds markers by scanning the map canvas for bright pixels and clustering them
(`markerCandidates`), then clicking each centroid until `[aria-label="Tutup detail"]` has a non-zero
box; a telemetry-ticker recentre + rescan is the fallback. Pixel scanning replaces the earlier
Web-Mercator projection, which assumed a fixed initial viewport and broke on any recentre.

## 8. BERITA mode reachability

| viewport | toggle clicked | panel rect | close button ≥44 | rows (first 3) | `#panel-peta` while BERITA | timeline while BERITA | back to PETA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 375x812 | yes | 0,243.6 375x568.4 | yes | 329x122 ×3 | `hidden` / `display:none` | not rendered | true |
| 768x1024 | yes | 432,332.3 320x675.8 | yes | 274x122 ×3 | `hidden` / `display:none` | not rendered | true |
| 1024x768 | yes | 688,214.4 320x537.6 | yes | 274x122 ×3 | `hidden` / `display:none` | not rendered | true |
| 1280x800 | yes | 944,224 320x560 | yes | 274x122 ×3 | `hidden` / `display:none` | not rendered | true |
| 1440x900 | yes | 1104,254 320x630 | yes | 274x122 ×3 | `hidden` / `display:none` | not rendered | true |

PASS at all five viewports: the toggle opens the panel, rows and the close button are ≥44px, PETA is
hidden while BERITA is open, and closing returns to PETA.

## 9. Runtime noise — clean

Production build, per viewport load, all five viewports: **0 console errors, 0 pageerrors, 0 step
failures**. The three problems of the previous pass are gone:

- **Hydration mismatch `Minified React error #418`** (was ×1 `pageerror` per load) — fixed by a mount
  gate in `TimelineBar`: the clock, progress and `aria-valuenow` render a neutral value until mounted,
  so server and first client render match.
- **Rain-radar 404 storm** (was 40–76× per load) — the tile template now appends the radar frame
  colour scheme: `https://tilecache.rainviewer.com/v2/radar/<frame>/256/{z}/{x}/{y}/2/1_1.png`, with
  the newest frame first. Measured on a fresh 1280x800 load: 40 responses, **40 × 200, 0 non-200**,
  and the raster paints (canvas bright-pixel count 12913).
- **`The layer 'tsunami-rings' does not exist …`** (was intermittent) — the
  `map.queryRenderedFeatures(e.point, { layers: [...] })` call is now guarded against layers that are
  not yet in the style.

**No console output remains from the app or its map libraries.** The deck.gl
`earthquake-crosshairs: rounded` deprecation warning is gone: the crosshair and path layers now pass
`capRounded: true, jointRounded: true` instead of `rounded: true`
(`src/components/map/DisasterLayers.tsx:213,441,621`). Chromium still logs its own
`GPU stall due to ReadPixels` performance warnings under headless screenshot capture; those come from
the browser, not the app, and do not appear in a normal load.

## 10. WebGL animation

Map animation runs outside React: `MapCanvas` drives one RAF loop that calls `applyLayers()` →
`overlay.setProps()`, so no component re-renders per frame. The loop is throttled to ~24fps
(`if (now - last < 41) return`), is cancelled on `visibilitychange` while `document.hidden` and
restarted on return, and under `prefers-reduced-motion: reduce` (`useDeviceCapability` reads
`matchMedia('(prefers-reduced-motion: reduce)')`) it early-returns after a single `applyLayers()` with
every layer frozen at `time = 0` (`DisasterLayers` `frozen` pins opacity; `WindParticleLayer` takes a
static path).

Four animated phenomena: seismic shockwave rings (magnitude ≥ 6), a cyclogenesis vortex with a dashed
pulsing track, thermal hotspot flicker, and a hydrological pulse gated on `pressureHpa < 1005`.

Evidence — `readPixels` on `.maplibregl-canvas` at 1280x800, snapshots kept in-page, per-channel diff
threshold `|ΔR|+|ΔG|+|ΔB| > 12`, 9s settle before sampling:

| assertion | window | result |
| --- | --- | --- |
| animating | 1200ms | **25514/1024000 px changed (2.492%)**, max Δ 330 |
| paused (`document.hidden`) | 1200ms | **0 px changed**, max Δ 0 |
| resumed | 1200ms | 11981 px changed (1.17%) |
| reduced motion | 1200ms | **0 px changed**, 13693 bright px (not blank) |

The paused and reduced-motion canvases are bit-identical to their own previous frame, so the gates are
real rather than a frame that happens to look static. Sampling has to wait for tile and radar fades to
settle; at a 3s settle a "paused" window still shows pixel change that is not animation.

## 11. Screenshots

Pixel statistics are measured from the written PNG (`canvas` devDependency, luma > 8 = non-black,
luma > 40 = bright):

| file | viewport | state | non-black | bright | distinct colours | console / page errors |
| --- | --- | --- | --- | --- | --- | --- |
| `screenshots/final-hud-desktop.png` | 1280x800 | PETA mode, full HUD | 1011107/1024000 (98.7%) | 736744 | 737 | 0 / 0 |
| `screenshots/final-hud-event.png` | 1280x800 | EventCard open (`944,503 320x282`), PANTAU reticle active | 1017811/1024000 (99.4%) | 805774 | 535 | 0 / 0 |

Neither is blank and neither has a console error, pageerror or non-2xx response. The PANTAU reticle was
proven by pixel diff rather than by an attribute (the button has no `aria-pressed`): with the timeline
clock paused, clicking PANTAU changed **53310 px** of the canvas, against **0** control noise over the
following 900ms. These two files supersede `stitch-desktop.png` and `stitch-desktop-eventcard.png`;
`scripts/audit-hud.mjs` still rewrites the `stitch-*` set (including `stitch-mobile.png`, 390x844 BERITA
drawer, 95.8% non-black, bright 105075).

## 12. Findings

**No open findings.** Every spec assertion passes, gates pass, and a production load is error-free.

1. **PASS (C8)** — 0 live overlap at all five viewports: 14px clearance at 375x812, 6px at 768x1024 and
   1024x768, x-disjoint at 1280/1440, from the mobile
   `bottom-[calc(env(safe-area-inset-bottom)+80px)]` / desktop `bottom-[88px]` / `xl:bottom-4` anchors (§4).
2. **PASS (runtime)** — 0 console errors, 0 pageerrors, 0 failed requests at all five viewports.
   Hydration `#418` is gone (mount gate in `TimelineBar`); the rain-radar 404 storm is gone (tile
   template `…/256/{z}/{x}/{y}/2/1_1.png`, newest frame first — 40/40 responses 200, raster paints);
   the `tsunami-rings` query is guarded; and the deck.gl `rounded` deprecation warning is gone (§9).
3. **PASS (C7)** — 0 touch-target violations across 5 viewports. The retune briefly regressed this: the
   ticker measured 27.5x44 at 375x812 once PANTAU appeared in the row. `55e302b` gives it
   `min-w-[44px]` and hides the LIVE wordmark below `md`, and the ticker now measures 44x44 there (§5).
4. **PASS (C6)** — 0 tabular-nums readouts failing, all 9 readouts `ok` at all 5 viewports, including the
   EventCard KOORDINAT value and its copy button (§6).
5. **PASS (BERITA)** — reachable at 375x812 and every other viewport, with PETA hidden while open (§8).
6. **PASS (WebGL animation)** — animating, paused, resumed and reduced-motion behaviour all verified by
   `readPixels` diff; paused and reduced-motion are bit-identical over a 1200ms window (§10).
7. **Resolved (map lifecycle crash, history)** — commit `112a6a5` *"fix(map): stop map lifecycle crash
   and camera corruption"* (`112a6a53f40737210d45debfe2e01b93d938e450`, plus the LF-normalisation
   commit `33d1630`), touching `src/components/map/MapBase.tsx` and
   `src/components/map/MapCanvas.tsx`, removed the StrictMode teardown race, the camera corruption and
   the broken overlay/picking wiring. Pre-fix, the production build reported a `0,0 <vw>x300` canvas in
   a 0-height container, `zoom 22`, `center {lng: 180}`, an
   `Application error: a client-side exception has occurred` page, and an EventCard that could never
   open (`opened=false via=not reached` at all five viewports). Post-fix the canvas is full-viewport at
   every size and the card opens at every size (§3, §7).
8. **Fix lineage** — `112a6a5` map lifecycle / camera / overlay / picking; `47be0ea` *"fix(map): repair
   RainViewer tile URL and guard tsunami-rings query"*; `46ceaee` *"feat(hud): tactical HUD pass"*
   (timeline mount gate, EventCard bottom anchor, touch sizing, `tabular-nums`, BERITA reachability);
   `754ec51` *"feat(map): animate seismic, cyclone, thermal and hydrological phenomena"* and `e20b49a`
   *"fix(map): restore data on the inner earthquake glow layer"* (animated phenomena, PANTAU reticle
   lock-on, `maxzoom: 6`, cyclone alpha 35 / `radiusMaxPixels: 34`, `capRounded`/`jointRounded`);
   `2325247` *"feat(hud): hairline HUD shell, retuned timeline, alert lock-on"* (the 267x66 pill,
   PANTAU button, alert pulse line, LIVE wordmark hidden below `md`); `55e302b` *"fix(hud): clear C7
   ticker width and C8 timeline overlap"*.
   The `2325247` retune briefly regressed two assertions: C7 (ticker squeezed to 27.5x44 at 375x812 by
   the new PANTAU button) and C8 (the taller pill overlapped the EventCard by 10px at 375x812 and 14px
   at 768x1024, intercepting clicks). `55e302b` fixes both, and this pass re-measures them at 0.
9. **Repo gates** — build, unit (4 files / 14 tests), `tsc --noEmit` and Playwright E2E (6 passed,
   3 skipped) all pass (§1).
