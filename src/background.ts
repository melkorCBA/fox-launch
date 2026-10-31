/**
 * FoxLaunch — Background Service Worker / Event Script (MV3)
 *
 * Listens for one-shot favicon watch requests from launcher tabs.
 * Manages targeted tab watchers that survive launcher tab closure.
 * Incurs 0% passive overhead when idle.
 */

import { createOneShotFaviconWatcher } from './services/favicon';
import { updateShortcutFavicon } from './services/storage';

export interface WatchFaviconMessage {
  type: 'WATCH_FAVICON';
  shortcutId: string;
  tabId: number;
  targetUrl?: string;
}

if (typeof browser !== 'undefined' && browser.runtime?.onMessage) {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (
      message &&
      typeof message === 'object' &&
      (message as WatchFaviconMessage).type === 'WATCH_FAVICON'
    ) {
      const { shortcutId, tabId, targetUrl } = message as WatchFaviconMessage;
      if (shortcutId && typeof tabId === 'number') {
        createOneShotFaviconWatcher(tabId, async (favIconUrl: string) => {
          try {
            await updateShortcutFavicon(shortcutId, favIconUrl, targetUrl);
          } catch (err) {
            console.error('[FoxLaunch Background] Error persisting captured favicon:', err);
          }
        });
      }
    }
  });
}
