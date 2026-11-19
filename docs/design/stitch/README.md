# Stitch Design Artifacts — TerraPulse Tactical HUD

**Status:** ⚠️ STITCH UNAVAILABLE — fallback wireframes used (see below)
**Date:** 2026-11-19
**Budget:** 2 screens requested (Screen A tactical map HUD, Screen B event detail + news drawer)

## Availability report

| Check | Result |
|-------|--------|
| Stitch MCP server (`stitch`) mounted in toolset | ✅ yes (`list_projects`, `create_project`, `generate_screen_from_text`, `update_screen`, `download_file`, …) |
| `list_projects` | ❌ `HTTP 401` — "Request is missing required authentication credential. Expected OAuth 2 access token, login cookie or other valid authentication credential." |
| `create_project` ("TerraPulse Tactical HUD") | ❌ `HTTP 401` — same `WWW-Authenticate: Bearer resource_metadata=https://stitch.googleapis.com/.well-known/oauth-protected-resource/…` |

**Project id:** none — no project created (create_project rejected at auth).
**Screen ids:** none.
**Screen URLs:** none.
**Screen renders (PNG):** none — nothing to download.

No OAuth credential exists in this environment and Stitch cannot be authenticated from a worker agent, so
generation was skipped rather than stalled. `docs/design/stitch/screen-a-tactical-hud.png` and
`screen-b-event-news.png` were **not** produced.

## Fallback: text wireframes (derived from DESIGN.md §1–§3)

Both wireframes use the DESIGN.md §1 tokens: overlay surface `rgba(9,9,11,0.72)` (`bg-tp-panel/70`) +
`backdrop-blur-md` + `border-white/10` (`border-tp-border`), accents cyan `#22D3EE` / violet `#A855F7`,
6px glowing indicator dots, Space Grotesk (values, `tabular-nums`) + Fira Code (labels), 44×44px touch targets.

### Screen A — "Tactical Map HUD Overlay"

A dark map of Indonesia (Carto dark-matter) fills ~92% of the viewport edge-to-edge; the HUD floats over it in four thin, borderless-rooted strips, never boxed cards. Across the very top runs a 40px **telemetry strip**: left cluster is a pulsing 8px cyan dot + `LIVE` in 10px mono uppercase, then a single-line truncated ticker (`GEM M8.1 … BANDA SEA 14:22 WIB`) that is a full-width click target; right edge is one 44×44 ghost refresh icon. Anchored top-left below the strip (desktop) sits the collapsible **layer panel**: a 210px rounded-lg translucent column with a `LAYER KONTROL` header + chevron; each row is a `<button>` of a 6px disaster-colored glowing dot, an 11px mono uppercase label (`GEMPA BUMI`), a right-aligned cyan count and an `ON/OFF` mono state — **no checkboxes, no nested boxes, no per-row cards**; a single 1px `border-white/10` divider separates rows without card chrome. Bottom-left is the **brand lockup**: a 24px cyan radar SVG with an animated sweep beside `TERRA // PULSE` (10px mono, tracking-widest), under it a two-item underline tab row `PETA · BERITA` (active tab = 2px cyan bottom border). Bottom-center is a slim **timeline scrubber**: a 40px-tall rounded-full glass pill holding a 36px play/pause circle, a mono speed select (`1×/2×/4×`), a `tabular-nums` timestamp, then a 2px cyan→violet gradient track with a 12px glowing cyan handle and tick labels (`-24H · NOW · +24H · +48H`). The open map canvas between all of these is untouched — no full-width bars, no sidebars consuming layout width, no collisions at the bottom-left or bottom-center.

### Screen B — "Event Detail & News Drawer"

Mobile: a bottom sheet slides up from the bottom edge (`rounded-t-2xl`), grab-handle bar first, then a header with a colored type chip (`GEMPA BUMI`) and an `M` badge, then a 2-column metric grid where every number is Space Grotesk `tabular-nums`: `MAGNITUDO 7.4`, `KEDALAMAN 42 km`, `WAKTU`, `JARAK DARI ANDA`; below it a coordinate block `-6.123456, 105.654321` with a copy affordance and a `Center` button; a cyan-tinted **Simulate Tsunami** block appears only when `magnitude ≥ 6.5 && depth ≤ 70`, containing a full-width `JALANKAN SIMULASI TSUNAMI` button that flips to a violet "simulation active" readout (`MAX RADIUS / RINGS / FIRST ETA`). Desktop: the same content as a 320px card at bottom-right. The **BERITA** mode (real-time disaster-news) reuses the same drawer geometry: a list of `NewsArticle` rows — source badge (`tp-badge`) + relative timestamp, a 14px title, a 2-line muted summary, and a disaster-type 6px dot — each row a single 44px+ touch target with only a 1px divider between rows, no boxed cards. Selecting news highlights its `location` on the map.

## Downstream

Because no Stitch render exists, the curation step (`docs/design/STITCH-HUD-SPEC.md`) is derived directly from
DESIGN.md plus the current `src/components/hud/*` implementations; every "Stitch delta" in that spec is either
grounded in an existing component or marked as a DESIGN.md-derived recommendation, and DESIGN.md wins on any
conflict.
