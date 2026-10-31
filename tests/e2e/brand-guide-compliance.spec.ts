/**
 * Brand Guide Compliance & Design System Verification
 *
 * Automated verification of:
 * 1. Brand identity primitives (--fx-*) and design tokens in :root
 * 2. Dark theme surface and text computed styles (#1C1B22, #2B2A33, #A6A4B6)
 * 3. Light theme surface and text computed styles (#F9F9FB, #F0F0F4, #15141A, #5B5B66)
 * 4. WCAG 2.1 AA contrast ratio compliance (>= 4.5:1 for normal text)
 * 5. Zero external font imports (strict CSP compliance & local system font stacks)
 * 6. Brand logo and favicon presence
 * 7. Generation of high-resolution AMO promotional screenshots (1280x800)
 *
 * Master Specification: docs/brand/foxlaunch-brand-guide.md
 */

import { test, expect, DEFAULT_MOCK_CONTAINERS, DEFAULT_SETTINGS, SAMPLE_SHORTCUTS } from '../fixtures';
import fs from 'node:fs';
import path from 'node:path';

function parseRgb(colorStr: string): [number, number, number] {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`Cannot parse color: ${colorStr}`);
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

test.describe('Brand Guide Compliance & Design System', () => {

  test('1. Root brand primitives (--fx-*) match Brand Guide specification', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: DEFAULT_SETTINGS,
    });

    const tokens = await page.evaluate(() => {
      const style = window.getComputedStyle(document.documentElement);
      return {
        fxOrange: style.getPropertyValue('--fx-orange').trim().toLowerCase(),
        fxMagenta: style.getPropertyValue('--fx-magenta').trim().toLowerCase(),
        fxViolet: style.getPropertyValue('--fx-violet').trim().toLowerCase(),
        fxYellow: style.getPropertyValue('--fx-yellow').trim().toLowerCase(),
        darkBase: style.getPropertyValue('--fx-neutral-dark-0').trim().toLowerCase(),
        darkSurface: style.getPropertyValue('--fx-neutral-dark-1').trim().toLowerCase(),
        darkMuted: style.getPropertyValue('--fx-neutral-dark-muted').trim().toLowerCase(),
        lightBase: style.getPropertyValue('--fx-neutral-light-0').trim().toLowerCase(),
        lightSurface: style.getPropertyValue('--fx-neutral-light-1').trim().toLowerCase(),
        lightInk: style.getPropertyValue('--fx-neutral-light-ink').trim().toLowerCase(),
      };
    });

    expect(tokens.fxOrange).toBe('#ff7139');
    expect(tokens.fxMagenta).toBe('#ff2a85');
    expect(tokens.fxViolet).toBe('#8000ff');
    expect(tokens.fxYellow).toBe('#ffd43b');
    expect(tokens.darkBase).toBe('#1c1b22');
    expect(tokens.darkSurface).toBe('#2b2a33');
    expect(tokens.darkMuted).toBe('#a6a4b6');
    expect(tokens.lightBase).toBe('#f9f9fb');
    expect(tokens.lightSurface).toBe('#f0f0f4');
    expect(tokens.lightInk).toBe('#15141a');
  });

  test('2. Dark Theme: UI elements compute Acorn Obsidian surfaces and compliant text colors', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
    });

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const styles = await page.evaluate(() => {
      const htmlStyle = window.getComputedStyle(document.documentElement);
      const bodyStyle = window.getComputedStyle(document.body);
      const swimlane = document.querySelector('.swimlane');
      const swimlaneStyle = swimlane ? window.getComputedStyle(swimlane) : null;
      const card = document.querySelector('.shortcut-card');
      const cardStyle = card ? window.getComputedStyle(card) : null;

      return {
        htmlBg: htmlStyle.backgroundColor,
        bodyBg: bodyStyle.backgroundColor,
        swimlaneBg: swimlaneStyle ? swimlaneStyle.backgroundColor : '',
        cardBg: cardStyle ? cardStyle.backgroundColor : '',
        textPrimary: htmlStyle.color,
      };
    });

    // Dark base is #1C1B22 -> rgb(28, 27, 34)
    expect(styles.htmlBg).toBe('rgb(28, 27, 34)');
    // Elevated surfaces are #2B2A33 -> rgb(43, 42, 51)
    expect(styles.swimlaneBg).toBe('rgb(43, 42, 51)');
    expect(styles.cardBg).toBe('rgb(43, 42, 51)');
    // Text primary is #FBFBFE -> rgb(251, 251, 254)
    expect(styles.textPrimary).toBe('rgb(251, 251, 254)');
  });

  test('3. Light Theme: UI elements compute clean crisp surfaces and Ink text', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, theme: 'light' },
    });

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const styles = await page.evaluate(() => {
      const htmlStyle = window.getComputedStyle(document.documentElement);
      const card = document.querySelector('.shortcut-card');
      const cardStyle = card ? window.getComputedStyle(card) : null;

      return {
        htmlBg: htmlStyle.backgroundColor,
        cardBg: cardStyle ? cardStyle.backgroundColor : '',
        textPrimary: htmlStyle.color,
      };
    });

    // Light base is #F9F9FB -> rgb(249, 249, 251)
    expect(styles.htmlBg).toBe('rgb(249, 249, 251)');
    // Light elevated surface is #F0F0F4 -> rgb(240, 240, 244)
    expect(styles.cardBg).toBe('rgb(240, 240, 244)');
    // Primary ink text is #15141A -> rgb(21, 20, 26)
    expect(styles.textPrimary).toBe('rgb(21, 20, 26)');
  });

  test('4. WCAG 2.1 AA Contrast Ratio: all text meets or exceeds 4.5:1 ratio', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
    });

    // 1. Measure Dark Mode rendered colors from actual DOM elements
    const darkMeasurements = await page.evaluate(() => {
      const brandTitle = document.querySelector('.brand-title') as HTMLElement;
      const card = document.querySelector('.shortcut-card') as HTMLElement;
      const mutedCount = document.querySelector('.swimlane-count') as HTMLElement;

      const btnPrimary = document.createElement('button');
      btnPrimary.className = 'btn-primary';
      btnPrimary.textContent = 'Save';
      document.body.appendChild(btnPrimary);
      const btnStyle = window.getComputedStyle(btnPrimary);
      const btnBg = btnStyle.backgroundColor;
      const btnColor = btnStyle.color;
      btnPrimary.remove();

      return {
        bodyBg: window.getComputedStyle(document.documentElement).backgroundColor,
        titleColor: window.getComputedStyle(brandTitle).color,
        cardBg: window.getComputedStyle(card).backgroundColor,
        mutedColor: window.getComputedStyle(mutedCount).color,
        btnBg,
        btnColor,
      };
    });

    const darkTitleRatio = getContrastRatio(parseRgb(darkMeasurements.bodyBg), parseRgb(darkMeasurements.titleColor));
    const darkMutedRatio = getContrastRatio(parseRgb(darkMeasurements.cardBg), parseRgb(darkMeasurements.mutedColor));
    const darkBtnRatio = getContrastRatio(parseRgb(darkMeasurements.btnBg), parseRgb(darkMeasurements.btnColor));

    expect(darkTitleRatio).toBeGreaterThanOrEqual(4.5);
    expect(darkMutedRatio).toBeGreaterThanOrEqual(4.5);
    expect(darkBtnRatio).toBeGreaterThanOrEqual(4.5);

    // 2. Switch to Light Mode and measure rendered colors from actual DOM elements
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(200);

    const lightMeasurements = await page.evaluate(() => {
      const brandTitle = document.querySelector('.brand-title') as HTMLElement;
      const card = document.querySelector('.shortcut-card') as HTMLElement;
      const mutedCount = document.querySelector('.swimlane-count') as HTMLElement;

      const btnPrimary = document.createElement('button');
      btnPrimary.className = 'btn-primary';
      btnPrimary.textContent = 'Save';
      document.body.appendChild(btnPrimary);
      const btnStyle = window.getComputedStyle(btnPrimary);
      const btnBg = btnStyle.backgroundColor;
      const btnColor = btnStyle.color;
      btnPrimary.remove();

      return {
        bodyBg: window.getComputedStyle(document.documentElement).backgroundColor,
        titleColor: window.getComputedStyle(brandTitle).color,
        cardBg: window.getComputedStyle(card).backgroundColor,
        mutedColor: window.getComputedStyle(mutedCount).color,
        btnBg,
        btnColor,
      };
    });

    const lightTitleRatio = getContrastRatio(parseRgb(lightMeasurements.bodyBg), parseRgb(lightMeasurements.titleColor));
    const lightMutedRatio = getContrastRatio(parseRgb(lightMeasurements.cardBg), parseRgb(lightMeasurements.mutedColor));
    const lightBtnRatio = getContrastRatio(parseRgb(lightMeasurements.btnBg), parseRgb(lightMeasurements.btnColor));

    expect(lightTitleRatio).toBeGreaterThanOrEqual(4.5);
    expect(lightMutedRatio).toBeGreaterThanOrEqual(4.5);
    expect(lightBtnRatio).toBeGreaterThanOrEqual(4.5);
  });

  test('5. Zero Remote Fonts & Strict CSP: uses local system fonts without external font requests', async ({ openFoxLaunch, page }) => {
    const externalRequests: string[] = [];

    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com') || url.endsWith('.woff2') || url.endsWith('.ttf')) {
        externalRequests.push(url);
      }
    });

    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: DEFAULT_SETTINGS,
    });

    expect(externalRequests).toHaveLength(0);

    const fontFamily = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily;
    });

    // Asserts system font stack presence
    expect(fontFamily).toMatch(/-apple-system|BlinkMacSystemFont|Segoe UI|Roboto/);
  });

  test('6. Brand mark and favicon are mounted in the UI', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: DEFAULT_SETTINGS,
    });

    const brandLogo = page.locator('.brand-logo');
    await expect(brandLogo).toBeVisible();
    await expect(brandLogo).toHaveAttribute('width', '32');
    await expect(brandLogo).toHaveAttribute('height', '32');

    // Check favicon link
    const faviconHref = await page.locator('link[rel="icon"]').getAttribute('href');
    expect(faviconHref).toContain('foxlaunch-app-icon.svg');
  });

  test('7. Capture AMO promotional screenshots in Dark and Light themes (1280x800)', async ({ openFoxLaunch, page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const screenshotsDir = path.resolve(process.cwd(), 'metadata/amo/screenshots');
    fs.mkdirSync(screenshotsDir, { recursive: true });

    // Dark Theme
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
    });
    await page.waitForSelector('.swimlane');
    await page.waitForTimeout(250);

    const darkPath = path.join(screenshotsDir, 'foxlaunch-dark-1280x800.png');
    await page.screenshot({ path: darkPath });
    expect(fs.existsSync(darkPath)).toBe(true);

    // Light Theme
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(250);

    const lightPath = path.join(screenshotsDir, 'foxlaunch-light-1280x800.png');
    await page.screenshot({ path: lightPath });
    expect(fs.existsSync(lightPath)).toBe(true);
  });

});
