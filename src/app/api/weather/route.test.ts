vi.mock('@/lib/normalizers', () => ({
  normalizeRainViewer: vi.fn(),
  normalizeOpenMeteoWind: vi.fn(),
  normalizeCyclones: vi.fn(() => ({ metadata: { source: 'test' } })),
}));

import { vi, test, beforeEach, afterEach, expect } from 'vitest';
import { GET } from './route';
import {
  normalizeRainViewer,
  normalizeOpenMeteoWind,
  normalizeCyclones,
} from '@/lib/normalizers';
const mockRainViewer = vi.mocked(normalizeRainViewer);
const mockOpenMeteo = vi.mocked(normalizeOpenMeteoWind);
const mockCyclones = vi.mocked(normalizeCyclones);

type FetchMock = typeof fetch & {
  mockReset: () => void;
  mockResolvedValueOnce: (value: unknown) => void;
  mockRejectedValue: (reason: unknown) => void;
};

const mockFetch: FetchMock = vi.fn() as unknown as FetchMock;
let originalFetch: typeof fetch | undefined;

beforeEach(() => {
  mockFetch.mockReset();
  originalFetch = globalThis.fetch;
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  if (originalFetch !== undefined) {
    vi.stubGlobal('fetch', originalFetch);
  }
});

test('mengembalikan HTTP 200 dengan status "degraded" saat fetch RainViewer timeout', async () => {
  const okResponse = { ok: true, json: async () => ({}) } as unknown as Response;
  mockFetch.mockResolvedValueOnce(okResponse);
  mockFetch.mockResolvedValueOnce(okResponse);
  mockRainViewer.mockImplementation(() => {
    throw new Error('ConnectTimeoutError: RainViewer request timed out');
  });
  mockOpenMeteo.mockReturnValue({} as unknown as never);
  mockCyclones.mockReturnValue({ metadata: { source: 'test' } } as unknown as never);

  const res = await GET();
  expect(res.status).toBe(200);

  const body = await res.json();
  expect(body.status).toBe('degraded');
  expect(Array.isArray(body.errors)).toBe(true);
  expect(
    body.errors.some((msg: unknown) => typeof msg === 'string' && /rainviewer/i.test(msg)),
  ).toBe(true);
});

test('tidak melempar unhandled rejection saat kedua fetch gagal', async () => {
  mockFetch.mockRejectedValue(new Error('connect timeout'));
  mockCyclones.mockReturnValue({ metadata: { source: 'test' } } as unknown as never);

  const res = await GET();
  expect(res.status).toBe(200);

  const body = await res.json();
  expect(body.status).toBe('degraded');
  expect(Array.isArray(body.errors)).toBe(true);
  expect(body.errors.length).toBeGreaterThanOrEqual(2);
});
