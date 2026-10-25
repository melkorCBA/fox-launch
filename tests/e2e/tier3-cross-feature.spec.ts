/**
 * Tier 3: Cross-Feature Combinations E2E Tests
 *
 * Verifies complex pairwise interactions between concurrent features:
 * 1. Search filtering while modal is open
 * 2. Deleting filtered shortcut and triggering undo
 * 3. Theme switching while modal is open
 * 4. Collapsing swimlane and searching within it
 * 5. Editing shortcut while search filter is active
 * 6. Simultaneous active Undo toast and opening Add modal
 *
 * Specification References:
 * - foxlaunch_specification.md §FR-1, §FR-2, §FR-3, §FR-4
 * - pilot-plan.md §D3, §D8, §D9, §D27, §D29
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

test.describe('Tier 3: Cross-Feature Combinations', () => {

  // ==========================================================================
  // 1. Search Filtering While Modal is Open
  // ==========================================================================
  test('3.1 search filter remains active when opening and closing modal without hotkey interception', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
    });

    // 1. Filter by "Git"
    const searchInput = loc.searchInput(page);
    await searchInput.fill('Git');
    await expect(loc.shortcutCardByTitle(page, 'GitHub')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Reddit')).not.toBeVisible();

    // 2. Open Add Shortcut modal on Work container
    const workSwimlane = loc.swimlaneById(page, 'firefox-container-2');
    await loc.addShortcutButton(workSwimlane).click();
    await expect(loc.modalDialog(page)).toBeVisible();

    // 3. Type inside modal with '/' character to ensure '/' hotkey doesn't jump to search
    const titleInput = loc.modalTitleInput(page);
    await titleInput.fill('GitLab / CI');
    expect(await titleInput.inputValue()).toBe('GitLab / CI');
    expect(await searchInput.inputValue()).toBe('Git');

    // 4. Close modal via Escape
    await page.keyboard.press('Escape');
    await expect(loc.modalDialog(page)).not.toBeVisible();

    // 5. Search query and filtered results are preserved
    expect(await searchInput.inputValue()).toBe('Git');
    await expect(loc.shortcutCardByTitle(page, 'GitHub')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Reddit')).not.toBeVisible();
  });

  // ==========================================================================
  // 2. Deleting Filtered Shortcut and Triggering Undo
  // ==========================================================================
  test('3.2 deleting a shortcut from active filtered search and undoing restores card in filtered view', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-2': [
          makeShortcut('firefox-container-2', 'Alpha Docs', 'https://docs.alpha.com', 0),
          makeShortcut('firefox-container-2', 'Beta Docs', 'https://docs.beta.com', 1),
        ],
      },
    });

    // 1. Search for "Docs" (both match)
    const searchInput = loc.searchInput(page);
    await searchInput.fill('Docs');
    await expect(loc.shortcutCardByTitle(page, 'Alpha Docs')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Beta Docs')).toBeVisible();

    // 2. Delete "Alpha Docs"
    const card = loc.shortcutCardByTitle(page, 'Alpha Docs');
    await loc.shortcutMenuButton(card).click();
    await loc.shortcutDeleteAction(page).click();

    // 3. Alpha Docs is hidden, Beta Docs is still visible, Undo toast appears
    await expect(loc.shortcutCardByTitle(page, 'Alpha Docs')).not.toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Beta Docs')).toBeVisible();
    await expect(loc.toastNotification(page)).toBeVisible();

    // 4. Click Undo
    await loc.toastUndoButton(page).click();

    // 5. Alpha Docs reappears in the active filtered view
    await expect(loc.shortcutCardByTitle(page, 'Alpha Docs')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Beta Docs')).toBeVisible();
  });

  // ==========================================================================
  // 3. Theme Switching While Modal is Open
  // ==========================================================================
  test('3.3 toggling theme dynamically inside settings modal updates background and open modal immediately', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
    });

    // 1. Open Settings modal
    await loc.settingsButton(page).click();
    await expect(loc.settingsModal(page)).toBeVisible();

    // 2. Switch to Dark Theme
    await loc.settingsThemeOption(page, 'dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 3. Switch to Light Theme while modal is still open
    await loc.settingsThemeOption(page, 'light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // 4. Close modal with Escape
    await page.keyboard.press('Escape');
    await expect(loc.settingsModal(page)).not.toBeVisible();

    // 5. Light theme remains active on entire document
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_settings.theme).toBe('light');
  });

  // ==========================================================================
  // 4. Collapsing Swimlane and Searching Within It
  // ==========================================================================
  test('3.4 searching for a shortcut in a collapsed swimlane auto-expands or highlights matching cards', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
      settings: DEFAULT_SETTINGS,
    });

    const workSwimlane = loc.swimlaneById(page, 'firefox-container-2');
    const toggle = loc.swimlaneToggle(workSwimlane);

    // 1. Collapse Work swimlane
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // 2. Search for a card located inside the collapsed swimlane ("Slack")
    const searchInput = loc.searchInput(page);
    await searchInput.fill('Slack');

    // 3. The matching shortcut card must be rendered and visible
    const slackCard = loc.shortcutCardByTitle(page, 'Slack Web');
    await expect(slackCard).toBeVisible();

    // 4. Clearing search restores or leaves swimlane manageable
    await searchInput.fill('');
    await expect(workSwimlane).toBeVisible();
  });

  // ==========================================================================
  // 5. Editing Shortcut While Search Filter is Active
  // ==========================================================================
  test('3.5 editing shortcut title so it no longer matches search filter removes it from view immediately', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Staging Portal', 'https://stage.example.com'),
        ],
      },
    });

    // 1. Search for "Staging"
    const searchInput = loc.searchInput(page);
    await searchInput.fill('Staging');
    await expect(loc.shortcutCardByTitle(page, 'Staging Portal')).toBeVisible();

    // 2. Edit shortcut title to "Production Gateway"
    const card = loc.shortcutCardByTitle(page, 'Staging Portal');
    await loc.shortcutMenuButton(card).click();
    await loc.shortcutEditAction(page).click();

    await loc.modalTitleInput(page).fill('Production Gateway');
    await loc.modalSubmitButton(page).click();

    // 3. Because query is still "Staging", card is no longer visible
    await expect(loc.shortcutCardByTitle(page, 'Production Gateway')).not.toBeVisible();

    // 4. Clear search query: "Production Gateway" becomes visible
    await searchInput.fill('');
    await expect(loc.shortcutCardByTitle(page, 'Production Gateway')).toBeVisible();
  });

  // ==========================================================================
  // 6. Simultaneous Active Undo Toast and Opening Add Modal
  // ==========================================================================
  test('3.6 opening Add modal while Undo toast is visible manages focus trap and dismissal independently', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: SAMPLE_SHORTCUTS,
    });

    // 1. Delete a shortcut to trigger Undo toast
    const card = loc.shortcutCardByTitle(page, 'Reddit');
    await loc.shortcutMenuButton(card).click();
    await loc.shortcutDeleteAction(page).click();
    await expect(loc.toastNotification(page)).toBeVisible();

    // 2. While toast is active, open Add modal
    const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
    await loc.addShortcutButton(personalSwimlane).click();

    const modal = loc.modalDialog(page);
    await expect(modal).toBeVisible();

    // 3. Pressing Escape closes the modal, does not break or interfere with toast
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
});
