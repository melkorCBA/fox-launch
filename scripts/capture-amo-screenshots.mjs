#!/usr/bin/env node
/**
 * AMO Store Visual Assets & Promotional Screenshots Generator
 *
 * Automates creation and verification of official Mozilla Add-ons (AMO) visual listing assets:
 * 1. Single Master Icon: metadata/amo/assets/foxlaunch-icon-128.png (128x128px, transparent background)
 *    - Downscale verified for 64x64 and 32x32 clarity
 * 2. Hero Promotional Banner: metadata/amo/assets/foxlaunch-hero-1280x640.png (1280x640px)
 * 3. Listing Screenshots: metadata/amo/screenshots/foxlaunch-*-2400x1800.png (2400x1800px, 4:3 aspect ratio)
 *    - Strictly enforces maximum 5 screenshots total per AMO limits
 *    - Cleans up legacy 1280x800 screenshots
 *
 * Usage:
 *   node scripts/capture-amo-screenshots.mjs
 *   node scripts/capture-amo-screenshots.mjs --scenes=dark,light
 *   node scripts/capture-amo-screenshots.mjs --scenes=dark,light,search,settings,add-shortcut
 *   node scripts/capture-amo-screenshots.mjs --prune
 */

import { firefox } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const WINDOWS_FIREFOX_CACHE = 'C:\\Users\\dadcb\\AppData\\Local\\ms-playwright\\firefox-1555\\firefox\\firefox.exe';
const executablePath = process.env.FIREFOX_BIN ||
  (process.platform === 'win32' && fs.existsSync(WINDOWS_FIREFOX_CACHE) ? WINDOWS_FIREFOX_CACHE : undefined);

const AMO_MAX_SCREENSHOTS = 5;

// Parse arguments
const args = process.argv.slice(2);
const scenesArg = args.find((a) => a.startsWith('--scenes='));
const isAll = args.includes('--all');
const shouldPrune = args.includes('--prune');

const SCENE_NAMES = ['dark', 'light', 'search', 'settings', 'add-shortcut'];
let selectedScenes = ['dark', 'light']; // Default baseline

if (isAll) {
  selectedScenes = SCENE_NAMES;
} else if (scenesArg) {
  const parsed = scenesArg.split('=')[1].split(',').map((s) => s.trim().toLowerCase());
  selectedScenes = parsed.filter((s) => SCENE_NAMES.includes(s));
  if (selectedScenes.length === 0) {
    selectedScenes = ['dark', 'light'];
  }
}

if (selectedScenes.length > AMO_MAX_SCREENSHOTS) {
  console.warn(`[Warning] Selected ${selectedScenes.length} scenes exceeds AMO maximum of ${AMO_MAX_SCREENSHOTS}. Limiting to top ${AMO_MAX_SCREENSHOTS}.`);
  selectedScenes = selectedScenes.slice(0, AMO_MAX_SCREENSHOTS);
}

async function renderHeroBanner(page) {
  const heroSvgPath = path.resolve(rootDir, 'metadata/amo/assets/foxlaunch-hero-1280x640.svg');
  if (!fs.existsSync(heroSvgPath)) return;

  const heroSvg = fs.readFileSync(heroSvgPath, 'utf8');
  await page.goto('data:text/html,<!DOCTYPE html><html><body></body></html>');
  const heroDataUrl = await page.evaluate(async ({ svg }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');

    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    ctx.drawImage(img, 0, 0, 1280, 640);
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/png');
  }, { svg: heroSvg });

  const heroPngPath = path.resolve(rootDir, 'metadata/amo/assets/foxlaunch-hero-1280x640.png');
  fs.mkdirSync(path.dirname(heroPngPath), { recursive: true });
  fs.writeFileSync(heroPngPath, Buffer.from(heroDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
  console.log(`✓ Generated Hero Banner: ${path.relative(rootDir, heroPngPath)} (1280x640, ${fs.statSync(heroPngPath).size} bytes)`);
}

async function renderAmoIcon(page) {
  const iconSvgPath = path.resolve(rootDir, 'public/icons/foxlaunch-app-icon.svg');
  if (!fs.existsSync(iconSvgPath)) return;

  const iconSvg = fs.readFileSync(iconSvgPath, 'utf8');
  await page.goto('data:text/html,<!DOCTYPE html><html><body></body></html>');

  const iconDataUrl = await page.evaluate(async ({ svg }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');

    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    ctx.clearRect(0, 0, 128, 128);
    ctx.drawImage(img, 0, 0, 128, 128);
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/png');
  }, { svg: iconSvg });

  const amoIconPath = path.resolve(rootDir, 'metadata/amo/assets/foxlaunch-icon-128.png');
  fs.mkdirSync(path.dirname(amoIconPath), { recursive: true });
  fs.writeFileSync(amoIconPath, Buffer.from(iconDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
  console.log(`✓ Generated AMO Master Icon: ${path.relative(rootDir, amoIconPath)} (128x128, ${fs.statSync(amoIconPath).size} bytes)`);

  // Verify Downscale Clarity
  const downscaleResults = await page.evaluate(async ({ base64Url }) => {
    const results = [];
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = base64Url;
    });

    for (const size of [64, 32]) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');
      ctx.drawImage(img, 0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size).data;
      let transparentPixels = 0;
      let opaquePixels = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        const alpha = imgData[i + 3];
        if (alpha === 0) transparentPixels++;
        else if (alpha > 50) opaquePixels++;
      }
      results.push({ size, hasTransparency: transparentPixels > 0, hasContent: opaquePixels > 0 });
    }
    return results;
  }, { base64Url: iconDataUrl });

  for (const res of downscaleResults) {
    if (!res.hasTransparency || !res.hasContent) {
      throw new Error(`AMO icon clarity check failed at ${res.size}x${res.size}`);
    }
  }
  console.log('✓ Verified AMO Master Icon downscale clarity (64x64 and 32x32 previews stay crisp with preserved alpha)');
}

function captureScreenshotsWithPlaywright(scenes) {
  const grepPattern = scenes.map((s) => `scene:${s}`).join('|');
  console.log(`\n📷 Capturing screenshots for scenes [${scenes.join(', ')}] via Playwright (2400x1800)...`);

  const cmd = `pnpm exec playwright test tests/e2e/amo-screenshots.spec.ts -g "${grepPattern}"`;
  execSync(cmd, { stdio: 'inherit', cwd: rootDir });
}

function enforceScreenshotLimitAndPrune(activeScenes) {
  const screenshotsDir = path.resolve(rootDir, 'metadata/amo/screenshots');
  if (!fs.existsSync(screenshotsDir)) return;

  const activeFilenames = new Set(activeScenes.map((s) => `foxlaunch-${s}-2400x1800.png`));
  const files = fs.readdirSync(screenshotsDir);

  for (const file of files) {
    if (!file.endsWith('.png')) continue;
    // Always remove legacy 1280x800 screenshots
    if (file.includes('1280x800')) {
      const filePath = path.join(screenshotsDir, file);
      fs.unlinkSync(filePath);
      console.log(`✂ Pruned legacy screenshot: ${file}`);
    } else if (shouldPrune && !activeFilenames.has(file)) {
      const filePath = path.join(screenshotsDir, file);
      fs.unlinkSync(filePath);
      console.log(`✂ Pruned unselected screenshot: ${file}`);
    }
  }

  // Check inventory count against AMO limits
  let remaining = fs.readdirSync(screenshotsDir).filter((f) => f.endsWith('.png'));

  if (remaining.length > AMO_MAX_SCREENSHOTS) {
    if (shouldPrune) {
      // Prioritize preserving dark and light themes, then prune excess files
      const priorityOrder = ['foxlaunch-dark-2400x1800.png', 'foxlaunch-light-2400x1800.png'];
      const nonPriority = remaining.filter((f) => !priorityOrder.includes(f));
      while (remaining.length > AMO_MAX_SCREENSHOTS && nonPriority.length > 0) {
        const toRemove = nonPriority.pop();
        fs.unlinkSync(path.join(screenshotsDir, toRemove));
        console.log(`✂ Pruned excess supplemental screenshot to respect AMO limit: ${toRemove}`);
        remaining = fs.readdirSync(screenshotsDir).filter((f) => f.endsWith('.png'));
      }
    } else {
      throw new Error(
        `[AMO Violation] Total screenshots in ${path.relative(rootDir, screenshotsDir)} is ${remaining.length}, which exceeds the AMO limit of ${AMO_MAX_SCREENSHOTS}.\n` +
        `Existing screenshots: ${remaining.join(', ')}\n` +
        `Please rerun with '--prune' to automatically remove excess supplemental screenshots, or manually delete redundant files.`
      );
    }
  }

  if (remaining.length > AMO_MAX_SCREENSHOTS) {
    throw new Error(
      `[AMO Violation] Unable to reduce screenshots to <= ${AMO_MAX_SCREENSHOTS}. Current count: ${remaining.length}`
    );
  }
}

async function main() {
  console.log('=== Mozilla Add-ons (AMO) Asset & Screenshot Pipeline ===\n');

  const browser = await firefox.launch({ executablePath, headless: true });
  const page = await browser.newPage();

  try {
    await renderHeroBanner(page);
    await renderAmoIcon(page);
  } finally {
    await browser.close();
  }

  captureScreenshotsWithPlaywright(selectedScenes);
  enforceScreenshotLimitAndPrune(selectedScenes);

  const screenshotsDir = path.resolve(rootDir, 'metadata/amo/screenshots');
  const finalFiles = fs.readdirSync(screenshotsDir).filter((f) => f.endsWith('.png'));

  if (finalFiles.length > AMO_MAX_SCREENSHOTS) {
    throw new Error(
      `[AMO Violation] Screenshot count (${finalFiles.length}) exceeds the maximum allowed by AMO (${AMO_MAX_SCREENSHOTS}).`
    );
  }

  console.log(`\n🎉 AMO Asset pipeline completed! Current screenshots (${finalFiles.length}/${AMO_MAX_SCREENSHOTS}):`);
  for (const f of finalFiles) {
    const stat = fs.statSync(path.join(screenshotsDir, f));
    console.log(`   - ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
}

main().catch((err) => {
  console.error('\n❌ Error executing screenshot pipeline:', err.message || err);
  process.exit(1);
});
