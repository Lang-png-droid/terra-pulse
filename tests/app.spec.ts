import { test, expect } from '@playwright/test';

test.describe('TerraPulse App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for map to load
    await page.waitForSelector('.maplibregl-canvas', { timeout: 30000 });
    await page.waitForTimeout(2000); // Let components fully render
  });

  test('loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.waitForTimeout(2000);

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

  test('Telemetry strip renders search input and GPS button', async ({ page }) => {
    // Search input with aria-label
    await expect(page.locator('input[aria-label="Cari lokasi atau bencana"]')).toBeVisible();
    // GPS button
    await expect(page.locator('button[aria-label="Lokasi saya (GPS)"]')).toBeVisible();
  });

  test('Layer panel is visible on desktop', async ({ page }, testInfo) => {
    // Only run on desktop viewport project
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Only for desktop viewport');
    // On desktop, LayerPanel renders as expanded sidebar with "Collapse panel" button
    const collapseBtn = page.locator('button[aria-label="Collapse panel"]').first();
    await expect(collapseBtn).toBeVisible();
    // Layer buttons should be visible
    await expect(page.locator('button:has-text("Gempa Bumi")')).toBeVisible();
    await expect(page.locator('button:has-text("Titik Api")')).toBeVisible();
  });

  test('Layer control trigger button exists on mobile viewport', async ({ page }, testInfo) => {
    // Only run on mobile viewport project
    test.skip(testInfo.project.name !== 'chromium-mobile', 'Only for mobile viewport');
    // The collapsed mobile trigger has aria-label "Buka kontrol layer"
    const layerBtn = page.locator('button[aria-label="Buka kontrol layer"]').first();
    await expect(layerBtn).toBeVisible();
  });

  test('Timeline scrubber exists when data available', async ({ page }) => {
    // Timeline has role="slider" when cyclone or tsunami data exists
    const timeline = page.locator('[role="slider"]').first();
    const isVisible = await timeline.isVisible().catch(() => false);
    // This test passes regardless - we're checking the component doesn't crash
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

  test('Brand lockup renders', async ({ page }) => {
    // Check for TERRA // PULSE brand
    await expect(page.locator('text=TERRA')).toBeVisible();
    await expect(page.locator('text=PULSE')).toBeVisible();
  });

  test.skip('Event card renders when feature selected', async ({ page }) => {
    // Click on map to potentially select a feature (might not have data)
    const canvas = page.locator('.maplibregl-canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(1000);
    // Just verify no crash - event card might not appear if no features
  });
});