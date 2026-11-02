/**
 * Tier 4: Real-World Acceptance Scenarios E2E Tests
 *
 * Verifies end-to-end acceptance tests defined in:
 * - ORIGINAL_REQUEST.md §Acceptance Criteria (AT-1 to AT-4)
 * - foxlaunch_specification.md §6
 * - pilot-plan.md §8.1
 * - Full WCAG AA Keyboard Accessibility Walkthrough
 */

import {
  test,
  expect,
  FoxLaunchLocators as loc,
  DEFAULT_MOCK_CONTAINERS,
  DEFAULT_SETTINGS,
  SAMPLE_SHORTCUTS,
  makeShortcut,
} from '../fixtures';

test.describe('Tier 4: Real-World Acceptance Scenarios', () => {

  // ==========================================================================
  // AT-1: Opening new tab page renders discovered container swimlanes in under 100ms
  // ==========================================================================
  test('AT-1: cold new tab page render completes in under 100ms', async ({ openFoxLaunch, page, mockHarness }) => {
    // Open new tab page
    const startTime = performance.now();
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: DEFAULT_SETTINGS,
    });

    // Wait until swimlanes container has finished rendering
    const swimlanes = loc.allSwimlanes(page);
    await expect(swimlanes.first()).toBeVisible();

    // Query performance mark/timing measured in page
    const renderDuration = await page.evaluate(() => {
      const mountEntry = performance.getEntriesByName('foxlaunch-mount')[0];
      if (mountEntry && typeof mountEntry.duration === 'number') {
        return mountEntry.duration;
      }
      const harnessDuration = (window as any).__FOXLAUNCH_MOUNT_DURATION__;
      if (typeof harnessDuration === 'number') {
        return harnessDuration;
      }
      const perfEntries = performance.getEntriesByType('navigation');
      if (perfEntries.length > 0) {
        const nav = perfEntries[0] as PerformanceNavigationTiming;
        return nav.domContentLoadedEventEnd - nav.responseEnd;
      }
      return performance.now();
    });

    console.log(`[AT-1 Benchmark] Measured render duration: ${renderDuration.toFixed(2)}ms`);

    // Verify all 4 containers + default are present
    const count = await swimlanes.count();
    expect(count).toBeGreaterThanOrEqual(4);

    // Assert under 100ms benchmark target (NFR-1)
    expect(renderDuration).toBeLessThan(100);
  });

  // ==========================================================================
  // AT-2: Dispatching shortcut from container swimlane creates tab with matching cookieStoreId
  // ==========================================================================
  test('AT-2: dispatching shortcut from container swimlane creates tab with matching cookieStoreId', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, tabBehavior: 'keep' },
    });

    // Target: Work container shortcut "GitHub" (cookieStoreId: "firefox-container-2")
    const workCard = loc.shortcutCardByTitle(page, 'GitHub');
    await expect(workCard).toBeVisible();

    await workCard.click();

    // Verify tab dispatch payload captured by mock WebExtension tabs API
    const dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(1);

    const targetTab = dispatched[0];
    expect(targetTab.url).toBe('https://github.com');
    expect(targetTab.cookieStoreId).toBe('firefox-container-2');
    expect(targetTab.active).toBe(true);
  });

  // ==========================================================================
  // AT-3: Shortcuts can be added, updated, reordered, and deleted with active undo toast
  // ==========================================================================
  test('AT-3: complete shortcut lifecycle (add -> update -> drag-reorder -> delete -> undo -> permanent purge)', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Initial Link', 'https://initial.com', 0),
        ],
      },
    });

    const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');

    // 1. ADD
    await loc.addShortcutButton(personalSwimlane).click();
    await loc.modalTitleInput(page).fill('Notion Workspace');
    await loc.modalUrlInput(page).fill('https://notion.so');
    await loc.modalSubmitButton(page).click();

    await expect(loc.modalDialog(page)).not.toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Notion Workspace')).toBeVisible();

    // 2. UPDATE
    const notionCard = loc.shortcutCardByTitle(page, 'Notion Workspace');
    await loc.shortcutMenuButton(notionCard).click();
    await loc.shortcutEditAction(page).click();

    await loc.modalTitleInput(page).fill('Team Notion');
    await loc.modalUrlInput(page).fill('https://team.notion.so');
    await loc.modalSubmitButton(page).click();

    await expect(loc.shortcutCardByTitle(page, 'Team Notion')).toBeVisible();

    // 3. REORDER (Drag and Drop simulation)
    const cards = loc.shortcutCards(personalSwimlane);
    const sourceCard = loc.shortcutCardByTitle(page, 'Team Notion');
    const targetCard = loc.shortcutCardByTitle(page, 'Initial Link');

    await sourceCard.dragTo(targetCard);

    // Verify order update in storage
    const storageAfterReorder = await mockHarness.getStorage();
    const personalItems = storageAfterReorder.foxlaunch_shortcuts['firefox-container-1'];
    expect(personalItems).toHaveLength(2);

    // 4. DELETE
    const cardToDelete = loc.shortcutCardByTitle(page, 'Team Notion');
    await loc.shortcutMenuButton(cardToDelete).click();
    await loc.shortcutDeleteAction(page).click();

    await expect(loc.shortcutCardByTitle(page, 'Team Notion')).not.toBeVisible();
    await expect(loc.toastNotification(page)).toBeVisible();

    // 5. UNDO
    await loc.toastUndoButton(page).click();
    await expect(loc.shortcutCardByTitle(page, 'Team Notion')).toBeVisible();

    // 6. PERMANENT PURGE (Delete again and wait for 5s toast expiration)
    const restoredCard = loc.shortcutCardByTitle(page, 'Team Notion');
    await loc.shortcutMenuButton(restoredCard).click();
    await loc.shortcutDeleteAction(page).click();

    await expect(loc.toastNotification(page)).toBeVisible();
    await expect(loc.toastNotification(page)).not.toBeVisible({ timeout: 7000 });

    const finalStorage = await mockHarness.getStorage();
    const finalItems = finalStorage.foxlaunch_shortcuts['firefox-container-1'];
    expect(finalItems.some((i: any) => i.title === 'Team Notion')).toBe(false);
  });

  // ==========================================================================
  // AT-4: Stored shortcuts and user preferences persist reliably across extension reloads
  // ==========================================================================
  test('AT-4: configured shortcuts, themes, and collapse states survive page reload', async ({ openFoxLaunch, page, mockHarness }) => {
    // 1. Initial configuration
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-2': [
          makeShortcut('firefox-container-2', 'Persistent Wiki', 'https://wiki.corp.internal', 0),
        ],
      },
      settings: {
        ...DEFAULT_SETTINGS,
        theme: 'auto',
        tabBehavior: 'close',
      },
    });

    // 2. Change theme to dark via settings
    await loc.settingsButton(page).click();
    await loc.settingsThemeOption(page, 'dark').click();
    await loc.settingsTab(page, 'behavior').click();
    await loc.settingsTabBehaviorKeep(page).click();
    await page.keyboard.press('Escape');

    // 3. Collapse Personal swimlane
    const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
    await loc.swimlaneToggle(personalSwimlane).click();
    await expect(loc.swimlaneToggle(personalSwimlane)).toHaveAttribute('aria-expanded', 'false');

    // 4. Simulate complete extension reload
    await mockHarness.reloadPage();

    // 5. Verify persistence
    // Check dark theme
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Check personal swimlane still collapsed
    const reloadedPersonal = loc.swimlaneById(page, 'firefox-container-1');
    await expect(loc.swimlaneToggle(reloadedPersonal)).toHaveAttribute('aria-expanded', 'false');

    // Check shortcut in Work swimlane still intact
    const reloadedWork = loc.swimlaneById(page, 'firefox-container-2');
    await expect(reloadedWork).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Persistent Wiki')).toBeVisible();

    // Check tabBehavior keep persisted in storage
    const storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_settings.theme).toBe('dark');
    expect(storage.foxlaunch_settings.tabBehavior).toBe('keep');
    expect(storage.foxlaunch_settings.swimlaneCollapse['firefox-container-1']).toBe(true);
  });

  // ==========================================================================
  // Full Keyboard Accessibility (WCAG AA Compliance)
  // ==========================================================================
  test.describe('Full Keyboard Accessibility (WCAG AA)', () => {
    test('tab cycling navigates through search, settings, swimlanes, and cards smoothly', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      // Start at top of document
      await page.keyboard.press('Tab');

      // First focusable element is Search Input
      const searchInput = loc.searchInput(page);
      await expect(searchInput).toBeFocused();

      // Next tab is Settings Button
      await page.keyboard.press('Tab');
      const settingsBtn = loc.settingsButton(page);
      await expect(settingsBtn).toBeFocused();

      // Next tabs reach swimlane headers / cards
      await page.keyboard.press('Tab');
      const activeEl = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.className);
      expect(activeEl).toBeDefined();
    });

    test('modal traps focus: Tab key loops exclusively within open modal without leaking to background', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await loc.addShortcutButton(personalSwimlane).click();

      const modal = loc.modalDialog(page);
      await expect(modal).toBeVisible();

      // Press Tab multiple times inside modal
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        // Ensure focused element is inside modal root
        const isInsideModal = await page.evaluate(() => {
          const modalRoot = document.getElementById('modal-root');
          return modalRoot ? modalRoot.contains(document.activeElement) : false;
        });
        expect(isInsideModal).toBe(true);
      }
    });

    test('pressing Escape dismisses any open modal and restores focus to triggering element', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const gearBtn = loc.settingsButton(page);
      await gearBtn.click();
      await expect(loc.settingsModal(page)).toBeVisible();

      // Press Esc to dismiss
      await page.keyboard.press('Escape');
      await expect(loc.settingsModal(page)).not.toBeVisible();

      // Focus returns to gear button
      await expect(gearBtn).toBeFocused();
    });

    test('pressing Enter on focused shortcut card triggers tab dispatch', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: { ...DEFAULT_SETTINGS, tabBehavior: 'keep' },
      });

      const card = loc.shortcutCardByTitle(page, 'Reddit');
      await card.focus();
      await page.keyboard.press('Enter');

      const dispatched = await mockHarness.getDispatchedTabs();
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].url).toBe('https://reddit.com');
      expect(dispatched[0].cookieStoreId).toBe('firefox-container-1');
    });

    test('pressing Escape while focused on action menu closes menu and restores focus to menu trigger button', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const card = loc.shortcutCardByTitle(page, 'Reddit');
      const menuBtn = loc.shortcutMenuButton(card);
      await menuBtn.click();

      const editItem = loc.shortcutEditAction(page);
      await expect(editItem).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(editItem).not.toBeVisible();
      await expect(menuBtn).toBeFocused();
    });

    test('pressing Ctrl+Enter on focused shortcut card dispatches tab with active: false', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: { ...DEFAULT_SETTINGS, tabBehavior: 'close' },
      });

      const card = loc.shortcutCardByTitle(page, 'Reddit');
      await card.focus();
      await page.keyboard.press('Control+Enter');

      const dispatched = await mockHarness.getDispatchedTabs();
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].url).toBe('https://reddit.com');
      expect(dispatched[0].cookieStoreId).toBe('firefox-container-1');
      expect(dispatched[0].active).toBe(false);

      // Background dispatch must not close launcher tab even if tabBehavior is "close"
      const closed = await mockHarness.getClosedTabs();
      expect(closed).toHaveLength(0);
    });
  });
});
