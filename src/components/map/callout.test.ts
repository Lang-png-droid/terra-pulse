import { describe, expect, it } from 'vitest';
import { clampCallout } from '@/lib/callout';

const base = {
  cursorX: 100, cursorY: 100, width: 205, height: 33,
  viewportW: 1280, viewportH: 800, rectLeft: 0, rectTop: 0,
  topStripBottom: null, bottomStripTop: null,
};

describe('clampCallout', () => {
  it('keeps a measured 205px callout inside a 1280px viewport at the right edge', () => {
    const r = clampCallout({ ...base, cursorX: 1200 });
    expect(r.left).toBeGreaterThanOrEqual(0);
    expect(r.left + 205).toBeLessThanOrEqual(1280);
  });
  it('keeps a content-grown callout inside the bottom edge', () => {
    const r = clampCallout({ ...base, cursorY: 760, height: 48 });
    expect(r.top).toBeGreaterThanOrEqual(0);
    expect(r.top + 48).toBeLessThanOrEqual(800);
  });
  it('clears the top strip', () => {
    const r = clampCallout({ ...base, cursorY: 10, topStripBottom: 44 });
    expect(r.top).toBeGreaterThanOrEqual(48);
  });
  it('clears the bottom strip', () => {
    const r = clampCallout({ ...base, cursorY: 780, bottomStripTop: 703 });
    expect(r.top).toBeLessThanOrEqual(703 - 4 - 33);
  });
});
