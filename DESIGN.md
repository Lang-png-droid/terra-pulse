# TerraPulse Design System Specification

**Theme:** Orbital Particle & Minimalist Telemetry HUD  
**Inspiration:** stencil.so  
**Version:** 1.0.0  
**Last Updated:** 2026-11-19

---

## 1. Design Tokens

### 1.1 Color Palette

| Token | Hex / Value | Usage | Tailwind Class |
|-------|-------------|-------|----------------|
| `--tp-bg-primary` | `#050507` | Void Canvas / Ocean base background | `bg-tp-bg` |
| `--tp-bg-panel` | `#09090B` | Land / Boundaries - panel surface | `bg-tp-panel` |
| `--tp-bg-panel-alpha` | `#09090BB3` (70% opacity) | Floating HUD Surface with backdrop-blur | `bg-tp-panel/70` |
| `--tp-border-subtle` | `rgba(255,255,255,0.08)` | Subtle monochrome contrast borders | `border-tp-border` |
| `--tp-border-active` | `rgba(34,211,238,0.4)` | Active/focus borders, interactive elements | `border-tp-cyan/40` |
| `--tp-accent-cyan` | `#22D3EE` | Primary Accent - Electric Cyan | `text-tp-cyan`, `bg-tp-cyan` |
| `--tp-accent-violet` | `#A855F7` | Secondary Accent - Luminous Violet | `text-tp-violet`, `bg-tp-violet` |
| `--tp-accent-cyan-glow` | `rgba(34,211,238,0.6)` | Cyan glow shadows | `tp-glow-cyan` |
| `--tp-accent-violet-glow` | `rgba(168,85,247,0.6)` | Violet glow shadows | `tp-glow-violet` |
| `--tp-status-critical` | `#EF4444` | Critical alerts, magnitude ≥ 7.0 | `text-tp-critical` |
| `--tp-status-high` | `#F97316` | High alerts, magnitude 5.0-6.9 | `text-tp-high` |
| `--tp-status-watch` | `#EAB308` | Watch alerts, magnitude 4.0-4.9 | `text-tp-watch` |
| `--tp-status-normal` | `#22C55E` | Normal/Info, magnitude < 4.0 | `text-tp-normal` |
| `--tp-text-primary` | `#F8FAFC` | Primary text, headings, values | `text-tp-text` |
| `--tp-text-muted` | `#71717A` | Muted/Telemetry text, labels, secondary info | `text-tp-muted` |
| `--tp-text-dim` | `#3F3F46` | Dim text, disabled states, background hints | `text-tp-dim` |

**Semantic Color Aliases (Tailwind):**
```css
/* In globals.css :root */
--tp-bg: var(--tp-bg-primary);
--tp-panel: var(--tp-bg-panel);
--tp-border: var(--tp-border-subtle);
--tp-cyan: var(--tp-accent-cyan);
--tp-violet: var(--tp-accent-violet);
--tp-text: var(--tp-text-primary);
--tp-muted: var(--tp-text-muted);
--tp-dim: var(--tp-text-dim);
--tp-critical: var(--tp-status-critical);
--tp-high: var(--tp-status-high);
--tp-watch: var(--tp-status-watch);
--tp-normal: var(--tp-status-normal);
```

### 1.2 Gradients

| Token | Definition | Usage |
|-------|------------|-------|
| `--tp-gradient-primary` | `linear-gradient(135deg, #22D3EE 0%, #A855F7 100%)` | Wind particles, shockwave rings, primary CTAs |
| `--tp-gradient-subtle` | `linear-gradient(90deg, rgba(34,211,238,0.15), rgba(168,85,247,0.15))` | Panel accents, hover states |
| `--tp-gradient-radial-cyan` | `radial-gradient(circle at center, rgba(34,211,238,0.4) 0%, transparent 70%)` | Epicenter glow, pulse effects |
| `--tp-gradient-radial-violet` | `radial-gradient(circle at center, rgba(168,85,247,0.3) 0%, transparent 70%)` | Secondary pulse, selection rings |

**Utility Classes:**
```css
.tp-gradient-primary { background: var(--tp-gradient-primary); }
.tp-gradient-subtle { background: var(--tp-gradient-subtle); }
.tp-gradient-radial-cyan { background: var(--tp-gradient-radial-cyan); }
.tp-gradient-radial-violet { background: var(--tp-gradient-radial-violet); }
```

### 1.3 Typography

#### Font Families

| Role | Font Stack | CSS Variable | Tailwind Class |
|------|------------|--------------|----------------|
| **Geometric Sans (Data/Values)** | `'Space Grotesk', Inter, system-ui, sans-serif` | `--tp-font-geo` | `.font-geo` |
| **Monospace (HUD Labels/System)** | `'Fira Code', 'Share Tech Mono', ui-monospace, SFMono-Regular, monospace` | `--tp-font-mono` | `.font-mono` |

#### Type Scale

| Token | Size | Weight | Tracking | Line Height | Usage | Class |
|-------|------|--------|----------|-------------|-------|-------|
| `--tp-text-xs` | `10px` | 400 | `0.15em` | 1.4 | HUD labels, system status, control buttons | `.tp-label` |
| `--tp-text-sm` | `11px` | 400 | `0.1em` | 1.4 | Compact HUD labels | `.tp-label-sm` |
| `--tp-text-base` | `14px` | 400 | `0` | 1.5 | Body text, descriptions | `.tp-body` |
| `--tp-text-lg` | `16px` | 500 | `0` | 1.5 | Emphasized values, small headings | `.tp-value-lg` |
| `--tp-text-xl` | `20px` | 600 | `-0.02em` | 1.3 | Magnitude displays, coordinates | `.tp-value-xl` |
| `--tp-text-2xl` | `28px` | 700 | `-0.03em` | 1.2 | Hero metrics, primary dashboard values | `.tp-value-2xl` |
| `--tp-text-3xl` | `40px` | 700 | `-0.04em` | 1.1 | Massive magnitude displays | `.tp-value-3xl` |

#### Font Feature Settings
```css
/* Applied globally on body */
font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
/* cv02: Tabular figures (tabular-nums)
   cv03: Slashed zero
   cv04: Alternative @
   cv11: Alternative g */
```

#### Tabular Numbers (Required for Data)
```css
.tp-value, .tp-value-lg, .tp-value-xl, .tp-value-2xl, .tp-value-3xl {
  font-variant-numeric: tabular-nums;
  font-family: var(--tp-font-geo);
}
```

### 1.4 Spacing Scale

Based on 4px base unit (`0.25rem`):

| Token | Value | Rem | Usage |
|-------|-------|-----|-------|
| `--tp-space-0` | `0` | `0` | Reset |
| `--tp-space-1` | `4px` | `0.25rem` | Micro gaps, icon-text |
| `--tp-space-2` | `8px` | `0.5rem` | Compact padding, label-value |
| `--tp-space-3` | `12px` | `0.75rem` | Standard gaps |
| `--tp-space-4` | `16px` | `1rem` | Panel padding, card gaps |
| `--tp-space-5` | `20px` | `1.25rem` | Section spacing |
| `--tp-space-6` | `24px` | `1.5rem` | Large gaps, container padding |
| `--tp-space-8` | `32px` | `2rem` | Major section breaks |
| `--tp-space-10` | `40px` | `2.5rem` | Hero sections |
| `--tp-space-12` | `48px` | `3rem` | Page-level spacing |

### 1.5 Border Radius

| Token | Value | Usage | Tailwind |
|-------|-------|-------|----------|
| `--tp-radius-none` | `0` | Sharp edges, map overlays | `rounded-none` |
| `--tp-radius-sm` | `4px` | `0.25rem` | Buttons, badges, chips | `rounded-sm` |
| `--tp-radius-md` | `8px` | `0.5rem` | Inputs, dropdowns, tooltips | `rounded-md` |
| `--tp-radius-lg` | `12px` | `0.75rem` | Cards, panels, modals | `rounded-lg` |
| `--tp-radius-xl` | `16px` | `1rem` | Large panels, primary containers | `rounded-xl` |
| `--tp-radius-2xl` | `24px` | `1.5rem` | Hero containers, full-screen modals | `rounded-2xl` |
| `--tp-radius-full` | `9999px` | Pills, dots, avatars | `rounded-full` |

### 1.6 Shadows & Glows

| Token | Value | Usage |
|-------|-------|-------|
| `--tp-shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle depth, inline elements |
| `--tp-shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Cards, dropdowns |
| `--tp-shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | Panels, modals |
| `--tp-shadow-xl` | `0 16px 48px rgba(0,0,0,0.6)` | Elevated surfaces, sheets |
| `--tp-glow-cyan` | `0 0 12px rgba(34,211,238,0.4), 0 0 24px rgba(34,211,238,0.2)` | Active cyan elements, live indicators |
| `--tp-glow-violet` | `0 0 12px rgba(168,85,247,0.4), 0 0 24px rgba(168,85,247,0.2)` | Active violet elements, secondary focus |
| `--tp-glow-critical` | `0 0 12px rgba(239,68,68,0.5), 0 0 24px rgba(239,68,68,0.25)` | Critical alerts, magnitude ≥ 7 |
| `--tp-glow-ring` | `0 0 0 2px rgba(34,211,238,0.4)` | Focus rings, selection outlines |

### 1.7 Transitions & Animations

| Token | Value | Usage |
|-------|-------|-------|
| `--tp-transition-fast` | `120ms ease-out` | Hover states, button press |
| `--tp-transition-base` | `200ms ease-out` | Standard transitions, panel open/close |
| `--tp-transition-slow` | `300ms ease-out` | Modals, sheets, complex state changes |
| `--tp-transition-spring` | `400ms cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy entrance, celebrate moments |
| `--tp-duration-pulse` | `2s ease-in-out infinite` | Live indicators, loading pulses |
| `--tp-duration-spin` | `1.5s linear infinite` | Spinners, rotating ornaments |

### 1.8 Z-Index Scale

| Layer | Value | Usage |
|-------|-------|-------|
| `--tp-z-base` | `0` | Base content |
| `--tp-z-raised` | `10` | Cards, panels |
| `--tp-z-sticky` | `20` | Sticky headers, sidebars |
| `--tp-z-overlay` | `30` | Dropdowns, tooltips, popovers |
| `--tp-z-modal` | `40` | Modals, drawers, sheets |
| `--tp-z-toast` | `50` | Toasts, notifications |
| `--tp-z-tooltip` | `60` | Tooltips (highest) |

---

## 2. Visual Ornaments & Signature Elements

### 2.1 Micro-Crosshair Reticle

**Specification:**
- Shape: Thin `+` crosshair (two 1px lines crossing at center)
- Size: `16px × 16px` total, `1px` stroke width
- Colors: Cyan (`#22D3EE`) for primary/earthquake, Violet (`#A855F7`) for secondary/wind
- Animation: Subtle pulse on epicenters (scale 1 → 1.15, 2s ease-in-out infinite)

```css
.tp-reticle {
  width: 16px;
  height: 16px;
  position: relative;
}
.tp-reticle::before,
.tp-reticle::after {
  content: '';
  position: absolute;
  background: currentColor;
}
.tp-reticle::before {
  width: 1px;
  height: 100%;
  left: 50%;
  transform: translateX(-50%);
}
.tp-reticle::after {
  width: 100%;
  height: 1px;
  top: 50%;
  transform: translateY(-50%);
}
.tp-reticle-cyan { color: var(--tp-accent-cyan); }
.tp-reticle-violet { color: var(--tp-accent-violet); }
.tp-reticle-pulse {
  animation: tp-reticle-pulse 2s ease-in-out infinite;
}
@keyframes tp-reticle-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
}
```

### 2.2 Shockwave Rings (Earthquake)

**Specification:**
- Expanding rings from epicenter
- 3 rings staggered: 0s, 0.4s, 0.8s delay
- Gradient stroke: cyan → transparent
- Duration: 3s per ring, infinite

```css
.tp-shockwave {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid transparent;
  background: linear-gradient(var(--tp-accent-cyan), transparent) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: tp-shockwave 3s ease-out infinite;
}
.tp-shockwave:nth-child(2) { animation-delay: 0.4s; }
.tp-shockwave:nth-child(3) { animation-delay: 0.8s; }
@keyframes tp-shockwave {
  0% { transform: scale(0.3); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}
```

### 2.3 Wind Particles

**Specification:**
- Flowing particles along wind vector paths
- Gradient: cyan → violet along path
- Size: 2-4px, varying opacity
- Animation: Continuous flow along curved paths

```css
.tp-wind-particle {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--tp-gradient-primary);
  opacity: 0.6;
  animation: tp-wind-flow 4s ease-in-out infinite;
}
@keyframes tp-wind-flow {
  0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.6; }
  100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
}
```

### 2.4 Grid Overlay (Telemetry HUD)

**Specification:**
- Subtle orthogonal grid on map/dashboard backgrounds
- Color: `rgba(255,255,255,0.03)` lines, `rgba(34,211,238,0.05)` major lines
- Spacing: 40px minor, 200px major
- Animated scanline: Single horizontal line sweeping top→bottom (8s cycle)

```css
.tp-grid-overlay {
  background-image: 
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
.tp-grid-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(34,211,238,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(34,211,238,0.05) 1px, transparent 1px);
  background-size: 200px 200px;
  pointer-events: none;
}
.tp-scanline::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--tp-accent-cyan), transparent);
  opacity: 0.3;
  animation: tp-scanline 8s linear infinite;
}
@keyframes tp-scanline {
  0% { top: 0; }
  100% { top: 100%; }
}
```

---

## 3. Component Specifications

### 3.1 Panels & Containers

#### `.tp-panel` (Standard HUD Panel)
```css
.tp-panel {
  background: rgba(9, 9, 11, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02) inset;
  padding: 16px;
}
```

#### `.tp-panel-strong` (Elevated/Primary Panel)
```css
.tp-panel-strong {
  background: rgba(9, 9, 11, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(34, 211, 238, 0.15);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 24px rgba(34,211,238,0.08);
  padding: 20px;
}
```

#### `.tp-panel-glass` (Minimal Glass)
```css
.tp-panel-glass {
  background: rgba(9, 9, 11, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}
```

**Usage Guidelines:**
- Use `.tp-panel` for standard map overlays, sidebar widgets, info cards
- Use `.tp-panel-strong` for primary dashboard panels, modals, critical data displays
- Use `.tp-panel-glass` for transient overlays, toast containers, subtle groupings
- All panels support dark mode only (TerraPulse is dark-first)

### 3.2 Buttons

#### Variants

| Variant | Background | Border | Text | Hover | Focus | Usage |
|---------|------------|--------|------|-------|-------|-------|
| **Primary** | `var(--tp-accent-cyan)` | None | `#050507` | Brighten 10% | Ring cyan | Primary CTAs |
| **Secondary** | `transparent` | `1px solid var(--tp-accent-cyan)` | `var(--tp-accent-cyan)` | `bg-cyan/10` | Ring cyan | Secondary actions |
| **Ghost** | `transparent` | None | `var(--tp-text-primary)` | `bg-white/5` | Ring cyan | Tertiary, toolbar |
| **Destructive** | `transparent` | `1px solid var(--tp-status-critical)` | `var(--tp-status-critical)` | `bg-critical/10` | Ring critical | Delete, dangerous |
| **HUD** | `rgba(9,9,11,0.8)` | `1px solid var(--tp-border-subtle)` | `var(--tp-text-muted)` | `border-cyan/50` | Ring cyan | Map controls, toolbar |

#### Sizes

| Size | Height | Padding X | Font Size | Icon Gap | Class |
|------|--------|-----------|-----------|----------|-------|
| `sm` | `32px` | `12px` | `11px` (mono) | `6px` | `.tp-btn-sm` |
| `md` | `40px` | `16px` | `13px` (geo) | `8px` | `.tp-btn-md` |
| `lg` | `48px` | `20px` | `14px` (geo) | `10px` | `.tp-btn-lg` |

#### Base Styles
```css
.tp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--tp-font-geo);
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--tp-transition-fast);
  min-height: 44px; /* Touch target */
  min-width: 44px;
}
.tp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.tp-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--tp-bg), 0 0 0 4px var(--tp-accent-cyan);
}
```

### 3.3 Data Display Components

#### Telemetry Label (`.tp-label`, `.tp-label-sm`)
```css
.tp-label {
  font-family: var(--tp-font-mono);
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--tp-text-muted);
  line-height: 1.4;
}
.tp-label-sm { font-size: 11px; letter-spacing: 0.1em; }
```
**Usage:** System status, units, column headers, control labels, timestamps

#### Data Value (`.tp-value`, `.tp-value-lg`, `.tp-value-xl`, `.tp-value-2xl`, `.tp-value-3xl`)
```css
.tp-value {
  font-family: var(--tp-font-geo);
  font-variant-numeric: tabular-nums;
  color: var(--tp-text-primary);
}
.tp-value-lg { font-size: 16px; font-weight: 500; }
.tp-value-xl { font-size: 20px; font-weight: 600; }
.tp-value-2xl { font-size: 28px; font-weight: 700; }
.tp-value-3xl { font-size: 40px; font-weight: 700; }
```
**Usage:** Magnitudes, coordinates, depths, counts, timestamps, any numeric telemetry

#### Status Badge (`.tp-badge`)
```css
.tp-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-family: var(--tp-font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.tp-badge-critical { background: rgba(239,68,68,0.15); color: var(--tp-status-critical); border: 1px solid rgba(239,68,68,0.3); }
.tp-badge-high { background: rgba(249,115,22,0.15); color: var(--tp-status-high); border: 1px solid rgba(249,115,22,0.3); }
.tp-badge-watch { background: rgba(234,179,8,0.15); color: var(--tp-status-watch); border: 1px solid rgba(234,179,8,0.3); }
.tp-badge-normal { background: rgba(34,197,94,0.15); color: var(--tp-status-normal); border: 1px solid rgba(34,197,94,0.3); }
.tp-badge-info { background: rgba(34,211,238,0.15); color: var(--tp-accent-cyan); border: 1px solid rgba(34,211,238,0.3); }
```
**Usage:** Alert levels, connection status, data freshness, filter tags

#### Metric Card (`.tp-metric`)
```css
.tp-metric {
  @apply tp-panel p-4;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tp-metric-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.tp-metric-label { @apply tp-label; }
.tp-metric-value { @apply tp-value-xl; }
.tp-metric-delta {
  @apply font-mono text-xs tabular-nums;
  display: flex; align-items: center; gap: 4px;
}
.tp-metric-delta-positive { color: var(--tp-status-normal); }
.tp-metric-delta-negative { color: var(--tp-status-critical); }
.tp-metric-sparkline { height: 32px; width: 100%; }
```

### 3.4 Form Components

#### Input (`.tp-input`)
```css
.tp-input {
  width: 100%;
  background: rgba(5,5,7,0.6);
  border: 1px solid var(--tp-border-subtle);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: var(--tp-font-geo);
  font-size: 14px;
  color: var(--tp-text-primary);
  transition: all var(--tp-transition-fast);
}
.tp-input::placeholder { color: var(--tp-text-dim); }
.tp-input:hover { border-color: rgba(255,255,255,0.15); }
.tp-input:focus {
  outline: none;
  border-color: var(--tp-accent-cyan);
  box-shadow: 0 0 0 3px rgba(34,211,238,0.15);
}
.tp-input:disabled { opacity: 0.5; cursor: not-allowed; }
.tp-input-error { border-color: var(--tp-status-critical); }
.tp-input-error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
```

#### Select (`.tp-select`)
```css
.tp-select {
  @apply tp-input appearance-none bg-[url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>")] bg-no-repeat bg-right-3;
  padding-right: 36px;
}
```

#### Checkbox (`.tp-checkbox`)
```css
.tp-checkbox {
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--tp-border-subtle);
  border-radius: 4px;
  background: transparent;
  appearance: none;
  cursor: pointer;
  position: relative;
  transition: all var(--tp-transition-fast);
  flex-shrink: 0;
}
.tp-checkbox:checked {
  background: var(--tp-accent-cyan);
  border-color: var(--tp-accent-cyan);
}
.tp-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 5px; top: 2px;
  width: 5px; height: 9px;
  border: solid #050507;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.tp-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--tp-bg), 0 0 0 4px var(--tp-accent-cyan);
}
```

#### Slider/Range (`.tp-slider`)
```css
.tp-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: var(--tp-border-subtle);
  border-radius: 3px;
  outline: none;
}
.tp-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--tp-accent-cyan);
  cursor: pointer;
  box-shadow: var(--tp-glow-cyan);
  transition: transform var(--tp-transition-fast);
}
.tp-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
.tp-slider::-moz-range-thumb {
  width: 20px; height: 20px;
  border: none;
  border-radius: 50%;
  background: var(--tp-accent-cyan);
  box-shadow: var(--tp-glow-cyan);
}
```

### 3.5 Navigation & Layout

#### Sidebar (`.tp-sidebar`)
```css
.tp-sidebar {
  @apply tp-panel-strong h-full flex flex-col;
  width: 280px;
  border-right: 1px solid var(--tp-border-subtle);
}
.tp-sidebar-collapsed { width: 64px; }
.tp-sidebar-section { @apply px-4 py-3; }
.tp-sidebar-item {
  @apply flex items-center gap-3 px-3 py-2 rounded-lg
    text-tp-muted hover:text-tp-text hover:bg-white/5
    transition-colors tp-transition-fast
    font-geo text-sm font-medium;
  white-space: nowrap;
}
.tp-sidebar-item-active {
  @apply bg-tp-cyan/10 text-tp-cyan border-l-2 border-tp-cyan;
}
```

#### Top Bar (`.tp-topbar`)
```css
.tp-topbar {
  @apply tp-panel-glass h-14 px-4 flex items-center justify-between;
  border-bottom: 1px solid var(--tp-border-subtle);
}
.tp-topbar-title { @apply tp-value-lg; }
.tp-topbar-actions { @apply flex items-center gap-2; }
```

#### Tabs (`.tp-tabs`)
```css
.tp-tabs { @apply flex gap-1 bg-tp-bg/50 rounded-lg p-1; }
.tp-tab {
  @apply px-4 py-2 rounded-md font-mono text-xs uppercase tracking-widest
    text-tp-muted hover:text-tp-text transition-colors tp-transition-fast;
}
.tp-tab-active {
  @apply bg-tp-panel text-tp-cyan shadow-md;
}
```

### 3.6 Feedback & Overlays

#### Toast (`.tp-toast`)
```css
.tp-toast {
  @apply tp-panel-strong px-4 py-3 rounded-xl shadow-xl
    flex items-start gap-3 min-w-[320px] max-w-md;
  animation: slideInRight 0.3s ease-out;
  border-left: 3px solid var(--tp-accent-cyan);
}
.tp-toast-critical { border-left-color: var(--tp-status-critical); }
.tp-toast-success { border-left-color: var(--tp-status-normal); }
.tp-toast-warning { border-left-color: var(--tp-status-watch); }
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}
```

#### Tooltip (`.tp-tooltip`)
```css
.tp-tooltip {
  @apply tp-panel-strong px-3 py-2 rounded-lg text-sm font-geo
    whitespace-nowrap z-[60] pointer-events-none;
  box-shadow: var(--tp-shadow-xl);
}
.tp-tooltip::after {
  content: '';
  position: absolute;
  bottom: -4px; left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(9,9,11,0.95);
}
```

#### Modal/Sheet (`.tp-modal`, `.tp-sheet`)
```css
.tp-modal-overlay {
  @apply fixed inset-0 bg-black/60 backdrop-blur-sm z-[40]
    flex items-center justify-center p-4;
  animation: fadeIn 0.2s ease-out;
}
.tp-modal {
  @apply tp-panel-strong w-full max-w-lg max-h-[85vh] overflow-auto;
  animation: scaleIn 0.2s ease-out;
}
.tp-sheet {
  @apply tp-panel-strong w-full max-h-[60vh] rounded-t-2xl;
  animation: slideUp 0.3s ease-out;
}
.tp-modal-header { @apply flex items-center justify-between p-4 border-b border-tp-border; }
.tp-modal-title { @apply tp-value-lg; }
.tp-modal-close {
  @apply tp-touch p-1 rounded-lg text-tp-muted hover:text-tp-text hover:bg-white/5
    transition-colors tp-transition-fast;
}
.tp-modal-body { @apply p-4; }
.tp-modal-footer { @apply flex items-center justify-end gap-2 p-4 border-t border-tp-border; }
```

### 3.7 Map-Specific Components

#### Epicenter Marker (`.tp-epicenter`)
```css
.tp-epicenter {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 100;
}
.tp-epicenter-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid var(--tp-accent-cyan);
  opacity: 0.6;
  animation: tp-ring-pulse 2s ease-out infinite;
}
.tp-epicenter-core {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: var(--tp-accent-cyan);
  box-shadow: var(--tp-glow-cyan);
}
.tp-epicenter-reticle { @apply tp-reticle tp-reticle-cyan absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2; }
@keyframes tp-ring-pulse {
  0% { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(1.5); opacity: 0; }
}
```

#### Magnitude Indicator (`.tp-magnitude`)
```css
.tp-magnitude {
  @apply tp-value font-bold;
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
}
.tp-magnitude-critical { color: var(--tp-status-critical); text-shadow: 0 0 12px rgba(239,68,68,0.5); }
.tp-magnitude-high { color: var(--tp-status-high); text-shadow: 0 0 12px rgba(249,115,22,0.5); }
.tp-magnitude-watch { color: var(--tp-status-watch); text-shadow: 0 0 12px rgba(234,179,8,0.5); }
.tp-magnitude-normal { color: var(--tp-status-normal); }
.tp-magnitude-unit { @apply tp-label ml-1; }
```

#### Coordinate Display (`.tp-coords`)
```css
.tp-coords {
  @apply font-mono text-xs tabular-nums text-tp-muted
    flex items-center gap-1;
}
.tp-coords-value { @apply text-tp-text font-geo; }
.tp-coords-label { @apply tp-label; }
```

#### Wind Vector (`.tp-wind-vector`)
```css
.tp-wind-vector {
  position: absolute;
  width: 48px;
  height: 48px;
  transform-origin: center;
}
.tp-wind-arrow {
  width: 0; height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 16px solid var(--tp-accent-cyan);
  filter: drop-shadow(0 0 6px var(--tp-accent-cyan));
}
.tp-wind-trail {
  position: absolute;
  top: 50%; left: 50%;
  width: 60px; height: 2px;
  transform-origin: left center;
  background: var(--tp-gradient-primary);
  opacity: 0.4;
  animation: tp-wind-trail 1.5s ease-out infinite;
}
@keyframes tp-wind-trail {
  0% { transform: translateX(-100%) scaleX(0); opacity: 0; }
  50% { opacity: 0.4; }
  100% { transform: translateX(0) scaleX(1); opacity: 0; }
}
```

---

## 4. Layout & Grid System

### 4.1 Container Widths
```css
.tp-container { @apply mx-auto px-4 md:px-6 lg:px-8; }
.tp-container-sm { @apply max-w-3xl; }
.tp-container-md { @apply max-w-5xl; }
.tp-container-lg { @apply max-w-7xl; }
.tp-container-full { @apply max-w-full; }
```

### 4.2 Dashboard Grid
```css
.tp-dashboard-grid {
  @apply grid gap-4;
  grid-template-columns: repeat(1, minmax(0, 1fr));
}
@media (min-width: 640px) {
  .tp-dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1024px) {
  .tp-dashboard-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (min-width: 1440px) {
  .tp-dashboard-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
```

### 4.3 Map Layout
```css
.tp-map-layout {
  @apply relative h-full w-full flex;
}
.tp-map-viewport { @apply flex-1 relative min-w-0; }
.tp-map-sidebar { @apply tp-sidebar; }
.tp-map-toolbar { @apply absolute top-4 left-4 right-4 z-20 flex justify-between; }
.tp-map-legend { @apply absolute bottom-4 left-4 z-20 tp-panel p-3 min-w-[180px]; }
.tp-map-scale { @apply absolute bottom-4 right-4 z-20 tp-panel px-3 py-1.5 font-mono text-xs text-tp-muted; }
```

---

## 5. Accessibility (WCAG 2.1 AA)

### 5.1 Color Contrast Ratios

| Combination | Ratio | Status |
|-------------|-------|--------|
| `#F8FAFC` on `#050507` | 18.5:1 | ✅ AAA |
| `#71717A` on `#050507` | 5.2:1 | ✅ AA |
| `#22D3EE` on `#050507` | 4.8:1 | ✅ AA (large text) |
| `#A855F7` on `#050507` | 3.9:1 | ⚠️ AA Large only |
| `#EF4444` on `#050507` | 5.8:1 | ✅ AA |
| `#22C55E` on `#050507` | 6.1:1 | ✅ AA |

**Guidelines:**
- Never use violet (`#A855F7`) as sole indicator for text < 18px
- Always pair color with icon/shape for status indicators
- Focus rings use cyan (`#22D3EE`) at 4px offset for 3:1 contrast against panel

### 5.2 Focus Management
```css
/* Global focus visible */
*:focus-visible {
  outline: none;
  box-shadow: 
    0 0 0 2px var(--tp-bg-primary),
    0 0 0 4px var(--tp-accent-cyan);
}

/* Panel focus trap */
.tp-modal:focus-within {
  box-shadow: 
    0 0 0 2px var(--tp-bg-primary),
    0 0 0 4px var(--tp-accent-cyan),
    var(--tp-shadow-xl);
}
```

### 5.3 Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .tp-reticle-pulse,
  .tp-shockwave,
  .tp-wind-particle,
  .tp-scanline,
  .tp-ring-pulse { animation: none !important; }
}
```

### 5.4 Touch Targets
- Minimum 44×44px (`.tp-touch` utility)
- Button minimum height: 40px (md), 32px (sm)
- Spacing between interactive elements: ≥8px

### 5.5 Screen Reader Support
```css
/* Visually hidden but accessible */
.tp-sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Live regions for dynamic updates */
.tp-live-polite { @apply tp-sr-only; aria-live: polite; }
.tp-live-assertive { @apply tp-sr-only; aria-live: assertive; }
```

---

## 6. Tailwind Configuration Mapping

### 6.1 `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tp: {
          bg: '#050507',
          panel: '#09090B',
          border: 'rgba(255,255,255,0.08)',
          cyan: '#22D3EE',
          violet: '#A855F7',
          text: '#F8FAFC',
          muted: '#71717A',
          dim: '#3F3F46',
          critical: '#EF4444',
          high: '#F97316',
          watch: '#EAB308',
          normal: '#22C55E',
        },
      },
      fontFamily: {
        geo: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Share Tech Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'tp-label': ['10px', { lineHeight: '1.4', letterSpacing: '0.15em', fontWeight: '400' }],
        'tp-label-sm': ['11px', { lineHeight: '1.4', letterSpacing: '0.1em', fontWeight: '400' }],
        'tp-body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'tp-value': ['14px', { lineHeight: '1.5', fontWeight: '400', fontVariantNumeric: 'tabular-nums' }],
        'tp-value-lg': ['16px', { lineHeight: '1.5', fontWeight: '500', fontVariantNumeric: 'tabular-nums' }],
        'tp-value-xl': ['20px', { lineHeight: '1.3', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }],
        'tp-value-2xl': ['28px', { lineHeight: '1.2', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }],
        'tp-value-3xl': ['40px', { lineHeight: '1.1', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }],
      },
      spacing: {
        'tp-1': '4px',
        'tp-2': '8px',
        'tp-3': '12px',
        'tp-4': '16px',
        'tp-5': '20px',
        'tp-6': '24px',
        'tp-8': '32px',
        'tp-10': '40px',
        'tp-12': '48px',
      },
      borderRadius: {
        'tp-none': '0',
        'tp-sm': '4px',
        'tp-md': '8px',
        'tp-lg': '12px',
        'tp-xl': '16px',
        'tp-2xl': '24px',
        'tp-full': '9999px',
      },
      boxShadow: {
        'tp-sm': '0 1px 2px rgba(0,0,0,0.3)',
        'tp-md': '0 4px 12px rgba(0,0,0,0.4)',
        'tp-lg': '0 8px 24px rgba(0,0,0,0.5)',
        'tp-xl': '0 16px 48px rgba(0,0,0,0.6)',
        'tp-glow-cyan': '0 0 12px rgba(34,211,238,0.4), 0 0 24px rgba(34,211,238,0.2)',
        'tp-glow-violet': '0 0 12px rgba(168,85,247,0.4), 0 0 24px rgba(168,85,247,0.2)',
        'tp-glow-critical': '0 0 12px rgba(239,68,68,0.5), 0 0 24px rgba(239,68,68,0.25)',
        'tp-ring': '0 0 0 2px rgba(34,211,238,0.4)',
      },
      transitionDuration: {
        'tp-fast': '120ms',
        'tp-base': '200ms',
        'tp-slow': '300ms',
      },
      transitionTimingFunction: {
        'tp-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'tp-pulse': 'pulse 2s ease-in-out infinite',
        'tp-spin': 'spin 1.5s linear infinite',
        'tp-slide-up': 'slideUp 0.3s ease-out',
        'tp-slide-down': 'slideDown 0.3s ease-out',
        'tp-fade-in': 'fadeIn 0.2s ease-out',
        'tp-scale-in': 'scaleIn 0.2s ease-out',
        'tp-reticle-pulse': 'tp-reticle-pulse 2s ease-in-out infinite',
        'tp-shockwave': 'tp-shockwave 3s ease-out infinite',
        'tp-scanline': 'tp-scanline 8s linear infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'tp-reticle-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.15)', opacity: '1' },
        },
        tpShockwave: {
          '0%': { transform: 'scale(0.3)', opacity: '0.8' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        tpScanline: { '0%': { top: '0' }, '100%': { top: '100%' } },
      },
      zIndex: {
        'tp-base': '0',
        'tp-raised': '10',
        'tp-sticky': '20',
        'tp-overlay': '30',
        'tp-modal': '40',
        'tp-toast': '50',
        'tp-tooltip': '60',
      },
      backdropBlur: {
        'tp-sm': '8px',
        'tp-md': '12px',
        'tp-lg': '16px',
      },
    },
  },
  plugins: [],
};

export default config;
```

### 6.2 CSS Variable Definitions (for `globals.css`)
```css
@layer base {
  :root {
    /* Core Colors */
    --tp-bg-primary: #050507;
    --tp-bg-panel: #09090B;
    --tp-bg-panel-alpha: #09090BB3;
    --tp-border-subtle: rgba(255,255,255,0.08);
    --tp-border-active: rgba(34,211,238,0.4);
    --tp-accent-cyan: #22D3EE;
    --tp-accent-violet: #A855F7;
    --tp-accent-cyan-glow: rgba(34,211,238,0.6);
    --tp-accent-violet-glow: rgba(168,85,247,0.6);
    --tp-status-critical: #EF4444;
    --tp-status-high: #F97316;
    --tp-status-watch: #EAB308;
    --tp-status-normal: #22C55E;
    --tp-text-primary: #F8FAFC;
    --tp-text-muted: #71717A;
    --tp-text-dim: #3F3F46;

    /* Semantic Aliases */
    --tp-bg: var(--tp-bg-primary);
    --tp-panel: var(--tp-bg-panel);
    --tp-border: var(--tp-border-subtle);
    --tp-cyan: var(--tp-accent-cyan);
    --tp-violet: var(--tp-accent-violet);
    --tp-text: var(--tp-text-primary);
    --tp-muted: var(--tp-text-muted);
    --tp-dim: var(--tp-text-dim);
    --tp-critical: var(--tp-status-critical);
    --tp-high: var(--tp-status-high);
    --tp-watch: var(--tp-status-watch);
    --tp-normal: var(--tp-status-normal);

    /* Fonts */
    --tp-font-geo: 'Space Grotesk', Inter, system-ui, sans-serif;
    --tp-font-mono: 'Fira Code', 'Share Tech Mono', ui-monospace, SFMono-Regular, monospace;

    /* Gradients */
    --tp-gradient-primary: linear-gradient(135deg, #22D3EE 0%, #A855F7 100%);
    --tp-gradient-subtle: linear-gradient(90deg, rgba(34,211,238,0.15), rgba(168,85,247,0.15));
    --tp-gradient-radial-cyan: radial-gradient(circle at center, rgba(34,211,238,0.4) 0%, transparent 70%);
    --tp-gradient-radial-violet: radial-gradient(circle at center, rgba(168,85,247,0.3) 0%, transparent 70%);
  }
}
```

---

## 7. Usage Guidelines

### 7.1 Color Usage Rules

| Rule | Description |
|------|-------------|
| **Primary Accent (Cyan)** | Use for primary actions, live data, focus states, epicenters, wind particles |
| **Secondary Accent (Violet)** | Use for secondary actions, wind vectors, alternate data series, hover accents |
| **Critical (Red)** | Magnitude ≥ 7.0, destructive actions, critical alerts only |
| **High (Orange)** | Magnitude 5.0-6.9, warnings, attention-needed states |
| **Watch (Yellow)** | Magnitude 4.0-4.9, pending states, cautions |
| **Normal (Green)** | Magnitude < 4.0, success, connected, healthy states |
| **Muted Text** | Labels, units, timestamps, secondary metadata |
| **Dim Text** | Disabled states, placeholder, background hints only |

### 7.2 Typography Rules

| Rule | Description |
|------|-------------|
| **Monospace uppercase (10-11px)** | ALL HUD labels, system status, control buttons, units, column headers |
| **Geometric sans + tabular-nums** | ALL numeric values: magnitudes, coordinates, depths, counts, timestamps |
| **Never mix** | Don't use mono for values, don't use geo for labels |
| **Tracking** | `tracking-widest` (0.15em) for 10px labels, `tracking-wider` (0.1em) for 11px |

### 7.3 Panel Hierarchy

```
Page Background (--tp-bg-primary)
├── Primary Panels (--tp-panel-strong) — Dashboard cards, modals, critical data
├── Standard Panels (--tp-panel) — Map overlays, sidebar widgets, info cards
└── Glass Panels (--tp-panel-glass) — Transient overlays, tooltips, toast containers
```

### 7.4 Animation Principles

| Principle | Guideline |
|-----------|-----------|
| **Purposeful** | Every animation communicates state change or draws attention to live data |
| **Subtle** | Avoid flashy transitions; prefer opacity, transform, color shifts |
| **Respect Reduced Motion** | All animations disable under `prefers-reduced-motion` |
| **Performance** | Use `transform` and `opacity` only; avoid layout-triggering properties |
| **Staggered** | Multiple elements animate with 50-100ms stagger for organic feel |

### 7.5 Map Visualization Standards

| Element | Specification |
|---------|---------------|
| **Epicenter** | Cyan core + pulsing ring + cyan reticle |
| **Magnitude Label** | Geo font, tabular-nums, color-coded by severity, unit in mono label |
| **Wind Vectors** | Cyan→violet gradient arrows, animated trails |
| **Grid Overlay** | 40px minor (rgba 255,255,255,0.03), 200px major (rgba 34,211,238,0.05) |
| **Scanline** | Single 2px cyan gradient line, 8s cycle, 30% opacity |

---

## 8. Component Checklist for Implementation

### 8.1 Required Base Components
- [ ] `Button` (Primary, Secondary, Ghost, Destructive, HUD variants; sm/md/lg sizes)
- [ ] `Panel` (Standard, Strong, Glass)
- [ ] `Input`, `Select`, `Checkbox`, `Slider`
- [ ] `Label` (tp-label, tp-label-sm)
- [ ] `Value` (tp-value through tp-value-3xl)
- [ ] `Badge` (Critical, High, Watch, Normal, Info)
- [ ] `MetricCard`
- [ ] `Tabs`
- [ ] `Sidebar` (collapsible)
- [ ] `TopBar`
- [ ] `Toast` (with variants)
- [ ] `Tooltip`
- [ ] `Modal` / `Sheet`
- [ ] `EpicenterMarker`
- [ ] `MagnitudeIndicator`
- [ ] `CoordinateDisplay`
- [ ] `WindVector`

### 8.2 Utility Classes to Implement
- [ ] `.tp-panel`, `.tp-panel-strong`, `.tp-panel-glass`
- [ ] `.tp-label`, `.tp-label-sm`
- [ ] `.tp-value`, `.tp-value-lg`, `.tp-value-xl`, `.tp-value-2xl`, `.tp-value-3xl`
- [ ] `.tp-badge-*` variants
- [ ] `.tp-btn-*` variants and sizes
- [ ] `.tp-input`, `.tp-select`, `.tp-checkbox`, `.tp-slider`
- [ ] `.tp-gradient-text`, `.tp-glow-cyan`, `.tp-glow-violet`
- [ ] `.tp-reticle`, `.tp-reticle-cyan`, `.tp-reticle-violet`, `.tp-reticle-pulse`
- [ ] `.tp-shockwave`, `.tp-wind-particle`, `.tp-grid-overlay`, `.tp-scanline`
- [ ] `.tp-touch`, `.tp-sr-only`, `.tp-live-polite`, `.tp-live-assertive`

### 8.3 Tailwind Config Integration
- [ ] All color tokens in `theme.extend.colors.tp`
- [ ] Font families in `theme.extend.fontFamily`
- [ ] Type scale in `theme.extend.fontSize`
- [ ] Spacing in `theme.extend.spacing`
- [ ] Border radius in `theme.extend.borderRadius`
- [ ] Shadows in `theme.extend.boxShadow`
- [ ] Transitions in `theme.extend.transitionDuration` / `transitionTimingFunction`
- [ ] Animations in `theme.extend.animation` / `keyframes`
- [ ] Z-index in `theme.extend.zIndex`
- [ ] Backdrop blur in `theme.extend.backdropBlur`

---

## 9. Migration Notes from Existing Code

### 9.1 Current `globals.css` Coverage
The existing `globals.css` already implements:
- ✅ Core color tokens (lines 10-25)
- ✅ Semantic aliases (lines 28-36)
- ✅ Font families (lines 82-87)
- ✅ Panel classes (lines 92-97)
- ✅ Label classes (lines 100-105)
- ✅ Value classes (lines 108-116)
- ✅ Touch target (lines 119-121)
- [ ] Dot indicators (lines 124-132) — *keep, but add variants*
- [ ] Gradient track (lines 135-137) — *rename to `.tp-gradient-track`*
- [ ] Animations (lines 140-157) — *add missing keyframes*
- [ ] Gradient text (lines 162-164) — *keep*
- [ ] Glow utilities (lines 167-172) — *keep*
- [ ] Safe area (lines 175-186) — *keep*
- [ ] Keyframes (lines 190-221) — *add reticle, shockwave, scanline*
- [ ] Reduced motion (lines 229-237) — *keep*

### 9.2 Additions Needed in `globals.css`
```css
/* Add these to @layer components */

/* Badge variants */
.tp-badge { ... }
.tp-badge-critical { ... }
.tp-badge-high { ... }
.tp-badge-watch { ... }
.tp-badge-normal { ... }
.tp-badge-info { ... }

/* Button base + variants */
.tp-btn { ... }
.tp-btn-primary { ... }
.tp-btn-secondary { ... }
.tp-btn-ghost { ... }
.tp-btn-destructive { ... }
.tp-btn-hud { ... }
.tp-btn-sm { ... }
.tp-btn-lg { ... }

/* Form components */
.tp-input { ... }
.tp-select { ... }
.tp-checkbox { ... }
.tp-slider { ... }

/* Map-specific */
.tp-epicenter { ... }
.tp-magnitude { ... }
.tp-coords { ... }
.tp-wind-vector { ... }

/* Visual ornaments */
.tp-reticle { ... }
.tp-reticle-cyan { ... }
.tp-reticle-violet { ... }
.tp-reticle-pulse { ... }
.tp-shockwave { ... }
.tp-wind-particle { ... }
.tp-grid-overlay { ... }
.tp-scanline { ... }

/* Overlays */
.tp-toast { ... }
.tp-tooltip { ... }
.tp-modal-overlay { ... }
.tp-modal { ... }
.tp-sheet { ... }

/* Layout */
.tp-dashboard-grid { ... }
.tp-map-layout { ... }
.tp-map-toolbar { ... }
.tp-map-legend { ... }
.tp-map-scale { ... }

/* Accessibility */
.tp-sr-only { ... }
.tp-live-polite { ... }
.tp-live-assertive { ... }

/* Add these to @layer utilities */
/* (already has gradient-text, glow-cyan, glow-violet, safe-area) */
```

### 9.3 Keyframe Additions
```css
@keyframes tp-reticle-pulse { ... }
@keyframes tp-shockwave { ... }
@keyframes tp-wind-flow { ... }
@keyframes tp-scanline { ... }
@keyframes tp-ring-pulse { ... }
@keyframes slideInRight { ... }
```

---

## 10. Design Review Checklist

Before shipping any UI component, verify:

- [ ] Uses only design token variables (no hardcoded colors)
- [ ] Typography follows mono-for-labels / geo-for-values rule
- [ ] Tabular nums on ALL numeric displays
- [ ] Touch targets ≥ 44×44px
- [ ] Focus visible with cyan ring (4px offset)
- [ ] Works with `prefers-reduced-motion`
- [ ] Color contrast ≥ 4.5:1 for text, 3:1 for UI elements
- [ ] Status colors paired with icons/shapes (not color alone)
- [ ] Panel hierarchy respected (strong > standard > glass)
- [ ] Animation durations from token scale
- [ ] Z-index from defined scale
- [ ] Responsive: works at 375px, 768px, 1024px, 1440px
- [ ] Dark mode only (no light mode variants needed)

---

## 11. References

- **stencil.so** — Visual inspiration for HUD aesthetic, telemetry typography, glassmorphism
- **WCAG 2.1 AA** — Accessibility compliance target
- **NASA/ESA Mission Control UI** — Reference for telemetry HUD patterns
- **Tailwind CSS v4** — Utility-first framework mapping
- **CSS Custom Properties** — Token delivery mechanism

---

*This document is the single source of truth for TerraPulse visual design. All implementation decisions should reference these specifications.*

---

## 13. Stitch-derived HUD deltas

Full implementation spec: [`docs/design/STITCH-HUD-SPEC.md`](./docs/design/STITCH-HUD-SPEC.md) (literal Tailwind strings, per-component acceptance). Stitch MCP was unreachable (OAuth 401) so no render exists — deltas are derived from this document + the current `src/components/hud/*`. **This document wins** except the rows marked *(wins)*:

| Component | Delta | Winner |
|-----------|-------|--------|
| TelemetryStrip | flat 40px top strip, `rounded-none` (narrower application of `.tp-panel`); dot 8px → 6px (C3) | DESIGN.md |
| BrandLockup | PETA/BERITA tabs padded to 44×44, underline style kept | delta *(wins)* — §5.4 touch outranks density |
| LayerPanel | collapsed = 44px rail, not off-screen; drop the inline `minHeight:32px` that defeats `.tp-touch` | delta *(wins)* / DESIGN.md |
| LayerPanel | desktop surface `bg-tp-panel/90` → `tp-panel` (exact 0.72) | DESIGN.md |
| TimelineBar | fix broken classes: `tp-panel/80` → `tp-panel`; `tp-gradient-primary` → `.tp-gradient-track`; `tp-label-xs` → `tp-label` | DESIGN.md |
| TimelineBar | `max-w-sm` at md / `max-w-md` at lg to stop overlap with the bottom-left lockup | delta *(wins)* — no-collision rule |
| EventCard | metric cells lose per-cell `border+rounded-lg+bg-tp-surface/50` boxes; values unchanged | delta *(wins)* — "no thick card boxes", C4 |
| EventCard | sheet shell → `tp-panel-strong`; emoji icons → SVG/text | DESIGN.md |
| NewsPanel (new, BERITA) | text-only `NewsArticle` rows, `divide-tp-border`, relative time with absolute in `title` | delta *(wins)* / DESIGN.md |

Non-negotiables encoded in the spec: overlay = `bg-tp-panel/70 backdrop-blur-md border-tp-border`; 6px glowing `tp-dot-*`; no stacked thick card boxes; ≥90% open map canvas; ≥44×44px targets; `tabular-nums` on every numeric readout; no bottom-left / bottom-center collisions at 375/768/1024/1440.

Out of scope here: `src/**` implementation (separate workstream) and the legacy `TopBar.tsx` raw `zinc-*` tokens (flagged, untouched).