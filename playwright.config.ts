import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Cached Playwright Firefox binary path on Windows dev environment
const WINDOWS_FIREFOX_CACHE = 'C:\\Users\\dadcb\\AppData\\Local\\ms-playwright\\firefox-1555\\firefox\\firefox.exe';
const firefoxExecutablePath = process.env.FIREFOX_BIN ||
  (process.platform === 'win32' && fs.existsSync(WINDOWS_FIREFOX_CACHE) ? WINDOWS_FIREFOX_CACHE : undefined);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false, // Run sequentially for predictable extension storage / mock isolation
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.PLAYWRIGHT_WORKERS ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10) : (process.env.CI ? 2 : 1),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        browserName: 'firefox',
        launchOptions: {
          executablePath: firefoxExecutablePath,
          headless: true,
          firefoxUserPrefs: {
            // Enable WebExtension contextualIdentities flag if applicable
            'privacy.userContext.enabled': true,
            'privacy.userContext.ui.enabled': true,
          },
        },
      },
    },
  ],
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173/newtab.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
    cwd: '.',
  },
});
