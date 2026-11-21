import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const screenshotsDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.describe('TerraPulse Screenshots', () => {
  test('desktop - 1280x800', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for map canvas
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'desktop-final.png'),
      fullPage: true 
    });
    
    console.log('Desktop console errors:', consoleErrors.length);
    consoleErrors.forEach(e => console.log('  -', e));
    console.log('Desktop page errors:', pageErrors.length);
    pageErrors.forEach(e => console.log('  -', e));
    
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('mobile - 390x844 (iPhone 14)', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for map canvas
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'mobile-final.png'),
      fullPage: true 
    });
    
    console.log('Mobile console errors:', consoleErrors.length);
    consoleErrors.forEach(e => console.log('  -', e));
    console.log('Mobile page errors:', pageErrors.length);
    pageErrors.forEach(e => console.log('  -', e));
    
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});