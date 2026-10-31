import { test, expect } from '../fixtures';
import { DEFAULT_MOCK_CONTAINERS } from '../fixtures/presets';

test.describe('Mock WebExtension Test Harness Verification', () => {
  test('injects mock browser object and discovers configured containers', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({ containers: DEFAULT_MOCK_CONTAINERS });

    const containers = await page.evaluate(async () => {
      return await window.browser.contextualIdentities.query({});
    });

    expect(containers).toHaveLength(4);
    expect(containers.map((c: any) => c.name)).toEqual(['Personal', 'Work', 'Banking', 'Shopping']);
    expect(containers[0].cookieStoreId).toBe('firefox-container-1');
  });

  test('browser.storage.local persists data across page reload', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      shortcuts: {
        'firefox-container-1': [
          {
            id: 'test-1',
            cookieStoreId: 'firefox-container-1',
            url: 'https://example.com',
            title: 'Example',
            domain: 'example.com',
            createdAt: 1000,
            order: 0,
          },
        ],
      },
    });

    // Verify initial storage read in page
    const initialStorage = await page.evaluate(async () => {
      return await window.browser.storage.local.get(null);
    });
    expect(initialStorage.foxlaunch_shortcuts['firefox-container-1']).toHaveLength(1);

    // Update storage from page
    await page.evaluate(async () => {
      const current = await window.browser.storage.local.get('foxlaunch_shortcuts');
      current.foxlaunch_shortcuts['firefox-container-1'].push({
        id: 'test-2',
        cookieStoreId: 'firefox-container-1',
        url: 'https://github.com',
        title: 'GitHub',
        domain: 'github.com',
        createdAt: 2000,
        order: 1,
      });
      await window.browser.storage.local.set({ foxlaunch_shortcuts: current.foxlaunch_shortcuts });
    });

    // Reload the page
    await mockHarness.reloadPage();

    // Verify persisted storage after reload
    const reloadedStorage = await page.evaluate(async () => {
      return await window.browser.storage.local.get(null);
    });
    expect(reloadedStorage.foxlaunch_shortcuts['firefox-container-1']).toHaveLength(2);
    expect(reloadedStorage.foxlaunch_shortcuts['firefox-container-1'][1].title).toBe('GitHub');
  });

  test('swimlane drag-and-drop order persists across page reload', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({ containers: DEFAULT_MOCK_CONTAINERS });

    await page
      .locator('#swimlane-firefox-container-1 .swimlane-drag-handle')
      .dragTo(page.locator('#swimlane-firefox-container-3 .swimlane-drag-handle'));

    const reorderedIds = await page.locator('#swimlanes-container > .swimlane').evaluateAll((lanes) =>
      lanes.map((lane) => lane.getAttribute('data-cookie-store-id'))
    );
    expect(reorderedIds).toEqual([
      'firefox-container-2',
      'firefox-container-1',
      'firefox-container-3',
      'firefox-container-4',
      'firefox-default',
    ]);

    const settings = await page.evaluate(async () => {
      const { foxlaunch_settings } = await window.browser.storage.local.get('foxlaunch_settings');
      return foxlaunch_settings;
    });
    expect(settings.swimlaneOrder).toEqual(reorderedIds);

    await mockHarness.reloadPage();
    const reloadedIds = await page.locator('#swimlanes-container > .swimlane').evaluateAll((lanes) =>
      lanes.map((lane) => lane.getAttribute('data-cookie-store-id'))
    );
    expect(reloadedIds).toEqual(reorderedIds);
  });

  test('browser.tabs.create records dispatched tabs accurately', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch();

    await page.evaluate(async () => {
      await window.browser.tabs.create({
        url: 'https://aws.amazon.com',
        cookieStoreId: 'firefox-container-2',
        active: false,
      });
    });

    const dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].url).toBe('https://aws.amazon.com');
    expect(dispatched[0].cookieStoreId).toBe('firefox-container-2');
    expect(dispatched[0].active).toBe(false);
  });

  test('browser.tabs.remove records closed tab IDs', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch();

    await page.evaluate(async () => {
      await window.browser.tabs.remove(12345);
    });

    const closed = await mockHarness.getClosedTabs();
    expect(closed).toContain(12345);
  });
});
