/**
 * FoxLaunch — Application Entry Point & Controller
 *
 * Bootstraps container auto-discovery, shortcut persistence, search filtering,
 * modal dialogs, reactive system theme listener, and manages sub-100ms dashboard mounting.
 */

import './styles/themes.css';
import './styles/main.css';
import './styles/swimlane.css';
import './styles/modal.css';
import './styles/onboarding.css';

import type { ContainerContext, ShortcutItem, FoxLaunchSettings, ThemeMode } from './types';
import { getContainers } from './services/containers';
import { getShortcuts, getSettings, addShortcut, updateShortcut, deleteShortcut, saveShortcuts } from './services/storage';
import { renderSwimlane, type SwimlaneCallbacks } from './components/swimlane';
import { initSearch, type SearchController } from './components/search';
import { openShortcutModal } from './components/modal';
import { openSettingsModal } from './components/settingsModal';
import { openOnboardingOverlay } from './components/onboarding';
import { showUndoToast } from './components/toast';

let searchController: SearchController | null = null;
let appSettings: FoxLaunchSettings;
let discoveredContainers: ContainerContext[] = [];

let themeMediaQueryList: MediaQueryList | null = null;
let themeChangeHandler: ((e: MediaQueryListEvent) => void) | null = null;

/**
 * Applies the appearance theme to the document root element
 * and manages the reactive prefers-color-scheme media query listener.
 */
export function applyTheme(theme: ThemeMode): void {
  // Clean up any existing media query listener
  if (themeMediaQueryList && themeChangeHandler) {
    if (typeof themeMediaQueryList.removeEventListener === 'function') {
      themeMediaQueryList.removeEventListener('change', themeChangeHandler);
    } else if (typeof (themeMediaQueryList as any).removeListener === 'function') {
      (themeMediaQueryList as any).removeListener(themeChangeHandler);
    }
    themeMediaQueryList = null;
    themeChangeHandler = null;
  }

  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    // 'auto': clear override so CSS media queries apply
    document.documentElement.removeAttribute('data-theme');

    // Attach dynamic listener for system preference change
    if (typeof window !== 'undefined' && window.matchMedia) {
      themeMediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
      themeChangeHandler = (_e: MediaQueryListEvent) => {
        if (appSettings?.theme === 'auto') {
          document.documentElement.removeAttribute('data-theme');
        }
      };

      if (typeof themeMediaQueryList.addEventListener === 'function') {
        themeMediaQueryList.addEventListener('change', themeChangeHandler);
      } else if (typeof (themeMediaQueryList as any).addListener === 'function') {
        (themeMediaQueryList as any).addListener(themeChangeHandler);
      }
    }
  }
}

export async function refreshSwimlane(cookieStoreId: string): Promise<void> {
  const [shortcutsMap, settings] = await Promise.all([
    getShortcuts(),
    getSettings(),
  ]);
  appSettings = settings;

  const container = discoveredContainers.find((c) => c.cookieStoreId === cookieStoreId);
  if (!container) return;

  const existingEl = document.getElementById(`swimlane-${cookieStoreId}`);
  const items = shortcutsMap[cookieStoreId] || [];

  const callbacks: SwimlaneCallbacks = {
    onAddShortcut: (cid) => handleOpenAddModal(cid),
    onEditShortcut: (item) => handleOpenEditModal(item),
    onDeleteShortcut: (item) => handleDeleteShortcut(item),
    onReorderShortcuts: (cid, reordered) => handleReorderShortcuts(cid, reordered),
  };

  const newEl = renderSwimlane(container, items, appSettings, callbacks);

  if (existingEl && existingEl.parentElement) {
    existingEl.parentElement.replaceChild(newEl, existingEl);
  }

  // Preserve search filtering on newly rendered cards
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (searchInput && searchController && searchInput.value) {
    searchController.filter(searchInput.value);
  }
}

function handleOpenAddModal(cookieStoreId: string): void {
  const container = discoveredContainers.find((c) => c.cookieStoreId === cookieStoreId);
  const addTrigger = document.querySelector<HTMLElement>(`#swimlane-${cookieStoreId} .btn-add-shortcut`);

  openShortcutModal({
    mode: 'add',
    cookieStoreId,
    containerName: container?.name,
    triggerElement: addTrigger,
    onSubmit: async (formData) => {
      await addShortcut(formData.cookieStoreId, {
        title: formData.title,
        url: formData.url,
      });
      await refreshSwimlane(formData.cookieStoreId);
    },
  });
}

function handleOpenEditModal(shortcut: ShortcutItem): void {
  const cardTrigger = document.querySelector<HTMLElement>(`.shortcut-card[data-id="${shortcut.id}"]`);

  openShortcutModal({
    mode: 'edit',
    cookieStoreId: shortcut.cookieStoreId,
    initialData: shortcut,
    triggerElement: cardTrigger,
    onSubmit: async (formData) => {
      await updateShortcut(formData.cookieStoreId, {
        id: shortcut.id,
        title: formData.title,
        url: formData.url,
      });
      await refreshSwimlane(formData.cookieStoreId);
    },
  });
}

async function handleDeleteShortcut(shortcut: ShortcutItem): Promise<void> {
  const deleted = await deleteShortcut(shortcut.cookieStoreId, shortcut.id);
  await refreshSwimlane(shortcut.cookieStoreId);

  if (deleted) {
    showUndoToast({
      message: 'Shortcut removed',
      durationMs: 5000,
      onUndo: async () => {
        const allShortcuts = await getShortcuts();
        const currentItems = allShortcuts[shortcut.cookieStoreId] ? [...allShortcuts[shortcut.cookieStoreId]] : [];
        const insertIndex = Math.min(deleted.order, currentItems.length);
        currentItems.splice(insertIndex, 0, deleted);
        await saveShortcuts(shortcut.cookieStoreId, currentItems);
        await refreshSwimlane(shortcut.cookieStoreId);
      },
    });
  }
}

async function handleReorderShortcuts(cookieStoreId: string, _reordered: ShortcutItem[]): Promise<void> {
  await refreshSwimlane(cookieStoreId);
}

export async function initializeApp(): Promise<void> {
  const startTime = performance.now();
  try {
    performance.mark('foxlaunch-mount-start');
  } catch {}

  // Concurrent pre-fetch for sub-100ms cold dashboard render
  const [settings, containers, shortcutsMap] = await Promise.all([
    getSettings(),
    getContainers(),
    getShortcuts(),
  ]);

  appSettings = settings;
  discoveredContainers = containers;

  // Apply persistent theme and setup reactive prefers-color-scheme listener
  applyTheme(settings.theme);
  document.documentElement.setAttribute('data-card-size', settings.cardSize);

  // Mount swimlanes
  const swimlanesContainer = document.getElementById('swimlanes-container');
  if (swimlanesContainer) {
    swimlanesContainer.replaceChildren();
    const fragment = document.createDocumentFragment();

    const callbacks: SwimlaneCallbacks = {
      onAddShortcut: (cid) => handleOpenAddModal(cid),
      onEditShortcut: (item) => handleOpenEditModal(item),
      onDeleteShortcut: (item) => handleDeleteShortcut(item),
      onReorderShortcuts: (cid, reordered) => handleReorderShortcuts(cid, reordered),
    };

    containers.forEach((container) => {
      const shortcuts = shortcutsMap[container.cookieStoreId] || [];
      const swimlaneEl = renderSwimlane(container, shortcuts, appSettings, callbacks);
      fragment.appendChild(swimlaneEl);
    });

    swimlanesContainer.appendChild(fragment);
  }

  // Initialize Search Controller
  searchController = initSearch();

  // Settings Gear Button
  const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement | null;
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      openSettingsModal(settingsBtn, async () => {
        await renderApp();
      });
    });
  }

  // First-run Onboarding Walkthrough
  if (!settings.firstRunDismissed) {
    openOnboardingOverlay({
      onDismiss: () => {
        appSettings.firstRunDismissed = true;
      },
    });
  }

  // Record W3C User Timing Mark & Measure
  try {
    performance.mark('foxlaunch-mount-end');
    performance.measure('foxlaunch-mount', 'foxlaunch-mount-start', 'foxlaunch-mount-end');
  } catch {}

  const measureEntries = performance.getEntriesByName('foxlaunch-mount');
  const durationMs = measureEntries.length > 0
    ? measureEntries[measureEntries.length - 1].duration
    : performance.now() - startTime;

  console.log(`[FoxLaunch] Mounted in ${durationMs.toFixed(2)}ms`);
  (window as any).__FOXLAUNCH_MOUNT_DURATION__ = durationMs;
}

export const renderApp = initializeApp;

// Bootstrap once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeApp());
} else {
  initializeApp();
}
