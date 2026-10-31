/**
 * AMO Store Listing Screenshot Generation Spec
 *
 * Captures high-resolution 2400x1800 (4:3) promotional screenshots for Mozilla Add-ons (AMO).
 * Maximum of 5 screenshots allowed in an AMO listing.
 *
 * Supported scenes:
 * 1. Dark Mode (foxlaunch-dark-2400x1800.png) - Primary dark swimlane view
 * 2. Light Mode (foxlaunch-light-2400x1800.png) - Clean light swimlane view
 * 3. Search Filter (foxlaunch-search-2400x1800.png) - Container filtering via search
 * 4. Settings (foxlaunch-settings-2400x1800.png) - Theme, card size, container visibility modal
 * 5. Add Shortcut (foxlaunch-add-shortcut-2400x1800.png) - Container-aware shortcut creation modal
 */

import { test, expect, DEFAULT_MOCK_CONTAINERS, DEFAULT_SETTINGS, SAMPLE_SHORTCUTS } from '../fixtures';
import fs from 'node:fs';
import path from 'node:path';

const screenshotsDir = path.resolve(process.cwd(), 'metadata/amo/screenshots');

test.describe('AMO Promotional Screenshots (2400x1800)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(screenshotsDir, { recursive: true });
    // Remove obsolete 1280x800 screenshots
    for (const file of ['foxlaunch-dark-1280x800.png', 'foxlaunch-light-1280x800.png']) {
      const p = path.join(screenshotsDir, file);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  test('scene:dark - Main workspace dashboard in dark theme', async ({ openFoxLaunch, page }) => {
    await page.setViewportSize({ width: 2400, height: 1800 });
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
    });
    await page.waitForSelector('.swimlane');
    await page.waitForTimeout(300);

    const target = path.join(screenshotsDir, 'foxlaunch-dark-2400x1800.png');
    await page.screenshot({ path: target });
    expect(fs.existsSync(target)).toBe(true);
  });

  test('scene:light - Main workspace dashboard in light theme', async ({ openFoxLaunch, page }) => {
    await page.setViewportSize({ width: 2400, height: 1800 });
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, theme: 'light' },
    });
    await page.waitForSelector('.swimlane');
    await page.waitForTimeout(300);

    const target = path.join(screenshotsDir, 'foxlaunch-light-2400x1800.png');
    await page.screenshot({ path: target });
    expect(fs.existsSync(target)).toBe(true);
  });

  test('scene:search - Interactive search filter across containers', async ({ openFoxLaunch, page }) => {
    await page.setViewportSize({ width: 2400, height: 1800 });
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
    });
    await page.waitForSelector('.swimlane');
    const searchInput = page.locator('#search-input');
    await searchInput.fill('work');
    await page.waitForTimeout(300);

    const target = path.join(screenshotsDir, 'foxlaunch-search-2400x1800.png');
    await page.screenshot({ path: target });
    expect(fs.existsSync(target)).toBe(true);
  });

  test('scene:settings - Customization and container visibility options', async ({ openFoxLaunch, page }) => {
    await page.setViewportSize({ width: 2400, height: 1800 });
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
    });
    await page.waitForSelector('#settings-btn');
    await page.locator('#settings-btn').click();
    await page.waitForSelector('.settings-modal');
    await page.waitForTimeout(300);

    const target = path.join(screenshotsDir, 'foxlaunch-settings-2400x1800.png');
    await page.screenshot({ path: target });
    expect(fs.existsSync(target)).toBe(true);
  });

  test('scene:add-shortcut - Container shortcut creation modal', async ({ openFoxLaunch, page }) => {
    await page.setViewportSize({ width: 2400, height: 1800 });
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
    });
    await page.waitForSelector('.btn-add-shortcut');
    await page.locator('.btn-add-shortcut').first().click();
    await page.waitForSelector('.modal-dialog');
    await page.waitForTimeout(300);

    const target = path.join(screenshotsDir, 'foxlaunch-add-shortcut-2400x1800.png');
    await page.screenshot({ path: target });
    expect(fs.existsSync(target)).toBe(true);
  });
});
