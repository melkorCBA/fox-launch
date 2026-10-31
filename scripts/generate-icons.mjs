import { firefox } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WINDOWS_FIREFOX_CACHE = 'C:\\Users\\dadcb\\AppData\\Local\\ms-playwright\\firefox-1555\\firefox\\firefox.exe';
const executablePath = process.env.FIREFOX_BIN ||
  (process.platform === 'win32' && fs.existsSync(WINDOWS_FIREFOX_CACHE) ? WINDOWS_FIREFOX_CACHE : undefined);

const svgPath = path.resolve(__dirname, '../public/icons/foxlaunch-app-icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

const sizes = [16, 48, 128];

async function generate() {
  const browser = await firefox.launch({ executablePath, headless: true });
  const page = await browser.newPage();
  await page.goto('data:text/html,<!DOCTYPE html><html><body></body></html>');

  for (const size of sizes) {
    const dataUrl = await page.evaluate(async ({ svg, s }) => {
      const canvas = document.createElement('canvas');
      canvas.width = s;
      canvas.height = s;
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

      ctx.clearRect(0, 0, s, s);
      ctx.drawImage(img, 0, 0, s, s);
      URL.revokeObjectURL(url);

      return canvas.toDataURL('image/png');
    }, { svg: svgContent, s: size });

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const outPath = path.resolve(__dirname, `../public/icons/foxlaunch-${size}.png`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
    const stat = fs.statSync(outPath);
    console.log(`Generated ${outPath} (${size}x${size}, ${stat.size} bytes)`);

    // Also output 128x128 icon to AMO visual assets directory
    if (size === 128) {
      const amoIconPath = path.resolve(__dirname, '../metadata/amo/assets/foxlaunch-icon-128.png');
      fs.mkdirSync(path.dirname(amoIconPath), { recursive: true });
      fs.writeFileSync(amoIconPath, Buffer.from(base64Data, 'base64'));
      console.log(`Generated AMO Asset Icon: ${amoIconPath} (128x128, ${stat.size} bytes)`);
    }
  }

  await browser.close();
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
