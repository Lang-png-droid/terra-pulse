# STITCH-HUD-SPEC — TerraPulse Tactical HUD (implementation-ready)

**Status:** Ready to implement. Written against `DESIGN.md` v1.0.0 + `src/app/globals.css` token/utility surface + the current `src/components/hud/*` implementations.
**Stitch source:** unavailable (OAuth 401) — see `docs/design/stitch/README.md`. Wherever this spec says "Stitch delta" it means *an intended HUD direction*; since no Stitch render exists, the baseline is DESIGN.md and the deltas are recommendations. **DESIGN.md wins on any conflict**, except the three itemised exceptions in §8 that are strictly better.

An implementer who has never seen the Stitch UI needs only this file: every block names the exact file, the exact class strings, and the exact pass/fail acceptance.

---

## 0. Hard constraints (apply to every component)

| # | Constraint | Literal expression |
|---|-----------|--------------------|
| C1 | Overlay surface | `bg-tp-panel/70 backdrop-blur-md border border-tp-border` — equivalently `.tp-panel` (its `rgba(9,9,11,0.72)`; 0.70 vs 0.72 is inside tolerance). No other surface colour. |
| C2 | Accents only | cyan `#22D3EE` (`tp-cyan`), violet `#A855F7` (`tp-violet`). Status colours only for severity (C6). |
| C3 | Indicator dots are 6px and glow | `<span className="tp-dot-hotspot" style={{ width: 6, height: 6 }} aria-hidden />` (dot classes carry `shadow-[0_0_8px_…]`). Never a 8px+ dot inside a list row. |
| C4 | No stacked thick card boxes | Rows are separated by a single `border-b border-tp-border` divider inside **one** panel. Never a bordered+rounded+padded box per row, and never two nested bordered surfaces. |
| C5 | Map stays open | All HUD is `fixed` overlay. Sum of HUD footprint must leave **≥ 90%** of `h-[100dvh]` unobstructed at 1280×800 and ≥ 88% at 390×844. No full-width bars, no layout-width sidebar. |
| C6 | Numbers | Every numeric readout is `.tp-value*` (Space Grotesk + `font-variant-numeric: tabular-nums`), or `font-mono tabular-nums` for compact inline readouts. Mono is only for labels/units. |
| C7 | Touch | Every interactive element ≥ `44×44px`: `className="… tp-touch"` (`.tp-touch` = `min-h-[44px] min-w-[44px] flex items-center justify-center`). Gap between targets ≥ `gap-2`. |
| C8 | Collision-free corners | `bottom-left` = BrandLockup only; `bottom-center` = TimelineBar only; they must not overlap at 375px width. EventCard (desktop) owns `bottom-right`. |
| C9 | Reduced motion | Any animation used here already drops under `prefers-reduced-motion` (globals.css §5.3 pattern); do not add inline animations that bypass it. |
| C10 | Labels | `tp-label` (10px/0.15em) or `tp-label-sm` (11px/0.1em), mono, uppercase — text is written uppercase in markup, no `uppercase` needed twice. |

**Z-index:** TelemetryStrip/Panels/Timeline/EventCard/BrandLockup `z-40`; mobile overlay scrim `z-40`; mobile slide-over `z-50`.

**Two real defects to fix as part of this work** (both make current components render wrong):

1. `TimelineBar.tsx:157` uses `className="tp-panel/80 backdrop-blur-md …"` — `tp-panel/80` is not a Tailwind class (missing `bg-`, and `.tp-panel` is a component class, not a colour). The pill therefore has **no background**. → use `.tp-panel` or `bg-tp-panel/70`.
2. `TimelineBar.tsx:205` uses `className="… tp-gradient-primary …"` and `:222/:264` use `tp-label-xs` — **none of these three exist** in `globals.css` or `tailwind.config.ts`. → gradient: use the existing `.tp-gradient-track` (`background: linear-gradient(90deg, var(--tp-accent-cyan), var(--tp-accent-violet))`); tick/tooltip labels: use `tp-label` + `text-[10px]`.

---

## 1. Shared primitives (define once, reference everywhere)

```
Overlay panel  → "tp-panel"                       // rgba(9,9,11,0.72) blur(12px) border-white/8 r-12
Elevated panel → "tp-panel-strong"                // EventCard/BottomSheet shell
Minimal glass  → "tp-panel-glass"                 // tooltips, transient
Label          → "tp-label" / "tp-label-sm"
Value          → "tp-value" | "tp-value-lg" | "tp-value-xl"
Row divider    → "border-b border-tp-border"      // C4
Dot            → "tp-dot tp-dot-<type>"           // + inline width/height 6px (C3)
Badge          → "tp-badge tp-badge-info|critical|high|watch|normal"
Touch          → "tp-touch"
```

Tailwind colours available: `tp-bg tp-panel tp-surface tp-border tp-cyan tp-violet tp-cyan-glow tp-violet-glow tp-critical tp-high tp-watch tp-normal tp-text tp-muted tp-dim`. Radii: `rounded-sm|md|lg|xl|2xl|full`. Blur: `backdrop-blur-md`(12px) `-lg`(16px). Shadow: `shadow-tp-glow-cyan`(cyan glow).

---

## 2. `TelemetryStrip` — `src/components/hud/TelemetryStrip.tsx`

**Current:** `fixed top-0 … z-40 safe-area-inset-top`, inner `bg-tp-panel/70 backdrop-blur-md border-b border-tp-border rounded-none px-4 h-10`. Left: 8px dot + `LIVE` + ticker button; right: one 44px refresh ghost. **This already matches C1/C3/C5** (strip is 40px, map untouched). Rows: no cards.

**Deltas:**
- **Dot 8px → 6px** (C3): `className="tp-dot tp-dot-active animate-pulse-slow"`, drop the inline `style={{ width/height }}` 8px override, or set it to `6px`.
- Ticker text: replace `tp-label text-tp-text` with **`tp-label-sm text-tp-text`** (11px is more legible for a live sentence) and keep `text-left truncate px-1 py-0.5` — DESIGN.md §1.3 assigns 10px to status, 11px to compact labels; a running sentence is a compact label. *(Trivial, either is compliant; take `tp-label` if the implementer prefers zero deviation — not a winning delta.)*
- Keep the refresh button exactly: `className="tp-touch p-1 rounded-lg bg-tp-bg/50 border border-tp-border text-tp-muted hover:text-tp-cyan hover:border-tp-cyan/50 hover:bg-tp-cyan/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"`.
- Right cluster may add **one** `tp-badge tp-badge-info` freshness chip (`LIVE`/`DELAYED`) — height `h-5`, never wider than 88px, hidden `md:` up only when the strip would wrap. No second row.
- `aria-live="polite"` on the ticker region is already present — keep; do not move it to the strip root.

**Acceptance:** strip height stays 40px; map visible ratio ≥ 90% at 1280×800; only one interactive right-side control at 375px.

---

## 3. `BrandLockup` — `src/components/hud/BrandLockup.tsx` (incl. PETA/BERITA tab)

**Current:** `fixed bottom-4 left-4 z-40`, column: radar SVG (24px, `text-tp-cyan`, `animate-radar-sweep`) + `TERRA // PULSE` (`tp-label tracking-widest text-tp-text`); below, `role="tablist"` with two `role="tab"` buttons `PETA`/`BERITA` styled `tp-label-sm px-2 py-1 rounded-none border-b-2` (active = `border-tp-cyan text-tp-cyan`). **Matches C8** (owns bottom-left, no panel chrome).

**Deltas:**
- **Increase tab touch targets to C7.** `px-2 py-1` on an 11px label is ≈ 30×24px. Use `tp-touch px-3` → `min-h-[44px] min-w-[44px]`, keep `border-b-2 rounded-none`. Visually still a bare underline tab — the extra hit area comes from padding, not new chrome.
- Keep `gap-2` between the lockup row and the tab row; keep the `·` separator with `text-tp-dim`.
- `BERITA` must be functional, not decorative: lift mode state to `page.tsx` (or a `useViewMode()` context) and render either `<MapCanvas/>` HUD (PETA) or the new `<NewsPanel/>` drawer content (BERITA). Keep `role="tablist"`/`aria-selected`/`aria-controls` → `aria-controls="panel-peta"` / `"panel-berita"` (ids already present).
- Hide below `md` (already `hidden md:block`). On mobile, mode switching is owned by the mobile equivalent (see §7 note) so bottom-left never collides with the EventCard at 375px.
- Add `safe-left` alongside `bottom-4 left-4` so notched devices do not clip the lockup (`className="fixed bottom-4 left-4 safe-left …"`).

**Acceptance:** both tabs ≥ 44×44; at 375px the EventCard (bottom sheet, full width) does **not** overlap the lockup (lockup is `md:` only); active tab has a 2px cyan underline and cyan label.

---

## 4. `LayerPanel` — `src/components/hud/LayerPanel.tsx`

**Current (desktop):** `fixed top-14 left-4 z-40 w-[210px] bg-tp-panel/90 backdrop-blur-md border border-tp-border rounded-lg shadow-xl`, `transition-all duration-300`, `translate-x-0` / `-translate-x-full opacity-0 pointer-events-none`, `maxHeight: 55vh`; header `px-3 py-2 border-b border-tp-border` with `LAYER KONTROL` + chevron; body `p-3 overflow-y-auto space-y-1`. Rows: `w-full flex items-center gap-2 px-2 py-1.5 rounded-sm … tp-touch`, 6px dot, `tp-label-sm text-tp-text`, `tp-badge-info` count, `ON`/`OFF` mono state.

**Deltas (the panel is already close to the target — mostly token hygiene + collapse affordance):**
1. Rows already satisfy **C4** (no checkbox, dot+label+state). Keep exactly: no `tp-checkbox`, no per-row border/rounded-lg/background. Replace the ad-hoc `style={{ minHeight: '32px' }}` with `min-h-[44px]` via `tp-touch` so **C7** holds (the class is already applied; the inline 32px currently *overrides* it below 44px — this is the bug).
2. `bg-tp-panel/90` → `tp-panel` (**C1**, exactly 0.72 + blur-md). Keep `rounded-lg`, keep `w-[210px]`.
3. Collapse: replace "translate fully off-screen" with a **thin rail** when collapsed so the map gains width without losing the control: collapsed = `w-11` column containing only the wrench/chevron button (`tp-touch`) + count badge; expanded = `w-[210px]`. Animate with `transition-[width] duration-300` (transform/opacity only for motion of children, per DESIGN.md §7.4).
4. Mobile (`isMobile` branch): the existing scrim + `w-[210px]` slide-over with `bg-tp-panel/95 backdrop-blur-md` and `animate-slide-in` is correct; change `bg-tp-panel/95` → `tp-panel-strong` for consistency, and keep the 44px close button.
5. Row state word: keep `ON`/`OFF` mono (it is the accessible redundancy for the dot colour). Ensure `aria-pressed={isActive}` stays.

**Acceptance:** no `<input type="checkbox">` anywhere in the panel; each row ≥ 44px tall; expanded width 210px; collapsed rail ≤ 44px wide; count badges only when `count > 0`.

---

## 5. `TimelineBar` — `src/components/hud/TimelineBar.tsx`

**Target:** slim, centered, **tabular-nums**, bottom-center, C8-safe.

**Deltas (fix the three broken classes first — §0 defects):**
1. Root pill: `className="tp-panel h-10 flex items-center gap-2 px-3"` (was `tp-panel/80 … rounded-full` with no background). Keep `rounded-full`.
2. Play/pause button: keep `w-9 h-9 … tp-touch flex-shrink-0` but wrap-hit-area: `tp-touch` gives 44×44 min; visually keep the 36px circle via inner span if the 44px box looks heavy. Acceptable as-is (`tp-touch` is applied) — option B: `min-w-[44px] min-h-[44px]` outer button, 36px visual circle inside.
3. Timestamp: `className="tp-value tabular-nums text-tp-text whitespace-nowrap flex-1 text-center min-w-0 font-mono text-[12px]"` — **keep** (C6; `font-mono` on a value is the one allowed exception for the compact clock, DESIGN.md §3.3 assigns mono to timestamps). Do not widen it: `flex-1` only, `min-w-0`.
4. Track: height **2px** (`h-[2px]`), fill uses **`.tp-gradient-track`** (cyan→violet) instead of the non-existent `tp-gradient-primary`; background `bg-tp-surface/40 rounded-full`.
5. Handle: 12px (`w-3 h-3`) cyan circle `bg-tp-cyan border-2 border-tp-bg shadow-tp-glow-cyan`, `scale-125` while dragging. Keep keyboard `ArrowLeft/ArrowRight` handler and the `role="slider"` ARIA on both track and handle.
6. Ticks: `-24H / NOW / +24H / +48H`. Major ticks 2px×10px, minor 1px×6px, colour `var(--tp-cyan)`. Replace `tp-label-xs` with `tp-label text-[10px]`. Keep them **inside** the 40px pill (overflow-hidden) so they never collide with the map edge. Labels are `aria-hidden` (values already exposed on the slider).
7. Hover preview bubble: `className="absolute bottom-full … px-2 py-1 bg-tp-surface border border-tp-border rounded tp-label tabular-nums text-tp-text whitespace-nowrap"` (drop `tp-label-xs`).
8. Speed select: `font-mono tabular-nums text-[11px] bg-tp-surface/40 rounded-md px-1 py-0.5` — keep; wrap in a `tp-touch` label so its hit area ≥ 44px on touch.
9. Position: keep `fixed bottom-0 left-1/2 -translate-x-1/2 z-40 px-4 pointer-events-none` + `safe-bottom pb-2` (mobile) / `pb-4` (desktop). Max width `max-w-md` so it never reaches the bottom-left lockup at ≥ 768px (lockup ends at ~168px; centered `max-w-md`=448px on a 768px screen spans 160→608 → **collision with lockup at 768px**). → **At `md` use `max-w-sm` (384px)** and only widen to `max-w-md` at `lg` (≥1024px). This is required by C8.

**Acceptance:** pill has a visible glass background; track shows cyan→violet fill; clock and hover bubble are `tabular-nums`; at 768px the pill's left edge ≥ 176px (no lockup overlap).

---

## 6. `EventCard` / `EventBottomSheet` — `src/components/hud/EventCard.tsx` (mounted), `EventBottomSheet.tsx` (legacy duplicate)

`page.tsx` mounts **`EventCard`**; `EventBottomSheet` is an older near-duplicate. Spec targets `EventCard`; `EventBottomSheet` should be deleted once `EventCard` lands (it is dead weight — delete, don't keep both).

**Current:** shell `bg-tp-panel/95 backdrop-blur-md border border-tp-border rounded-t-2xl xl:rounded-xl shadow-2xl`; mobile bottom sheet `bottom-[calc(env(safe-area-inset-bottom)+44px)] max-h-[calc(85vh-…)]`, desktop `bottom-4 right-4 w-80 max-h-[70vh]`; header row; metric grid `grid grid-cols-2 gap-3` with **`bg-tp-surface/50 border border-tp-border rounded-lg p-3` per metric**; coords block; tsunami block; active-simulation block.

**Deltas:**
1. Shell: `bg-tp-panel/95 …` → `tp-panel-strong` (DESIGN.md §3.1 elevated surface for sheets; C1-aligned). Keep `rounded-t-2xl xl:rounded-xl shadow-2xl overflow-hidden flex flex-col`.
2. **Remove the nested per-metric boxes** (this is the "no stacked thick card boxes" mandate, **C4**). Metric grid becomes a 2-col grid of *label over value* pairs inside **one** `border-t border-tp-border pt-3` section — no `border border-tp-border rounded-lg bg-tp-surface/50` per cell. Literal replacement:
   ```
   <div className="grid grid-cols-2 gap-x-4 gap-y-2">
     <div className="flex flex-col gap-0.5">
       <span className="tp-label text-tp-muted">MAGNITUDO</span>
       <span className="tp-value-xl tabular-nums text-tp-text" style={{ color: getMagnitudeColor(magnitude) }}>M{magnitude.toFixed(1)}</span>
     </div>
     … KEDALAMAN  <span className="tp-value-lg tabular-nums text-tp-text">{depth} km</span>
     … WAKTU (col-span-2) <span className="tp-value font-mono tabular-nums text-tp-text">… WIB</span>
     … JARAK DARI ANDA (col-span-2) <span className="tp-value tabular-nums text-tp-cyan">{distanceStr}</span>
   </div>
   ```
   Same values as today, same `getMagnitudeColor()`, just without card chrome.
3. Magnitude is the hero: `tp-value-2xl` (28px/700) with `style={{ color: getMagnitudeColor(magnitude) }}` and `text-shadow` per `.tp-magnitude-critical|high|watch` mapping (use `.tp-magnitude tp-magnitude-high` etc., or the DESIGN.md `.tp-magnitude` helper). Depth in `tp-value-lg tabular-nums`.
4. Coordinates: keep monospace+copy. `className="tp-coords …"` style = `font-mono text-xs tabular-nums`; value `text-tp-text`, label `tp-label`. Keep copy-to-clipboard and `Center` button, both `tp-touch` (already) — but drop the emoji `🎯` from the button label (DESIGN.md / skill rule: SVG or text, never emoji as icon; `EventCard` uses emoji `📍 🎯 🌊` and `TYPE_ICONS` emoji — replace with the inline SVGs already used in `TimelineBar`, or `aria-hidden` text).
5. Tsunami block: keep the gating `type === 'earthquake' && magnitude >= 6.5 && depth <= 70` (AGENTS.md §5) and the label `SIMULASI TSUNAMI TERSEDIA`; style the trigger `className="w-full min-h-[44px] tp-body bg-tp-cyan/20 border border-tp-cyan/40 rounded-lg text-tp-cyan hover:bg-tp-cyan/30 transition-colors flex items-center justify-center gap-2"` (C7 + C1-family). Active state uses violet (`bg-tp-violet/10 border-tp-violet/30 text-tp-violet`), 3-up stat trio without per-cell boxes (divider-based, like §6.2).
6. Drag handle: keep (mobile `w-10 h-1 rounded-full bg-tp-border`); keep the `expanded` height logic (`140px` collapsed / `85vh` expanded) — it is the "bottom-sheet" behaviour the brief asks for.
7. Close button: keep `tp-touch`; `aria-label="Tutup detail"`.
8. `EventBottomSheet.tsx`: delete. If it is referenced elsewhere, repoint to `EventCard` in the same commit; do not leave an alias.

**Acceptance:** zero `border border-tp-border rounded-lg` wrappers *inside* the metric area; magnitude is 28px colour-coded `tabular-nums`; depth/coords `tabular-nums`; tsunami button ≥44px and appears only for qualifying quakes; no emoji icons in the card.

---

## 7. `NewsPanel` (NEW — BERITA mode) — `src/components/hud/NewsPanel.tsx`

Real-time disaster-news drawer. Data already exists end-to-end: `GET /api/news` → `NewsArticle[]` (`src/types/disaster.ts:97`: `id,title,summary,url,source,publishedAt,imageUrl?,disasterTypes,location?`). No new API work.

**Spec:**
- **Placement/shape (reuse the drawer geometry of §6):**
  - Desktop: `fixed bottom-4 right-4 z-40 w-80 max-h-[70vh] tp-panel-strong rounded-xl overflow-hidden flex flex-col`.
  - Mobile: bottom sheet `fixed left-0 right-0 bottom-0 z-40 rounded-t-2xl max-h-[70vh] tp-panel-strong safe-bottom` with the same `w-10 h-1` grab handle.
  - It must not be shown simultaneously with `EventCard` in the same corner: opening news closes the event card (`setSelectedFeature(null)`).
- **Header:** `flex items-center justify-between px-3 py-2 border-b border-tp-border`, title `tp-label tracking-widest text-tp-text` = `BERITA BENCANA`, then `tp-badge tp-badge-info` with the article count, then a `tp-touch` close button.
- **List (single panel, dividers only — C4):**
  ```
  <ul className="flex-1 overflow-y-auto divide-y divide-tp-border">
    <li key={a.id}>
      <a href={a.url} target="_blank" rel="noopener noreferrer"
         className="flex gap-2.5 px-3 py-2.5 min-h-[44px] tp-touch items-start
                    hover:bg-tp-surface/50 focus-visible:ring-2 focus-visible:ring-tp-cyan
                    focus-visible:ring-offset-2 focus-visible:ring-offset-tp-bg
                    outline-none transition-colors">
        <span className="tp-dot tp-dot-hotspot mt-1 flex-shrink-0" style={{width:6,height:6}} aria-hidden />
        <span className="min-w-0 flex-1 flex flex-col gap-1">
          <span className="flex items-center gap-2 min-w-0">
            <span className="tp-badge tp-badge-info px-1.5 py-0.5">{a.source}</span>
            <span className="tp-label text-tp-dim whitespace-nowrap">{relativeTime(a.publishedAt)}</span>
          </span>
          <span className="tp-title text-tp-text line-clamp-2">{a.title}</span>
          <span className="tp-body text-tp-muted line-clamp-2 text-[12px]">{a.summary}</span>
        </span>
      </a>
    </li>
  </ul>
  ```
  - Dot colour is chosen from `a.disasterTypes[0]` via a `Record<DisasterType,string>` → existing `tp-dot-earthquake|hotspot|volcano|cyclone|tsunami|flood|rain`. Never colour-only signal: the `source` badge + title text carry the meaning.
  - **No images** in the row (keeps it slim and avoids layout shift/CLS); `a.imageUrl` is ignored. *(Delta from a "rich news card" Stitch direction; DESIGN.md's density + C4 win.)*
  - Relative time via `Intl.RelativeTimeFormat('id-ID')`; absolute timestamp in `title=` attribute (exact values remain accessible) — no new dependency.
  - `line-clamp` utility already ships with Tailwind (v3.3+); if the installed version lacks `line-clamp-*`, use `overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]` — no plugin install (zero-dep constraint, AGENTS.md §2).
- **Empty/loading/error states** (AGENTS.md §7 error resilience): loading → 3 skeleton rows (`bg-tp-surface/40 h-3 rounded animate-pulse`, `aria-hidden`); empty → centered `tp-label text-tp-muted` = `TIDAK ADA BERITA`; fetch error → the same text plus `tp-badge tp-badge-watch` = `OFFLINE`. No crash, drawer stays usable.
- **Location → map:** if `a.location` exists, the row gets an extra `tp-touch` map-pin button (`aria-label="Tampilkan di peta"`) calling `onCenterMap(a.location.lat, a.location.lng)`; it does **not** navigate away (the `<a>` wraps only the text block, the pin sits as a sibling).
- **Props:** `{ articles: NewsArticle[]; loading: boolean; error?: string|null; onClose: () => void; onCenterMap: (lat:number,lng:number)=>void }`.
- **Mobile entry point:** on `< md`, because `BrandLockup` is hidden, add one 44×44 `tp-touch` news toggle so BERITA is reachable — reuse `LayerPanel`'s collapsed-trigger visual (`px-3 py-2 tp-panel rounded-full shadow-lg tp-label text-tp-cyan`). It must never collide with the timeline pill: place it top-right (`fixed top-14 right-4 z-40`) — the timeline owns bottom-center, the event card owns the bottom.

**Acceptance:** BERITA mode reachable at 375px and 1280px; rows are single 44px+ targets separated only by `divide-tp-border`; a `location` article centers the map without leaving the app; list never renders a per-row box.

---

## 8. Stitch-vs-DESIGN.md delta ledger

| Component | Delta vs DESIGN.md | Winner | One-line justification |
|-----------|--------------------|--------|------------------------|
| TelemetryStrip | 40px flat top strip (no rounded panel, `border-b` only) | **DESIGN.md** (`.tp-panel` is `rounded-xl`) | A full-bleed strip has no corners to round; the flat variant is a *narrower* application of `.tp-panel`, not a contradiction — apply `rounded-none` explicitly and document it. |
| TelemetryStrip | Ticker uses `tp-label-sm` (11px) not 10px | DESIGN.md (either compliant) | DESIGN.md §1.3 already defines 11px compact labels; no override needed. |
| BrandLockup | Underline tabs get 44×44 padding | **Stitch delta wins** | DESIGN.md §5.4 (44px touch) outranks any visual density; underline style is preserved so the look is unchanged. |
| LayerPanel | Collapsed = 44px icon rail, not off-screen | **Stitch delta wins** | Keeping the control reachable is strictly better UX than hiding it; still < 5% of viewport, C5 holds. |
| LayerPanel | Remove inline `minHeight:32px` | DESIGN.md | The inline style contradicts the `.tp-touch` class already on the element (bug). |
| TimelineBar | Pill gets a real background (`tp-panel`) | DESIGN.md | Current `tp-panel/80` renders nothing; DESIGN.md C1 requires the glass surface. |
| TimelineBar | `max-w-sm` at md, `max-w-md` at lg | **Stitch delta wins (collision fix)** | At 768px a centered 448px pill overlaps the bottom-left lockup — C8 mandates no collision; DESIGN.md is silent on this specific geometry. |
| TimelineBar | `.tp-gradient-track` instead of non-existent `tp-gradient-primary` | DESIGN.md | DESIGN.md §6.2 defines the cyan→violet gradient; `.tp-gradient-track` is its existing implementation. |
| EventCard | Metric cells lose their per-cell `border+rounded-lg+bg-tp-surface/50` boxes | **Stitch delta wins** | Directly serves the brief + C4 ("no thick card boxes") while keeping identical values; DESIGN.md only recommends `.tp-metric` cards for dashboards, not the mobile sheet. |
| EventCard | Emoji icons replaced by SVG/text | DESIGN.md + skill `ui-ux-pro-max` P4 | "SVG icons (no emoji)" is an explicit anti-pattern rule; no DESIGN.md entry permits emoji. |
| EventCard | Sheet shell `tp-panel-strong` (0.95) vs `.tp-panel` (0.72) | DESIGN.md | DESIGN.md §3.1 assigns `.tp-panel-strong` to modals/sheets; C1's 0.72 applies to floating map overlays. |
| NewsPanel | Rows are text-only (no thumbnail) | **Stitch delta wins** | Zero image weight, zero CLS, dense list — aligns with the "ultra-lightweight" mission and C4. |
| NewsPanel | Relative timestamp, absolute in `title` | DESIGN.md | DESIGN.md §3.3 puts timestamps in mono `tabular-nums`; relative time is only a label, exact value stays accessible. |
| Global | `TopBar.tsx` uses raw `zinc-*`/`bg-white` classes, not tokens | DESIGN.md | Pre-existing token violation in a component outside this workstream; `page.tsx` already uses `TelemetryStrip` instead. Flag for a later cleanup — **do not touch `TopBar` in this workstream**. |

Nothing else in the Stitch direction conflicts; where a Stitch idea is merely stylistic it wins only when DESIGN.md is silent *and* the result is measurably better (C5/C7/C8), per the rows marked "Stitch delta wins".

---

## 9. Responsive matrix (must hold after implementation)

| Region | < 768px (mobile) | ≥ 768px (tablet) | ≥ 1024px (desktop) |
|--------|------------------|------------------|--------------------|
| Top strip | 40px, ticker truncates | 40px | 40px |
| Layer panel | scrim slide-over, `w-[210px]`, trigger top-left | `w-[210px]` / 44px rail | same |
| Timeline | bottom-center `max-w-sm pb-2 safe-bottom` | `max-w-sm` | `max-w-md pb-4` |
| Brand lockup | hidden (mobile news toggle top-right instead) | visible bottom-left | visible bottom-left |
| Event/news drawer | bottom sheet `rounded-t-2xl max-h-[70vh] safe-bottom` | right card `w-80` | right card `w-80` |

Map-canvas visibility check (C5): at 1280×800 the HUD (40 strip + 210×~440 panel + 448×40 pill + lockup) leaves > 90% of the viewport; at 390×844 (strip + trigger pill + sheet collapsed at 140px) leaves > 88%. If an implementer's build measures below the threshold, shrink the sheet's default height first, never the map.

## 10. Definition of done (spec-level acceptance)

- [ ] No `.tp-panel` overlay outside C1's surface recipe; no second surface colour introduced.
- [ ] All indicator dots inside lists are 6px and use existing `tp-dot-*` classes.
- [ ] `.tp-gradient-primary` (non-existent) and `tp-label-xs` (non-existent) appear **zero** times.
- [ ] No element inside LayerPanel or EventCard metric area is a bordered+rounded box (C4).
- [ ] Every interactive target ≥ 44×44 (C7), verified for BrandLockup tabs, LayerPanel rows, TimelineBar play/handle/select, EventCard buttons, NewsPanel rows.
- [ ] Every numeric readout has `tabular-nums` (C6): strip timestamp, timeline clock + hover bubble, magnitude, depth, coordinates, tsunami stats, news relative time.
- [ ] Bottom-left (lockup) and bottom-center (timeline) never overlap at 375 / 768 / 1024 / 1440 (C8).
- [ ] `EventBottomSheet.tsx` deleted; `NewsPanel.tsx` added and reachable in BERITA mode on both breakpoints.
- [ ] `prefers-reduced-motion` still neutralises radar sweep / pulse / slide-in.
