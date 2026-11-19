import { describe, expect, test } from 'vitest';
import { normalizeRainViewer } from './normalizers';

const payload = {
  host: 'https://tilecache.rainviewer.com',
  radar: {
    past: [
      { time: 1000, path: '/v2/radar/old' },
      { time: 2000, path: '/v2/radar/newest-past' },
    ],
    nowcast: [{ time: 3000, path: '/v2/radar/nowcast' }],
  },
};

describe('normalizeRainViewer', () => {
  test('builds the full tile URL RainViewer requires', () => {
    const [first] = normalizeRainViewer(payload);
    // RainViewer 404s without the trailing /{color}/{smooth}_{snow} segments.
    expect(first.path).toBe(
      'https://tilecache.rainviewer.com/v2/radar/nowcast/256/{z}/{x}/{y}/2/1_1.png',
    );
  });

  test('puts the newest frame first so [0] is live', () => {
    const tiles = normalizeRainViewer(payload);
    expect(tiles.map((t) => t.timestamp)).toEqual([3000000, 2000000, 1000000]);
  });

  test('returns empty list when radar is absent', () => {
    expect(normalizeRainViewer({})).toEqual([]);
  });
});
