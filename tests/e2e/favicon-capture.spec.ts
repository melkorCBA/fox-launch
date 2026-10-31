import { test, expect } from '../fixtures';
import type { ShortcutItem } from '../../src/types';

test.describe('Shortcut Favicon Capture & Display (Issue #15)', () => {
  const testCookieStoreId = 'firefox-container-1';

  test('displays procedural SVG letter avatar when shortcut has no cached favicon', async ({ openFoxLaunch, page }) => {
    const unvisitedShortcut: ShortcutItem = {
      id: 'sc-nofavicon-1',
      cookieStoreId: testCookieStoreId,
      url: 'https://example-site.org/docs',
      title: 'Example Docs',
      domain: 'example-site.org',
      createdAt: Date.now(),
      order: 0,
    };

    await openFoxLaunch({
      shortcuts: {
        [testCookieStoreId]: [unvisitedShortcut],
      },
    });

    const card = page.locator(`.shortcut-card[data-id="${unvisitedShortcut.id}"]`);
    await expect(card).toBeVisible();

    const avatarImg = card.locator('[data-testid="shortcut-avatar"]');
    await expect(avatarImg).toBeVisible();

    const src = await avatarImg.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src!.startsWith('data:image/svg+xml;utf8,<svg')).toBe(true);
    expect(src).toContain('>E<'); // Initial for example-site.org
  });

  test('displays cached favicon URL when shortcut has favIconUrl in storage', async ({ openFoxLaunch, page }) => {
    const testFaviconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const shortcutWithFavicon: ShortcutItem = {
      id: 'sc-withfavicon-1',
      cookieStoreId: testCookieStoreId,
      url: 'https://cached-site.com',
      title: 'Cached Site',
      domain: 'cached-site.com',
      favIconUrl: testFaviconUrl,
      createdAt: Date.now(),
      order: 0,
    };

    await openFoxLaunch({
      shortcuts: {
        [testCookieStoreId]: [shortcutWithFavicon],
      },
    });

    const card = page.locator(`.shortcut-card[data-id="${shortcutWithFavicon.id}"]`);
    await expect(card).toBeVisible();

    const avatarImg = card.locator('[data-testid="shortcut-avatar"]');
    await expect(avatarImg).toBeVisible();

    const src = await avatarImg.getAttribute('src');
    expect(src).toBe(testFaviconUrl);
  });

  test('falls back gracefully to SVG letter avatar if favicon fails to load (onerror)', async ({ openFoxLaunch, page }) => {
    const brokenFaviconShortcut: ShortcutItem = {
      id: 'sc-brokenfavicon-1',
      cookieStoreId: testCookieStoreId,
      url: 'https://broken-icon-site.com',
      title: 'Broken Icon Site',
      domain: 'broken-icon-site.com',
      favIconUrl: 'https://invalid-non-existent-domain-12345.xyz/favicon.ico',
      createdAt: Date.now(),
      order: 0,
    };

    await openFoxLaunch({
      shortcuts: {
        [testCookieStoreId]: [brokenFaviconShortcut],
      },
    });

    const card = page.locator(`.shortcut-card[data-id="${brokenFaviconShortcut.id}"]`);
    await expect(card).toBeVisible();

    const avatarImg = card.locator('[data-testid="shortcut-avatar"]');

    // Trigger onerror on image element
    await avatarImg.dispatchEvent('error');

    await expect.poll(async () => {
      const currentSrc = await avatarImg.getAttribute('src');
      return currentSrc?.startsWith('data:image/svg+xml');
    }).toBe(true);

    const src = await avatarImg.getAttribute('src');
    expect(src).toContain('>B<'); // 'B' for broken-icon-site.com
  });

  test('pre-populates favicon immediately when adding shortcut if URL is open in an existing tab', async ({ openFoxLaunch, page }) => {
    const existingTabFavicon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await openFoxLaunch();

    // Simulate an open tab with a loaded favicon in Firefox
    await page.evaluate(({ favUrl }) => {
      window.__FOXLAUNCH_TEST_HARNESS__.setOpenTabs([
        {
          id: 42,
          url: 'https://github.com/trending',
          favIconUrl: favUrl,
          active: false,
          status: 'complete',
        },
      ]);
    }, { favUrl: existingTabFavicon });

    // Click Add Shortcut button on Personal container
    const addBtn = page.locator(`#swimlane-${testCookieStoreId} .btn-add-shortcut`);
    await addBtn.click();

    // Fill the modal form
    const urlInput = page.locator('#shortcut-url-input');
    const titleInput = page.locator('#shortcut-title-input');
    await urlInput.fill('https://github.com/trending');
    await titleInput.fill('GitHub Trending');

    // Submit form
    const saveBtn = page.locator('button[data-action="save-shortcut"]');
    await saveBtn.click();

    // Verify shortcut card was created with the captured favicon
    const newCard = page.locator('.shortcut-card', { hasText: 'GitHub Trending' });
    await expect(newCard).toBeVisible();

    const avatarImg = newCard.locator('[data-testid="shortcut-avatar"]');
    const src = await avatarImg.getAttribute('src');
    expect(src).toBe(existingTabFavicon);

    // Verify stored in browser.storage.local
    const storedShortcuts = await page.evaluate(async (cid) => {
      const storage = window.__FOXLAUNCH_TEST_HARNESS__.getStorage();
      return storage.foxlaunch_shortcuts?.[cid] || [];
    }, testCookieStoreId);

    const createdItem = storedShortcuts.find((s: ShortcutItem) => s.title === 'GitHub Trending');
    expect(createdItem).toBeDefined();
    expect(createdItem.favIconUrl).toBe(existingTabFavicon);
  });

  test('one-shot watcher captures favicon and live-updates card when tab navigation finishes', async ({ openFoxLaunch, page }) => {
    const targetUrl = 'https://fresh-uncached-site.org';
    const targetShortcut: ShortcutItem = {
      id: 'sc-fresh-1',
      cookieStoreId: testCookieStoreId,
      url: targetUrl,
      title: 'Fresh Uncached',
      domain: 'fresh-uncached-site.org',
      createdAt: Date.now(),
      order: 0,
    };

    await openFoxLaunch({
      shortcuts: {
        [testCookieStoreId]: [targetShortcut],
      },
    });

    const card = page.locator(`.shortcut-card[data-id="${targetShortcut.id}"]`);
    await expect(card).toBeVisible();

    // Initially displays letter avatar
    const initialAvatar = await card.locator('[data-testid="shortcut-avatar"]').getAttribute('src');
    expect(initialAvatar!.startsWith('data:image/svg+xml')).toBe(true);

    // Dispatch shortcut (click card)
    await card.click();

    // Get the dispatched tab ID from harness
    const dispatchedTabs = await page.evaluate(() => {
      return window.__FOXLAUNCH_TEST_HARNESS__.getDispatchedTabs();
    });
    expect(dispatchedTabs.length).toBeGreaterThan(0);
    const createdTabId = dispatchedTabs[dispatchedTabs.length - 1].id;

    // Simulate tab receiving favicon via tab.onUpdated
    const capturedFavicon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';

    await page.evaluate(({ tabId, favIconUrl }) => {
      window.__FOXLAUNCH_TEST_HARNESS__.emitTabUpdated(tabId, { favIconUrl }, {
        id: tabId,
        favIconUrl,
        status: 'complete',
      });
    }, { tabId: createdTabId, favIconUrl: capturedFavicon });

    // The storage onChanged event updates the displayed card live!
    await expect.poll(async () => {
      const updatedCard = page.locator(`.shortcut-card[data-id="${targetShortcut.id}"]`);
      return updatedCard.locator('[data-testid="shortcut-avatar"]').getAttribute('src');
    }).toBe(capturedFavicon);

    // Verify storage was updated with captured favicon under dedicated key
    const capturedInStorage = await page.evaluate(async (shortcutId) => {
      const storage = window.__FOXLAUNCH_TEST_HARNESS__.getStorage();
      return storage.foxlaunch_favicons?.[shortcutId];
    }, targetShortcut.id);
    expect(capturedInStorage).toBe(capturedFavicon);
  });
});
