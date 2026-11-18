import { WindGridData } from '@/lib/normalizers';

/**
 * Simpler CPU-based wind particle animation using ScatterplotLayer with transitions.
 * This is more performant and easier to maintain than custom WebGL shaders.
 */
export interface WindParticleLayerProps {
  data: WindGridData | null;
  maxParticles?: number;
  currentTime?: number;
  particleSize?: number;
  speedFactor?: number;
  colorRamp?: Array<[number, number, number]>;
}

export interface WindParticle {
  position: [number, number];
  velocity: [number, number];
  speed: number;
  age: number;
  color: [number, number, number, number];
}

/**
 * Generate wind particle data from wind grid for CPU-based rendering
 */
export function createWindParticleData(
  windGrid: WindGridData | null,
  maxParticles: number = 1500,
  currentTime: number = Date.now(),
  particleSize: number = 4,
  speedFactor: number = 1
): WindParticle[] {
  if (!windGrid || !windGrid.uComponent || !windGrid.vComponent) {
    return [];
  }

  const particles: WindParticle[] = [];
  const { uComponent, vComponent, lats, lngs } = windGrid;
  const latCount = lats.length;
  const lngCount = lngs.length;

  // Color ramp from blue (slow) to red (fast)
  const colorRamp: Array<[number, number, number]> = [
    [0, 100, 255],   // Blue - calm
    [0, 200, 255],   // Light blue
    [0, 255, 150],   // Cyan
    [100, 255, 0],   // Green
    [255, 200, 0],   // Yellow
    [255, 100, 0],   // Orange
    [255, 0, 0],     // Red - fast
  ];

  // Sample particles from the wind grid
  const stepLat = Math.max(1, Math.floor(latCount / Math.sqrt(maxParticles)));
  const stepLng = Math.max(1, Math.floor(lngCount / Math.sqrt(maxParticles)));

  for (let i = 0; i < latCount; i += stepLat) {
    for (let j = 0; j < lngCount; j += stepLng) {
      if (particles.length >= maxParticles) break;

      const u = uComponent[i]?.[j];
      const v = vComponent[i]?.[j];

      if (u === undefined || v === undefined || isNaN(u) || isNaN(v)) continue;

      const speed = Math.sqrt(u * u + v * v);
      if (speed < 1) continue; // Skip very calm areas

      const lat = lats[i];
      const lng = lngs[j];

      // Normalize speed to 0-1 for color mapping (max ~30 m/s)
      const normalizedSpeed = Math.min(speed / 30, 1);
      const colorIdx = Math.floor(normalizedSpeed * (colorRamp.length - 1));
      const [r, g, b] = colorRamp[colorIdx];

      // Add some randomness to age for staggered animation
      const age = Math.random();

      particles.push({
        position: [lng, lat],
        velocity: [u * speedFactor, v * speedFactor],
        speed,
        age,
        color: [r, g, b, 180],
      });
    }
    if (particles.length >= maxParticles) break;
  }

  return particles;
}

/**
 * Update particle positions based on time (for animation)
 * This can be called in a loop to animate particles
 */
export function updateWindParticles(
  particles: WindParticle[],
  deltaTime: number,
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): WindParticle[] {
  return particles.map((p) => {
    // Move particle based on velocity (simplified - real implementation would use wind field interpolation)
    const newLng = p.position[0] + p.velocity[0] * deltaTime * 0.0001;
    const newLat = p.position[1] + p.velocity[1] * deltaTime * 0.0001;

    // Wrap around or reset if out of bounds
    let finalLng = newLng;
    let finalLat = newLat;
    let finalAge = p.age + deltaTime * 0.001;

    if (bounds) {
      if (finalLng > bounds.maxLng || finalLng < bounds.minLng ||
          finalLat > bounds.maxLat || finalLat < bounds.minLat) {
        // Reset to random position within bounds
        finalLng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
        finalLat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
        finalAge = 0;
      }
    }

    if (finalAge > 1) {
      finalAge = 0;
      if (bounds) {
        finalLng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
        finalLat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
      }
    }

    return {
      ...p,
      position: [finalLng, finalLat],
      age: finalAge,
      // Fade out based on age
      color: [p.color[0], p.color[1], p.color[2], Math.round(180 * (1 - finalAge))],
    };
  });
}

/**
 * Interpolate color from color ramp based on speed (0-1)
 */
export function interpolateWindColor(speed: number, maxSpeed: number = 30): [number, number, number, number] {
  const normalized = Math.min(speed / maxSpeed, 1);
  const colorRamp: Array<[number, number, number]> = [
    [0, 100, 255],
    [0, 200, 255],
    [0, 255, 150],
    [100, 255, 0],
    [255, 200, 0],
    [255, 100, 0],
    [255, 0, 0],
  ];
  const idx = normalized * (colorRamp.length - 1);
  const i = Math.floor(idx);
  const t = idx - i;
  if (i >= colorRamp.length - 1) {
    return [...colorRamp[colorRamp.length - 1], 180];
  }
  const [r1, g1, b1] = colorRamp[i];
  const [r2, g2, b2] = colorRamp[i + 1];
  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
    180,
  ];
}