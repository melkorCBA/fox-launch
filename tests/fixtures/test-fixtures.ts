/**
 * Playwright Custom Test Fixtures for FoxLaunch
 *
 * Provides pre-configured pages with injected mock WebExtension APIs,
 * test harness controllers, and utility helpers.
 */

import { test as baseTest, expect, Page } from '@playwright/test';
import {
  buildMockWebExtensionScript,
  DispatchedTabRecord,
  MockHarnessInitOptions,
} from './mockBrowser';
import {
  DEFAULT_MOCK_CONTAINERS,
  DEFAULT_SETTINGS,
  NativeContextualIdentity,
} from './presets';

export interface FoxLaunchTestHarnessController {
  init(options?: MockHarnessInitOptions): Promise<void>;
  getDispatchedTabs(): Promise<DispatchedTabRecord[]>;
  clearDispatchedTabs(): Promise<void>;
  getClosedTabs(): Promise<number[]>;
  getStorage(): Promise<Record<string, any>>;
  setStorage(data: Record<string, any>): Promise<void>;
  setContainers(containers: NativeContextualIdentity[]): Promise<void>;
  getContainers(): Promise<NativeContextualIdentity[]>;
  measureRenderTime(): Promise<number>;
  reloadPage(): Promise<void>;
}

export interface FoxLaunchTestFixtures {
  mockHarness: FoxLaunchTestHarnessController;
  openFoxLaunch: (options?: MockHarnessInitOptions) => Promise<Page>;
}

export const test = baseTest.extend<FoxLaunchTestFixtures>({
  mockHarness: async ({ page }, use) => {
    const controller: FoxLaunchTestHarnessController = {
      async init(options: MockHarnessInitOptions = {}) {
        const script = buildMockWebExtensionScript(options);
        await page.addInitScript(script);
      },

      async getDispatchedTabs(): Promise<DispatchedTabRecord[]> {
        return page.evaluate(() => {
          const harness = (window as any).__FOXLAUNCH_TEST_HARNESS__;
          return harness ? harness.getDispatchedTabs() : [];
        });
      },

      async clearDispatchedTabs(): Promise<void> {
        await page.evaluate(() => {
          const harness = (window as any).__FOXLAUNCH_TEST_HARNESS__;
          if (harness) harness.clearDispatchedTabs();
        });
      },

      async getClosedTabs(): Promise<number[]> {
        return page.evaluate(() => {
          const harness = (window as any).__FOXLAUNCH_TEST_HARNESS__;
          return harness ? harness.getClosedTabs() : [];
        });
      },

      async getStorage(): Promise<Record<string, any>> {
        return page.evaluate(() => {
          const harness = (window as any).__FOXLAUNCH_TEST_HARNESS__;
          return harness ? harness.getStorage() : {};
        });
      },

      async setStorage(data: Record<string, any>): Promise<void> {
        await page.evaluate((d) => {
          const harness = (window as any).__FOXLAUNCH_TEST_HARNESS__;
          if (harness) harness.setStorage(d);
        }, data);
      },

      async setContainers(containers: NativeContextualIdentity[]): Promise<void> {
        await page.evaluate((c) => {
          const harness = (window as any).__FOXLAUNCH_TEST_HARNESS__;
          if (harness) harness.setContainers(c);
        }, containers);
      },

      async getContainers(): Promise<NativeContextualIdentity[]> {
        return page.evaluate(() => {
          const harness = (window as any).__FOXLAUNCH_TEST_HARNESS__;
          return harness ? harness.getContainers() : [];
        });
      },

      async measureRenderTime(): Promise<number> {
        return page.evaluate(() => {
          const mountEntry = performance.getEntriesByName('foxlaunch-mount')[0];
          if (mountEntry && typeof mountEntry.duration === 'number') {
            return mountEntry.duration;
          }
          const harnessDuration = (window as any).__FOXLAUNCH_MOUNT_DURATION__;
          if (typeof harnessDuration === 'number') {
            return harnessDuration;
          }
          const entries = performance.getEntriesByType('navigation');
          if (entries.length > 0) {
            const nav = entries[0] as PerformanceNavigationTiming;
            return nav.domContentLoadedEventEnd - nav.responseEnd;
          }
          return 0;
        });
      },

      async reloadPage(): Promise<void> {
        await page.reload({ waitUntil: 'domcontentloaded' });
      },
    };

    await use(controller);
  },

  openFoxLaunch: async ({ page, mockHarness }, use) => {
    const opener = async (options: MockHarnessInitOptions = {}): Promise<Page> => {
      await mockHarness.init(options);
      await page.goto('/newtab.html', { waitUntil: 'domcontentloaded' });
      return page;
    };
    await use(opener);
  },
});

export { expect };
