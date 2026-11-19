'use client';

import { ScatterplotLayer, PolygonLayer, PathLayer } from '@deck.gl/layers';
import { DisasterFeature, LayerVisibility } from '@/types/disaster';

// ===========================
// BRUTALIST PALETTE - flat, fully opaque, zero glow.
// ===========================
const RED: [number, number, number] = [255, 77, 42]; // #FF4D2A earthquake, volcano
const AMBER: [number, number, number] = [245, 158, 11]; // #F59E0B hotspot
const SKY: [number, number, number] = [56, 189, 248]; // #38BDF8 flood, hydrological
const WHITE: [number, number, number] = [255, 255, 255]; // cyclone, tsunami, selection

// Dot-matrix opacity ladder: phenomena step through 4 discrete alphas instead of
// fading smoothly, so they read as printed telemetry rather than a soft glow.
const STEPS = [235, 165, 95, 35];

type RGBA = [number, number, number, number];

function hexToRgba(hex: string, alpha: number): RGBA {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return [r, g, b, Math.round(alpha * 255)];
}

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  return [
    parseInt(cleanHex.slice(0, 2), 16),
    parseInt(cleanHex.slice(2, 4), 16),
    parseInt(cleanHex.slice(4, 6), 16),
  ];
}

function getVolcanoAlertColor(alertLevel: string): RGBA {
  switch (alertLevel.toLowerCase()) {
    case 'warning':
    case 'red':
      return [239, 68, 68, 220]; // Critical red
    case 'watch':
    case 'orange':
      return [249, 115, 22, 220]; // High orange
    case 'advisory':
    case 'yellow':
      return [234, 179, 8, 200]; // Watch yellow
    case 'normal':
    case 'green':
    default:
      return [34, 197, 94, 180]; // Normal green
  }
}

function getVolcanoAlertColorHex(alertLevel: string): string {
  switch (alertLevel.toLowerCase()) {
    case 'warning':
    case 'red':
      return '#EF4444';
    case 'watch':
    case 'orange':
      return '#F97316';
    case 'advisory':
    case 'yellow':
      return '#EAB308';
    case 'normal':
    case 'green':
    default:
      return '#22C55E';
  }
}

// Brutalist direction: one flat red for every seismic event. Depth is reported
// in the callout, not encoded as a hue shift.
function getEarthquakeColor(_depth: number): RGBA {
  return [...RED, 235];
}

function generateCirclePolygon(
  lat: number,
  lng: number,
  radiusKm: number,
  points: number = 64
): number[][][] {
  const coords: number[][] = [];
  const radiusDeg = radiusKm / 111.32; // Approximate km to degrees

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const latOffset = radiusDeg * Math.cos(angle);
    const lngOffset = radiusDeg * Math.sin(angle) / Math.cos((lat * Math.PI) / 180);
    coords.push([lng + lngOffset, lat + latOffset]);
  }

  return [coords];
}

interface DisasterLayersProps {
  earthquakes: DisasterFeature[];
  hotspots: DisasterFeature[];
  volcanoes: DisasterFeature[];
  cyclones: DisasterFeature[];
  layerVisibility: LayerVisibility;
  selectedFeatureId: string | null;
}

// ===========================
// BULLSEYE - solid core + hairline ring + outer tick ring for active events.
// All radii are in pixels, so a marker reads identically at any zoom and never
// uses a large low-alpha circle to fake a glow.
// ===========================
interface BullseyeDatum {
  position: [number, number];
  color: [number, number, number];
  selected: boolean;
  active: boolean;
  __feature: DisasterFeature;
}

function bullseyeLayers(id: string, data: BullseyeDatum[]): Array<any> {
  if (data.length === 0) return [];
  return [
    new ScatterplotLayer({
      id,
      data,
      getPosition: (d: BullseyeDatum) => d.position,
      getRadius: 5,
      radiusUnits: 'pixels',
      radiusMinPixels: 4,
      radiusMaxPixels: 6,
      getFillColor: (d: BullseyeDatum) =>
        (d.selected ? [...WHITE, 255] : [...d.color, 255]) as RGBA,
      pickable: true,
      stroked: false,
      filled: true,
    }),
    new ScatterplotLayer({
      id: `${id}-rings`,
      data,
      getPosition: (d: BullseyeDatum) => d.position,
      getRadius: 11,
      radiusUnits: 'pixels',
      radiusMinPixels: 11,
      radiusMaxPixels: 11,
      getLineColor: (d: BullseyeDatum) =>
        (d.selected ? [...WHITE, 255] : [...d.color, 220]) as RGBA,
      getLineWidth: (d: BullseyeDatum) => (d.selected ? 2 : 1.5),
      lineWidthUnits: 'pixels',
      lineWidthMinPixels: 1.5,
      lineWidthMaxPixels: 2,
      stroked: true,
      filled: false,
      pickable: false,
    }),
    new ScatterplotLayer({
      id: `${id}-ticks`,
      data: data.filter((d) => d.active),
      getPosition: (d: BullseyeDatum) => d.position,
      getRadius: 18,
      radiusUnits: 'pixels',
      radiusMinPixels: 18,
      radiusMaxPixels: 18,
      getLineColor: (d: BullseyeDatum) =>
        (d.selected ? [...WHITE, 200] : [...d.color, 140]) as RGBA,
      getLineWidth: 1,
      lineWidthUnits: 'pixels',
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 1,
      stroked: true,
      filled: false,
      pickable: false,
    }),
  ];
}

function pointOf(f: DisasterFeature): [number, number] {
  const c = f.geometry.coordinates;
  return Array.isArray(c) && typeof c[0] === 'number' ? (c as [number, number]) : [0, 0];
}

export function createDisasterLayers({
  earthquakes,
  hotspots: _hotspots, // animated per-frame in createAnimatedLayers
  volcanoes,
  cyclones,
  layerVisibility,
  selectedFeatureId,
}: DisasterLayersProps): Array<any> {
  const layers: Array<any> = [];

  // ===========================
  // EARTHQUAKES - flat red bullseye; tick ring marks magnitude >= 6.
  // ===========================
  if (layerVisibility.earthquakes && earthquakes.length > 0) {
    layers.push(
      ...bullseyeLayers(
        'earthquakes',
        earthquakes.map((f) => ({
          position: pointOf(f),
          color: RED,
          selected: f.id === selectedFeatureId,
          active: (f.properties.magnitude || 0) >= 6,
          __feature: f,
        }))
      )
    );
  }

  // ===========================
  // VOLCANOES - flat red bullseye; tick ring marks any non-Normal alert.
  // ===========================
  if (layerVisibility.volcanoes && volcanoes.length > 0) {
    layers.push(
      ...bullseyeLayers(
        'volcanoes',
        volcanoes.map((f) => ({
          position: pointOf(f),
          color: RED,
          selected: f.id === selectedFeatureId,
          active: (f.properties.alertLevel || 'Normal') !== 'Normal',
          __feature: f,
        }))
      )
    );

    // Hazard radius as a 1px hairline outline: geometry, not a fill glow.
    layers.push(
      new PolygonLayer({
        id: 'volcano-hazard-zones',
        data: volcanoes.map((f) => {
          const [lng, lat] = pointOf(f);
          return {
            polygon: generateCirclePolygon(lat, lng, f.properties.hazardRadiusKm || 5),
            __feature: f,
          };
        }),
        getPolygon: (d: any) => d.polygon,
        getLineColor: [...RED, 90] as RGBA,
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1,
        pickable: false,
        filled: false,
        stroked: true,
      })
    );
  }

  // ===========================
  // CYCLONES - white bullseye; vortex and track are animated on top.
  // ===========================
  if (layerVisibility.cyclones && cyclones.length > 0) {
    layers.push(
      ...bullseyeLayers(
        'cyclones',
        cyclones.map((f) => ({
          position: pointOf(f),
          color: WHITE,
          selected: f.id === selectedFeatureId,
          active: (f.properties.windSpeedKmh || 0) >= 118,
          __feature: f,
        }))
      )
    );
  }

  return layers;
}

// ===========================
// ANIMATED PHENOMENA
// Driven from MapCanvas' RAF loop; `time` is seconds since map load. These are
// composed on top of createDisasterLayers() every tick and never trigger React.
// Everything here is a 1px hairline stepping through 4 discrete alphas.
// ===========================
interface AnimatedLayersProps {
  earthquakes: DisasterFeature[];
  hotspots: DisasterFeature[];
  cyclones: DisasterFeature[];
  layerVisibility: LayerVisibility;
  time: number;
  selectedFeatureId?: string | null;
}

// Arc of a circle in degrees, longitude corrected for latitude.
function ringPath(
  lat: number,
  lng: number,
  radiusDeg: number,
  startDeg: number,
  endDeg: number,
  segments: number = 32
): number[][] {
  const lngScale = Math.cos((lat * Math.PI) / 180) || 1;
  const pts: number[][] = [];
  for (let i = 0; i <= segments; i++) {
    const a = ((startDeg + ((endDeg - startDeg) * i) / segments) * Math.PI) / 180;
    pts.push([lng + (radiusDeg * Math.sin(a)) / lngScale, lat + radiusDeg * Math.cos(a)]);
  }
  return pts;
}

// Split a ring into `count` arcs with gaps; `rotation` spins the dash pattern.
function dashedRing(
  lat: number,
  lng: number,
  radiusDeg: number,
  count: number,
  duty: number,
  rotation: number
): number[][][] {
  const step = 360 / count;
  const arcs: number[][][] = [];
  for (let k = 0; k < count; k++) {
    const start = (rotation * 180) / Math.PI + k * step;
    arcs.push(ringPath(lat, lng, radiusDeg, start, start + step * duty, 8));
  }
  return arcs;
}

export function createAnimatedLayers({
  earthquakes,
  hotspots,
  cyclones,
  layerVisibility,
  time,
  selectedFeatureId = null,
}: AnimatedLayersProps): Array<any> {
  const layers: Array<any> = [];

  // (a) Seismic shockwave: 3 expanding hairlines per mag>=6 quake.
  if (layerVisibility.earthquakes && earthquakes.length > 0) {
    const major = earthquakes.filter((f) => (f.properties.magnitude || 0) >= 6.0);
    if (major.length > 0) {
      const data = major.flatMap((f) => {
        const [lng, lat] = pointOf(f);
        const mag = f.properties.magnitude || 6;
        return [0, 1, 2].map((i) => {
          const phase = (time * 0.22 + i / 3) % 1;
          return {
            path: ringPath(lat, lng, mag * 0.3 * (0.3 + phase * 1.5), 0, 360, 40),
            color: [...RED, STEPS[Math.min(3, Math.floor(phase * 4))]] as RGBA,
          };
        });
      });
      layers.push(
        new PathLayer({
          id: 'earthquake-shockwaves',
          data,
          getPath: (d: any) => d.path,
          getColor: (d: any) => d.color,
          getWidth: 1,
          widthUnits: 'pixels',
          widthMinPixels: 1,
          widthMaxPixels: 1,
          capRounded: false,
          jointRounded: false,
          pickable: false,
        })
      );
    }
  }

  // (b) Cyclogenesis vortex + stepping forecast track.
  if (layerVisibility.cyclones && cyclones.length > 0) {
    const vortex = cyclones.flatMap((f, ci) => {
      const [lng, lat] = pointOf(f);
      const spin = time * 0.5 + ci;
      return [0, 1].flatMap((r) =>
        dashedRing(lat, lng, 0.55 + r * 0.45, 8, 0.55, spin * (r === 0 ? 1 : -1)).map(
          (path, k) => ({
            path,
            color: [...WHITE, STEPS[(k + Math.floor(time * 4)) % 4]] as RGBA,
          })
        )
      );
    });
    if (vortex.length > 0) {
      layers.push(
        new PathLayer({
          id: 'cyclone-vortex',
          data: vortex,
          getPath: (d: any) => d.path,
          getColor: (d: any) => d.color,
          getWidth: 1,
          widthUnits: 'pixels',
          widthMinPixels: 1,
          widthMaxPixels: 1,
          capRounded: false,
          pickable: false,
        })
      );
    }

    const trackAlpha = STEPS[Math.floor(time * 4) % 4];
    const track = cyclones.flatMap((f) => {
      const pts = ((f.properties as any).forecastTrack || []) as Array<{ lat: number; lng: number }>;
      if (pts.length === 0) return [];
      const [lng, lat] = pointOf(f);
      const all = [{ lat, lng }, ...pts];
      const segs: any[] = [];
      // Alternate kept/dropped segments to emulate dashes without PathStyleExtension.
      for (let i = 0; i < all.length - 1; i++) {
        if (i % 2 === 1) continue;
        segs.push({
          path: [
            [all[i].lng, all[i].lat],
            [all[i + 1].lng, all[i + 1].lat],
          ],
          color: [...WHITE, trackAlpha] as RGBA,
        });
      }
      return segs;
    });
    if (track.length > 0) {
      layers.push(
        new PathLayer({
          id: 'cyclone-tracks',
          data: track,
          getPath: (d: any) => d.path,
          getColor: (d: any) => d.color,
          getWidth: 1,
          widthUnits: 'pixels',
          widthMinPixels: 1,
          widthMaxPixels: 1,
          pickable: false,
        })
      );
    }

    // (d) Hydrological pulse at low-pressure convergence zones.
    const lows = cyclones.filter((f) => (f.properties.pressureHpa ?? 1010) < 1005);
    if (lows.length > 0) {
      const rings = lows.flatMap((f) => {
        const [lng, lat] = pointOf(f);
        return [0, 0.5].map((offset) => {
          const phase = (time * 0.35 + offset) % 1;
          return {
            path: ringPath(lat, lng, 0.35 + phase * 0.9, 0, 360, 32),
            color: [...SKY, STEPS[Math.min(3, Math.floor(phase * 4))]] as RGBA,
          };
        });
      });
      layers.push(
        new PathLayer({
          id: 'hydrological-pulse',
          data: rings,
          getPath: (d: any) => d.path,
          getColor: (d: any) => d.color,
          getWidth: 1,
          widthUnits: 'pixels',
          widthMinPixels: 1,
          widthMaxPixels: 1,
          pickable: false,
        })
      );
    }
  }

  // (c) Thermal: 2-state square blink, no radius breathe. Squares are fixed
  // degrees so the marker stays a hard-edged pixel block, not a soft dot.
  if (layerVisibility.hotspots && hotspots.length > 0) {
    const HALF_DEG = 0.09;
    const square = (lng: number, lat: number) => {
      const lngHalf = HALF_DEG / (Math.cos((lat * Math.PI) / 180) || 1);
      return [
        [lng - lngHalf, lat - HALF_DEG],
        [lng + lngHalf, lat - HALF_DEG],
        [lng + lngHalf, lat + HALF_DEG],
        [lng - lngHalf, lat + HALF_DEG],
        [lng - lngHalf, lat - HALF_DEG],
      ];
    };

    const data = hotspots.map((f, idx) => {
      const brightness = f.properties.brightness || 300;
      const [lng, lat] = pointOf(f);
      const on = Math.floor(time * 2 + idx * 0.5) % 2 === 0;
      return {
        polygon: square(lng, lat),
        position: [lng, lat] as [number, number],
        color: (f.id === selectedFeatureId ? [...WHITE, 255] : [...AMBER, on ? 255 : 90]) as RGBA,
        active: brightness > 330,
        selected: f.id === selectedFeatureId,
        __feature: f,
      };
    });

    layers.push(
      new PolygonLayer({
        id: 'hotspots',
        data,
        getPolygon: (d: any) => d.polygon,
        getFillColor: (d: any) => d.color,
        pickable: true,
        filled: true,
        stroked: false,
      })
    );
    layers.push(
      new ScatterplotLayer({
        id: 'hotspot-rings',
        data,
        getPosition: (d: any) => d.position,
        getRadius: 11,
        radiusUnits: 'pixels',
        radiusMinPixels: 11,
        radiusMaxPixels: 11,
        getLineColor: (d: any) =>
          (d.selected ? [...WHITE, 255] : [...AMBER, 200]) as RGBA,
        getLineWidth: (d: any) => (d.selected ? 2 : 1.5),
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1.5,
        lineWidthMaxPixels: 2,
        stroked: true,
        filled: false,
        pickable: false,
      })
    );
    layers.push(
      new ScatterplotLayer({
        id: 'hotspot-ticks',
        data: data.filter((d) => d.active),
        getPosition: (d: any) => d.position,
        getRadius: 18,
        radiusUnits: 'pixels',
        radiusMinPixels: 18,
        radiusMaxPixels: 18,
        getLineColor: [...AMBER, 140] as RGBA,
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 1,
        stroked: true,
        filled: false,
        pickable: false,
      })
    );
  }

  return layers;
}

// ===========================
// LOCK-ON RETICLE - corner brackets around a locked coordinate.
// `frozen` (prefers-reduced-motion) pins opacity instead of breathing.
// ===========================
export function createLockOnLayer({
  target,
  time = 0,
  frozen = false,
  zoom = 4.5,
}: {
  target: { lat: number; lng: number; label?: string } | null;
  time?: number;
  frozen?: boolean;
  zoom?: number;
}): Array<any> {
  if (!target) return [];
  // Fixed 56px half-extent regardless of zoom; 512px world tiles at zoom z.
  const degPerPx = 360 / (512 * Math.pow(2, zoom));
  const size = 56 * degPerPx;
  const arm = 0.45;
  const alpha = frozen ? 255 : Math.round(150 + 105 * Math.sin(time * 2.2));
  const lngScale = Math.cos((target.lat * Math.PI) / 180) || 1;
  const data = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as Array<[number, number]>).map(([sx, sy]) => {
    const cx = target.lng + (sx * size) / lngScale;
    const cy = target.lat + sy * size;
    return {
      path: [
        [cx - (sx * size * arm) / lngScale, cy],
        [cx, cy],
        [cx, cy - sy * size * arm],
      ],
      color: [...WHITE, alpha] as RGBA,
    };
  });
  return [
    new PathLayer({
      id: 'lock-on-reticle',
      data,
      getPath: (d: any) => d.path,
      getColor: (d: any) => d.color,
      getWidth: 1.5,
      widthUnits: 'pixels',
      widthMinPixels: 1.5,
      widthMaxPixels: 1.5,
      capRounded: false,
      jointRounded: false,
      pickable: false,
    }),
  ];
}

// Export helper functions for testing/reuse
export {
  getEarthquakeColor,
  getVolcanoAlertColor,
  getVolcanoAlertColorHex,
  hexToRgba,
  hexToRgb,
  generateCirclePolygon,
};
