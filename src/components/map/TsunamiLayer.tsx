'use client';

import { PolygonLayer } from '@deck.gl/layers';
import { hexToRgba } from './DisasterLayers';

export interface TsunamiPolygon {
  coordinates: number[][][];
  etaMinutes: number;
  color: string;
  opacity: number;
}

interface TsunamiLayerProps {
  tsunamiPolygons: TsunamiPolygon[];
  layerVisibility: { tsunamiRings: boolean };
}

export function createTsunamiLayer({
  tsunamiPolygons,
  layerVisibility,
}: TsunamiLayerProps): Array<any> {
  const layers: Array<any> = [];

  // Tsunami isochrone rings - cyan with expanding animation
  if (layerVisibility.tsunamiRings && tsunamiPolygons.length > 0) {
    layers.push(
      new PolygonLayer({
        id: 'tsunami-rings',
        data: tsunamiPolygons.map((poly, i) => ({
          polygon: poly.coordinates,
          color: hexToRgba(poly.color, poly.opacity),
          ringIndex: i,
          etaMinutes: poly.etaMinutes,
        })),
        getPolygon: (d: any) => d.polygon,
        getFillColor: (d: any) => d.color,
        pickable: false,
        filled: true,
        stroked: true,
        getLineColor: (d: any) => [34, 211, 238, 180], // Cyan stroke
        getLineWidth: 1.5,
        // Animation: rings expand over time based on etaMinutes
        // This can be driven by a time uniform or CSS animation
      })
    );
  }

  return layers;
}