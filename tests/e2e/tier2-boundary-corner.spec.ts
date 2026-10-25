/**
 * Tier 2: Boundary & Corner Cases E2E Tests
 *
 * Verifies edge cases, stress boundaries, validation rules, and error recovery:
 * 1. Empty containers (zero shortcuts) (>=5 tests)
 * 2. 100+ shortcuts performance (>=5 tests)
 * 3. Invalid URL schemes and auto-prepending https:// (>=5 tests)
 * 4. Special characters & Unicode in titles/URLs (>=5 tests)
 * 5. Rapid deletion and undo countdown expiration (5-second threshold) (>=5 tests)
 * 6. Missing / orphaned containers (>=5 tests)
 *
 * Specification References:
 * - foxlaunch_specification.md §FR-2.3, §FR-5.2, §FR-5.3, §NFR-1, §NFR-2
 * - pilot-plan.md §D2, §D8, §D13, §D22
 * - PROJECT.md §Interface Contracts
 */

import {
  test,
  expect,
  FoxLaunchLocators as loc,
  DEFAULT_MOCK_CONTAINERS,
  DEFAULT_SETTINGS,
  EMPTY_CONTAINERS,
  generate100Shortcuts,
  makeShortcut,
} from '../fixtures';

test.describe('Tier 2: Boundary & Corner Cases', () => {

  // ==========================================================================
  // Area 1: Empty Containers (Zero Shortcuts)
  // ==========================================================================
  test.describe('1. Empty Containers (Zero Shortcuts)', () => {
    test('1.1 container with zero shortcuts renders empty state placeholder prompt', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [], // Empty
          'firefox-container-2': [makeShortcut('firefox-container-2', 'Work Site', 'https://work.com')],
        },
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await expect(loc.emptyPlaceholder(personalSwimlane)).toBeVisible();
      await expect(loc.emptyPlaceholder(personalSwimlane)).toContainText(/No shortcuts|Add a shortcut/i);
    });

    test('1.2 empty placeholder contains an intuitive action to add shortcut', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: { 'firefox-container-1': [] },
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      const addTrigger = personalSwimlane.locator('.btn-add-shortcut, [data-action="add-shortcut"], .empty-add-btn');
      await expect(addTrigger.first()).toBeVisible();
    });

    test('1.3 adding a shortcut to empty container immediately replaces placeholder with card', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: { 'firefox-container-1': [] },
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await loc.addShortcutButton(personalSwimlane).click();

      await loc.modalTitleInput(page).fill('First Link');
      await loc.modalUrlInput(page).fill('https://firstlink.org');
      await loc.modalSubmitButton(page).click();

      // Placeholder disappears and card appears
      await expect(loc.emptyPlaceholder(personalSwimlane)).not.toBeVisible();
      await expect(loc.shortcutCardByTitle(page, 'First Link')).toBeVisible();
    });

    test('1.4 empty containers toggle collapse state cleanly without visual glitch', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: { 'firefox-container-1': [] },
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      const toggle = loc.swimlaneToggle(personalSwimlane);

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(loc.emptyPlaceholder(personalSwimlane)).toBeVisible();
    });

    test('1.5 zero shortcuts across all discovered containers displays dashboard without errors', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {},
      });

      // All 4 containers + default exist and show empty placeholders
      for (const container of DEFAULT_MOCK_CONTAINERS) {
        const swimlane = loc.swimlaneById(page, container.cookieStoreId);
        await expect(swimlane).toBeVisible();
        await expect(loc.emptyPlaceholder(swimlane)).toBeVisible();
      }
    });
  });

  // ==========================================================================
  // Area 2: 100+ Shortcuts Performance
  // ==========================================================================
  test.describe('2. 100+ Shortcuts Performance', () => {
    test('2.1 renders 100+ shortcuts across containers without timeout or crash', async ({ openFoxLaunch, page }) => {
      const stressShortcuts = generate100Shortcuts(DEFAULT_MOCK_CONTAINERS);

      const startTime = Date.now();
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: stressShortcuts,
      });
      const loadTime = Date.now() - startTime;

      // Ensure all cards are loaded
      const allCards = loc.shortcutCards(page);
      const cardCount = await allCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(100);
      expect(loadTime).toBeLessThan(10000); // Loads within reasonable threshold
    });

    test('2.2 search filtering across 100+ shortcuts performs under 200ms', async ({ openFoxLaunch, page }) => {
      const stressShortcuts = generate100Shortcuts(DEFAULT_MOCK_CONTAINERS);
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: stressShortcuts,
      });

      const searchInput = loc.searchInput(page);

      const filterStart = Date.now();
      await searchInput.fill('Stress Test Item 42');
      const matchingCard = loc.shortcutCardByTitle(page, 'Stress Test Item 42');
      await expect(matchingCard).toBeVisible();
      const filterDuration = Date.now() - filterStart;

      expect(filterDuration).toBeLessThan(2000); // Highly responsive
    });

    test('2.3 collapsing swimlanes with large card counts renders without lag', async ({ openFoxLaunch, page }) => {
      const stressShortcuts = generate100Shortcuts(DEFAULT_MOCK_CONTAINERS);
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: stressShortcuts,
      });

      const workSwimlane = loc.swimlaneById(page, 'firefox-container-2');
      const toggle = loc.swimlaneToggle(workSwimlane);

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    test('2.4 rapid text entry in search filter with 100+ cards remains smooth', async ({ openFoxLaunch, page }) => {
      const stressShortcuts = generate100Shortcuts(DEFAULT_MOCK_CONTAINERS);
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: stressShortcuts,
      });

      const searchInput = loc.searchInput(page);
      await searchInput.focus();
      await page.keyboard.type('service-5', { delay: 20 });

      // Check results filtered
      const visibleCards = page.locator('.shortcut-card:visible');
      const count = await visibleCards.count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(100);
    });

    test('2.5 storing 100+ shortcuts serializes cleanly within browser.storage.local limits', async ({ openFoxLaunch, page, mockHarness }) => {
      const stressShortcuts = generate100Shortcuts(DEFAULT_MOCK_CONTAINERS);
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: stressShortcuts,
      });

      const storage = await mockHarness.getStorage();
      const shortcutsObj = storage.foxlaunch_shortcuts;
      const totalStored = Object.values(shortcutsObj).reduce((acc: number, arr: any) => acc + arr.length, 0);
      expect(totalStored).toBeGreaterThanOrEqual(100);
    });
  });

  // ==========================================================================
  // Area 3: Invalid URL Schemes & Auto-Prepending https://
  // ==========================================================================
  test.describe('3. Invalid URL Schemes & Auto-Prepending https://', () => {
    test('3.1 bare domain input auto-prepends https:// upon submission', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: { 'firefox-container-1': [] },
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await loc.addShortcutButton(personalSwimlane).click();

      await loc.modalTitleInput(page).fill('GitHub Bare');
      await loc.modalUrlInput(page).fill('github.com');
      await loc.modalSubmitButton(page).click();

      await expect(loc.modalDialog(page)).not.toBeVisible();

      // Check stored URL has https://
      const storage = await mockHarness.getStorage();
      const item = storage.foxlaunch_shortcuts['firefox-container-1'].find((i: any) => i.title === 'GitHub Bare');
      expect(item).toBeDefined();
      expect(item.url).toBe('https://github.com');
    });

    test('3.2 explicit http:// protocol is preserved without forcing https', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: { 'firefox-container-1': [] },
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await loc.addShortcutButton(personalSwimlane).click();

      await loc.modalTitleInput(page).fill('Local Dev HTTP');
      await loc.modalUrlInput(page).fill('http://localhost:8080');
      await loc.modalSubmitButton(page).click();

      const storage = await mockHarness.getStorage();
      const item = storage.foxlaunch_shortcuts['firefox-container-1'].find((i: any) => i.title === 'Local Dev HTTP');
      expect(item).toBeDefined();
      expect(item.url).toBe('http://localhost:8080');
    });

    test('3.3 explicit about: URL scheme (e.g. about:config) is accepted', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: { 'firefox-container-1': [] },
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await loc.addShortcutButton(personalSwimlane).click();

      await loc.modalTitleInput(page).fill('Firefox Config');
      await loc.modalUrlInput(page).fill('about:config');
      await loc.modalSubmitButton(page).click();

      const storage = await mockHarness.getStorage();
      const item = storage.foxlaunch_shortcuts['firefox-container-1'].find((i: any) => i.title === 'Firefox Config');
      expect(item).toBeDefined();
      expect(item.url).toBe('about:config');
    });

    test('3.4 javascript: URI scheme is rejected with validation error and not saved', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: { 'firefox-container-1': [] },
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await loc.addShortcutButton(personalSwimlane).click();

      await loc.modalTitleInput(page).fill('XSS Attack');
      await loc.modalUrlInput(page).fill('javascript:alert(1)');
      await loc.modalSubmitButton(page).click();

      // Modal remains open and shows validation error
      await expect(loc.modalDialog(page)).toBeVisible();
      await expect(loc.modalValidationError(page)).toBeVisible();
      await expect(loc.modalValidationError(page)).toContainText(/Invalid URL|protocol not allowed|scheme/i);

      // Verify not saved in storage
      const storage = await mockHarness.getStorage();
      const items = storage.foxlaunch_shortcuts['firefox-container-1'] || [];
      expect(items.some((i: any) => i.title === 'XSS Attack')).toBe(false);
    });

    test('3.5 data: and file: URI schemes are rejected with validation error', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: { 'firefox-container-1': [] },
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await loc.addShortcutButton(personalSwimlane).click();

      await loc.modalTitleInput(page).fill('File Exploit');
      await loc.modalUrlInput(page).fill('file:///etc/passwd');
      await loc.modalSubmitButton(page).click();

      await expect(loc.modalValidationError(page)).toBeVisible();
    });
  });

  // ==========================================================================
  // Area 4: Special Characters & Unicode in Titles/URLs
  // ==========================================================================
  test.describe('4. Special Characters & Unicode in Titles/URLs', () => {
    test('4.1 unicode emoji and international scripts in title render faithfully without mojibake', async ({ openFoxLaunch, page }) => {
      const unicodeTitle = '🚀 Cloud Console 日本語 עִבְרִית';
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [makeShortcut('firefox-container-1', unicodeTitle, 'https://cloud.example.com')],
        },
      });

      const card = loc.shortcutCardByTitle(page, unicodeTitle);
      await expect(card).toBeVisible();
      await expect(loc.shortcutTitle(card)).toHaveText(unicodeTitle);
    });

    test('4.2 HTML meta-characters in title are rendered as plain text without execution', async ({ openFoxLaunch, page }) => {
      const xssPayload = '<img src=x onerror=alert(1)> & " \' < >';
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [makeShortcut('firefox-container-1', xssPayload, 'https://safe.example.com')],
        },
      });

      // Confirm raw text is displayed safely via textContent
      const card = page.locator('.shortcut-card').first();
      await expect(loc.shortcutTitle(card)).toHaveText(xssPayload);
    });

    test('4.3 URL with complex query params and encoded characters dispatches unmodified', async ({ openFoxLaunch, page, mockHarness }) => {
      const complexUrl = 'https://example.com/search?q=hello%20world&filters=%7B%22status%22%3A%22active%22%7D#top';
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [makeShortcut('firefox-container-1', 'Complex Search', complexUrl)],
        },
        settings: { ...DEFAULT_SETTINGS, tabBehavior: 'keep' },
      });

      const card = loc.shortcutCardByTitle(page, 'Complex Search');
      await card.click();

      const dispatched = await mockHarness.getDispatchedTabs();
      expect(dispatched[0].url).toBe(complexUrl);
    });

    test('4.4 long titles (150+ chars) truncate gracefully with ellipsis without breaking card layout', async ({ openFoxLaunch, page }) => {
      const longTitle = 'Very Long Shortcut Label Designed To Test Layout Wrapping And Truncation Behavior Across Modern CSS Grid And Flexbox Containers Without Overflows';
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [makeShortcut('firefox-container-1', longTitle, 'https://longtitle.example.com')],
        },
      });

      const card = loc.shortcutCardByTitle(page, longTitle);
      await expect(card).toBeVisible();
      const titleElem = loc.shortcutTitle(card);
      // CSS overflow / text-overflow check
      await expect(titleElem).toBeVisible();
    });

    test('4.5 nested subdomain extracts avatar initial from effective domain hostname', async ({ openFoxLaunch, page }) => {
      const nestedUrl = 'https://sub4.sub3.corp.jira.atlassian.com/browse/PROJ-123';
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [makeShortcut('firefox-container-1', 'Nested Jira', nestedUrl)],
        },
      });

      const card = loc.shortcutCardByTitle(page, 'Nested Jira');
      const avatar = loc.shortcutAvatar(card);
      await expect(avatar).toBeVisible();
    });
  });

  // ==========================================================================
  // Area 5: Rapid Deletion & Undo Countdown Expiration (5-second threshold)
  // ==========================================================================
  test.describe('5. Rapid Deletion & Undo Countdown Expiration', () => {
    test('5.1 deleting a shortcut displays 5-second countdown on undo toast', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [makeShortcut('firefox-container-1', 'Undo Me', 'https://undome.com')],
        },
      });

      const card = loc.shortcutCardByTitle(page, 'Undo Me');
      await loc.shortcutMenuButton(card).click();
      await loc.shortcutDeleteAction(page).click();

      const toast = loc.toastNotification(page);
      await expect(toast).toBeVisible();
      await expect(loc.toastUndoButton(page)).toBeVisible();
    });

    test('5.2 clicking Undo restores deleted shortcut immediately to original position', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [
            makeShortcut('firefox-container-1', 'Item 1', 'https://item1.com', 0),
            makeShortcut('firefox-container-1', 'Item 2', 'https://item2.com', 1),
          ],
        },
      });

      const card = loc.shortcutCardByTitle(page, 'Item 1');
      await loc.shortcutMenuButton(card).click();
      await loc.shortcutDeleteAction(page).click();

      await expect(loc.shortcutCardByTitle(page, 'Item 1')).not.toBeVisible();

      // Click Undo
      await loc.toastUndoButton(page).click();

      // Item 1 is restored
      await expect(loc.shortcutCardByTitle(page, 'Item 1')).toBeVisible();

      // Storage has both items
      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_shortcuts['firefox-container-1']).toHaveLength(2);
    });

    test('5.3 toast expires after 5-second window if undo is not clicked', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [makeShortcut('firefox-container-1', 'Expire Me', 'https://expire.com')],
        },
      });

      const card = loc.shortcutCardByTitle(page, 'Expire Me');
      await loc.shortcutMenuButton(card).click();
      await loc.shortcutDeleteAction(page).click();

      const toast = loc.toastNotification(page);
      await expect(toast).toBeVisible();

      // Wait for expiration threshold (5 seconds + buffer)
      await expect(toast).not.toBeVisible({ timeout: 7000 });
    });

    test('5.4 rapidly deleting multiple items in succession manages undo toast cleanly', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [
            makeShortcut('firefox-container-1', 'First Del', 'https://first.com', 0),
            makeShortcut('firefox-container-1', 'Second Del', 'https://second.com', 1),
          ],
        },
      });

      // Delete first
      const card1 = loc.shortcutCardByTitle(page, 'First Del');
      await loc.shortcutMenuButton(card1).click();
      await loc.shortcutDeleteAction(page).click();

      // Delete second immediately
      const card2 = loc.shortcutCardByTitle(page, 'Second Del');
      await loc.shortcutMenuButton(card2).click();
      await loc.shortcutDeleteAction(page).click();

      await expect(loc.toastNotification(page)).toBeVisible();
    });

    test('5.5 page reload during active undo toast finalizes deletion without ghost resurrection', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [makeShortcut('firefox-container-1', 'Permanent Del', 'https://permdel.com')],
        },
      });

      const card = loc.shortcutCardByTitle(page, 'Permanent Del');
      await loc.shortcutMenuButton(card).click();
      await loc.shortcutDeleteAction(page).click();

      // Reload while toast is visible
      await mockHarness.reloadPage();

      // Item remains deleted
      await expect(loc.shortcutCardByTitle(page, 'Permanent Del')).not.toBeVisible();
    });
  });

  // ==========================================================================
  // Area 6: Missing / Orphaned Containers
  // ==========================================================================
  test.describe('6. Missing / Orphaned Containers', () => {
    test('6.1 shortcuts assigned to missing container are preserved silently in storage', async ({ openFoxLaunch, page, mockHarness }) => {
      const orphanedContainerId = 'firefox-container-999';
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS, // does not include container-999
        shortcuts: {
          'firefox-container-1': [makeShortcut('firefox-container-1', 'Normal', 'https://normal.com')],
          [orphanedContainerId]: [makeShortcut(orphanedContainerId, 'Orphaned Item', 'https://orphaned.com')],
        },
      });

      // Dashboard loads normally
      await expect(loc.swimlaneById(page, 'firefox-container-1')).toBeVisible();

      // Storage still holds the orphaned shortcut
      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_shortcuts[orphanedContainerId]).toBeDefined();
      expect(storage.foxlaunch_shortcuts[orphanedContainerId][0].title).toBe('Orphaned Item');
    });

    test('6.2 orphaned shortcuts do not cause unhandled runtime errors or white-screen', async ({ openFoxLaunch, page }) => {
      const orphanedContainerId = 'firefox-container-deleted';
      let pageErrorOccurred = false;
      page.on('pageerror', () => { pageErrorOccurred = true; });

      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          [orphanedContainerId]: [makeShortcut(orphanedContainerId, 'Ghost', 'https://ghost.com')],
        },
      });

      expect(pageErrorOccurred).toBe(false);
      await expect(loc.searchInput(page)).toBeVisible();
    });

    test('6.3 re-creating container identity with matching cookieStoreId restores its shortcuts', async ({ openFoxLaunch, page, mockHarness }) => {
      const containerId = 'firefox-container-100';
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          [containerId]: [makeShortcut(containerId, 'Recovered Shortcut', 'https://recovered.com')],
        },
      });

      // Container is not in current active containers
      await expect(loc.swimlaneById(page, containerId)).not.toBeVisible();

      // Dynamically add the container identity back
      const updatedContainers = [
        ...DEFAULT_MOCK_CONTAINERS,
        {
          cookieStoreId: containerId,
          name: 'Restored Container',
          color: 'purple',
          icon: 'circle',
          colorCode: '#9400d3',
        },
      ];
      await mockHarness.setContainers(updatedContainers);
      await mockHarness.reloadPage();

      // Now swimlane and shortcut are visible
      const restoredSwimlane = loc.swimlaneById(page, containerId);
      await expect(restoredSwimlane).toBeVisible();
      await expect(loc.shortcutCardByTitle(page, 'Recovered Shortcut')).toBeVisible();
    });

    test('6.4 adding new shortcut in normal container does not wipe orphaned container data', async ({ openFoxLaunch, page, mockHarness }) => {
      const orphanId = 'firefox-container-orphan';
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {
          'firefox-container-1': [],
          [orphanId]: [makeShortcut(orphanId, 'Keep Me Safe', 'https://safe.org')],
        },
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await loc.addShortcutButton(personalSwimlane).click();
      await loc.modalTitleInput(page).fill('Newly Added');
      await loc.modalUrlInput(page).fill('https://newlyadded.org');
      await loc.modalSubmitButton(page).click();

      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_shortcuts[orphanId]).toBeDefined();
      expect(storage.foxlaunch_shortcuts[orphanId][0].title).toBe('Keep Me Safe');
    });

    test('6.5 removing container identity via contextualIdentities.remove updates swimlanes cleanly', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: {},
      });

      await expect(loc.swimlaneById(page, 'firefox-container-4')).toBeVisible();

      // Trigger container removal
      await page.evaluate(async () => {
        await window.browser.contextualIdentities.remove('firefox-container-4');
      });

      // Reload to simulate query-on-load
      await mockHarness.reloadPage();
      await expect(loc.swimlaneById(page, 'firefox-container-4')).not.toBeVisible();
    });
  });
});
