/**
 * FoxLaunch — Local Storage Service
 *
 * Persists and manages shortcuts and user settings via browser.storage.local.
 */

import type { FoxLaunchSettings, ShortcutItem } from '../types';
import { extractDomain } from '../utils/validation';

export const STORAGE_KEYS = {
  SHORTCUTS: 'foxlaunch_shortcuts',
  SETTINGS: 'foxlaunch_settings',
  FAVICONS: 'foxlaunch_favicons',
} as const;

export const DEFAULT_SETTINGS: FoxLaunchSettings = {
  version: 1,
  tabBehavior: 'keep',
  theme: 'auto',
  cardSize: 'medium',
  firstRunDismissed: false,
  containerVisibility: {
    mode: 'all',
    cookieStoreIds: [],
    namePatterns: [],
  },
  swimlaneCollapse: {
    'firefox-default': true, // Collapsed by default per R1 & Pilot Plan §D6
  },
  swimlaneOrder: [],
};

/**
 * Retrieves all stored shortcuts grouped by container cookieStoreId.
 * Ensures shortcuts within each container are sorted by their order property.
 */
export async function getShortcuts(): Promise<Record<string, ShortcutItem[]>> {
  try {
    if (typeof browser === 'undefined' || !browser.storage?.local) {
      console.warn('[FoxLaunch] browser.storage.local unavailable. Returning empty shortcuts.');
      return {};
    }

    const result = await browser.storage.local.get([STORAGE_KEYS.SHORTCUTS, STORAGE_KEYS.FAVICONS]);
    const shortcuts = (result[STORAGE_KEYS.SHORTCUTS] as Record<string, ShortcutItem[]>) || {};
    const favicons = (result[STORAGE_KEYS.FAVICONS] as Record<string, string>) || {};

    const sorted: Record<string, ShortcutItem[]> = {};
    for (const [cookieStoreId, items] of Object.entries(shortcuts)) {
      if (Array.isArray(items)) {
        sorted[cookieStoreId] = [...items]
          .sort((a, b) => a.order - b.order)
          .map((item) => ({
            ...item,
            favIconUrl: favicons[item.id] || item.favIconUrl,
          }));
      } else {
        sorted[cookieStoreId] = [];
      }
    }
    return sorted;
  } catch (error) {
    console.error('[FoxLaunch] Error reading shortcuts from storage:', error);
    return {};
  }
}

/**
 * Saves the full list of shortcuts for a specific container.
 * Re-normalizes the order property for each item.
 */
export async function saveShortcuts(
  cookieStoreId: string,
  items: ShortcutItem[]
): Promise<ShortcutItem[]> {
  try {
    const all = await getShortcuts();
    const normalized = items.map((item, index) => ({
      ...item,
      cookieStoreId,
      order: index,
    }));

    all[cookieStoreId] = normalized;

    if (typeof browser !== 'undefined' && browser.storage?.local) {
      await browser.storage.local.set({ [STORAGE_KEYS.SHORTCUTS]: all });
    }
    return normalized;
  } catch (error) {
    console.error(`[FoxLaunch] Error saving shortcuts for container ${cookieStoreId}:`, error);
    throw error;
  }
}

/**
 * Adds a new shortcut to a container swimlane.
 * Automatically generates id, createdAt timestamp, derives domain, and assigns next order index.
 */
export async function addShortcut(
  cookieStoreId: string,
  itemInput: { title: string; url: string; domain?: string; id?: string; createdAt?: number; favIconUrl?: string }
): Promise<ShortcutItem> {
  const all = await getShortcuts();
  const currentItems = all[cookieStoreId] ? [...all[cookieStoreId]] : [];

  const domain = itemInput.domain || extractDomain(itemInput.url);
  const title = itemInput.title.trim() || domain || 'Shortcut';

  const newShortcut: ShortcutItem = {
    id: itemInput.id || crypto.randomUUID(),
    cookieStoreId,
    url: itemInput.url,
    title,
    domain,
    createdAt: itemInput.createdAt || Date.now(),
    order: currentItems.length,
    favIconUrl: itemInput.favIconUrl,
  };

  currentItems.push(newShortcut);
  all[cookieStoreId] = currentItems;

  if (typeof browser !== 'undefined' && browser.storage?.local) {
    await browser.storage.local.set({ [STORAGE_KEYS.SHORTCUTS]: all });
  }

  return newShortcut;
}

/**
 * Updates an existing shortcut item within a container.
 * Returns the updated item, or null if not found.
 */
export async function updateShortcut(
  cookieStoreId: string,
  updatedItem: Partial<ShortcutItem> & { id: string }
): Promise<ShortcutItem | null> {
  const all = await getShortcuts();
  const currentItems = all[cookieStoreId] ? [...all[cookieStoreId]] : [];
  const index = currentItems.findIndex((item) => item.id === updatedItem.id);

  if (index === -1) {
    console.warn(`[FoxLaunch] Shortcut ${updatedItem.id} not found in container ${cookieStoreId}.`);
    return null;
  }

  const existing = currentItems[index];
  const url = updatedItem.url ?? existing.url;
  const domain = updatedItem.url ? extractDomain(updatedItem.url) : (updatedItem.domain ?? existing.domain);
  const title = updatedItem.title !== undefined ? (updatedItem.title.trim() || domain) : existing.title;

  const merged: ShortcutItem = {
    ...existing,
    ...updatedItem,
    cookieStoreId,
    url,
    domain,
    title,
  };

  currentItems[index] = merged;
  all[cookieStoreId] = currentItems;

  if (typeof browser !== 'undefined' && browser.storage?.local) {
    await browser.storage.local.set({ [STORAGE_KEYS.SHORTCUTS]: all });
  }

  return merged;
}

/**
 * Deletes a shortcut from a container by ID.
 * Re-indexes remaining items' order and returns the deleted item (enables undo toast).
 */

let faviconSaveQueue: Promise<unknown> = Promise.resolve();

/**
 * Updates the cached favicon for a specific shortcut ID.
 * Stores favicons under a dedicated storage key to eliminate lost updates with shortcut mutations.
 * Validates expectedUrl to discard stale favicons if shortcut was edited while tab loaded.
 */
export async function updateShortcutFavicon(
  shortcutId: string,
  favIconUrl: string,
  expectedUrl?: string
): Promise<boolean> {
  const executeSave = async (): Promise<boolean> => {
    try {
      if (expectedUrl) {
        const all = await getShortcuts();
        let matches = false;
        for (const items of Object.values(all)) {
          const sc = items.find((item) => item.id === shortcutId);
          if (sc) {
            if (sc.url === expectedUrl) {
              matches = true;
            }
            break;
          }
        }
        if (!matches) {
          return false;
        }
      }

      if (typeof browser !== 'undefined' && browser.storage?.local) {
        const res = await browser.storage.local.get(STORAGE_KEYS.FAVICONS);
        const favicons = (res[STORAGE_KEYS.FAVICONS] as Record<string, string>) || {};
        favicons[shortcutId] = favIconUrl;
        await browser.storage.local.set({ [STORAGE_KEYS.FAVICONS]: favicons });
      }

      return true;
    } catch (error) {
      console.error('[FoxLaunch] Error updating favicon:', error);
      return false;
    }
  };

  const nextSave = faviconSaveQueue.then(executeSave, executeSave);
  faviconSaveQueue = nextSave.catch(() => false);
  return nextSave;
}

/**
 * Removes the cached favicon for a specific shortcut ID.
 */
export async function deleteShortcutFavicon(shortcutId: string): Promise<void> {
  const executeDelete = async (): Promise<void> => {
    try {
      if (typeof browser !== 'undefined' && browser.storage?.local) {
        const res = await browser.storage.local.get(STORAGE_KEYS.FAVICONS);
        const favicons = (res[STORAGE_KEYS.FAVICONS] as Record<string, string>) || {};
        if (favicons[shortcutId]) {
          delete favicons[shortcutId];
          await browser.storage.local.set({ [STORAGE_KEYS.FAVICONS]: favicons });
        }
      }
    } catch (error) {
      console.error('[FoxLaunch] Error deleting shortcut favicon:', error);
    }
  };

  const nextDelete = faviconSaveQueue.then(executeDelete, executeDelete);
  faviconSaveQueue = nextDelete.catch(() => {});
  return nextDelete;
}

export async function deleteShortcut(
  cookieStoreId: string,
  id: string
): Promise<ShortcutItem | null> {
  const all = await getShortcuts();
  const currentItems = all[cookieStoreId] ? [...all[cookieStoreId]] : [];
  const index = currentItems.findIndex((item) => item.id === id);

  if (index === -1) {
    console.warn(`[FoxLaunch] Shortcut ${id} not found for deletion in container ${cookieStoreId}.`);
    return null;
  }

  const [deleted] = currentItems.splice(index, 1);

  // Re-index remaining items to guarantee contiguous 0-indexed order
  const reindexed = currentItems.map((item, idx) => ({
    ...item,
    order: idx,
  }));

  all[cookieStoreId] = reindexed;

  if (typeof browser !== 'undefined' && browser.storage?.local) {
    await browser.storage.local.set({ [STORAGE_KEYS.SHORTCUTS]: all });
  }

  return deleted;
}

/**
 * Reorders shortcuts within a swimlane according to the provided array.
 */
export async function reorderShortcuts(
  cookieStoreId: string,
  reorderedItems: ShortcutItem[]
): Promise<ShortcutItem[]> {
  return saveShortcuts(cookieStoreId, reorderedItems);
}

/**
 * Retrieves user preferences and application settings merged with DEFAULT_SETTINGS.
 */
export async function getSettings(): Promise<FoxLaunchSettings> {
  try {
    if (typeof browser === 'undefined' || !browser.storage?.local) {
      return { ...DEFAULT_SETTINGS };
    }

    const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
    const raw = (result[STORAGE_KEYS.SETTINGS] as Partial<FoxLaunchSettings>) || {};

    return {
      version: raw.version ?? DEFAULT_SETTINGS.version,
      tabBehavior: raw.tabBehavior ?? DEFAULT_SETTINGS.tabBehavior,
      theme: raw.theme ?? DEFAULT_SETTINGS.theme,
      cardSize: raw.cardSize === 'small' || raw.cardSize === 'medium' || raw.cardSize === 'large'
        ? raw.cardSize
        : DEFAULT_SETTINGS.cardSize,
      firstRunDismissed: raw.firstRunDismissed ?? DEFAULT_SETTINGS.firstRunDismissed,
      containerVisibility: {
        mode: raw.containerVisibility?.mode === 'only' || raw.containerVisibility?.mode === 'hide'
          ? raw.containerVisibility.mode : 'all',
        cookieStoreIds: Array.isArray(raw.containerVisibility?.cookieStoreIds)
          ? raw.containerVisibility.cookieStoreIds.filter((id) => typeof id === 'string') : [],
        namePatterns: Array.isArray(raw.containerVisibility?.namePatterns)
          ? raw.containerVisibility.namePatterns.filter((pattern) => typeof pattern === 'string') : [],
      },
      swimlaneCollapse: {
        ...DEFAULT_SETTINGS.swimlaneCollapse,
        ...(raw.swimlaneCollapse || {}),
      },
      swimlaneOrder: Array.isArray(raw.swimlaneOrder)
        ? raw.swimlaneOrder.filter((id) => typeof id === 'string')
        : [],
    };
  } catch (error) {
    console.error('[FoxLaunch] Error reading settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persists partial settings updates merged with current settings.
 */
let settingsSaveQueue: Promise<unknown> = Promise.resolve();

export async function saveSettings(
  partialSettings: Partial<FoxLaunchSettings>
): Promise<FoxLaunchSettings> {
  const executeSave = async (): Promise<FoxLaunchSettings> => {
    try {
      const current = await getSettings();
      const updated: FoxLaunchSettings = {
        ...current,
        ...partialSettings,
        swimlaneCollapse: {
          ...current.swimlaneCollapse,
          ...(partialSettings.swimlaneCollapse || {}),
        },
      };

      if (typeof browser !== 'undefined' && browser.storage?.local) {
        await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
      }

      return updated;
    } catch (error) {
      console.error('[FoxLaunch] Error saving settings:', error);
      throw error;
    }
  };

  const nextSave = settingsSaveQueue.then(executeSave, executeSave);
  settingsSaveQueue = nextSave.catch(() => {});
  return nextSave;
}

/**
 * Returns shortcuts belonging to containers that are no longer active/discovered.
 * Enforces requirement F2.8: orphaned shortcuts are retained silently in storage.
 */
export async function getOrphanedShortcuts(
  activeCookieStoreIds: string[]
): Promise<Record<string, ShortcutItem[]>> {
  const all = await getShortcuts();
  const activeSet = new Set(activeCookieStoreIds);
  const orphaned: Record<string, ShortcutItem[]> = {};

  for (const [cookieStoreId, items] of Object.entries(all)) {
    if (!activeSet.has(cookieStoreId) && items.length > 0) {
      orphaned[cookieStoreId] = items;
    }
  }

  return orphaned;
}

/**
 * Resets stored shortcuts (foxlaunch_shortcuts) to {} and settings (foxlaunch_settings)
 * to DEFAULT_SETTINGS, keeping firstRunDismissed: true if retainOnboarding is true or default.
 */
export async function resetToDefaults(options?: { retainOnboarding?: boolean }): Promise<void> {
  const retainOnboarding = options?.retainOnboarding ?? true;
  const newSettings: FoxLaunchSettings = {
    ...DEFAULT_SETTINGS,
    firstRunDismissed: retainOnboarding ? true : DEFAULT_SETTINGS.firstRunDismissed,
  };

  if (typeof browser !== 'undefined' && browser.storage?.local) {
    await browser.storage.local.set({
      [STORAGE_KEYS.SHORTCUTS]: {},
      [STORAGE_KEYS.SETTINGS]: newSettings,
    });
  }
}
