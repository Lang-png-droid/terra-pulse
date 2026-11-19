'use client';

import { ScatterplotLayer, PolygonLayer, PathLayer } from '@deck.gl/layers';
import { DisasterFeature, LayerVisibility } from '@/types/disaster';

function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
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

function getVolcanoAlertColor(alertLevel: string): [number, number, number, number] {
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

function getEarthquakeColor(depth: number): [number, number, number, number] {
  // Shallow (< 70km): cyan #22D3EE, Deep (>= 70km): violet #A855F7
  if (depth < 70) return [34, 211, 238, 230]; // Cyan for shallow
  return [168, 85, 247, 230]; // Violet for deep
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
  // EARTHQUAKES - ScatterplotLayer with cyan/violet glow + crosshair reticle
  // ===========================
  if (layerVisibility.earthquakes && earthquakes.length > 0) {
    const eqData = earthquakes.map((f) => {
      const mag = f.properties.magnitude || 1;
      const depth = f.properties.depth || 10;
      // Scale: magnitude * 6 for radius in pixels (min 6, max 40)
      const baseRadius = Math.max(6, Math.min(40, mag * 6));
      const isShallow = depth < 70;
      const fillColor = isShallow ? [34, 211, 238, 200] : [168, 85, 247, 200]; // Cyan shallow, Violet deep
      const strokeColor = isShallow ? [34, 211, 238, 255] : [168, 85, 247, 255];
      return {
        ...f,
        radius: baseRadius,
        fillColor: f.id === selectedFeatureId ? [255, 255, 0, 255] : fillColor,
        strokeColor: f.id === selectedFeatureId ? [255, 255, 0, 255] : strokeColor,
        magnitude: mag,
        depth,
        isShallow,
        __feature: f,
      };
    });

    // 1. Outer glow ring (larger, more transparent) - renders first (bottom)
    layers.push(
      new ScatterplotLayer({
        id: 'earthquakes-glow-outer',
        data: eqData,
        getPosition: (d: any) => d.geometry.coordinates,
        getRadius: (d: any) => d.radius * 2.5,
        getFillColor: (d: any) => [d.strokeColor[0], d.strokeColor[1], d.strokeColor[2], 40] as [number, number, number, number],
        pickable: false,
        radiusMinPixels: 12,
        radiusMaxPixels: 120,
        stroked: false,
        filled: true,
      })
    );

    // 2. Inner glow ring (medium, semi-transparent)
    layers.push(
      new ScatterplotLayer({
        id: 'earthquakes-glow-inner',
        getPosition: (d: any) => d.geometry.coordinates,
        getRadius: (d: any) => d.radius * 1.6,
        getFillColor: (d: any) => [d.strokeColor[0], d.strokeColor[1], d.strokeColor[2], 80] as [number, number, number, number],
        pickable: false,
        radiusMinPixels: 8,
        radiusMaxPixels: 80,
        stroked: false,
        filled: true,
      })
    );

    // 3. Main earthquake marker (solid circle with stroke)
    layers.push(
      new ScatterplotLayer({
        id: 'earthquakes',
        data: eqData,
        getPosition: (d: any) => d.geometry.coordinates,
        getRadius: (d: any) => d.radius,
        getFillColor: (d: any) => d.fillColor,
        getLineColor: (d: any) => d.strokeColor,
        getLineWidth: 2,
        pickable: true,
        radiusMinPixels: 6,
        radiusMaxPixels: 60,
        stroked: true,
        filled: true,
      })
    );

    // 4. Crosshair reticle (+) at epicenter - rendered as PathLayer for crisp '+' shape
    layers.push(
      new PathLayer({
        id: 'earthquake-crosshairs',
        data: eqData.flatMap((d) => {
          // Narrow geometry to Point since earthquakes are always Point type
          const pointGeom = d.geometry as GeoJSON.Point;
          const [lng, lat] = pointGeom.coordinates as [number, number];
          const size = Math.max(8, Math.min(24, d.radius * 0.7)); // Crosshair arm length in pixels
          const degSize = size / 111000; // ~111km per degree at equator
          return [
            {
              ...d,
              path: [
                [lng - degSize, lat],
                [lng + degSize, lat],
              ],
              color: d.strokeColor,
              __feature: d,
            },
            {
              ...d,
              path: [
                [lng, lat - degSize],
                [lng, lat + degSize],
              ],
              color: d.strokeColor,
              __feature: d,
            },
          ];
        }),
        getPath: (d: any) => d.path,
        getColor: (d: any) => d.color,
        getWidth: 2,
        widthMinPixels: 1.5,
        widthMaxPixels: 3,
        capRounded: true,
        jointRounded: true,
        pickable: false,
      })
    );

  }

  // ===========================
  // VOLCANOES - ScatterplotLayer with alert level colors + hazard radius polygons
  // ===========================
  if (layerVisibility.volcanoes && volcanoes.length > 0) {
    // Main volcano markers
    layers.push(
      new ScatterplotLayer({
        id: 'volcanoes',
        data: volcanoes.map((f) => {
          const alertLevel = f.properties.alertLevel || 'Normal';
          const alertColor = getVolcanoAlertColor(alertLevel);
          // Radius based on hazard radius in km, converted to meters for getRadius
          const hazardRadiusKm = f.properties.hazardRadiusKm || 5;
          return {
            ...f,
            radius: (hazardRadiusKm * 1000) / 12, // Scale for visual representation
            color: f.id === selectedFeatureId ? [255, 255, 0, 255] : alertColor,
            alertLevel,
            __feature: f,
          };
        }),
        getPosition: (d: any) => d.geometry.coordinates as [number, number],
        getRadius: (d: any) => d.radius,
        getFillColor: (d: any) => d.color,
        pickable: true,
        radiusMinPixels: 10,
        radiusMaxPixels: 60,
        stroked: true,
        getLineColor: [255, 255, 255, 180],
        getLineWidth: 2,
      })
    );

    // Hazard radius polygons (semi-transparent filled circles)
    layers.push(
      new PolygonLayer({
        id: 'volcano-hazard-zones',
        data: volcanoes.map((f) => {
          const coords = f.geometry.coordinates;
          const alertLevel = f.properties.alertLevel || 'Normal';
          const [lng, lat] = (Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number')
            ? coords as [number, number]
            : [0, 0];
          return {
            ...f,
            polygon: generateCirclePolygon(lat, lng, f.properties.hazardRadiusKm || 5),
            color: [...hexToRgb(getVolcanoAlertColorHex(alertLevel)), 30],
            __feature: f,
          };
        }),
        getPolygon: (d: any) => d.polygon,
        getFillColor: (d: any) => d.color,
        pickable: false,
        filled: true,
        stroked: false,
      })
    );
  }

  // ===========================
  // CYCLONES - quiet center disc + glowing edge ring (vortex/track are animated)
  // ===========================
  if (layerVisibility.cyclones && cyclones.length > 0) {
    const cycloneData = cyclones.map((f) => ({
      ...f,
      radius: Math.max(15000, (f.properties.windSpeedKmh || 50) * 500),
      selected: f.id === selectedFeatureId,
      __feature: f,
    }));

    // Center disc: low alpha so the animated vortex stays readable on top.
    layers.push(
      new ScatterplotLayer({
        id: 'cyclones',
        data: cycloneData,
        getPosition: (d: any) => d.geometry.coordinates as [number, number],
        getRadius: (d: any) => d.radius,
        getFillColor: (d: any) =>
          (d.selected ? [255, 255, 0, 120] : [168, 85, 247, 35]) as [number, number, number, number],
        pickable: true,
        radiusMinPixels: 10,
        radiusMaxPixels: 34,
        stroked: false,
        filled: true,
      })
    );

    // Soft halo + crisp ring at the marker edge.
    layers.push(
      new ScatterplotLayer({
        id: 'cyclone-rings-glow',
        data: cycloneData,
        getPosition: (d: any) => d.geometry.coordinates as [number, number],
        getRadius: (d: any) => d.radius,
        getLineColor: (d: any) =>
          (d.selected ? [255, 255, 0, 70] : [168, 85, 247, 60]) as [number, number, number, number],
        getLineWidth: 7,
        pickable: false,
        radiusMinPixels: 10,
        radiusMaxPixels: 34,
        stroked: true,
        filled: false,
      })
    );
    layers.push(
      new ScatterplotLayer({
        id: 'cyclone-rings',
        data: cycloneData,
        getPosition: (d: any) => d.geometry.coordinates as [number, number],
        getRadius: (d: any) => d.radius,
        getLineColor: (d: any) =>
          (d.selected ? [255, 255, 0, 240] : [168, 85, 247, 230]) as [number, number, number, number],
        getLineWidth: 2,
        pickable: false,
        radiusMinPixels: 10,
        radiusMaxPixels: 34,
        stroked: true,
        filled: false,
      })
    );
  }

  return layers;
}

// ===========================
// ANIMATED PHENOMENA
// Driven from MapCanvas' RAF loop; `time` is seconds since map load. These are
// composed on top of createDisasterLayers() every tick and never trigger React.
// ===========================
const CYAN: [number, number, number] = [34, 211, 238];
const VIOLET: [number, number, number] = [168, 85, 247];

interface AnimatedLayersProps {
  earthquakes: DisasterFeature[];
  hotspots: DisasterFeature[];
  cyclones: DisasterFeature[];
  layerVisibility: LayerVisibility;
  time: number;
  selectedFeatureId?: string | null;
}

function pointOf(f: DisasterFeature): [number, number] {
  const c = f.geometry.coordinates;
  return Array.isArray(c) && typeof c[0] === 'number' ? (c as [number, number]) : [0, 0];
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

  // (a) Seismic shockwave: 3 expanding rings per mag>=6 quake.
  if (layerVisibility.earthquakes && earthquakes.length > 0) {
    const major = earthquakes.filter((f) => (f.properties.magnitude || 0) >= 6.0);
    if (major.length > 0) {
      const data = major.flatMap((f) => {
        const [lng, lat] = pointOf(f);
        const mag = f.properties.magnitude || 6;
        const rgb = (f.properties.depth || 10) < 70 ? CYAN : VIOLET;
        return [0, 1, 2].map((i) => {
          const phase = (time * 0.22 + i / 3) % 1;
          return {
            path: ringPath(lat, lng, mag * 0.3 * (0.3 + phase * 1.5), 0, 360, 40),
            color: [...rgb, Math.round((1 - phase) * 190)] as [number, number, number, number],
            width: 2.5 - phase * 1.2,
          };
        });
      });
      layers.push(
        new PathLayer({
          id: 'earthquake-shockwaves',
          data,
          getPath: (d: any) => d.path,
          getColor: (d: any) => d.color,
          getWidth: (d: any) => d.width,
          widthUnits: 'pixels',
          widthMinPixels: 1,
          widthMaxPixels: 3,
          capRounded: true,
          jointRounded: true,
          pickable: false,
        })
      );
    }
  }

  // (b) Cyclogenesis vortex + pulsing dashed forecast track.
  if (layerVisibility.cyclones && cyclones.length > 0) {
    const vortex = cyclones.flatMap((f, ci) => {
      const [lng, lat] = pointOf(f);
      const spin = time * 0.5 + ci;
      return [0, 1].flatMap((r) => {
        const rgb = r === 0 ? VIOLET : CYAN;
        return dashedRing(lat, lng, 0.55 + r * 0.45, 8, 0.55, spin * (r === 0 ? 1 : -1)).map(
          (path) => ({
            path,
            color: [...rgb, r === 0 ? 210 : 170] as [number, number, number, number],
            width: 2,
          })
        );
      });
    });
    if (vortex.length > 0) {
      layers.push(
        new PathLayer({
          id: 'cyclone-vortex',
          data: vortex,
          getPath: (d: any) => d.path,
          getColor: (d: any) => d.color,
          getWidth: (d: any) => d.width,
          widthUnits: 'pixels',
          capRounded: true,
          pickable: false,
        })
      );
    }

    const pulse = 0.45 + 0.4 * Math.sin(time * 3);
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
          color: [...VIOLET, Math.round(pulse * 255)] as [number, number, number, number],
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
          getWidth: 2,
          widthUnits: 'pixels',
          capRounded: true,
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
            color: [...CYAN, Math.round((1 - phase) * 150)] as [number, number, number, number],
          };
        });
      });
      layers.push(
        new PathLayer({
          id: 'hydrological-pulse',
          data: rings,
          getPath: (d: any) => d.path,
          getColor: (d: any) => d.color,
          getWidth: 1.5,
          widthUnits: 'pixels',
          pickable: false,
        })
      );
    }
  }

  // (c) Thermal flicker: radius +/-15% and opacity modulated per feature.
  if (layerVisibility.hotspots && hotspots.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: 'hotspots',
        data: hotspots.map((f, idx) => {
          const brightness = f.properties.brightness || 300;
          const base = Math.max(4, Math.min(24, (brightness - 250) / 8));
          const wobble = Math.sin(time * 2 + idx * 1.7);
          const baseColor = brightness > 330 ? [255, 68, 68] : brightness > 310 ? [255, 136, 0] : [255, 170, 0];
          const color =
            f.id === selectedFeatureId
              ? [255, 255, 0, 255]
              : [...baseColor, Math.round(190 + wobble * 30)];
          return {
            ...f,
            radius: base * (1 + wobble * 0.15),
            color,
            __feature: f,
          };
        }),
        getPosition: (d: any) => d.geometry.coordinates,
        getRadius: (d: any) => d.radius,
        getFillColor: (d: any) => d.color,
        pickable: true,
        radiusMinPixels: 4,
        radiusMaxPixels: 30,
        stroked: true,
        getLineColor: [255, 255, 255, 120],
        getLineWidth: 1,
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
      color: [...CYAN, alpha] as [number, number, number, number],
    };
  });
  return [
    new PathLayer({
      id: 'lock-on-reticle',
      data,
      getPath: (d: any) => d.path,
      getColor: (d: any) => d.color,
      getWidth: 2,
      widthUnits: 'pixels',
      capRounded: true,
      jointRounded: true,
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