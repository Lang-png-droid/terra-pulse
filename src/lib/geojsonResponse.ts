import { NextResponse } from 'next/server';
import type { DisasterFeatureCollection } from '@/types/disaster';

export interface ResponseMeta {
  source: string;
  cached: boolean;
  stale: boolean;
  timestamp: string;
}

export interface GeoJsonResponse extends DisasterFeatureCollection {
  meta: ResponseMeta;
}

/**
 * GeoJSON routes always answer 200 with this shape — degraded or not — so the map
 * never sees a 5xx or a body without `features[]` when a feed is unreachable.
 */
export function geojsonResponse(
  collection: DisasterFeatureCollection,
  source: string,
  maxAgeSeconds: number,
  stale = false,
) {
  const body: GeoJsonResponse = {
    ...collection,
    metadata: { ...collection.metadata, source },
    meta: { source, cached: false, stale, timestamp: new Date().toISOString() },
  };
  return NextResponse.json(body, {
    status: 200,
    headers: {
      'Cache-Control': `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function emptyCollection(source: string): DisasterFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
    metadata: { source, fetchedAt: new Date().toISOString(), count: 0 },
  };
}
