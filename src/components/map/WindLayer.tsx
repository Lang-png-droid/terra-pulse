'use client';

import { ScatterplotLayer } from '@deck.gl/layers';
import { WindGridData } from '@/lib/normalizers';
import { createWindParticleData, WindParticle, interpolateWindColor } from './WindParticleLayer';

interface WindLayerProps {
  windGrid: WindGridData | null;
  layerVisibility: { windParticles: boolean };
  maxParticles: number;
  prefersReducedMotion: boolean;
  timelineTime: number;
  particleSize?: number;
}

export function createWindLayer({
  windGrid,
  layerVisibility,
  maxParticles,
  prefersReducedMotion,
  timelineTime,
  particleSize = 4,
}: WindLayerProps): Array<any> {
  const layers: Array<any> = [];

  // Wind particle layer - cyan to violet gradient by speed
  if (layerVisibility.windParticles && windGrid && !prefersReducedMotion) {
    const windParticles = createWindParticleData(windGrid, maxParticles, timelineTime);
    if (windParticles.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'wind-particles',
          data: windParticles,
          getPosition: (d: WindParticle) => d.position,
          getRadius: particleSize,
          getFillColor: (d: WindParticle) => d.color,
          pickable: false,
          radiusMinPixels: 2,
          radiusMaxPixels: 6,
          // Particles animate via timelineTime regeneration in parent
        })
      );
    }
  }

  return layers;
}

// Export for potential standalone use
export { createWindParticleData, interpolateWindColor } from './WindParticleLayer';
export type { WindParticle } from './WindParticleLayer';