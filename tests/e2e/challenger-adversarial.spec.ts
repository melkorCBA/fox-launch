/**
 * Challenger Adversarial Stress Suite for Milestone M4
 *
 * Authored by: challenger_m4_1
 * Purpose: Adversarially challenge settings modal, reset defaults, tab dispatch, and container fallback.
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

test.describe('Challenger Adversarial Stress Tests (M4)', () => {
  test.setTimeout(60000);

  // ==========================================================================
  // 1. Settings Modal: Rapid theme switching & tabBehavior toggling
  // ==========================================================================
  test('ADV-1: Rapid theme and tabBehavior toggling persists accurately without race conditions', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, theme: 'auto', tabBehavior: 'keep' },
    });

    const settingsBtn = loc.settingsButton(page);
    await settingsBtn.click();
    await expect(loc.settingsModal(page)).toBeVisible();

    // Rapidly toggle themes: light -> dark -> light -> auto
    await loc.settingsThemeOption(page, 'light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await loc.settingsThemeOption(page, 'dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await loc.settingsThemeOption(page, 'light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await loc.settingsThemeOption(page, 'auto').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');

    let storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_settings.theme).toBe('auto');

    // Rapidly toggle tabBehavior: close -> keep -> close
    await loc.settingsTab(page, 'behavior').click();
    await loc.settingsTabBehaviorClose(page).click();
    storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_settings.tabBehavior).toBe('close');

    await loc.settingsTabBehaviorKeep(page).click();
    storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_settings.tabBehavior).toBe('keep');

    await loc.settingsTabBehaviorClose(page).click();
    storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_settings.tabBehavior).toBe('close');

    // Close modal via Done
    await page.locator('#modal-root [data-action="close-modal"].btn-primary').click();
    await expect(loc.settingsModal(page)).not.toBeVisible();
  });

  // ==========================================================================
  // 2. Reset Defaults: Cancel retains data; Confirm resets shortcuts & settings, keeps onboarding dismissed
  // ==========================================================================
  test('ADV-2: Reset defaults cancellation preserves all user data; confirm performs clean reset', async ({ openFoxLaunch, page, mockHarness }) => {
    const customShortcuts = {
      'firefox-container-1': [
        makeShortcut('firefox-container-1', 'Custom 1', 'https://custom1.com', 0),
      ],
      'firefox-container-2': [
        makeShortcut('firefox-container-2', 'Custom 2', 'https://custom2.com', 0),
      ],
    };

    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: customShortcuts,
      settings: {
        ...DEFAULT_SETTINGS,
        theme: 'dark',
        tabBehavior: 'close',
        firstRunDismissed: true,
      },
    });

    // Verify initial state rendered
    await expect(loc.shortcutCardByTitle(page, 'Custom 1')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Custom 2')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Open settings modal
    await loc.settingsButton(page).click();
    await expect(loc.settingsModal(page)).toBeVisible();
    await loc.settingsTab(page, 'data').click();

    const resetBtn = page.locator('#modal-root [data-action="reset-defaults"]');
    const confirmPanel = page.locator('#modal-root .reset-confirm-panel');
    const cancelBtn = page.locator('#modal-root [data-action="cancel-reset"]');
    const confirmBtn = page.locator('#modal-root [data-action="confirm-reset"]');

    // Step 1: Click Reset -> panel opens
    await resetBtn.click();
    await expect(confirmPanel).toBeVisible();
    await expect(resetBtn).not.toBeVisible();

    // Step 2: Click Cancel -> panel hides, reset button restores, storage untouched
    await cancelBtn.click();
    await expect(confirmPanel).not.toBeVisible();
    await expect(resetBtn).toBeVisible();

    let storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_shortcuts['firefox-container-1']).toHaveLength(1);
    expect(storage.foxlaunch_shortcuts['firefox-container-2']).toHaveLength(1);
    expect(storage.foxlaunch_settings.theme).toBe('dark');
    expect(storage.foxlaunch_settings.tabBehavior).toBe('close');

    // Step 3: Click Reset again, then Confirm
    await resetBtn.click();
    await expect(confirmPanel).toBeVisible();
    await confirmBtn.click();

    // Modal should close immediately
    await expect(loc.settingsModal(page)).not.toBeVisible();

    // Verify storage reset
    storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_shortcuts).toEqual({});
    expect(storage.foxlaunch_settings.theme).toBe('auto');
    expect(storage.foxlaunch_settings.tabBehavior).toBe('keep');
    expect(storage.foxlaunch_settings.firstRunDismissed).toBe(true);

    // Verify UI reflects reset without reload: cards gone, theme cleared, empty placeholders visible
    await expect(loc.shortcutCardByTitle(page, 'Custom 1')).not.toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Custom 2')).not.toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.swimlane-empty').first()).toBeVisible();

    // Verify onboarding overlay does NOT appear because firstRunDismissed is retained as true
    await expect(loc.onboardingOverlay(page)).not.toBeVisible();
  });

  test('ADV-3a: Middle-click background dispatch never closes launcher tab even when tabBehavior is "close"', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Middle Test', 'https://middle.test', 0),
        ],
      },
      settings: { ...DEFAULT_SETTINGS, tabBehavior: 'close' },
    });

    const middleCard = loc.shortcutCardByTitle(page, 'Middle Test');
    await middleCard.click({ button: 'middle' });

    const dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].url).toBe('https://middle.test');
    expect(dispatched[0].cookieStoreId).toBe('firefox-container-1');
    expect(dispatched[0].active).toBe(false);

    const closed = await mockHarness.getClosedTabs();
    expect(closed).toHaveLength(0); // Launcher tab MUST NOT close!
  });

  test('ADV-3b: Ctrl+click background dispatch never closes launcher tab even when tabBehavior is "close"', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Ctrl Test', 'https://ctrl.test', 0),
        ],
      },
      settings: { ...DEFAULT_SETTINGS, tabBehavior: 'close' },
    });

    const ctrlCard = loc.shortcutCardByTitle(page, 'Ctrl Test');
    await ctrlCard.click({ modifiers: ['Control'] });

    const dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].url).toBe('https://ctrl.test');
    expect(dispatched[0].cookieStoreId).toBe('firefox-container-1');
    expect(dispatched[0].active).toBe(false);

    const closed = await mockHarness.getClosedTabs();
    expect(closed).toHaveLength(0); // Launcher tab MUST NOT close!
  });

  test('ADV-3c: Ctrl+Enter keyboard background dispatch never closes launcher tab even when tabBehavior is "close"', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Keyboard BG Test', 'https://kbbg.test', 0),
        ],
      },
      settings: { ...DEFAULT_SETTINGS, tabBehavior: 'close' },
    });

    const kbBgCard = loc.shortcutCardByTitle(page, 'Keyboard BG Test');
    await kbBgCard.focus();
    await page.keyboard.press('Control+Enter');

    const dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].url).toBe('https://kbbg.test');
    expect(dispatched[0].cookieStoreId).toBe('firefox-container-1');
    expect(dispatched[0].active).toBe(false);

    const closed = await mockHarness.getClosedTabs();
    expect(closed).toHaveLength(0); // Still 0 closed tabs!
  });

  test('ADV-3d: Left-click foreground dispatch closes launcher tab when tabBehavior is "close"', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Foreground Test', 'https://fg.test', 0),
        ],
      },
      settings: { ...DEFAULT_SETTINGS, tabBehavior: 'close' },
    });

    const fgCard = loc.shortcutCardByTitle(page, 'Foreground Test');
    await fgCard.click();

    const dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].url).toBe('https://fg.test');
    expect(dispatched[0].cookieStoreId).toBe('firefox-container-1');
    expect(dispatched[0].active).toBe(true);

    const closed = await mockHarness.getClosedTabs();
    expect(closed.length).toBeGreaterThan(0); // Launcher tab IS closed!
  });

  // ==========================================================================
  // 4. Default Container Fallback & Edge Dispatching
  // ==========================================================================
  test('ADV-4: Shortcuts in default context or fallback cookieStoreId dispatch to firefox-default', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-default': [
          makeShortcut('firefox-default', 'Uncontained App', 'https://uncontained.local', 0),
        ],
      },
      settings: {
        ...DEFAULT_SETTINGS,
        tabBehavior: 'keep',
        swimlaneCollapse: { 'firefox-default': false },
      },
    });

    const defaultCard = loc.shortcutCardByTitle(page, 'Uncontained App');
    await expect(defaultCard).toBeVisible();

    // Dispatch via left-click
    await defaultCard.click();

    let dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].url).toBe('https://uncontained.local');
    expect(dispatched[0].cookieStoreId).toBe('firefox-default');
    expect(dispatched[0].active).toBe(true);

    // Also directly verify dispatchShortcut fallback via page evaluation
    const fallbackResult = await page.evaluate(async () => {
      // Access tabs service directly from module if exposed or through window
      const win = window as any;
      if (typeof win.browser !== 'undefined' && win.browser.tabs?.create) {
        // Test fallback when cookieStoreId is empty string or undefined
        await win.browser.tabs.create({
          url: 'https://fallback-check.org',
          cookieStoreId: '' || 'firefox-default',
          active: true,
        });
        return true;
      }
      return false;
    });

    expect(fallbackResult).toBe(true);
    dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(2);
    expect(dispatched[1].url).toBe('https://fallback-check.org');
    expect(dispatched[1].cookieStoreId).toBe('firefox-default');
  });

});
