/**
 * FoxLaunch — Favicon Service
 *
 * Provides targeted, one-shot favicon discovery and capture without passive background polling.
 * Zero third-party network requests. 100% offline & privacy compliant.
 */

import { extractDomain } from '../utils/validation';

/**
 * Determines whether candidateUrl matches the shortcut targetUrl.
 * Matches exact URL, matching origin/hostname, or matching protocol paths.
 */
export function isMatchingTarget(shortcutUrl: string, candidateUrl: string): boolean {
  if (!shortcutUrl || !candidateUrl) return false;
  if (shortcutUrl === candidateUrl) return true;

  try {
    const sUrl = new URL(shortcutUrl);
    const cUrl = new URL(candidateUrl);

    // Exact origin match (same protocol, host, port)
    if (sUrl.origin !== 'null' && cUrl.origin !== 'null' && sUrl.origin === cUrl.origin) {
      if (sUrl.pathname && sUrl.pathname !== '/') {
        return cUrl.pathname.startsWith(sUrl.pathname) || sUrl.pathname.startsWith(cUrl.pathname);
      }
      return true;
    }
  } catch {
    const sDomain = extractDomain(shortcutUrl);
    const cDomain = extractDomain(candidateUrl);
    if (sDomain && cDomain && sDomain.toLowerCase() === cDomain.toLowerCase()) {
      return true;
    }
  }

  return false;
}

/**
 * Searches currently open tabs across all windows for a matching URL with a loaded favicon.
 * Enables instant pre-population when adding or editing shortcuts without waiting for a new tab visit.
 */
export async function findFaviconFromOpenTabs(targetUrl: string): Promise<string | undefined> {
  if (typeof browser === 'undefined' || !browser.tabs?.query) {
    return undefined;
  }

  try {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.favIconUrl && tab.url && isMatchingTarget(targetUrl, tab.url)) {
        return tab.favIconUrl;
      }
    }
  } catch (error) {
    console.warn('[FoxLaunch] Error querying open tabs for favicon:', error);
  }

  return undefined;
}

/**
 * Creates an ephemeral, one-shot listener strictly watching targetTabId until its favicon is captured.
 * Automatically unregisters upon capture, tab removal, or a 10-second timeout.
 * Incurs 0% passive overhead when no shortcut is actively awaiting an icon.
 */
export function createOneShotFaviconWatcher(
  targetTabId: number,
  onCaptured: (favIconUrl: string) => void,
  timeoutMs = 10000
): () => void {
  if (typeof browser === 'undefined' || !browser.tabs?.onUpdated) {
    return () => {};
  }

  let cleanedUp = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }

    try {
      if (browser.tabs?.onUpdated?.removeListener) {
        browser.tabs.onUpdated.removeListener(onUpdated);
      }
      if (browser.tabs?.onRemoved?.removeListener) {
        browser.tabs.onRemoved.removeListener(onRemoved);
      }
    } catch (e) {
      console.warn('[FoxLaunch] Error cleaning up favicon watcher listeners:', e);
    }
  };

  const onUpdated = (
    tabId: number,
    changeInfo: browser.tabs._OnUpdatedChangeInfo,
    tab: browser.tabs.Tab
  ) => {
    if (tabId !== targetTabId) return;

    const iconUrl = changeInfo.favIconUrl || (tab.status === 'complete' ? tab.favIconUrl : undefined);
    if (iconUrl) {
      cleanup();
      try {
        onCaptured(iconUrl);
      } catch (err) {
        console.error('[FoxLaunch] Error in onCaptured callback:', err);
      }
    }
  };

  const onRemoved = (tabId: number) => {
    if (tabId === targetTabId) {
      cleanup();
    }
  };

  try {
    browser.tabs.onUpdated.addListener(onUpdated);
    if (browser.tabs.onRemoved?.addListener) {
      browser.tabs.onRemoved.addListener(onRemoved);
    }

    timerId = setTimeout(() => {
      cleanup();
    }, timeoutMs);
  } catch (err) {
    console.warn('[FoxLaunch] Could not attach favicon watcher listeners:', err);
    cleanup();
  }

  return cleanup;
}
