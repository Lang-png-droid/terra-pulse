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
 * Cyan to Violet color ramp for wind particles
 * Low speed = Cyan (#22D3EE), High speed = Violet (#A855F7)
 */
const WIND_COLOR_RAMP: Array<[number, number, number]> = [
  [34, 211, 238],   // #22D3EE - Electric Cyan (calm)
  [56, 189, 248],   // #38BDF8 - Light Cyan
  [96, 165, 250],   // #60A5FA - Blue
  [139, 92, 246],   // #8B5CF6 - Indigo/Violet transition
  [168, 85, 247],   // #A855F7 - Luminous Violet (strong wind)
  [192, 38, 211],   // #C026D3 - Deep Violet (storm)
];

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
  if (!windGrid || !windGrid.uComponent || !windGrid.vComponent) return [];

  const { uComponent: u, vComponent: v, lats: lat, lngs: lon, time } = windGrid;
  const nLat = lat.length;
  const nLon = lon.length;

  if (nLat === 0 || nLon === 0) return [];

  const particles: WindParticle[] = [];
  const timeOffset = (currentTime - time) * speedFactor * 0.001; // seconds

  // Calculate grid spacing
  const latStep = (lat[nLat - 1] - lat[0]) / (nLat - 1);
  const lonStep = (lon[nLon - 1] - lon[0]) / (nLon - 1);

  // Seed random for reproducible distribution
  let seed = Math.floor(currentTime / 30000) * 1000; // Changes every 30s
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // Generate particles at grid points with some jitter
  const density = Math.min(maxParticles / (nLat * nLon), 1);

  for (let i = 0; i < nLat; i++) {
    for (let j = 0; j < nLon; j++) {
      if (random() > density) continue;

      const uVal = u[i]?.[j];
      const vVal = v[i]?.[j];

      if (uVal === undefined || vVal === undefined || uVal === null || vVal === null) continue;

      // Wind speed in m/s
      const speed = Math.sqrt(uVal * uVal + vVal * vVal);
      if (speed < 0.5) continue; // Skip very calm areas

      // Add jitter to position for organic feel
      const jitterLat = (random() - 0.5) * latStep * 0.8;
      const jitterLon = (random() - 0.5) * lonStep * 0.8;

      const particleLat = lat[i] + jitterLat;
      const particleLon = lon[j] + jitterLon;

      // Calculate velocity (degrees per second)
      // Approximate: 1 degree lat ≈ 111km, 1 degree lon ≈ 111km * cos(lat)
      const latRad = (particleLat * Math.PI) / 180;
      const degPerSecLat = (vVal / 111000) * 3600; // m/s to deg/hour
      const degPerSecLon = (uVal / (111000 * Math.cos(latRad))) * 3600;

      // Initial age based on position for wave effect
      const age = random() * 2 * Math.PI;

      // Color based on speed: cyan (low) -> violet (high)
      const color = interpolateWindColor(speed, 30); // max 30 m/s ≈ 108 km/h

      particles.push({
        position: [particleLon, particleLat],
        velocity: [degPerSecLon, degPerSecLat],
        speed,
        age,
        color,
      });

      if (particles.length >= maxParticles) break;
    }
    if (particles.length >= maxParticles) break;
  }

  return particles;
}

/**
 * Update particle positions based on time (for animation)
 */
export function updateWindParticles(
  particles: WindParticle[],
  deltaTime: number,
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): WindParticle[] {
  const hourDelta = deltaTime / 3600; // Convert seconds to hours

  return particles.map((p) => {
    let newLng = p.position[0] + p.velocity[0] * hourDelta;
    let newLat = p.position[1] + p.velocity[1] * hourDelta;
    const newAge = p.age + deltaTime * 0.5;

    // Wrap around bounds if provided
    if (bounds) {
      if (newLng > bounds.maxLng) newLng = bounds.minLng;
      if (newLng < bounds.minLng) newLng = bounds.maxLng;
      if (newLat > bounds.maxLat) newLat = bounds.minLat;
      if (newLat < bounds.minLat) newLat = bounds.maxLat;
    }

    // Color shifts slightly with age for shimmer effect
    const shimmer = Math.sin(newAge) * 15;
    const color = [
      Math.min(255, Math.max(0, p.color[0] + shimmer)),
      Math.min(255, Math.max(0, p.color[1] + shimmer)),
      Math.min(255, Math.max(0, p.color[2] + shimmer)),
      p.color[3],
    ] as [number, number, number, number];

    return {
      ...p,
      position: [newLng, newLat] as [number, number],
      age: newAge,
      color,
    };
  });
}

/**
 * Interpolate color from cyan-violet ramp based on wind speed (0-30 m/s)
 * Returns RGBA tuple
 */
export function interpolateWindColor(speed: number, maxSpeed: number = 30): [number, number, number, number] {
  const normalized = Math.min(speed / maxSpeed, 1);
  const idx = normalized * (WIND_COLOR_RAMP.length - 1);
  const i = Math.floor(idx);
  const t = idx - i;

  if (i >= WIND_COLOR_RAMP.length - 1) {
    return [...WIND_COLOR_RAMP[WIND_COLOR_RAMP.length - 1], 200];
  }

  const [r1, g1, b1] = WIND_COLOR_RAMP[i];
  const [r2, g2, b2] = WIND_COLOR_RAMP[i + 1];

  // Alpha varies with speed too - faster = more opaque
  const alpha = Math.round(120 + 100 * normalized);

  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
    alpha,
  ];
}

/**
 * Get color for streamline visualization (static, non-animated)
 * Used when prefers-reduced-motion is enabled
 */
export function getStreamlineColor(speed: number, maxSpeed: number = 30): string {
  const [r, g, b, a] = interpolateWindColor(speed, maxSpeed);
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}