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

**Overall result: all PASS.** C6, C7, C8 and BERITA reachability pass at all five viewports; the map
renders full-viewport everywhere; the EventCard opens everywhere; and a production load produces
**0 console errors, 0 pageerrors and 0 failed requests** at every viewport. The only remaining
console output is a deck.gl deprecation warning (§9).

---

## 1. Gate results (repo-level)

| Gate | Command | Result |
| --- | --- | --- |
| Build | `npm run build` | **PASS** — exit 0, 71.6s, page 459 kB / 564 kB First Load |
| Unit tests | `npm run test:unit` | **PASS** — 4 files, 14 tests (vitest 3.2.7), 8.76s |
| Types | `npx tsc --noEmit` | **PASS** — exit 0 |
| E2E | `npx playwright test tests/app.spec.ts` | **PASS** — 6 passed, 3 skipped (44.9s), exit 0 |

The E2E gate ran against the same production server on port 3001 (`playwright.config.ts`
`baseURL: http://localhost:3001`, `webServer: undefined`).

---

## 2. Measured rects (PETA mode, CSS pixels)

| viewport | lockup | timeline pill | layer control | telemetry strip | mobile news toggle | news panel (BERITA) |
| --- | --- | --- | --- | --- | --- | --- |
| 375x812 | not rendered (hidden <768) | 44.5,772 286x40 | 16,56 112x44 (trigger) | 12,0 351x44 | 270,56 89x44 | 0,243.6 375x568.4 |
| 768x1024 | 16,932 134.6x76 | 241,968 286x40 | 16,56 210x419 | 12,0 744x40 | n/a (`md:hidden`) | 432,316 320x692 |
| 1024x768 | 16,676 134.6x76 | 369,712 286x40 | 16,56 210x419 | 12,0 1000x40 | n/a (`md:hidden`) | 688,214.4 320x537.6 |
| 1280x800 | 16,708 134.6x76 | 497,744 286x40 | 16,56 210x419 | 12,0 1256x40 | n/a (`md:hidden`) | 944,224 320x560 |
| 1440x900 | 16,808 134.6x76 | 577,844 286x40 | 16,56 210x419 | 32,0 1376x40 | n/a (`md:hidden`) | 1104,254 320x630 |

Observations: the timeline pill is always 286x40 and horizontally centred (44.5/241/369/497/577 at the
five viewports, i.e. `(vw-286)/2`), sitting 0px above the viewport bottom; the layer panel is a fixed
210x419 side panel at `top-14 left-4` on desktop and a 112x44 trigger on mobile; the telemetry strip
spans the viewport width minus a 12px gutter (32px at 1440) and is 40–44px tall. The EventCard clears
the pill at every viewport: at 375/768/1024 its bottom edge (756/956/700) sits above the pill top
(772/968/712); at 1280/1440 it is anchored to the right (`bottom-[68px] xl:bottom-4`) and its
x-range (944–1264 / 1104–1424) does not intersect the centred pill (497–783 / 577–863).

## 3. Map sizing

| viewport | `.maplibregl-canvas` | `.maplibregl-map` |
| --- | --- | --- |
| 375x812 | 0,0 375x812 | 0,0 375x812 |
| 768x1024 | 0,0 768x1024 | 0,0 768x1024 |
| 1024x768 | 0,0 1024x768 | 0,0 1024x768 |
| 1280x800 | 0,0 1280x800 | 0,0 1280x800 |
| 1440x900 | 0,0 1440x900 | 0,0 1440x900 |

Canvas == container == viewport at every size (previously `0,0 <vw>x300` with a 0-height container).
An independent canvas probe at 1280x800 reads `buffer [1280,800]`, 12913 bright pixels (radar raster
and markers), and the marker clustering used to open cards finds its largest cluster at n=167, CSS
`325,724`. The rain-radar layer paints: 40 of 40 `tilecache.rainviewer.com/v2/radar/<frame>/256/{z}/{x}/{y}/2/1_1.png`
requests return 200, 0 non-200. The map renders, tiles load, and deck.gl markers are pickable.

## 4. Overlap assertions (spec C8)

Method: rectangle-intersection of the measured boxes (`area > 0.5px²` counts as a hit).

| pair | 375 | 768 | 1024 | 1280 | 1440 |
| --- | --- | --- | --- | --- | --- |
| lockup vs timeline | N/A | PASS | PASS | PASS | PASS |
| lockup vs EventCard | N/A | PASS | PASS | PASS | PASS |
| timeline vs EventCard | PASS | PASS | PASS | PASS | PASS |
| NewsPanel vs timeline (live BERITA rects) | N/A | N/A | N/A | N/A | N/A |
| NewsPanel vs timeline pill using the *PETA-mode* rect (cross-mode reference) | 11440px² | 3800px² | PASS | PASS | PASS |

**No live overlap at any viewport.** `timeline vs EventCard` now clears everywhere: at 375/768/1024 the
card's bottom edge is above the pill's top edge (756 vs 772, 956 vs 968, 700 vs 712), and at
1280/1440 the card is right-anchored (`bottom-[68px] xl:bottom-4`) with an x-range that misses the
centred pill entirely. Before the HUD fix (`46ceaee`) the 768x1024 pair intersected by 3800px² and the
pill painted over the card's bottom 40px, intercepting clicks; that no longer reproduces.

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

16 visible interactive elements at 1280x800, all ≥44px in both axes: telemetry ticker `826x44`,
timeline `<select>` and buttons `44x44`, layer-panel collapse `44x44`, layer rows `184x44`, brand
buttons `52.6x44` / `66.9x44`. The previously reported 20.5px ticker, 28px search input and 21x20.5
speed select no longer reproduce — the `tp-touch` sizing is applied to the interactive element itself.

## 6. Numeric readouts (spec C6) — **PASS**

`font-variant-numeric` computed style, checked on the live elements:

| readout | 375 | 768 | 1024 | 1280 | 1440 |
| --- | --- | --- | --- | --- | --- |
| telemetry ticker (`button`) | ok | ok | ok | ok | ok |
| timeline clock (`.tp-value`) | ok | ok | ok | ok | ok |
| timeline speed `<select>` | ok | ok | ok | ok | ok |
| news panel relative time | ok | ok | ok | ok | ok |
| EventCard MAGNITUDO | ok | n/a (not in this card) | n/a | n/a | n/a |
| EventCard KEDALAMAN | ok | n/a | n/a | n/a | n/a |
| EventCard WAKTU | ok | ok | ok | ok | ok |
| EventCard KOORDINAT value | ok | ok | ok | ok | ok |
| EventCard coord copy button | ok | ok | ok | ok | ok |

0 readouts failing. The earlier hypothesis that the KOORDINAT value lacks `tabular-nums` is **wrong**
for this build: the card shell carries `tabular-nums` and both the value and the copy button compute
`tabular-nums`. `n/a` rows are conditional card sections (magnitude/depth only render for earthquake
features; the 768+ cards opened on a cyclone feature).

## 7. EventCard

| viewport | opened | how | rect |
| --- | --- | --- | --- |
| 375x812 | yes | marker pixel scan (208,403 n=33) | 0,616 375x140 |
| 768x1024 | yes | marker pixel scan (69,836 n=167) | 432,657 320x299 |
| 1024x768 | yes | marker pixel scan (197,708 n=167) | 688,401 320x299 |
| 1280x800 | yes | marker pixel scan (325,724 n=167) | 944,485 320x299 |
| 1440x900 | yes | marker pixel scan (405,774 n=167) | 1104,585 320x299 |

Opened at all five viewports on the first candidate. Content at 1280x800: title `SIKLON` / `AKTIF` /
`Cempaka 85 km/h`, then `KECEPATAN ANGIN 85 km/h`, `TEKANAN 985 hPa`,
`WAKTU Kam, 19 Nov, 17.41 WIB`, `KOORDINAT -1.471529, 118.168`.

The harness finds markers by scanning the map canvas for bright pixels and clustering them
(`markerCandidates`), then clicking each centroid until `[aria-label="Tutup detail"]` has a non-zero
box; a telemetry-ticker recentre + rescan is the fallback. Pixel scanning replaces the earlier
Web-Mercator projection, which assumed a fixed initial viewport and broke on any recentre.

## 8. BERITA mode reachability

| viewport | toggle clicked | panel rect | close button ≥44 | rows (first 3) | `#panel-peta` while BERITA | timeline while BERITA | back to PETA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 375x812 | yes | 0,243.6 375x568.4 | yes | 329x125 ×3 | `hidden` / `display:none` | not rendered | true |
| 768x1024 | yes | 432,316 320x692 | yes | 274x125 ×3 | `hidden` / `display:none` | not rendered | true |
| 1024x768 | yes | 688,214.4 320x537.6 | yes | 274x125 ×3 | `hidden` / `display:none` | not rendered | true |
| 1280x800 | yes | 944,224 320x560 | yes | 274x125 ×3 | `hidden` / `display:none` | not rendered | true |
| 1440x900 | yes | 1104,254 320x630 | yes | 274x125 ×3 | `hidden` / `display:none` | not rendered | true |

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

The only remaining console output is one deck.gl deprecation **warning** (not an error):
`deck: 'earthquake-crosshairs: rounded' is deprecated and will be removed in a later version. Use
'jointRounded/capRounded' instead` — `src/components/map/DisasterLayers.tsx:212` passes `rounded: true`
to a `PathLayer`; migrate to `capRounded`/`jointRounded` when convenient. Chromium also logs its own
`GPU stall due to ReadPixels` performance warnings under headless screenshots; those come from the
browser, not the app.

## 10. Screenshots

Pixel statistics are measured from the written PNG (`canvas` devDependency, luma > 8 = non-black,
luma > 40 = bright):

| file | viewport | state | non-black | bright | distinct colours | console / page errors |
| --- | --- | --- | --- | --- | --- | --- |
| `screenshots/stitch-desktop.png` | 1280x800 | PETA mode, full HUD | 1023819/1024000 (100%) | 739990 | 512 (cap) | 0 / 0 |
| `screenshots/stitch-mobile.png` | 390x844, touch | BERITA drawer open (`open=true`) | 329160/329160 (100%) | 100667 | 512 (cap) | 0 / 0 |
| `screenshots/stitch-desktop-eventcard.png` | 1280x800 | EventCard open (`open=true`) | 1017278/1024000 (99.3%) | 662091 | 385 | 0 / 0 |

None is blank and none has a console error or pageerror. The 1024-pixel shortfall on the desktop shots
is the rounded viewport corner transparency; the mobile shot is fully opaque. Existing `*-final.png` /
`*-v2.png` were not touched.

## 11. Findings

**No open findings.** Every spec assertion passes, gates pass, and a production load is error-free.

1. **PASS (C8)** — no live overlap at any viewport. The 768x1024 EventCard/timeline intersection
   (3800px², pill painting over the card's bottom 40px) is fixed by the card's
   `bottom-[68px] xl:bottom-4` desktop anchor and the `+56px` mobile offset (§4).
2. **PASS (runtime)** — 0 console errors, 0 pageerrors, 0 failed requests at all five viewports.
   Hydration `#418` is gone (mount gate in `TimelineBar`); the rain-radar 404 storm is gone (tile
   template `…/256/{z}/{x}/{y}/2/1_1.png`, newest frame first — 40/40 responses 200, raster paints);
   the `tsunami-rings` query is guarded (§9). The only console output left is the deck.gl
   `earthquake-crosshairs: rounded` deprecation warning, noted for a later cleanup.
3. **Resolved (C7)** — 0 touch-target violations across 5 viewports; the 14 violations of the
   pre-HUD-pass build (ticker 20.5px, search input 28px, speed select 21x20.5) no longer reproduce (§5).
4. **Resolved (C6)** — 0 tabular-nums readouts failing, including the EventCard KOORDINAT value and
   its copy button (§6).
5. **Resolved (BERITA)** — reachable at 375x812 and every other viewport, with PETA hidden while open (§8).
6. **Resolved (map lifecycle crash, history)** — commit `112a6a5` *"fix(map): stop map lifecycle crash
   and camera corruption"* (`112a6a53f40737210d45debfe2e01b93d938e450`, plus the LF-normalisation
   commit `33d1630`), touching `src/components/map/MapBase.tsx` and
   `src/components/map/MapCanvas.tsx`, removed the StrictMode teardown race, the camera corruption and
   the broken overlay/picking wiring. Pre-fix, the production build reported a `0,0 <vw>x300` canvas in
   a 0-height container, `zoom 22`, `center {lng: 180}`, an
   `Application error: a client-side exception has occurred` page, and an EventCard that could never
   open (`opened=false via=not reached` at all five viewports). Post-fix the canvas is full-viewport at
   every size and the card opens at every size (§3, §7).
7. **Fix lineage** — `112a6a5` map lifecycle / camera / overlay / picking; `47be0ea` *"fix(map): repair
   RainViewer tile URL and guard tsunami-rings query"*; `46ceaee` *"feat(hud): tactical HUD pass"*
   (timeline mount gate, EventCard bottom anchor, touch sizing, `tabular-nums`, BERITA reachability).
8. **Repo gates** — build, unit (4 files / 14 tests), `tsc --noEmit` and Playwright E2E (6 passed,
   3 skipped) all pass (§1).
