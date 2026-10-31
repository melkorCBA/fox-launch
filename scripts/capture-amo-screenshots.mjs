import { firefox } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WINDOWS_FIREFOX_CACHE = 'C:\\Users\\dadcb\\AppData\\Local\\ms-playwright\\firefox-1555\\firefox\\firefox.exe';
const executablePath = process.env.FIREFOX_BIN ||
  (process.platform === 'win32' && fs.existsSync(WINDOWS_FIREFOX_CACHE) ? WINDOWS_FIREFOX_CACHE : undefined);

async function capture() {
  // Render Hero Banner SVG to PNG
  const heroSvgPath = path.resolve(__dirname, '../metadata/amo/assets/foxlaunch-hero-1280x640.svg');
  if (fs.existsSync(heroSvgPath)) {
    const heroSvg = fs.readFileSync(heroSvgPath, 'utf8');
    const b = await firefox.launch({ executablePath, headless: true });
    const p = await b.newPage();
    await p.goto('data:text/html,<!DOCTYPE html><html><body></body></html>');
    const heroDataUrl = await p.evaluate(async ({ svg }) => {
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

    const heroPngPath = path.resolve(__dirname, '../metadata/amo/assets/foxlaunch-hero-1280x640.png');
    fs.mkdirSync(path.dirname(heroPngPath), { recursive: true });
    fs.writeFileSync(heroPngPath, Buffer.from(heroDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log(`Generated Hero Banner: ${heroPngPath} (${fs.statSync(heroPngPath).size} bytes)`);
    await b.close();
  }
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
