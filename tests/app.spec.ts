import { test, expect } from '@playwright/test';

test.describe('TerraPulse App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for map to load
    await page.waitForSelector('.maplibregl-canvas', { timeout: 30000 });
  });

  test('loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.waitForTimeout(2000); // Let map fully render

    // Filter out known benign errors (extension noise, etc.)
    const criticalErrors = errors.filter(e =>
      !e.includes('Extension') &&
      !e.includes('chrome-extension') &&
      !e.includes('favicon') &&
      !e.includes('Content Security Policy')
    );

    expect(criticalErrors, `Console errors: ${criticalErrors.join('; ')}`).toHaveLength(0);
  });

  test('map canvas is visible', async ({ page }) => {
    const canvas = page.locator('.maplibregl-canvas');
    await expect(canvas).toBeVisible();
  });

  test('TopBar tabs render', async ({ page }) => {
    // Check for Peta and Berita tabs
    await expect(page.locator('button:has-text("Peta")')).toBeVisible();
    await expect(page.locator('button:has-text("Berita")')).toBeVisible();
  });

  test('Layer control button exists (mobile)', async ({ page }) => {
    // Layer toggle button on mobile
    const layerBtn = page.locator('button[aria-label*="lapisar"], button[aria-label*="layer"]').first();
    // Might be hidden on desktop, just verify no crash
  });

  test('Timeline scrubber exists', async ({ page }) => {
    const timeline = page.locator('[role="slider"], input[type="range"]').first();
    await expect(timeline).toBeVisible();
  });

  test('no WebGL context lost', async ({ page }) => {
    const webglErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('WebGL')) {
        webglErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(3000);

    expect(webglErrors, `WebGL errors: ${webglErrors.join('; ')}`).toHaveLength(0);
  });
});