import {
  test, expect, DEFAULT_SETTINGS, DEFAULT_MOCK_CONTAINERS, SAMPLE_SHORTCUTS,
  FoxLaunchLocators as loc,
} from '../fixtures';
import { matchesContainerName, isContainerVisible } from '../../src/utils/containerVisibility';
import { DEFAULT_CONTAINER } from '../../src/services/containers';

test.describe('Container visibility matching', () => {
  for (const [name, pattern, expected] of [
    ['Work', 'Work*', true],
    ['work team', ' Work* ', true],
    ['Dev-Prod', 'Dev-*', true],
    ['Work', 'Work', true],
    ['Work team', 'Work', false],
    ['My Work', 'Work*', false],
    ['Work', '*', true],
    ['Work', '   ', false],
    ['Dev-[a].(b)+?', 'Dev-[a].(b)+?', true],
    ['Dev-aab', 'Dev-[a].(b)+?', false],
    ['aaa', 'aa*aa', false],
    ['Dev-Prod-Team', 'Dev**Prod*Team', true],
    ['Dev-Team-Prod', 'Dev*Prod*Team', false],
    ['Work\nTeam', 'Work*', true],
  ] as const) {
    test(`matches ${JSON.stringify(name)} against ${JSON.stringify(pattern)}`, () => {
      expect(matchesContainerName(name, pattern)).toBe(expected);
    });
  }

  test('keeps the default context visible even when all names are hidden', () => {
    expect(isContainerVisible(DEFAULT_CONTAINER, {
      mode: 'hide', cookieStoreIds: ['firefox-default'], namePatterns: ['*'],
    })).toBe(true);
  });
});

test.describe('Container visibility settings', () => {
  test('defaults to show all for existing settings without filters', async ({ openFoxLaunch, page }) => {
    const { containerVisibility: _visibility, ...legacySettings } = DEFAULT_SETTINGS;
    await openFoxLaunch({ settings: legacySettings });
    await expect(page.locator('.swimlane')).toHaveCount(5);
    await page.locator('#settings-btn').click();
    await page.locator('[data-testid="nav-tab-containers"]').click();
    await expect(page.getByRole('radio', { name: 'Show all', exact: true })).toBeChecked();
  });

  test('only shows selected IDs or matching names and persists without deleting shortcuts', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({ shortcuts: SAMPLE_SHORTCUTS });
    await page.locator('#settings-btn').click();
    await page.locator('[data-testid="nav-tab-containers"]').click();
    await page.getByRole('radio', { name: 'Only show these', exact: true }).check();
    await expect(page.locator('.swimlane')).toHaveCount(1);
    await page.getByRole('checkbox', { name: 'Personal', exact: true }).check();
    await page.getByLabel('Container name patterns').fill(' Work* \n\n Dev-* ');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.locator('.swimlane')).toHaveCount(3);
    await expect(loc.swimlaneById(page, 'firefox-container-2')).toBeVisible();
    const storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_settings.containerVisibility).toEqual({
      mode: 'only', cookieStoreIds: ['firefox-container-1'], namePatterns: ['Work*', 'Dev-*'],
    });
    expect(storage.foxlaunch_shortcuts).toEqual(SAMPLE_SHORTCUTS);
    await mockHarness.reloadPage();
    await expect(page.locator('.swimlane')).toHaveCount(3);
    await page.locator('#settings-btn').click();
    await page.locator('[data-testid="nav-tab-containers"]').click();
    await expect(page.getByRole('checkbox', { name: 'Personal', exact: true })).toBeChecked();
    await expect(page.getByLabel('Container name patterns')).toHaveValue('Work*\nDev-*');
    await page.getByRole('radio', { name: 'Show all', exact: true }).check();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.locator('.swimlane')).toHaveCount(5);
  });

  test('hides IDs and patterns without search revealing hidden lanes', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      settings: {
        ...DEFAULT_SETTINGS,
        containerVisibility: {
          mode: 'hide', cookieStoreIds: ['firefox-container-1', 'deleted-id'], namePatterns: ['work*'],
        },
      },
      shortcuts: SAMPLE_SHORTCUTS,
    });
    await expect(page.locator('.swimlane')).toHaveCount(3);
    await page.locator('#search-input').fill('work');
    await expect(loc.swimlaneById(page, 'firefox-container-2')).toHaveCount(0);
    await page.locator('#search-input').fill('');
    await expect(page.locator('.swimlane:visible')).toHaveCount(3);
    await page.locator('#settings-btn').click();
    await page.locator('[data-testid="nav-tab-containers"]').click();
    await page.getByRole('checkbox', { name: 'Personal', exact: true }).uncheck();
    await page.getByLabel('Container name patterns').fill('');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.locator('.swimlane')).toHaveCount(5);
  });

  test('reevaluates name patterns against renamed and newly discovered identities', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      settings: {
        ...DEFAULT_SETTINGS,
        containerVisibility: { mode: 'only', cookieStoreIds: [], namePatterns: ['Dev-*'] },
      },
    });
    await expect(page.locator('.swimlane')).toHaveCount(1);
    await mockHarness.setContainers([
      { ...DEFAULT_MOCK_CONTAINERS[0], name: 'Dev-Local' },
      { ...DEFAULT_MOCK_CONTAINERS[1], cookieStoreId: 'new-id', name: 'Dev-Prod' },
    ]);
    await mockHarness.reloadPage();
    await expect(page.locator('.swimlane')).toHaveCount(3);
  });

  test('ignores malformed filter data and resets filters to show all', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch({
      settings: {
        ...DEFAULT_SETTINGS,
        containerVisibility: { mode: 'invalid', cookieStoreIds: null, namePatterns: [42, null, '*'] },
      },
    });
    await expect(page.locator('.swimlane')).toHaveCount(5);
    await page.locator('#settings-btn').click();
    await page.locator('[data-testid="nav-tab-containers"]').click();
    await page.getByRole('radio', { name: 'Hide these', exact: true }).check();
    await expect(page.locator('.swimlane')).toHaveCount(1);
    await page.locator('[data-testid="nav-tab-data"]').click();
    await page.getByRole('button', { name: 'Reset to Defaults...' }).click();
    await page.getByRole('button', { name: 'Yes, Reset Everything' }).click();
    await expect(page.locator('.swimlane')).toHaveCount(5);
  });

  test('reordering swimlanes while filter is active preserves hidden container positions upon reset', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      settings: {
        ...DEFAULT_SETTINGS,
        swimlaneOrder: [
          'firefox-container-1',
          'firefox-container-2',
          'firefox-container-3',
          'firefox-container-4',
          'firefox-default',
        ],
        containerVisibility: {
          mode: 'hide',
          cookieStoreIds: ['firefox-container-2'],
          namePatterns: [],
        },
      },
    });

    await expect(page.locator('.swimlane')).toHaveCount(4);

    const handle3 = page.locator('#swimlane-firefox-container-3 .swimlane-drag-handle');
    await handle3.focus();
    await page.keyboard.press('ArrowUp');

    const visibleIds = await page.locator('#swimlanes-container > .swimlane').evaluateAll((lanes) =>
      lanes.map((lane) => lane.getAttribute('data-cookie-store-id'))
    );
    expect(visibleIds).toEqual([
      'firefox-container-3',
      'firefox-container-1',
      'firefox-container-4',
      'firefox-default',
    ]);

    const storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_settings.swimlaneOrder).toEqual([
      'firefox-container-3',
      'firefox-container-2',
      'firefox-container-1',
      'firefox-container-4',
      'firefox-default',
    ]);

    await page.locator('#settings-btn').click();
    await page.locator('[data-testid="nav-tab-containers"]').click();
    await page.getByRole('radio', { name: 'Show all', exact: true }).check();
    await page.getByRole('button', { name: 'Done', exact: true }).click();

    await expect(page.locator('.swimlane')).toHaveCount(5);
    const allIds = await page.locator('#swimlanes-container > .swimlane').evaluateAll((lanes) =>
      lanes.map((lane) => lane.getAttribute('data-cookie-store-id'))
    );
    expect(allIds).toEqual([
      'firefox-container-3',
      'firefox-container-2',
      'firefox-container-1',
      'firefox-container-4',
      'firefox-default',
    ]);
  });
});
