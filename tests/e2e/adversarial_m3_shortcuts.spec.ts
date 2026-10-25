/**
 * Adversarial Verification Suite — Challenger M3 Fix 2
 *
 * Stress-testing:
 * 1. Rapid Action Menu toggling & Escape key dismissals (listener leak & focus restoration)
 * 2. Cross-card singleton menu enforcement
 * 3. Rapid click jitter on menu triggers
 * 4. Keyboard dispatch parity (Enter, Ctrl+Enter, Meta+Enter) and tabBehavior interaction
 * 5. Menu-internal Enter isolation (Enter on menu item does not trigger card dispatch)
 * 6. Escape when no menu is active
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

test.describe('Adversarial M3 Fix 2: Action Menu Resilience & Keyboard Shortcuts', () => {

  test('1. Rapid open and Escape dismissal cycle (20 iterations) preserves focus and cleans DOM', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
    });

    const card = loc.shortcutCardByTitle(page, 'Reddit');
    const menuBtn = loc.shortcutMenuButton(card);

    for (let i = 0; i < 20; i++) {
      await menuBtn.click();
      const editItem = loc.shortcutEditAction(page);
      await expect(editItem).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(editItem).not.toBeVisible();
      await expect(menuBtn).toBeFocused();

      // Ensure no leftover menu elements in the DOM
      const menuCount = await page.locator('.shortcut-menu').count();
      expect(menuCount).toBe(0);
    }
  });

  test('2. Rapid cross-card menu opening maintains strict singleton menu without leak', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Card Alpha', 'https://alpha.com', 0, 'sc-a'),
          makeShortcut('firefox-container-1', 'Card Beta', 'https://beta.com', 1, 'sc-b'),
          makeShortcut('firefox-container-1', 'Card Gamma', 'https://gamma.com', 2, 'sc-c'),
          makeShortcut('firefox-container-1', 'Card Delta', 'https://delta.com', 3, 'sc-d'),
        ],
      },
    });

    const cardA = loc.shortcutCardByTitle(page, 'Card Alpha');
    const cardB = loc.shortcutCardByTitle(page, 'Card Beta');
    const cardC = loc.shortcutCardByTitle(page, 'Card Gamma');
    const cardD = loc.shortcutCardByTitle(page, 'Card Delta');

    const btnA = loc.shortcutMenuButton(cardA);
    const btnB = loc.shortcutMenuButton(cardB);
    const btnC = loc.shortcutMenuButton(cardC);
    const btnD = loc.shortcutMenuButton(cardD);

    // Rapidly click buttons in succession without closing previous ones
    await btnA.click();
    expect(await page.locator('.shortcut-menu').count()).toBe(1);

    await btnB.click();
    expect(await page.locator('.shortcut-menu').count()).toBe(1);

    await btnC.click();
    expect(await page.locator('.shortcut-menu').count()).toBe(1);

    await btnD.click();
    expect(await page.locator('.shortcut-menu').count()).toBe(1);

    // Escape should close Card Delta's menu and restore focus to btnD
    await page.keyboard.press('Escape');
    expect(await page.locator('.shortcut-menu').count()).toBe(0);
    await expect(btnD).toBeFocused();
  });

  test('3. Rapid double-click / click jitter on menu trigger toggles cleanly', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
    });

    const card = loc.shortcutCardByTitle(page, 'Reddit');
    const menuBtn = loc.shortcutMenuButton(card);

    // Click twice rapidly: should open then immediately close
    await menuBtn.click();
    await menuBtn.click();

    expect(await page.locator('.shortcut-menu').count()).toBe(0);

    // Click once more: should open cleanly
    await menuBtn.click();
    expect(await page.locator('.shortcut-menu').count()).toBe(1);

    // Click again: should close cleanly
    await menuBtn.click();
    expect(await page.locator('.shortcut-menu').count()).toBe(0);
  });

  test('4. Pressing Escape when no menu is open does not throw or displace focus', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
    });

    const card = loc.shortcutCardByTitle(page, 'Reddit');
    await card.focus();
    await expect(card).toBeFocused();

    // Press Escape without any menu open
    await page.keyboard.press('Escape');

    // Verify page is still responsive and card remains focused
    await expect(card).toBeFocused();
    expect(await page.locator('.shortcut-menu').count()).toBe(0);
  });

  test('5. Keyboard Enter on focused menu item executes action and does not dispatch tab', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, tabBehavior: 'keep' },
    });

    const card = loc.shortcutCardByTitle(page, 'Reddit');
    const menuBtn = loc.shortcutMenuButton(card);
    await menuBtn.click();

    const editBtn = loc.shortcutEditAction(page);
    await expect(editBtn).toBeVisible();

    // Focus the edit button inside the menu dropdown and press Enter
    await editBtn.focus();
    await page.keyboard.press('Enter');

    // Modal should open
    await expect(loc.modalDialog(page)).toBeVisible();
    await expect(loc.modalTitleInput(page)).toHaveValue('Reddit');

    // No tab dispatch should have occurred
    const dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(0);
  });

  test('6. Ctrl+Enter vs Meta+Enter vs Enter on card respects background vs foreground dispatch', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Alpha', 'https://alpha.com', 0, 'sc-1'),
          makeShortcut('firefox-container-1', 'Beta', 'https://beta.com', 1, 'sc-2'),
          makeShortcut('firefox-container-1', 'Gamma', 'https://gamma.com', 2, 'sc-3'),
        ],
      },
      settings: { ...DEFAULT_SETTINGS, tabBehavior: 'close' },
    });

    // 1. Ctrl+Enter on Alpha: background dispatch, NO launcher close
    const cardAlpha = loc.shortcutCardByTitle(page, 'Alpha');
    await cardAlpha.focus();
    await page.keyboard.press('Control+Enter');

    let dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].url).toBe('https://alpha.com');
    expect(dispatched[0].active).toBe(false);

    let closed = await mockHarness.getClosedTabs();
    expect(closed).toHaveLength(0);

    // 2. Meta+Enter on Beta: background dispatch, NO launcher close
    const cardBeta = loc.shortcutCardByTitle(page, 'Beta');
    await cardBeta.focus();
    await page.keyboard.press('Meta+Enter');

    dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(2);
    expect(dispatched[1].url).toBe('https://beta.com');
    expect(dispatched[1].active).toBe(false);

    closed = await mockHarness.getClosedTabs();
    expect(closed).toHaveLength(0);

    // 3. Regular Enter on Gamma: foreground dispatch, launcher CLOSED
    const cardGamma = loc.shortcutCardByTitle(page, 'Gamma');
    await cardGamma.focus();
    await page.keyboard.press('Enter');

    dispatched = await mockHarness.getDispatchedTabs();
    expect(dispatched).toHaveLength(3);
    expect(dispatched[2].url).toBe('https://gamma.com');
    expect(dispatched[2].active).toBe(true);

    closed = await mockHarness.getClosedTabs();
    expect(closed).toHaveLength(1);
  });

  test('7. Clicking outside open menu dismisses menu and removes global event listener', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
    });

    const card = loc.shortcutCardByTitle(page, 'Reddit');
    const menuBtn = loc.shortcutMenuButton(card);
    await menuBtn.click();

    expect(await page.locator('.shortcut-menu').count()).toBe(1);

    // Click outside on the header search input
    await loc.searchInput(page).click();

    expect(await page.locator('.shortcut-menu').count()).toBe(0);

    // Now press Escape while focused on search input: should not focus menuBtn
    await page.keyboard.press('Escape');
    expect(await page.locator('.shortcut-menu').count()).toBe(0);
    // Menu button is NOT focused because listener was cleanly unhooked
    await expect(menuBtn).not.toBeFocused();
  });
});
