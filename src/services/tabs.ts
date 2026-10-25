/**
 * FoxLaunch — Tab Dispatcher Service
 *
 * Spawns isolated container tabs and manages launcher tab lifecycle.
 */

import type { DispatchOptions } from '../types';
import { getSettings } from './storage';

/**
 * Dispatches a URL into a container tab.
 *
 * @param url Target destination URL
 * @param cookieStoreId Container ID ('firefox-container-X' or 'firefox-default')
 * @param options Dispatch configuration options (e.g. { active: false } for background tab)
 * @returns The created tab object, or undefined if browser.tabs is unavailable
 */
export async function dispatchShortcut(
  url: string,
  cookieStoreId: string,
  options?: DispatchOptions
): Promise<browser.tabs.Tab | undefined> {
  const isActive = options?.active ?? true;

  // Use destination cookieStoreId, falling back to 'firefox-default' for uncontained context
  const targetCookieStoreId = cookieStoreId || 'firefox-default';

  const createProps: browser.tabs._CreateCreateProperties = {
    url,
    active: isActive,
    cookieStoreId: targetCookieStoreId,
  };

  if (typeof browser === 'undefined' || !browser.tabs?.create) {
    console.warn('[FoxLaunch] browser.tabs.create is unavailable. Simulating dispatch for:', url);
    return undefined;
  }

  const createdTab = await browser.tabs.create(createProps);

  // If tab was opened in foreground (active: true), check tabBehavior setting
  // Middle-click / Ctrl-click (active: false) NEVER closes the launcher tab
  if (isActive) {
    try {
      const settings = await getSettings();
      if (settings.tabBehavior === 'close') {
        const currentTab = await browser.tabs.getCurrent();
        if (currentTab?.id !== undefined) {
          await browser.tabs.remove(currentTab.id);
        } else if (browser.tabs.query) {
          // Fallback: query active tab in current window
          const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id !== undefined && activeTab.id !== createdTab?.id) {
            await browser.tabs.remove(activeTab.id);
          }
        }
      }
    } catch (tabCloseError) {
      console.warn('[FoxLaunch] Could not close launcher tab after dispatch:', tabCloseError);
    }
  }

  return createdTab;
}
