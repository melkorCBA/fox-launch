import { test, expect } from '@playwright/test';
import {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  getShortcuts,
  saveShortcuts,
  addShortcut,
  updateShortcut,
  deleteShortcut,
  reorderShortcuts,
  getSettings,
  saveSettings,
  getOrphanedShortcuts,
} from '../../src/services/storage';
import {
  getContainers,
  DEFAULT_CONTAINER,
  getContainerHex,
  getContainerCssVar,
} from '../../src/services/containers';
import { dispatchShortcut } from '../../src/services/tabs';
import type { ShortcutItem } from '../../src/types';

interface MockBrowserState {
  store: Record<string, any>;
  dispatchedTabs: any[];
  closedTabs: number[];
  createRejectError?: Error;
  removeRejectError?: Error;
  queryRejectError?: Error;
}

function setupMockBrowser(overrides?: {
  storageDelayMs?: number;
}): MockBrowserState {
  const store: Record<string, any> = {};
  const dispatchedTabs: any[] = [];
  const closedTabs: number[] = [];

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  (globalThis as any).browser = {
    storage: {
      local: {
        get: async (key: string) => {
          if (overrides?.storageDelayMs) await delay(overrides.storageDelayMs);
          return {
            [key]: store[key] !== undefined ? JSON.parse(JSON.stringify(store[key])) : undefined,
          };
        },
        set: async (items: Record<string, any>) => {
          if (overrides?.storageDelayMs) await delay(overrides.storageDelayMs);
          for (const [k, v] of Object.entries(items)) {
            store[k] = JSON.parse(JSON.stringify(v));
          }
        },
        clear: async () => {
          for (const k of Object.keys(store)) delete store[k];
        },
      },
    },
    contextualIdentities: {
      query: async () => [
        {
          cookieStoreId: 'firefox-container-1',
          name: 'Personal',
          color: 'blue',
          icon: 'fingerprint',
          colorCode: '#37adff',
        },
        {
          cookieStoreId: 'firefox-container-2',
          name: 'Work',
          color: 'orange',
          icon: 'briefcase',
          colorCode: '#ff922b',
        },
      ],
    },
    tabs: {
      create: async (props: any) => {
        if (state.createRejectError) {
          throw state.createRejectError;
        }
        const tab = { id: 101 + dispatchedTabs.length, ...props };
        dispatchedTabs.push(tab);
        return tab;
      },
      getCurrent: async () => ({ id: 99, active: true }),
      remove: async (id: number) => {
        if (state.removeRejectError) {
          throw state.removeRejectError;
        }
        closedTabs.push(id);
      },
      query: async () => [{ id: 99, active: true }],
    },
  };

  const state: MockBrowserState = { store, dispatchedTabs, closedTabs };
  return state;
}

test.describe('Adversarial Storage Probing (src/services/storage.ts)', () => {
  let mockState: MockBrowserState;

  test.beforeEach(() => {
    mockState = setupMockBrowser();
  });

  test('Attack 1.1: Concurrent addShortcut calls (race condition probe)', async () => {
    // Probe what happens when 5 shortcuts are added concurrently via Promise.all
    const promises = [
      addShortcut('firefox-container-1', { title: 'Item 1', url: 'https://site1.com' }),
      addShortcut('firefox-container-1', { title: 'Item 2', url: 'https://site2.com' }),
      addShortcut('firefox-container-1', { title: 'Item 3', url: 'https://site3.com' }),
      addShortcut('firefox-container-1', { title: 'Item 4', url: 'https://site4.com' }),
      addShortcut('firefox-container-1', { title: 'Item 5', url: 'https://site5.com' }),
    ];

    await Promise.all(promises);
    const shortcuts = (await getShortcuts())['firefox-container-1'] || [];

    // Document whether concurrent additions suffer from read-modify-write lost updates
    console.log(`[Adversarial Probe] Concurrent adds completed. Stored items count: ${shortcuts.length} (expected 5 if atomic, <5 if racy)`);
    // Check whether all items or partial items survived:
    // If concurrent adds are racy, some items will have overwritten each other
  });

  test('Attack 1.2: Duplicate IDs insertion and handling', async () => {
    const fixedId = 'duplicate-uuid-12345';
    const item1 = await addShortcut('firefox-container-1', {
      id: fixedId,
      title: 'Original',
      url: 'https://original.com',
    });
    const item2 = await addShortcut('firefox-container-1', {
      id: fixedId,
      title: 'Duplicate',
      url: 'https://duplicate.com',
    });

    expect(item1.id).toBe(fixedId);
    expect(item2.id).toBe(fixedId);

    const shortcuts = (await getShortcuts())['firefox-container-1'];
    // Check how many items were stored
    expect(shortcuts.length).toBe(2);
    expect(shortcuts[0].id).toBe(fixedId);
    expect(shortcuts[1].id).toBe(fixedId);

    // Update with duplicate ID should update the first match
    const updated = await updateShortcut('firefox-container-1', {
      id: fixedId,
      title: 'Updated First',
    });
    expect(updated?.title).toBe('Updated First');

    // Delete with duplicate ID should delete the first match, leaving the second
    const deleted = await deleteShortcut('firefox-container-1', fixedId);
    expect(deleted?.title).toBe('Updated First');

    const remaining = (await getShortcuts())['firefox-container-1'];
    expect(remaining.length).toBe(1);
    expect(remaining[0].title).toBe('Duplicate');
    expect(remaining[0].order).toBe(0); // Re-indexed contiguously
  });

  test('Attack 1.3: Rapid deletions to empty and beyond', async () => {
    const item1 = await addShortcut('firefox-container-1', { title: 'A', url: 'https://a.com' });
    const item2 = await addShortcut('firefox-container-1', { title: 'B', url: 'https://b.com' });

    // Sequential rapid deletion
    const del1 = await deleteShortcut('firefox-container-1', item1.id);
    const del2 = await deleteShortcut('firefox-container-1', item2.id);

    expect(del1?.id).toBe(item1.id);
    expect(del2?.id).toBe(item2.id);

    const remaining = (await getShortcuts())['firefox-container-1'];
    expect(remaining).toEqual([]);

    // Delete again on empty list
    const del3 = await deleteShortcut('firefox-container-1', item1.id);
    expect(del3).toBeNull();
  });

  test('Attack 1.4: Concurrent deletions race condition probe', async () => {
    const item1 = await addShortcut('firefox-container-1', { title: 'A', url: 'https://a.com' });
    const item2 = await addShortcut('firefox-container-1', { title: 'B', url: 'https://b.com' });
    const item3 = await addShortcut('firefox-container-1', { title: 'C', url: 'https://c.com' });

    // Concurrent delete calls
    await Promise.all([
      deleteShortcut('firefox-container-1', item1.id),
      deleteShortcut('firefox-container-1', item2.id),
    ]);

    const remaining = (await getShortcuts())['firefox-container-1'] || [];
    console.log(`[Adversarial Probe] Concurrent deletions remaining count: ${remaining.length} (expected 1 if atomic)`);
  });

  test('Attack 1.5: Reordering boundaries (index 0 to 0, empty array, single item)', async () => {
    // Boundary 1: Reordering empty array
    const emptyResult = await reorderShortcuts('firefox-container-1', []);
    expect(emptyResult).toEqual([]);

    // Boundary 2: Single item reorder (0 to 0)
    const single = await addShortcut('firefox-container-1', { title: 'Solo', url: 'https://solo.com' });
    const singleResult = await reorderShortcuts('firefox-container-1', [single]);
    expect(singleResult.length).toBe(1);
    expect(singleResult[0].order).toBe(0);

    // Boundary 3: Multiple items moving index 0 to 0 (no-op reorder)
    const second = await addShortcut('firefox-container-1', { title: 'Duo', url: 'https://duo.com' });
    const noOpResult = await reorderShortcuts('firefox-container-1', [single, second]);
    expect(noOpResult[0].order).toBe(0);
    expect(noOpResult[1].order).toBe(1);

    // Boundary 4: Reordering with negative or out-of-order properties in input
    const scrambledInput: ShortcutItem[] = [
      { ...second, order: 999 },
      { ...single, order: -50 },
    ];
    const normalized = await reorderShortcuts('firefox-container-1', scrambledInput);
    // Should re-normalize order contiguously to 0, 1
    expect(normalized[0].id).toBe(second.id);
    expect(normalized[0].order).toBe(0);
    expect(normalized[1].id).toBe(single.id);
    expect(normalized[1].order).toBe(1);
  });

  test('Attack 1.6: Corrupted storage payloads (null, primitives, malformed items)', async () => {
    // Scenario A: foxlaunch_shortcuts is null in storage
    mockState.store[STORAGE_KEYS.SHORTCUTS] = null;
    const fromNull = await getShortcuts();
    expect(fromNull).toEqual({});

    // Scenario B: foxlaunch_shortcuts is a primitive string
    mockState.store[STORAGE_KEYS.SHORTCUTS] = 'not-an-object';
    const fromString = await getShortcuts();
    // VULNERABILITY / BEHAVIOR: Object.entries('not-an-object') maps string character indices to arrays!
    // It returns { "0": [], "1": [], ... "12": [] } instead of {} because typeof shortcuts === 'object' check is missing.
    expect(Object.keys(fromString).length).toBe('not-an-object'.length);


    // Scenario C: container entry is null
    mockState.store[STORAGE_KEYS.SHORTCUTS] = {
      'firefox-container-1': null,
    };
    const fromNullEntry = await getShortcuts();
    expect(fromNullEntry['firefox-container-1']).toEqual([]);

    // Scenario D: container entry contains null item inside array
    mockState.store[STORAGE_KEYS.SHORTCUTS] = {
      'firefox-container-1': [null, { id: 'valid', order: 0, title: 'Valid', url: 'https://v.com' }],
    };
    // getShortcuts catches the TypeError on null.order and gracefully returns {}
    const fromNullItem = await getShortcuts();
    expect(fromNullItem).toBeDefined();

    // Scenario E: foxlaunch_settings is null or corrupted string
    mockState.store[STORAGE_KEYS.SETTINGS] = null;
    const settingsNull = await getSettings();
    expect(settingsNull.version).toBe(DEFAULT_SETTINGS.version);

    mockState.store[STORAGE_KEYS.SETTINGS] = 'corrupted_string';
    const settingsStr = await getSettings();
    expect(settingsStr.version).toBe(DEFAULT_SETTINGS.version);
    expect(settingsStr.tabBehavior).toBe(DEFAULT_SETTINGS.tabBehavior);

    // Scenario F: swimlaneCollapse corrupted with null
    mockState.store[STORAGE_KEYS.SETTINGS] = {
      swimlaneCollapse: null,
    };
    const settingsNullCollapse = await getSettings();
    expect(settingsNullCollapse.swimlaneCollapse['firefox-default']).toBe(true);
  });

  test('Attack 1.7: Orphaned container queries stress-test', async () => {
    // 1. When storage has no shortcuts at all
    const emptyOrphans = await getOrphanedShortcuts([]);
    expect(emptyOrphans).toEqual({});

    // 2. When storage has items in active containers and inactive containers
    await addShortcut('container-alive', { title: 'Alive', url: 'https://alive.com' });
    await addShortcut('container-dead-1', { title: 'Dead 1', url: 'https://dead1.com' });
    await addShortcut('container-dead-2', { title: 'Dead 2', url: 'https://dead2.com' });
    await saveShortcuts('container-empty', []); // 0 items

    const orphans = await getOrphanedShortcuts(['container-alive']);
    expect(Object.keys(orphans).sort()).toEqual(['container-dead-1', 'container-dead-2']);
    expect(orphans['container-alive']).toBeUndefined();
    expect(orphans['container-empty']).toBeUndefined(); // Empty container should not appear
  });
});

test.describe('Adversarial Tab Dispatch Probing (src/services/tabs.ts)', () => {
  let mockState: MockBrowserState;

  test.beforeEach(() => {
    mockState = setupMockBrowser();
  });

  test('Attack 2.1: Dispatching to uncontained firefox-default vs user containers', async () => {
    // Test 1: 'firefox-default' -> cookieStoreId must be omitted (undefined)
    const defaultTab = await dispatchShortcut('https://example.com', 'firefox-default');
    expect(defaultTab?.cookieStoreId).toBeUndefined();
    expect(mockState.dispatchedTabs[0].cookieStoreId).toBeUndefined();

    // Test 2: empty string -> cookieStoreId must be omitted (undefined)
    const emptyTab = await dispatchShortcut('https://example.com', '');
    expect(emptyTab?.cookieStoreId).toBeUndefined();

    // Test 3: user container 'firefox-container-1'
    const containerTab = await dispatchShortcut('https://example.com', 'firefox-container-1');
    expect(containerTab?.cookieStoreId).toBe('firefox-container-1');
    expect(mockState.dispatchedTabs[2].cookieStoreId).toBe('firefox-container-1');
  });

  test('Attack 2.2: Background dispatch (active: false) with close behavior', async () => {
    await saveSettings({ tabBehavior: 'close' });

    // Background dispatch (active: false)
    const tab = await dispatchShortcut('https://example.com', 'firefox-container-1', {
      active: false,
    });

    expect(tab?.active).toBe(false);
    expect(mockState.closedTabs).toEqual([]); // Must NOT close launcher tab
  });

  test('Attack 2.3: Foreground dispatch (active: true) with close behavior', async () => {
    await saveSettings({ tabBehavior: 'close' });

    const tab = await dispatchShortcut('https://example.com', 'firefox-container-1', {
      active: true,
    });

    expect(tab?.active).toBe(true);
    expect(mockState.closedTabs).toContain(99); // Launcher tab closed
  });

  test('Attack 2.4: Launcher tab closure fallback when getCurrent returns undefined', async () => {
    await saveSettings({ tabBehavior: 'close' });

    // Mock getCurrent returning undefined
    (globalThis as any).browser.tabs.getCurrent = async () => undefined;
    // Mock query returning launcher tab id 88
    (globalThis as any).browser.tabs.query = async () => [{ id: 88, active: true }];

    await dispatchShortcut('https://example.com', 'firefox-container-1', { active: true });

    expect(mockState.closedTabs).toContain(88); // Successfully fell back to query
  });

  test('Attack 2.5: Launcher tab closure guard when query returns the newly created tab', async () => {
    await saveSettings({ tabBehavior: 'close' });

    (globalThis as any).browser.tabs.getCurrent = async () => undefined;
    // Mock query returning the created tab itself (id 101)
    (globalThis as any).browser.tabs.query = async () => [{ id: 101, active: true }];

    await dispatchShortcut('https://example.com', 'firefox-container-1', { active: true });

    // Safety guard should prevent closing the created tab
    expect(mockState.closedTabs).not.toContain(101);
  });

  test('Attack 2.6: Error handling when browser.tabs.create rejects', async () => {
    mockState.createRejectError = new Error('Tabs quota exceeded');

    // Test whether dispatchShortcut throws or rejects
    let caughtError: any = null;
    try {
      await dispatchShortcut('https://example.com', 'firefox-container-1');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.message).toBe('Tabs quota exceeded');
    // Launcher tab should NOT be closed if create failed
    expect(mockState.closedTabs).toEqual([]);
  });

  test('Attack 2.7: Error handling when browser.tabs.remove throws', async () => {
    await saveSettings({ tabBehavior: 'close' });
    mockState.removeRejectError = new Error('Tab cannot be closed');

    // Should catch the tab close error internally and not crash dispatchShortcut
    const tab = await dispatchShortcut('https://example.com', 'firefox-container-1', {
      active: true,
    });

    expect(tab).toBeDefined();
    expect(tab?.id).toBe(101);
  });
});

test.describe('Adversarial Container Discovery Probing (src/services/containers.ts)', () => {
  test('Attack 3.1: contextualIdentities API throws error', async () => {
    setupMockBrowser();
    (globalThis as any).browser.contextualIdentities.query = async () => {
      throw new Error('contextualIdentities permission denied');
    };

    const containers = await getContainers();
    expect(containers.length).toBe(1);
    expect(containers[0]).toEqual(DEFAULT_CONTAINER);
  });

  test('Attack 3.2: contextualIdentities returns empty list []', async () => {
    setupMockBrowser();
    (globalThis as any).browser.contextualIdentities.query = async () => [];

    const containers = await getContainers();
    expect(containers.length).toBe(1);
    expect(containers[0]).toEqual(DEFAULT_CONTAINER);
  });

  test('Attack 3.3: containers with unexpected / invalid colors and icons', async () => {
    setupMockBrowser();
    (globalThis as any).browser.contextualIdentities.query = async () => [
      {
        cookieStoreId: 'c-weird-1',
        name: 'Cyberpunk',
        color: 'neon-violet', // Non-standard color keyword
        icon: 'alien-ship',  // Non-standard icon keyword
      },
      {
        cookieStoreId: 'c-weird-2',
        name: 'Empty Color',
        color: '',           // Empty string
        icon: '',
      },
      {
        cookieStoreId: 'c-weird-3',
        name: 'Case Mixed',
        color: '  BLUE  ',   // Uppercase with whitespace
        icon: 'briefcase',
      },
    ];

    const containers = await getContainers();
    expect(containers.length).toBe(4); // 3 discovered + 1 default

    // Non-standard color should fall back to var(--container-default)
    expect(containers[0].colorCode).toBe('var(--container-default)');

    // Empty color should fall back to var(--container-default)
    expect(containers[1].colorCode).toBe('var(--container-default)');

    // Mixed case trimmed color should resolve correctly to var(--container-blue)
    expect(containers[2].colorCode).toBe('var(--container-blue)');

    // Last container is DEFAULT_CONTAINER
    expect(containers[3]).toEqual(DEFAULT_CONTAINER);
  });

  test('Attack 3.4: color mapping helper functions with adversarial inputs', () => {
    // getContainerHex
    expect(getContainerHex('RED')).toBe('#ff6b6b');
    expect(getContainerHex('  green  ')).toBe('#51cf66');
    expect(getContainerHex('')).toBe('#808080');
    expect(getContainerHex('invalid-color-name')).toBe('#808080');
    expect(getContainerHex(null as any)).toBe('#808080');
    expect(getContainerHex(undefined as any)).toBe('#808080');

    // getContainerCssVar
    expect(getContainerCssVar('RED')).toBe('var(--container-red)');
    expect(getContainerCssVar('  pink  ')).toBe('var(--container-pink)');
    expect(getContainerCssVar('')).toBe('var(--container-default)');
    expect(getContainerCssVar('invalid-color-name')).toBe('var(--container-default)');
    expect(getContainerCssVar(null as any)).toBe('var(--container-default)');
    expect(getContainerCssVar(undefined as any)).toBe('var(--container-default)');
  });

  test('Attack 3.5: contextualIdentities API missing entirely (undefined)', async () => {
    (globalThis as any).browser = {}; // No contextualIdentities property

    const containers = await getContainers();
    expect(containers.length).toBe(1);
    expect(containers[0]).toEqual(DEFAULT_CONTAINER);
  });
});
