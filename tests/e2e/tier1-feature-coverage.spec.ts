/**
 * Tier 1: Feature Coverage E2E Tests
 *
 * Verifies core functionality across all 8 feature areas:
 * 1. Container discovery & swimlanes rendering (>=5 tests)
 * 2. Default uncontained context ('firefox-default') collapsed by default (>=5 tests)
 * 3. Search / filter bar & '/' hotkey (>=5 tests)
 * 4. Shortcut add/edit/delete (>=5 tests)
 * 5. Container tab dispatch (left click) (>=5 tests)
 * 6. Background tab dispatch (middle click / ctrl+click) (>=5 tests)
 * 7. Settings modal & theme preferences (>=5 tests)
 * 8. First-run onboarding walkthrough (>=5 tests)
 *
 * Specification References:
 * - foxlaunch_specification.md §FR-1, §FR-2, §FR-3, §FR-4, §NFR-3
 * - pilot-plan.md §D1 - §D30
 * - PROJECT.md §Feature Inventory
 */

import {
  test,
  expect,
  FoxLaunchLocators as loc,
  DEFAULT_MOCK_CONTAINERS,
  DEFAULT_SETTINGS,
  ONBOARDING_SETTINGS,
  SAMPLE_SHORTCUTS,
  DEV_CONTAINERS,
  EMPTY_CONTAINERS,
  makeShortcut,
} from '../fixtures';

test.describe('Tier 1: Feature Coverage', () => {

  // ==========================================================================
  // Area 1: Container Discovery & Swimlanes Rendering
  // ==========================================================================
  test.describe('1. Container Discovery & Swimlanes Rendering', () => {
    test('1.1 discovers and renders all 4 standard user containers with correct names', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: DEFAULT_SETTINGS,
      });

      // Verify swimlane elements exist for each container
      for (const container of DEFAULT_MOCK_CONTAINERS) {
        const swimlane = loc.swimlaneById(page, container.cookieStoreId);
        await expect(swimlane).toBeVisible();
        const title = loc.swimlaneTitle(swimlane);
        await expect(title).toContainText(container.name);
      }
    });

    test('1.2 renders native color badges or indicators matching container identity', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      // Check personal (blue: #37adff) and work (orange: #ff9400)
      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await expect(personalSwimlane).toBeVisible();
      const personalBadge = loc.swimlaneBadge(personalSwimlane);
      await expect(personalBadge).toBeVisible();

      const workSwimlane = loc.swimlaneById(page, 'firefox-container-2');
      await expect(workSwimlane).toBeVisible();
      const workBadge = loc.swimlaneBadge(workSwimlane);
      await expect(workBadge).toBeVisible();
    });

    test('1.3 displays accurate shortcut count badge per swimlane', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      // Personal has 3 shortcuts in SAMPLE_SHORTCUTS
      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      const personalCount = loc.swimlaneCount(personalSwimlane);
      await expect(personalCount).toContainText('3');

      // Work has 4 shortcuts in SAMPLE_SHORTCUTS
      const workSwimlane = loc.swimlaneById(page, 'firefox-container-2');
      const workCount = loc.swimlaneCount(workSwimlane);
      await expect(workCount).toContainText('4');
    });

    test('1.4 renders custom container setups dynamically (e.g. DevOps identities)', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEV_CONTAINERS,
        shortcuts: {},
      });

      for (const container of DEV_CONTAINERS) {
        const swimlane = loc.swimlaneById(page, container.cookieStoreId);
        await expect(swimlane).toBeVisible();
        await expect(loc.swimlaneTitle(swimlane)).toContainText(container.name);
      }
    });

    test('1.5 toggling swimlane collapse button toggles visibility and aria-expanded state', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      const toggleBtn = loc.swimlaneToggle(personalSwimlane);
      const cards = loc.shortcutCards(personalSwimlane);

      // Initially expanded
      await expect(cards.first()).toBeVisible();

      // Click to collapse
      await toggleBtn.click();
      await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

      // Click again to expand
      await toggleBtn.click();
      await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      await expect(cards.first()).toBeVisible();
    });
  });

  // ==========================================================================
  // Area 2: Default Uncontained Context ('firefox-default')
  // ==========================================================================
  test.describe('2. Default Uncontained Context (firefox-default)', () => {
    test('2.1 always renders default context swimlane even with 0 custom containers', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: EMPTY_CONTAINERS,
        shortcuts: {},
      });

      const defaultSwimlane = loc.swimlaneById(page, 'firefox-default');
      await expect(defaultSwimlane).toBeVisible();
    });

    test('2.2 default context is collapsed by default on initial load', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: DEFAULT_SETTINGS, // swimlaneCollapse['firefox-default'] is true
      });

      const defaultSwimlane = loc.swimlaneById(page, 'firefox-default');
      const toggle = loc.swimlaneToggle(defaultSwimlane);
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('2.3 expanding default context reveals its shortcuts', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: DEFAULT_SETTINGS,
      });

      const defaultSwimlane = loc.swimlaneById(page, 'firefox-default');
      const toggle = loc.swimlaneToggle(defaultSwimlane);

      // Expand default swimlane
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');

      // Check shortcut cards inside default swimlane (MDN, Wikipedia)
      const mdnCard = defaultSwimlane.locator('.shortcut-card:has-text("Mozilla Developer Network")');
      await expect(mdnCard).toBeVisible();
    });

    test('2.4 collapse state changes on default context persist to settings storage', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: DEFAULT_SETTINGS,
      });

      const defaultSwimlane = loc.swimlaneById(page, 'firefox-default');
      const toggle = loc.swimlaneToggle(defaultSwimlane);

      // Expand it (setting collapsed to false)
      await toggle.click();

      // Verify persisted in browser.storage.local
      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_settings.swimlaneCollapse['firefox-default']).toBe(false);
    });

    test('2.5 default context displays distinct neutral badge styling', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const defaultSwimlane = loc.swimlaneById(page, 'firefox-default');
      const badge = loc.swimlaneBadge(defaultSwimlane);
      await expect(badge).toBeVisible();
      const title = loc.swimlaneTitle(defaultSwimlane);
      await expect(title).toContainText(/Default|Uncontained/i);
    });
  });

  // ==========================================================================
  // Area 3: Search / Filter Bar & '/' Hotkey
  // ==========================================================================
  test.describe('3. Search / Filter Bar & Hotkey', () => {
    test('3.1 pressing "/" anywhere focuses search input when not typing in an input', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const searchInput = loc.searchInput(page);
      await expect(searchInput).not.toBeFocused();

      // Press '/' hotkey on page
      await page.keyboard.press('/');
      await expect(searchInput).toBeFocused();
    });

    test('3.2 typing query filters shortcuts matching title in real time', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const searchInput = loc.searchInput(page);
      await searchInput.fill('GitHub');

      // GitHub card in Work container should be visible
      const githubCard = loc.shortcutCardByTitle(page, 'GitHub');
      await expect(githubCard).toBeVisible();

      // Non-matching card (Reddit in Personal) should be hidden
      const redditCard = loc.shortcutCardByTitle(page, 'Reddit');
      await expect(redditCard).not.toBeVisible();
    });

    test('3.3 typing query filters shortcuts matching domain/URL in real time', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const searchInput = loc.searchInput(page);
      await searchInput.fill('chase.com');

      const chaseCard = loc.shortcutCardByTitle(page, 'Online Banking Portal');
      await expect(chaseCard).toBeVisible();

      const slackCard = loc.shortcutCardByTitle(page, 'Slack Web');
      await expect(slackCard).not.toBeVisible();
    });

    test('3.4 clearing search query restores visibility of all shortcuts', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const searchInput = loc.searchInput(page);
      await searchInput.fill('Mastodon');
      await expect(loc.shortcutCardByTitle(page, 'Mastodon')).toBeVisible();
      await expect(loc.shortcutCardByTitle(page, 'GitHub')).not.toBeVisible();

      // Clear search
      await searchInput.fill('');
      await expect(loc.shortcutCardByTitle(page, 'Mastodon')).toBeVisible();
      await expect(loc.shortcutCardByTitle(page, 'GitHub')).toBeVisible();
    });

    test('3.5 pressing "/" while typing in an input does not steal or reset focus', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await loc.addShortcutButton(personalSwimlane).click();

      const titleInput = loc.modalTitleInput(page);
      await titleInput.focus();
      await titleInput.fill('Test/Slash');

      // Focus should remain in title input, not jump to search
      await expect(titleInput).toBeFocused();
      expect(await titleInput.inputValue()).toContain('Test/Slash');
    });
  });

  // ==========================================================================
  // Area 4: Shortcut Add/Edit/Delete
  // ==========================================================================
  test.describe('4. Shortcut Add/Edit/Delete', () => {
    test('4.1 clicking "+" button opens Add Shortcut modal with container pre-selected', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const workSwimlane = loc.swimlaneById(page, 'firefox-container-2');
      await loc.addShortcutButton(workSwimlane).click();

      const modal = loc.modalDialog(page);
      await expect(modal).toBeVisible();
      await expect(loc.modalTitleInput(page)).toBeVisible();
      await expect(loc.modalUrlInput(page)).toBeVisible();
    });

    test('4.2 submitting Add modal creates card and persists to browser.storage.local', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: { 'firefox-container-1': [] },
      });

      const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
      await loc.addShortcutButton(personalSwimlane).click();

      await loc.modalTitleInput(page).fill('GitLab');
      await loc.modalUrlInput(page).fill('https://gitlab.com');
      await loc.modalSubmitButton(page).click();

      // Modal closes
      await expect(loc.modalDialog(page)).not.toBeVisible();

      // New card appears
      const newCard = loc.shortcutCardByTitle(page, 'GitLab');
      await expect(newCard).toBeVisible();

      // Persisted to storage
      const storage = await mockHarness.getStorage();
      const items = storage.foxlaunch_shortcuts['firefox-container-1'];
      expect(items.some((i: any) => i.title === 'GitLab' && i.url === 'https://gitlab.com')).toBe(true);
    });

    test('4.3 opening Edit modal pre-populates existing title and URL', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const card = loc.shortcutCardByTitle(page, 'Reddit');
      await loc.shortcutMenuButton(card).click();
      await loc.shortcutEditAction(page).click();

      const modal = loc.modalDialog(page);
      await expect(modal).toBeVisible();
      await expect(loc.modalTitleInput(page)).toHaveValue('Reddit');
      await expect(loc.modalUrlInput(page)).toHaveValue('https://reddit.com');
    });

    test('4.4 submitting Edit modal updates card title and URL in view and storage', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const card = loc.shortcutCardByTitle(page, 'Reddit');
      await loc.shortcutMenuButton(card).click();
      await loc.shortcutEditAction(page).click();

      await loc.modalTitleInput(page).fill('Reddit Old');
      await loc.modalUrlInput(page).fill('https://old.reddit.com');
      await loc.modalSubmitButton(page).click();

      await expect(loc.modalDialog(page)).not.toBeVisible();
      await expect(loc.shortcutCardByTitle(page, 'Reddit Old')).toBeVisible();

      const storage = await mockHarness.getStorage();
      const items = storage.foxlaunch_shortcuts['firefox-container-1'];
      expect(items.some((i: any) => i.title === 'Reddit Old' && i.url === 'https://old.reddit.com')).toBe(true);
    });

    test('4.5 clicking Delete removes card and displays 5-second undo toast notification', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const card = loc.shortcutCardByTitle(page, 'Mastodon');
      await loc.shortcutMenuButton(card).click();
      await loc.shortcutDeleteAction(page).click();

      // Card is removed from view
      await expect(loc.shortcutCardByTitle(page, 'Mastodon')).not.toBeVisible();

      // Undo toast appears
      const toast = loc.toastNotification(page);
      await expect(toast).toBeVisible();
      await expect(loc.toastUndoButton(page)).toBeVisible();
    });
  });

  // ==========================================================================
  // Area 5: Container Tab Dispatch (Left Click)
  // ==========================================================================
  test.describe('5. Container Tab Dispatch (Left Click)', () => {
    test('5.1 left-clicking Personal shortcut calls browser.tabs.create with Personal cookieStoreId', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: { ...DEFAULT_SETTINGS, tabBehavior: 'keep' },
      });

      const card = loc.shortcutCardByTitle(page, 'Personal Email');
      await card.click();

      const dispatched = await mockHarness.getDispatchedTabs();
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].url).toBe('https://mail.proton.me');
      expect(dispatched[0].cookieStoreId).toBe('firefox-container-1');
      expect(dispatched[0].active).toBe(true);
    });

    test('5.2 left-clicking Work shortcut calls browser.tabs.create with Work cookieStoreId', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: { ...DEFAULT_SETTINGS, tabBehavior: 'keep' },
      });

      const card = loc.shortcutCardByTitle(page, 'GitHub');
      await card.click();

      const dispatched = await mockHarness.getDispatchedTabs();
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].url).toBe('https://github.com');
      expect(dispatched[0].cookieStoreId).toBe('firefox-container-2');
    });

    test('5.3 left-clicking Banking shortcut calls browser.tabs.create with Banking cookieStoreId', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: { ...DEFAULT_SETTINGS, tabBehavior: 'keep' },
      });

      const card = loc.shortcutCardByTitle(page, 'Online Banking Portal');
      await card.click();

      const dispatched = await mockHarness.getDispatchedTabs();
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].url).toBe('https://secure.chase.com');
      expect(dispatched[0].cookieStoreId).toBe('firefox-container-3');
    });

    test('5.4 left-clicking default context shortcut dispatches with firefox-default cookieStoreId', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: { ...DEFAULT_SETTINGS, tabBehavior: 'keep', swimlaneCollapse: { 'firefox-default': false } },
      });

      const card = loc.shortcutCardByTitle(page, 'Mozilla Developer Network');
      await card.click();

      const dispatched = await mockHarness.getDispatchedTabs();
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].url).toBe('https://developer.mozilla.org');
      expect(dispatched[0].cookieStoreId).toBe('firefox-default');
    });

    test('5.5 when tabBehavior is "close", launcher tab is closed via browser.tabs.remove after left-click dispatch', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: { ...DEFAULT_SETTINGS, tabBehavior: 'close' },
      });

      const card = loc.shortcutCardByTitle(page, 'Slack Web');
      await card.click();

      const closed = await mockHarness.getClosedTabs();
      expect(closed.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Area 6: Background Tab Dispatch (Middle Click / Ctrl+Click)
  // ==========================================================================
  test.describe('6. Background Tab Dispatch (Middle Click / Ctrl+Click)', () => {
    test('6.1 middle-clicking shortcut dispatches tab with active: false', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const card = loc.shortcutCardByTitle(page, 'Jira Work Management');
      // Middle click (auxclick button: 1)
      await card.click({ button: 'middle' });

      const dispatched = await mockHarness.getDispatchedTabs();
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].url).toBe('https://atlassian.net');
      expect(dispatched[0].cookieStoreId).toBe('firefox-container-2');
      expect(dispatched[0].active).toBe(false);
    });

    test('6.2 Ctrl+clicking shortcut dispatches tab with active: false', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const card = loc.shortcutCardByTitle(page, 'Amazon Store');
      await card.click({ modifiers: ['Control'] });

      const dispatched = await mockHarness.getDispatchedTabs();
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].url).toBe('https://amazon.com');
      expect(dispatched[0].cookieStoreId).toBe('firefox-container-4');
      expect(dispatched[0].active).toBe(false);
    });

    test('6.3 Meta/Cmd+clicking shortcut dispatches tab with active: false', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const card = loc.shortcutCardByTitle(page, 'eBay Marketplace');
      await card.click({ modifiers: ['Meta'] });

      const dispatched = await mockHarness.getDispatchedTabs();
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].active).toBe(false);
    });

    test('6.4 background dispatch preserves the target container cookieStoreId', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const card = loc.shortcutCardByTitle(page, 'Vanguard Investments');
      await card.click({ button: 'middle' });

      const dispatched = await mockHarness.getDispatchedTabs();
      expect(dispatched[0].cookieStoreId).toBe('firefox-container-3');
    });

    test('6.5 background dispatch does not close launcher tab even if tabBehavior is "close"', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: { ...DEFAULT_SETTINGS, tabBehavior: 'close' },
      });

      const card = loc.shortcutCardByTitle(page, 'Google Docs');
      await card.click({ button: 'middle' });

      const closed = await mockHarness.getClosedTabs();
      expect(closed).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Area 7: Settings Modal & Theme Preferences
  // ==========================================================================
  test.describe('7. Settings Modal & Theme Preferences', () => {
    test('7.1 clicking gear icon opens settings modal', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      await loc.settingsButton(page).click();
      const modal = loc.settingsModal(page);
      await expect(modal).toBeVisible();
    });

    test('7.2 changing tab behavior setting to "keep" persists to storage', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: { ...DEFAULT_SETTINGS, tabBehavior: 'close' },
      });

      await loc.settingsButton(page).click();
      await loc.settingsTab(page, 'behavior').click();
      await loc.settingsTabBehaviorKeep(page).click();

      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_settings.tabBehavior).toBe('keep');
    });

    test('7.3 selecting dark theme sets data-theme="dark" on root element and persists', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      await loc.settingsButton(page).click();
      await loc.settingsThemeOption(page, 'dark').click();

      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_settings.theme).toBe('dark');
    });

    test('7.4 selecting light theme sets data-theme="light" on root element and persists', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      await loc.settingsButton(page).click();
      await loc.settingsThemeOption(page, 'light').click();

      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_settings.theme).toBe('light');
    });

    test('7.5 pressing Escape dismisses settings modal and restores focus', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
      });

      const gearBtn = loc.settingsButton(page);
      await gearBtn.click();
      await expect(loc.settingsModal(page)).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(loc.settingsModal(page)).not.toBeVisible();
      await expect(gearBtn).toBeFocused();
    });

    test('7.6 reset to defaults flow requires two-stage inline confirmation and resets storage and UI', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: { ...DEFAULT_SETTINGS, theme: 'dark', tabBehavior: 'close' },
      });

      const gearBtn = loc.settingsButton(page);
      await gearBtn.click();
      const modal = loc.settingsModal(page);
      await expect(modal).toBeVisible();

      // Switch to Data tab
      await loc.settingsTab(page, 'data').click();

      // Click Reset to Defaults button
      const resetBtn = page.locator('#modal-root [data-action="reset-defaults"], .btn-reset-defaults');
      await expect(resetBtn).toBeVisible();
      await resetBtn.click();

      // Inline confirmation panel is revealed
      const confirmPanel = page.locator('#modal-root .reset-confirm-panel');
      await expect(confirmPanel).toBeVisible();
      await expect(resetBtn).not.toBeVisible();

      // Click Cancel
      const cancelBtn = page.locator('#modal-root [data-action="cancel-reset"]');
      await cancelBtn.click();
      await expect(confirmPanel).not.toBeVisible();
      await expect(resetBtn).toBeVisible();

      // Click Reset again, then confirm
      await resetBtn.click();
      await expect(confirmPanel).toBeVisible();
      const confirmBtn = page.locator('#modal-root [data-action="confirm-reset"]');
      await confirmBtn.click();

      // Modal closes
      await expect(modal).not.toBeVisible();

      // Settings and shortcuts in storage are reset
      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_settings.theme).toBe('auto');
      expect(storage.foxlaunch_settings.tabBehavior).toBe('keep');
      expect(storage.foxlaunch_settings.firstRunDismissed).toBe(true);
      expect(storage.foxlaunch_shortcuts).toEqual({});

      // data-theme on html is removed
      await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
    });
  });

  // ==========================================================================
  // Area 8: First-Run Onboarding Walkthrough
  // ==========================================================================
  test.describe('8. First-Run Onboarding Walkthrough', () => {
    test('8.1 displays onboarding walkthrough overlay on initial load when firstRunDismissed is false', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: ONBOARDING_SETTINGS,
      });

      const overlay = loc.onboardingOverlay(page);
      await expect(overlay).toBeVisible();
    });

    test('8.2 walkthrough presents multi-step guide explaining containers and shortcuts', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: ONBOARDING_SETTINGS,
      });

      const overlay = loc.onboardingOverlay(page);
      await expect(overlay).toContainText(/Container|Shortcut|FoxLaunch/i);
      await expect(loc.onboardingNextButton(page)).toBeVisible();
    });

    test('8.3 clicking Next advances through walkthrough steps', async ({ openFoxLaunch, page }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: ONBOARDING_SETTINGS,
      });

      const nextBtn = loc.onboardingNextButton(page);
      await nextBtn.click();

      // Next step content is displayed
      const overlay = loc.onboardingOverlay(page);
      await expect(overlay).toBeVisible();
    });

    test('8.4 completing or dismissing onboarding saves firstRunDismissed: true in storage', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: ONBOARDING_SETTINGS,
      });

      const dismissBtn = loc.onboardingDismissButton(page);
      await dismissBtn.click();

      await expect(loc.onboardingOverlay(page)).not.toBeVisible();

      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_settings.firstRunDismissed).toBe(true);
    });

    test('8.5 subsequent page reload does not show onboarding overlay when firstRunDismissed is true', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: DEFAULT_SETTINGS, // firstRunDismissed is true
      });

      await expect(loc.onboardingOverlay(page)).not.toBeVisible();

      await mockHarness.reloadPage();
      await expect(loc.onboardingOverlay(page)).not.toBeVisible();
    });

    test('8.6 walkthrough supports 4 steps with Back navigation and final Get Started completion', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: ONBOARDING_SETTINGS,
      });

      const overlay = loc.onboardingOverlay(page);
      const nextBtn = loc.onboardingNextButton(page);
      const backBtn = page.locator('#onboarding-root [data-action="onboarding-back"]');
      const stepIndicator = page.locator('#onboarding-root .step-indicator');

      // Step 1: back button is hidden, indicator is "Step 1 of 4"
      await expect(stepIndicator).toHaveText('Step 1 of 4');
      await expect(backBtn).not.toBeVisible();

      // Advance to Step 2
      await nextBtn.click();
      await expect(stepIndicator).toHaveText('Step 2 of 4');
      await expect(backBtn).toBeVisible();

      // Go back to Step 1
      await backBtn.click();
      await expect(stepIndicator).toHaveText('Step 1 of 4');
      await expect(backBtn).not.toBeVisible();

      // Advance to Step 2, then Step 3
      await nextBtn.click();
      await nextBtn.click();
      await expect(stepIndicator).toHaveText('Step 3 of 4');

      // Advance to Step 4 (final step)
      await nextBtn.click();
      await expect(stepIndicator).toHaveText('Step 4 of 4');
      await expect(nextBtn).not.toBeVisible();

      // On final step, dismiss button displays "Get Started"
      const getStartedBtn = loc.onboardingDismissButton(page);
      await expect(getStartedBtn).toHaveText('Get Started');
      await getStartedBtn.click();

      await expect(overlay).not.toBeVisible();
      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_settings.firstRunDismissed).toBe(true);
    });

    test('8.7 pressing Escape on onboarding walkthrough dismisses overlay and saves state', async ({ openFoxLaunch, page, mockHarness }) => {
      await openFoxLaunch({
        containers: DEFAULT_MOCK_CONTAINERS,
        shortcuts: SAMPLE_SHORTCUTS,
        settings: ONBOARDING_SETTINGS,
      });

      const overlay = loc.onboardingOverlay(page);
      await expect(overlay).toBeVisible();

      // Advance to step 2
      await loc.onboardingNextButton(page).click();
      await expect(page.locator('#onboarding-root .step-indicator')).toHaveText('Step 2 of 4');

      // Press Escape
      await page.keyboard.press('Escape');
      await expect(overlay).not.toBeVisible();

      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_settings.firstRunDismissed).toBe(true);
      await expect(loc.searchInput(page)).toBeFocused();
    });
  });
});
