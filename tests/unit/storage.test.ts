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
  resetToDefaults,
} from '../../src/services/storage';
import {
  getContainers,
  DEFAULT_CONTAINER,
  getContainerHex,
  getContainerCssVar,
} from '../../src/services/containers';
import { dispatchShortcut } from '../../src/services/tabs';

interface MockBrowserState {
  store: Record<string, any>;
  dispatchedTabs: any[];
  closedTabs: number[];
}

function setupMockBrowser(): MockBrowserState {
  const store: Record<string, any> = {};
  const dispatchedTabs: any[] = [];
  const closedTabs: number[] = [];

  (globalThis as any).browser = {
    storage: {
      local: {
        get: async (key: string) => ({
          [key]: store[key] !== undefined ? JSON.parse(JSON.stringify(store[key])) : undefined,
        }),
        set: async (items: Record<string, any>) => {
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
        const tab = { id: 101, ...props };
        dispatchedTabs.push(tab);
        return tab;
      },
      getCurrent: async () => ({ id: 99, active: true }),
      remove: async (id: number) => {
        closedTabs.push(id);
      },
      query: async () => [{ id: 99, active: true }],
    },
  };

  return { store, dispatchedTabs, closedTabs };
}

test.describe('Storage Service (browser.storage.local)', () => {
  let mockState: MockBrowserState;

  test.beforeEach(() => {
    mockState = setupMockBrowser();
  });

  test('getSettings returns deep clone of DEFAULT_SETTINGS when storage is uninitialized', async () => {
    const settings = await getSettings();
    expect(settings.version).toBe(1);
    expect(settings.tabBehavior).toBe('keep');
    expect(settings.theme).toBe('auto');
    expect(settings.cardSize).toBe('medium');
    expect(settings.firstRunDismissed).toBe(false);
    expect(settings.swimlaneCollapse['firefox-default']).toBe(true);
  });

  test('saveSettings merges partial settings properly and preserves other fields', async () => {
    await saveSettings({ tabBehavior: 'close', theme: 'dark' });
    const updated = await getSettings();
    expect(updated.tabBehavior).toBe('close');
    expect(updated.theme).toBe('dark');
    expect(updated.firstRunDismissed).toBe(false); // Preserved
    expect(updated.swimlaneCollapse['firefox-default']).toBe(true); // Preserved
  });

  test('getSettings defaults missing or invalid card sizes to medium', async () => {
    for (const cardSize of [undefined, null, 'invalid']) {
      mockState.store[STORAGE_KEYS.SETTINGS] = { theme: 'dark', cardSize };
      const settings = await getSettings();
      expect(settings.cardSize).toBe('medium');
      expect(settings.theme).toBe('dark');
    }
  });

  test('saveSettings persists each card size and preserves it in other updates', async () => {
    for (const cardSize of ['small', 'medium', 'large'] as const) {
      await saveSettings({ cardSize });
      await saveSettings({ theme: 'dark', swimlaneCollapse: { 'firefox-container-1': true } });
      const settings = await getSettings();
      expect(settings.cardSize).toBe(cardSize);
      expect(settings.theme).toBe('dark');
      expect(settings.swimlaneCollapse['firefox-container-1']).toBe(true);
    }
  });

  test('saveSettings serializes concurrent updates without discarding cardSize or theme', async () => {
    await Promise.all([
      saveSettings({ cardSize: 'small' }),
      saveSettings({ theme: 'dark' }),
    ]);

    const finalSettings = await getSettings();
    expect(finalSettings.cardSize).toBe('small');
    expect(finalSettings.theme).toBe('dark');
  });

  test('saveSettings merges swimlaneCollapse dictionary without overwriting other containers', async () => {
    await saveSettings({
      swimlaneCollapse: { 'firefox-container-1': false },
    });
    const s1 = await getSettings();
    expect(s1.swimlaneCollapse['firefox-default']).toBe(true);
    expect(s1.swimlaneCollapse['firefox-container-1']).toBe(false);

    await saveSettings({
      swimlaneCollapse: { 'firefox-container-2': true },
    });
    const s2 = await getSettings();
    expect(s2.swimlaneCollapse['firefox-default']).toBe(true);
    expect(s2.swimlaneCollapse['firefox-container-1']).toBe(false);
    expect(s2.swimlaneCollapse['firefox-container-2']).toBe(true);
  });

  test('addShortcut generates id, timestamp, order, and domain', async () => {
    const item = await addShortcut('firefox-container-1', {
      title: 'GitHub',
      url: 'https://github.com/mozilla',
    });

    expect(item.id).toBeDefined();
    expect(item.cookieStoreId).toBe('firefox-container-1');
    expect(item.title).toBe('GitHub');
    expect(item.domain).toBe('github.com');
    expect(item.order).toBe(0);
    expect(item.createdAt).toBeGreaterThan(0);

    const all = await getShortcuts();
    expect(all['firefox-container-1']).toHaveLength(1);
    expect(all['firefox-container-1'][0].id).toBe(item.id);
  });

  test('addShortcut falls back to extracted domain if title is empty or whitespace', async () => {
    const item = await addShortcut('firefox-container-1', {
      title: '   ',
      url: 'https://docs.rs/tokio',
    });

    expect(item.title).toBe('docs.rs');
    expect(item.domain).toBe('docs.rs');
  });

  test('updateShortcut updates title and recalculates domain if URL changed', async () => {
    const item = await addShortcut('firefox-container-1', {
      title: 'Initial',
      url: 'https://initial.com',
    });

    const updated = await updateShortcut('firefox-container-1', {
      id: item.id,
      title: 'Updated Title',
      url: 'https://updated.org',
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('Updated Title');
    expect(updated?.domain).toBe('updated.org');
    expect(updated?.id).toBe(item.id);

    const stored = (await getShortcuts())['firefox-container-1'];
    expect(stored[0].title).toBe('Updated Title');
    expect(stored[0].domain).toBe('updated.org');
  });

  test('updateShortcut returns null when shortcut ID does not exist', async () => {
    const res = await updateShortcut('firefox-container-1', {
      id: 'non-existent-id',
      title: 'Ghost',
    });
    expect(res).toBeNull();
  });

  test('deleteShortcut removes item, re-indexes orders contiguously, and returns deleted item', async () => {
    const item1 = await addShortcut('firefox-container-1', { title: '1', url: 'https://1.com' });
    const item2 = await addShortcut('firefox-container-1', { title: '2', url: 'https://2.com' });
    const item3 = await addShortcut('firefox-container-1', { title: '3', url: 'https://3.com' });

    const deleted = await deleteShortcut('firefox-container-1', item2.id);
    expect(deleted?.id).toBe(item2.id);
    expect(deleted?.title).toBe('2');

    const remaining = (await getShortcuts())['firefox-container-1'];
    expect(remaining).toHaveLength(2);
    expect(remaining[0].id).toBe(item1.id);
    expect(remaining[0].order).toBe(0);
    expect(remaining[1].id).toBe(item3.id);
    expect(remaining[1].order).toBe(1); // Re-indexed from 2 to 1
  });

  test('deleteShortcut returns null when deleting non-existent shortcut', async () => {
    const res = await deleteShortcut('firefox-container-1', 'non-existent');
    expect(res).toBeNull();
  });

  test('reorderShortcuts updates item order properties according to array sequence', async () => {
    const item1 = await addShortcut('firefox-container-1', { title: 'A', url: 'https://a.com' });
    const item2 = await addShortcut('firefox-container-1', { title: 'B', url: 'https://b.com' });
    const item3 = await addShortcut('firefox-container-1', { title: 'C', url: 'https://c.com' });

    // Reverse order: C, B, A
    const reordered = await reorderShortcuts('firefox-container-1', [item3, item2, item1]);
    expect(reordered[0].id).toBe(item3.id);
    expect(reordered[0].order).toBe(0);
    expect(reordered[1].id).toBe(item2.id);
    expect(reordered[1].order).toBe(1);
    expect(reordered[2].id).toBe(item1.id);
    expect(reordered[2].order).toBe(2);

    const stored = (await getShortcuts())['firefox-container-1'];
    expect(stored[0].id).toBe(item3.id);
    expect(stored[2].id).toBe(item1.id);
  });

  test('getOrphanedShortcuts retains shortcuts when container is deleted', async () => {
    await addShortcut('firefox-container-deleted', { title: 'Orphan', url: 'https://orphan.com' });
    await addShortcut('firefox-container-active', { title: 'Active', url: 'https://active.com' });

    const orphaned = await getOrphanedShortcuts(['firefox-container-active']);
    expect(orphaned['firefox-container-deleted']).toHaveLength(1);
    expect(orphaned['firefox-container-deleted'][0].title).toBe('Orphan');
    expect(orphaned['firefox-container-active']).toBeUndefined();
  });

  test('resetToDefaults clears shortcuts and resets settings preserving firstRunDismissed', async () => {
    await addShortcut('firefox-container-1', { title: 'Test', url: 'https://test.com' });
    await saveSettings({ tabBehavior: 'close', theme: 'dark', cardSize: 'large' });

    await resetToDefaults();

    const shortcuts = await getShortcuts();
    expect(Object.keys(shortcuts)).toHaveLength(0);

    const settings = await getSettings();
    expect(settings.tabBehavior).toBe('keep');
    expect(settings.theme).toBe('auto');
    expect(settings.cardSize).toBe('medium');
    expect(settings.firstRunDismissed).toBe(true);
  });

  test('resetToDefaults with retainOnboarding: false resets firstRunDismissed to false', async () => {
    await resetToDefaults({ retainOnboarding: false });
    const settings = await getSettings();
    expect(settings.firstRunDismissed).toBe(false);
  });
});


test.describe('Container Discovery Service', () => {
  test.beforeEach(() => {
    setupMockBrowser();
  });

  test('getContainers discovers native containers and appends synthesized DEFAULT_CONTAINER', async () => {
    const containers = await getContainers();
    expect(containers.length).toBe(3); // 2 discovered + 1 default
    expect(containers[0].cookieStoreId).toBe('firefox-container-1');
    expect(containers[0].name).toBe('Personal');
    expect(containers[0].colorCode).toBe('var(--container-blue)');
    expect(containers[0].isDefault).toBe(false);

    expect(containers[1].cookieStoreId).toBe('firefox-container-2');
    expect(containers[1].name).toBe('Work');
    expect(containers[1].colorCode).toBe('var(--container-orange)');

    const defaultContainer = containers[2];
    expect(defaultContainer.cookieStoreId).toBe('firefox-default');
    expect(defaultContainer.name).toBe('Default');
    expect(defaultContainer.color).toBe('toolbar');
    expect(defaultContainer.colorCode).toBe('var(--container-default)');
    expect(defaultContainer.isDefault).toBe(true);
  });

  test('getContainers falls back gracefully when API throws or is unavailable', async () => {
    (globalThis as any).browser.contextualIdentities.query = async () => {
      throw new Error('API disabled');
    };

    const containers = await getContainers();
    expect(containers.length).toBe(1);
    expect(containers[0].cookieStoreId).toBe('firefox-default');
    expect(containers[0].isDefault).toBe(true);
  });

  test('getContainerHex and getContainerCssVar map container colors correctly', () => {
    expect(getContainerHex('blue')).toBe('#37adff');
    expect(getContainerHex('turquoise')).toBe('#00c79a');
    expect(getContainerHex('toolbar')).toBe('#808080');
    expect(getContainerHex('unknown-color')).toBe('#808080');

    expect(getContainerCssVar('blue')).toBe('var(--container-blue)');
    expect(getContainerCssVar('turquoise')).toBe('var(--container-turquoise)');
    expect(getContainerCssVar('unknown-color')).toBe('var(--container-default)');
  });
});

test.describe('Tab Dispatch Service', () => {
  let mockState: MockBrowserState;

  test.beforeEach(() => {
    mockState = setupMockBrowser();
  });

  test('dispatches containerized tab with matching cookieStoreId', async () => {
    const tab = await dispatchShortcut('https://github.com', 'firefox-container-1', { active: true });
    expect(tab).toBeDefined();
    expect(tab?.url).toBe('https://github.com');
    expect(tab?.cookieStoreId).toBe('firefox-container-1');
    expect(tab?.active).toBe(true);
    expect(mockState.dispatchedTabs).toHaveLength(1);
  });

  test('dispatches default context with firefox-default cookieStoreId in tabs.create', async () => {
    const tab = await dispatchShortcut('https://mozilla.org', 'firefox-default', { active: true });
    expect(tab).toBeDefined();
    expect(tab?.cookieStoreId).toBe('firefox-default');
    expect(mockState.dispatchedTabs[0].cookieStoreId).toBe('firefox-default');
  });

  test('respects tabBehavior keep setting and keeps launcher tab open', async () => {
    await saveSettings({ tabBehavior: 'keep' });
    await dispatchShortcut('https://github.com', 'firefox-container-1', { active: true });
    expect(mockState.closedTabs).toHaveLength(0); // Not closed
  });

  test('respects tabBehavior close setting and closes launcher tab on foreground dispatch', async () => {
    await saveSettings({ tabBehavior: 'close' });
    await dispatchShortcut('https://github.com', 'firefox-container-1', { active: true });
    expect(mockState.closedTabs).toContain(99); // Launcher tab closed
  });

  test('background dispatch (active: false) never closes launcher tab even if tabBehavior is close', async () => {
    await saveSettings({ tabBehavior: 'close' });
    const tab = await dispatchShortcut('https://github.com', 'firefox-container-1', { active: false });
    expect(tab?.active).toBe(false);
    expect(mockState.closedTabs).toHaveLength(0); // Launcher tab remains open!
  });
});
