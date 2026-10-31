/**
 * FoxLaunch — Main Application Controller (Vite / TypeScript Entry)
 *
 * Orchestrates container discovery, storage retrieval, reactive theming,
 * swimlane mounting, keyboard navigation, and modal dialogues.
 */

import './styles/themes.css';
import './styles/main.css';
import './styles/swimlane.css';
import './styles/modal.css';
import './styles/onboarding.css';

import type { ContainerContext, ShortcutItem, FoxLaunchSettings, ThemeMode } from './types';
import { getContainers } from './services/containers';
import { getShortcuts, getSettings, addShortcut, updateShortcut, deleteShortcut, saveShortcuts, saveSettings } from './services/storage';
import { renderSwimlane, type SwimlaneCallbacks } from './components/swimlane';
import { setupSwimlaneReordering } from './components/dragDrop';
import { initSearch, type SearchController } from './components/search';
import { openShortcutModal } from './components/modal';
import { openSettingsModal } from './components/settingsModal';
import { openOnboardingOverlay } from './components/onboarding';
import { showUndoToast } from './components/toast';
import { isContainerVisible } from './utils/containerVisibility';

let searchController: SearchController | null = null;
let appSettings: FoxLaunchSettings;
let discoveredContainers: ContainerContext[] = [];
let swimlaneReorderingInitialized = false;
let lastMountedVisibility = '';

let themeMediaQueryList: MediaQueryList | null = null;
let themeChangeHandler: ((e: MediaQueryListEvent) => void) | null = null;

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;

  if (themeMediaQueryList && themeChangeHandler) {
    themeMediaQueryList.removeEventListener('change', themeChangeHandler);
    themeMediaQueryList = null;
    themeChangeHandler = null;
  }

  if (theme === 'auto') {
    root.removeAttribute('data-theme');
    themeMediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    themeChangeHandler = (e: MediaQueryListEvent) => {
      document.body.classList.toggle('prefers-dark', e.matches);
    };
    themeMediaQueryList.addEventListener('change', themeChangeHandler);
    document.body.classList.toggle('prefers-dark', themeMediaQueryList.matches);
  } else {
    root.setAttribute('data-theme', theme);
    document.body.classList.remove('prefers-dark');
  }
}

export async function refreshSwimlane(cookieStoreId: string): Promise<void> {
  const [shortcutsMap, settings] = await Promise.all([getShortcuts(), getSettings()]);
  appSettings = settings;

  const container = discoveredContainers.find((c) => c.cookieStoreId === cookieStoreId);
  if (!container) return;

  const existingEl = document.getElementById(`swimlane-${cookieStoreId}`);
  if (!isContainerVisible(container, settings.containerVisibility)) {
    existingEl?.remove();
    return;
  }
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

async function handleReorderSwimlanes(reorderedVisibleIds: string[]): Promise<void> {
  const fullCurrentOrder = orderContainers(discoveredContainers, appSettings.swimlaneOrder).map(
    (c) => c.cookieStoreId
  );
  const visibleSet = new Set(reorderedVisibleIds);
  let visibleIndex = 0;
  const mergedOrder = fullCurrentOrder.map((id) => {
    if (visibleSet.has(id)) {
      const nextVisible = reorderedVisibleIds[visibleIndex];
      visibleIndex++;
      return nextVisible ?? id;
    }
    return id;
  });

  const mergedSet = new Set(mergedOrder);
  reorderedVisibleIds.forEach((id) => {
    if (!mergedSet.has(id)) {
      mergedOrder.push(id);
      mergedSet.add(id);
    }
  });

  appSettings = await saveSettings({ swimlaneOrder: mergedOrder });
}

function orderContainers(containers: ContainerContext[], order: string[]): ContainerContext[] {
  const containersById = new Map(containers.map((container) => [container.cookieStoreId, container]));
  const ordered: ContainerContext[] = [];
  const orderedIds = new Set<string>();
  (order || []).forEach((cookieStoreId) => {
    const container = containersById.get(cookieStoreId);
    if (container && !orderedIds.has(cookieStoreId)) {
      ordered.push(container);
      orderedIds.add(cookieStoreId);
    }
  });

  return [...ordered, ...containers.filter((container) => !orderedIds.has(container.cookieStoreId))];
}

function mountSwimlanes(shortcutsMap: Record<string, ShortcutItem[]>): void {
  const swimlanesContainer = document.getElementById('swimlanes-container');
  if (!swimlanesContainer) return;

  lastMountedVisibility = JSON.stringify(appSettings.containerVisibility);

  if (!swimlaneReorderingInitialized) {
    setupSwimlaneReordering(swimlanesContainer, handleReorderSwimlanes);
    swimlaneReorderingInitialized = true;
  }

  const fragment = document.createDocumentFragment();
  const callbacks: SwimlaneCallbacks = {
    onAddShortcut: (cid) => handleOpenAddModal(cid),
    onEditShortcut: (item) => handleOpenEditModal(item),
    onDeleteShortcut: (item) => handleDeleteShortcut(item),
    onReorderShortcuts: (cid, reordered) => handleReorderShortcuts(cid, reordered),
  };

  orderContainers(discoveredContainers, appSettings.swimlaneOrder).forEach((container) => {
    if (!isContainerVisible(container, appSettings.containerVisibility)) return;
    const shortcuts = shortcutsMap[container.cookieStoreId] || [];
    fragment.appendChild(renderSwimlane(container, shortcuts, appSettings, callbacks));
  });

  swimlanesContainer.replaceChildren(fragment);
  searchController?.init();
}

export async function initializeApp(): Promise<void> {
  const versionEl = document.getElementById('app-version');
  if (versionEl && typeof browser !== 'undefined' && browser.runtime?.getManifest) {
    versionEl.textContent = ` v${browser.runtime.getManifest().version}`;
  }

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
  mountSwimlanes(shortcutsMap);

  // Initialize Search Controller
  searchController = initSearch();

  // Settings Gear Button
  const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement | null;
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      openSettingsModal({
        triggerElement: settingsBtn,
        onSettingsChanged: async (updated) => {
          appSettings = updated;
          applyTheme(updated.theme);
          document.documentElement.setAttribute('data-card-size', updated.cardSize);
          const newVisibility = JSON.stringify(updated.containerVisibility);
          if (newVisibility !== lastMountedVisibility) {
            const [refreshedContainers, refreshedShortcuts] = await Promise.all([
              getContainers(),
              getShortcuts(),
            ]);
            discoveredContainers = refreshedContainers;
            mountSwimlanes(refreshedShortcuts);
          }
        },
        onResetDefaults: async () => {
          await renderApp();
        },
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

  const durationMs = performance.now() - startTime;
  (window as any).__FOXLAUNCH_MOUNT_DURATION__ = durationMs;
}

export const renderApp = initializeApp;

// Bootstrap once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeApp());
} else {
  initializeApp();
}
