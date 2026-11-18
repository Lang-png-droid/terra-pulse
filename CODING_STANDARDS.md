# Coding Standards - TerraPulse

> **Baca saat review.** Agent implementer tidak perlu baca file ini; reviewer agent yang enforce.

---

## Aturan Mekanis (Deterministic Checks)

> Otomatis dicek via ESLint/TypeScript/pre-commit. Tidak butuh judgement.

### 1. Entitas JSX
- **Larang:** `>`, `<`, `&` mentah di JSX text content.
- **Wajib:** `>`, `<`, `&`.
- **Contoh salah:** `{magnitude > 6.0 ? '> M6.0' : '< M5.0'}`
- **Contoh benar:** `{magnitude > 6.0 ? '> M6.0' : '< M5.0'}`

### 2. Penyempitan Koordinat GeoJSON
- Tipe `geometry.coordinates` = `Position | Position[] | Position[][]` (spec GeoJSON).
- **Wajib sempitkan sebelum destructuring:**
```ts
const coords = feature.geometry.coordinates;
if (!Array.isArray(coords) || coords.length < 2 || typeof coords[0] !== 'number') return;
const [lng, lat] = coords as [number, number];
```
- **Helper kanonik:** `src/lib/geoMath.ts:toLngLat()` — pakai ini, jangan duplikasikan.

### 3. Guard SSR (window/navigator)
- **Larang:** Akses `window`, `navigator`, `document` di top-level module / render.
- **Wajib:** Di dalam `useEffect` ATAU cek `typeof window !== 'undefined'`.
```ts
// ✓ Benar
useEffect(() => { const w = window.innerWidth; }, []);
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

// ✗ Salah
const isMobile = window.innerWidth < 768;
```

### 4. Import DeckGL Layers
- **Larang:** Import layer yang tidak ada di `@deck.gl/layers` v9 (contoh: `HeatmapLayer`).
- **Cek:** `package.json` → `@deck.gl/layers` version → docs resmi.

### 5. Console.log di Production Code
- **Larang:** `console.log`, `console.debug` di file non-test.
- **Izinkan:** `console.warn`, `console.error` untuk error handling nyata.

---

## Aturan Judgement (Butuh Reviewer)

> Tidak bisa diotomatisasi penuh. Reviewer agent evaluate.

### 1. Konsistensi Cross-File
- Pola `createDeckLayers()` di `MapCanvas.tsx` = referensi untuk layer baru.
- Pola `addDistanceToFeatures()` di `geoMath.ts` = referensi untuk distance calc.
- Baru buat file → follow pola existing, jangan ciptakan pola baru.

### 2. Penamaan
- Hook: `usePascalCase` (contoh: `useDeviceCapability`)
- Component: `PascalCase.tsx`
- Util/Helper: `camelCase.ts`
- Type/Interface: `PascalCase` (contoh: `DisasterFeature`)
- Constant: `UPPER_SNAKE_CASE`

### 3. Props Interface
- Selalu define `interface Props` di atas component.
- Optional props pakai `?`, default value di destructuring.
```ts
interface Props {
  className?: string;
  onChange: (value: number) => void;
}
export const Slider = ({ className, onChange }: Props) => { ... }
```

### 4. Error Handling API Routes
- Setiap `/api/*` route **wajib** `try/catch` dengan fallback data.
- Response error tetap valid GeoJSON/JSON (bukan HTML).
- Log error server-side, jangan bocorkan detail internal ke client.

### 5. Mobile-First CSS
- Tailwind: `mobile-first` (default = mobile, `md:` = desktop).
- Touch target minimal `44x44px` → `min-h-[44px] min-w-[44px]`.
- Safe area: `pb-safe` / `pt-safe` untuk bottom sheet, top bar.

---

## Referensi Cepat

| File | Pola Kanonik |
|------|--------------|
| `src/components/map/MapCanvas.tsx` | `createDeckLayers()`, layer config |
| `src/lib/geoMath.ts` | `toLngLat()`, `addDistanceToFeatures()`, `haversine()` |
| `src/hooks/useDeviceCapability.ts` | SSR guard, device detection |
| `src/app/api/*/route.ts` | `try/catch`, `revalidate`, fallback |

---

## Enforcement Checklist (Reviewer)

- [ ] Zero `console.log` di src/ (kecuali test)
- [ ] Zero bare `>` `<` `&` di JSX text
- [ ] Semua akses `window`/`navigator` ter-guard
- [ ] Koordinat GeoJSON disempitkan sebelum pakai
- [ ] Import DeckGL layer valid
- [ ] API route ada fallback data
- [ ] Props interface defined
- [ ] Mobile-first Tailwind class