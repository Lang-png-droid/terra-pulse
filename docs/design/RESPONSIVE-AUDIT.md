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

**Overall result: 1 FAIL (C8 — the EventCard/timeline overlap at 768x1024, real and z-order
confirmed) + residual runtime noise (hydration warning, rain-radar tile 404s). C6, C7 and BERITA
reachability pass at all five viewports; the map renders full-viewport everywhere.**

---

## 1. Gate results (repo-level)

| Gate | Command | Result |
| --- | --- | --- |
| Build | `npm run build` | **PASS** — exit 0, 94.44s, page 459 kB / 564 kB First Load |
| Unit tests | `npm run test:unit` | **PASS** — 3 files, 11 tests (vitest 3.2.7), 8.52s |
| Types | `npx tsc --noEmit` | **PASS** — exit 0 |
| E2E | `npx playwright test tests/app.spec.ts` | **PASS** — 6 passed, 3 skipped (48.0s), exit 0 |

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

Observations: the timeline pill is always 286x40, bottom-centred and fully inside the viewport (bottom
edge == viewport bottom at 375/768/1024/1280/1440 → `bottom-0` + `pb-safe` honoured); the layer panel
is a fixed 210x419 side panel at `top-14 left-4` on desktop and a 112x44 trigger on mobile; the
telemetry strip spans the viewport width minus a 12px gutter (32px at 1440) and is 40–44px tall.

## 3. Map sizing

| viewport | `.maplibregl-canvas` | `.maplibregl-map` |
| --- | --- | --- |
| 375x812 | 0,0 375x812 | 0,0 375x812 |
| 768x1024 | 0,0 768x1024 | 0,0 768x1024 |
| 1024x768 | 0,0 1024x768 | 0,0 1024x768 |
| 1280x800 | 0,0 1280x800 | 0,0 1280x800 |
| 1440x900 | 0,0 1440x900 | 0,0 1440x900 |

Canvas == container == viewport at every size (previously `0,0 <vw>x300` with a 0-height container).
A canvas pixel scan at 1280x800 reads `buffer [1280,800]`, `dpr 1`, 256000/256000 non-black sampled,
1229 bright pixels in 12 marker clusters (largest n=167 at CSS `325,724`). The map renders, tiles load,
and deck.gl markers are pickable.

## 4. Overlap assertions (spec C8)

Method: rectangle-intersection of the measured boxes (`area > 0.5px²` counts as a hit).

| pair | 375 | 768 | 1024 | 1280 | 1440 |
| --- | --- | --- | --- | --- | --- |
| lockup vs timeline | N/A | PASS | PASS | PASS | PASS |
| lockup vs EventCard | N/A | PASS | PASS | PASS | PASS |
| timeline vs EventCard | PASS | **FAIL 3800px²** | PASS | PASS | PASS |
| NewsPanel vs timeline (live BERITA rects) | N/A | N/A | N/A | N/A | N/A |
| NewsPanel vs timeline pill using the *PETA-mode* rect (cross-mode reference) | 11440px² | 3800px² | PASS | PASS | PASS |

**FAIL — 768x1024 `timeline vs EventCard` = 3800px².** EventCard `432,709 320x299` (bottom edge 1008)
and the timeline pill `241,968 286x40` share the band y=968–1008 across x=432–527 (95x40). `elementsFromPoint`
inside that band returns the timeline internals (`DIV.absolute top-1/2 -translate-x-1/2 …`,
`DIV.tp-panel rounded-full h-10 …`) above the card, i.e. the timeline paints over the card's bottom
40px and intercepts clicks there. Not a measurement artefact: both rects are live in the same
viewport, and z-order was verified separately. 1024/1280/1440 clear the pill; 375x812 uses the mobile
bottom sheet (`0,628 375x140`) which ends above the pill.

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
| 375x812 | yes | marker pixel scan (269,61 n=32) | 0,628 375x140 |
| 768x1024 | yes | marker pixel scan (69,836 n=167) | 432,709 320x299 |
| 1024x768 | yes | marker pixel scan (197,708 n=167) | 688,453 320x299 |
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

## 9. Runtime errors — residual noise

Production build, per viewport load:

- `Minified React error #418; visit https://react.dev/errors/418?args[]= …` — ×1 `pageerror` per
  load, every viewport, all three screenshots. A hydration mismatch that React recovers from (the HUD
  stays mounted and interactive); reported, not filtered.
- `Failed to load resource: the server responded with a status of 404 ()` — 40–76× per load. Every one
  is `https://tilecache.rainviewer.com/v2/radar/2c66a8ce20eb/256/{z}/{x}/{y}.png` (verified by
  capturing failing responses with their URLs). The radar frame id comes from `/api/weather` →
  `data.radar[].path` (`src/app/page.tsx:105`); the id is stale, so the whole rain-radar frame 404s.
  Cosmetic (no crash, map and HUD unaffected) but it floods the console.
- `Error: The layer 'tsunami-rings' does not exist in the map's style and cannot be queried for
  features.` — intermittent (4× at 375x812 in one run, absent in the next), from
  `map.queryRenderedFeatures(e.point, { layers: ['tsunami-rings'] })` in
  `src/components/map/MapCanvas.tsx` when the tsunami layer has not been added yet.

## 10. Screenshots

Pixel statistics are measured from the written PNG (`canvas` devDependency, luma > 8 = non-black,
luma > 40 = bright):

| file | viewport | state | non-black | bright | distinct colours | console / page errors |
| --- | --- | --- | --- | --- | --- | --- |
| `screenshots/stitch-desktop.png` | 1280x800 | PETA mode, full HUD | 1023819/1024000 (100%) | 737207 | 512 (cap) | 16 / 1 |
| `screenshots/stitch-mobile.png` | 390x844, touch | BERITA drawer open (`open=true`) | 329160/329160 (100%) | 99487 | 243 | 40 / 1 |
| `screenshots/stitch-desktop-eventcard.png` | 1280x800 | EventCard open (`open=true`) | 1017278/1024000 (99.3%) | 670481 | 379 | 16 / 1 |

None is blank. The 1024-pixel shortfall on the desktop shots is the rounded viewport corner
transparency; the mobile shot is fully opaque. Console counts are the residual errors of §9. Existing
`*-final.png` / `*-v2.png` were not touched.

## 11. Findings

1. **FAIL (C8)** — at 768x1024 the EventCard (`432,705 320x299`) and the timeline pill
   (`225,968 318x56`) intersect by 3800px², and the timeline paints over the card's bottom 40px,
   intercepting clicks there (§4).
2. **Residual (runtime)** — hydration mismatch `React error #418` once per load; stale rain-radar
   frame id in `/api/weather` → 40–76 tile 404s per load; intermittent `tsunami-rings` layer query
   error (§9). None breaks rendering or interaction.
3. **Resolved (map lifecycle crash)** — commit `112a6a5` *"fix(map): stop map lifecycle crash and
   camera corruption"* (`112a6a53f40737210d45debfe2e01b93d938e450`, touching
   `src/components/map/MapBase.tsx` and `src/components/map/MapCanvas.tsx`) removed the StrictMode
   teardown race and the camera corruption. History: the pre-fix production build reported a
   `0,0 <vw>x300` canvas in a 0-height container, `zoom 22`, `center {lng: 180}`, an
   `Application error: a client-side exception has occurred` page, and an EventCard that could never
   open (`opened=false via=not reached` at all five viewports). Post-fix the canvas is full-viewport
   at every size and the card opens at every size (§3, §7).
4. **Resolved (C7)** — the 14 touch-target violations of the previous pass (ticker 20.5px, search
   input 28px, speed select 21x20.5) no longer reproduce; 0 violations across 5 viewports (§5).
5. **Resolved (C6)** — the EventCard readouts now measure `tabular-nums`; 0 readouts failing (§6).
6. **Resolved (BERITA)** — reachable at 375x812 and every other viewport (§8).
7. Repo gates all pass: unit, tsc, build, Playwright (§1).

Finding 1 lives in `src/components/hud/EventCard.tsx` / `TimelineBar.tsx` (card bottom position vs
timeline pill at the 768 breakpoint), outside this workstream's writable scope
(`scripts/audit-hud.mjs`, `docs/design/RESPONSIVE-AUDIT.md`, `screenshots/stitch-*.png`).
