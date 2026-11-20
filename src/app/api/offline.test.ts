/**
 * Regression: restricted network. Every external fetch is blackholed, and each
 * route must still answer HTTP 200 with a valid body inside the wall-clock budget.
 *
 * This is the loop for the reported failure:
 *   ConnectTimeoutError ... UND_ERR_SOCKET ... ⨯ [Error: failed to pipe response]
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { installBlackholeFetch, withinBudget, type Blackhole } from '@/test/offlineFetch';
import { GET as getEarthquakes } from './earthquakes/route';
import { GET as getHotspots } from './hotspots/route';
import { GET as getVolcanoes } from './volcanoes/route';
import { GET as getNews } from './news/route';
import { GET as getWeather } from './weather/route';
import { GET as getGeocode } from './geocode/route';

const TIMEOUT_MS = 3000;
// 3s abort + scheduling slack. The pre-fix code needed 8s–30s per route.
const BUDGET_MS = TIMEOUT_MS + 500;

let blackhole: Blackhole;
let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.NASA_FIRMS_MAP_KEY = 'offline-repro';
  blackhole = installBlackholeFetch();
  errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  blackhole.restore();
  errorLog.mockRestore();
  delete process.env.NASA_FIRMS_MAP_KEY;
});

type BodyCheck = (body: any) => void;

const expectFeatures: BodyCheck = (body) => {
  expect(body.type).toBe('FeatureCollection');
  expect(Array.isArray(body.features)).toBe(true);
  expect(body.meta).toMatchObject({
    source: expect.any(String),
    cached: expect.any(Boolean),
    stale: expect.any(Boolean),
    timestamp: expect.any(String),
  });
};

const cases: { name: string; get: () => Promise<Response>; check: BodyCheck }[] = [
  { name: 'news', get: () => getNews(new Request('http://localhost/api/news')), check: (b) => expect(Array.isArray(b.articles)).toBe(true) },
  { name: 'earthquakes', get: () => getEarthquakes(), check: expectFeatures },
  { name: 'hotspots', get: () => getHotspots(), check: expectFeatures },
  { name: 'volcanoes', get: () => getVolcanoes(), check: expectFeatures },
  {
    name: 'weather',
    get: () => getWeather(),
    check: (b) => {
      expect(b.status).toBe('degraded');
      expect(b.radar).toBeNull();
      expect(b.weather).toBeNull();
      expect(Array.isArray(b.cyclones.features)).toBe(true);
      expect(typeof b.timestamp).toBe('string');
    },
  },
  {
    name: 'geocode',
    get: () => getGeocode(new Request('http://localhost/api/geocode?q=jakarta')),
    check: (b) => expect(b.results).toEqual([]),
  },
];

describe.each(cases)('offline /api/$name', ({ name, get, check }) => {
  test(`HTTP 200 with a valid body inside ${BUDGET_MS}ms`, async () => {
    const { value: res, elapsedMs } = await withinBudget(get(), BUDGET_MS, name);

    expect(res.status).toBe(200);
    check(await res.json());
    expect(elapsedMs).toBeLessThan(BUDGET_MS);
    // Degraded is expected behaviour, not an error: nothing to log.
    expect(errorLog).not.toHaveBeenCalled();
  }, BUDGET_MS + 2000);
});

test('all routes are bounded independently of each other', async () => {
  const startedAt = Date.now();
  const responses = await Promise.all(cases.map(({ get }) => get()));
  expect(responses.every((r) => r.status === 200)).toBe(true);
  // Parallel: one 3s window total, not one per route.
  expect(Date.now() - startedAt).toBeLessThan(BUDGET_MS);
}, BUDGET_MS + 2000);
