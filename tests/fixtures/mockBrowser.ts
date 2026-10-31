/**
 * FoxLaunch WebExtension Mock Harness
 *
 * Injected into the browser environment via Playwright's `page.addInitScript`.
 * Faithfully simulates Mozilla Firefox WebExtensions APIs:
 * - browser.contextualIdentities (query, get, create, remove, listeners)
 * - browser.storage.local (get, set, remove, clear, onChanged)
 * - browser.tabs (create, getCurrent, remove, update)
 * - browser.runtime (getURL, lastError)
 * - browser.i18n (getMessage)
 *
 * Persistence across page reloads is backed by window.localStorage.
 */

import type { NativeContextualIdentity } from './presets';
import { DEFAULT_MOCK_CONTAINERS, DEFAULT_SETTINGS } from './presets';

export interface DispatchedTabRecord {
  id: number;
  url: string;
  cookieStoreId?: string;
  active: boolean;
  timestamp: number;
}

export interface MockHarnessInitOptions {
  containers?: NativeContextualIdentity[];
  shortcuts?: Record<string, any[]>;
  settings?: Record<string, any>;
  dispatchedTabs?: DispatchedTabRecord[];
  closedTabs?: number[];
}

/**
 * Creates the browser injection script string with custom initial state.
 */
export function buildMockWebExtensionScript(options: MockHarnessInitOptions = {}): string {
  const initialContainers = options.containers ?? DEFAULT_MOCK_CONTAINERS;
  const initialShortcuts = options.shortcuts ?? {};
  const initialSettings = options.settings ?? DEFAULT_SETTINGS;

  const serializedInitialState = JSON.stringify({
    containers: initialContainers,
    storage: {
      foxlaunch_shortcuts: initialShortcuts,
      foxlaunch_settings: initialSettings,
    },
  });

  return `
(function() {
  const STORAGE_KEY = '__foxlaunch_mock_storage_state__';
  const CONTAINERS_KEY = '__foxlaunch_mock_containers_state__';
  const DISPATCHED_TABS_KEY = '__foxlaunch_mock_dispatched_tabs__';
  const CLOSED_TABS_KEY = '__foxlaunch_mock_closed_tabs__';

  const defaultSeed = ${serializedInitialState};

  // Initialize localStorage state if not already populated
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSeed.storage));
    }
    if (!localStorage.getItem(CONTAINERS_KEY)) {
      localStorage.setItem(CONTAINERS_KEY, JSON.stringify(defaultSeed.containers));
    }
  } catch (e) {
    console.warn('[FoxLaunch Mock] localStorage access failed:', e);
  }

  function getRawStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultSeed.storage));
    } catch {
      return JSON.parse(JSON.stringify(defaultSeed.storage));
    }
  }

  function saveRawStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[FoxLaunch Mock] Failed to save storage:', e);
    }
  }

  function getRawContainers() {
    try {
      const raw = localStorage.getItem(CONTAINERS_KEY);
      return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultSeed.containers));
    } catch {
      return JSON.parse(JSON.stringify(defaultSeed.containers));
    }
  }

  function saveRawContainers(data) {
    try {
      localStorage.setItem(CONTAINERS_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[FoxLaunch Mock] Failed to save containers:', e);
    }
  }

  function getRawDispatchedTabs() {
    try {
      const raw = sessionStorage.getItem(DISPATCHED_TABS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveRawDispatchedTabs(tabs) {
    try {
      sessionStorage.setItem(DISPATCHED_TABS_KEY, JSON.stringify(tabs));
    } catch (e) {
      console.warn('[FoxLaunch Mock] Failed to save tabs:', e);
    }
  }

  function getRawClosedTabs() {
    try {
      const raw = sessionStorage.getItem(CLOSED_TABS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveRawClosedTabs(tabs) {
    try {
      sessionStorage.setItem(CLOSED_TABS_KEY, JSON.stringify(tabs));
    } catch (e) {
      console.warn('[FoxLaunch Mock] Failed to save closed tabs:', e);
    }
  }

  // Event listener registry
  const storageListeners = new Set();
  const containerCreatedListeners = new Set();
  const containerRemovedListeners = new Set();
  const containerUpdatedListeners = new Set();

  function createListenerContainer(set) {
    return {
      addListener(fn) {
        if (typeof fn === 'function') set.add(fn);
      },
      removeListener(fn) {
        set.delete(fn);
      },
      hasListener(fn) {
        return set.has(fn);
      }
    };
  }

  // WebExtension Mock API Object
  const mockBrowser = {
    contextualIdentities: {
      async query(details) {
        const containers = getRawContainers();
        if (!details || Object.keys(details).length === 0) {
          return JSON.parse(JSON.stringify(containers));
        }
        return containers.filter(c => {
          if (details.name && c.name !== details.name) return false;
          return true;
        });
      },
      async get(cookieStoreId) {
        const containers = getRawContainers();
        const found = containers.find(c => c.cookieStoreId === cookieStoreId);
        if (!found) {
          throw new Error('Container identity not found: ' + cookieStoreId);
        }
        return JSON.parse(JSON.stringify(found));
      },
      async create(details) {
        const containers = getRawContainers();
        const newId = 'firefox-container-' + (containers.length + 10);
        const item = {
          cookieStoreId: newId,
          name: details.name || 'Custom Container',
          color: details.color || 'blue',
          icon: details.icon || 'circle',
          colorCode: details.colorCode || '#37adff',
        };
        containers.push(item);
        saveRawContainers(containers);
        containerCreatedListeners.forEach(fn => {
          try { fn({ contextualIdentity: item }); } catch (err) { console.error(err); }
        });
        return JSON.parse(JSON.stringify(item));
      },
      async remove(cookieStoreId) {
        const containers = getRawContainers();
        const idx = containers.findIndex(c => c.cookieStoreId === cookieStoreId);
        if (idx !== -1) {
          const removed = containers.splice(idx, 1)[0];
          saveRawContainers(containers);
          containerRemovedListeners.forEach(fn => {
            try { fn({ contextualIdentity: removed }); } catch (err) { console.error(err); }
          });
          return removed;
        }
        throw new Error('Container identity not found: ' + cookieStoreId);
      },
      onCreated: createListenerContainer(containerCreatedListeners),
      onRemoved: createListenerContainer(containerRemovedListeners),
      onUpdated: createListenerContainer(containerUpdatedListeners),
    },

    storage: {
      local: {
        async get(keys) {
          const store = getRawStorage();
          if (keys === null || keys === undefined) {
            return JSON.parse(JSON.stringify(store));
          }
          if (typeof keys === 'string') {
            return { [keys]: store[keys] !== undefined ? JSON.parse(JSON.stringify(store[keys])) : undefined };
          }
          if (Array.isArray(keys)) {
            const result = {};
            keys.forEach(k => {
              if (store[k] !== undefined) {
                result[k] = JSON.parse(JSON.stringify(store[k]));
              }
            });
            return result;
          }
          if (typeof keys === 'object') {
            const result = {};
            for (const [k, defaultVal] of Object.entries(keys)) {
              result[k] = store[k] !== undefined ? JSON.parse(JSON.stringify(store[k])) : defaultVal;
            }
            return result;
          }
          return JSON.parse(JSON.stringify(store));
        },
        async set(items) {
          const store = getRawStorage();
          const changes = {};
          for (const [key, value] of Object.entries(items)) {
            changes[key] = {
              oldValue: store[key] !== undefined ? JSON.parse(JSON.stringify(store[key])) : undefined,
              newValue: JSON.parse(JSON.stringify(value)),
            };
            store[key] = JSON.parse(JSON.stringify(value));
          }
          saveRawStorage(store);
          storageListeners.forEach(fn => {
            try { fn(changes, 'local'); } catch (err) { console.error(err); }
          });
        },
        async remove(keys) {
          const store = getRawStorage();
          const keysArr = Array.isArray(keys) ? keys : [keys];
          const changes = {};
          keysArr.forEach(k => {
            if (store[k] !== undefined) {
              changes[k] = { oldValue: store[k], newValue: undefined };
              delete store[k];
            }
          });
          saveRawStorage(store);
          storageListeners.forEach(fn => {
            try { fn(changes, 'local'); } catch (err) { console.error(err); }
          });
        },
        async clear() {
          const store = getRawStorage();
          const changes = {};
          for (const k of Object.keys(store)) {
            changes[k] = { oldValue: store[k], newValue: undefined };
          }
          saveRawStorage({});
          storageListeners.forEach(fn => {
            try { fn(changes, 'local'); } catch (err) { console.error(err); }
          });
        },
        onChanged: createListenerContainer(storageListeners),
      },
      onChanged: createListenerContainer(storageListeners),
    },

    tabs: {
      async create(createProperties) {
        const tabs = getRawDispatchedTabs();
        const tabRecord = {
          id: Math.floor(Math.random() * 900000) + 100000,
          url: createProperties.url,
          cookieStoreId: createProperties.cookieStoreId,
          active: createProperties.active !== undefined ? createProperties.active : true,
          timestamp: Date.now(),
        };
        tabs.push(tabRecord);
        saveRawDispatchedTabs(tabs);
        return {
          id: tabRecord.id,
          url: tabRecord.url,
          cookieStoreId: tabRecord.cookieStoreId,
          active: tabRecord.active,
        };
      },
      async getCurrent() {
        return { id: 1, active: true, url: window.location.href };
      },
      async remove(tabId) {
        const closed = getRawClosedTabs();
        closed.push(tabId);
        saveRawClosedTabs(closed);
      },
      async update(tabId, updateProps) {
        return { id: tabId, ...updateProps };
      },
    },

    runtime: {
      getManifest() {
        return { manifest_version: 3, name: 'FoxLaunch', version: '9.8.7' };
      },
      getURL(path) {
        if (!path) return '/';
        return path.startsWith('/') ? path : '/' + path;
      },
      lastError: null,
    },

    i18n: {
      getMessage(name, substitutions) {
        return name;
      },
    },
  };

  // Expose on window and globalThis
  window.browser = mockBrowser;
  globalThis.browser = mockBrowser;

  // Test Harness Controller attached to window
  window.__FOXLAUNCH_TEST_HARNESS__ = {
    getDispatchedTabs() {
      return getRawDispatchedTabs();
    },
    clearDispatchedTabs() {
      saveRawDispatchedTabs([]);
    },
    getClosedTabs() {
      return getRawClosedTabs();
    },
    setContainers(containers) {
      saveRawContainers(containers);
    },
    getContainers() {
      return getRawContainers();
    },
    getStorage() {
      return getRawStorage();
    },
    setStorage(data) {
      saveRawStorage(data);
    },
    reset(newSeed) {
      const seed = newSeed || defaultSeed;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed.storage));
      localStorage.setItem(CONTAINERS_KEY, JSON.stringify(seed.containers));
      saveRawDispatchedTabs([]);
      saveRawClosedTabs([]);
    },
  };
})();
`;
}
