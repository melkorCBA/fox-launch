/**
 * FoxLaunch Test Presets & Fixture Data
 *
 * Provides standardized container definitions, settings, and shortcut generators
 * aligned with PROJECT.md and foxlaunch_specification.md.
 */

import type { ContainerContext, FoxLaunchSettings, ShortcutItem } from '../../src/types';

/**
 * Native Firefox container identity representations returned by browser.contextualIdentities.query({}).
 * Note: Native API returns user containers; firefox-default is synthesized by FoxLaunch.
 */
export interface NativeContextualIdentity {
  cookieStoreId: string;
  name: string;
  color: string;
  icon: string;
  colorCode: string;
}

export const DEFAULT_MOCK_CONTAINERS: NativeContextualIdentity[] = [
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
    colorCode: '#ff9400',
  },
  {
    cookieStoreId: 'firefox-container-3',
    name: 'Banking',
    color: 'green',
    icon: 'dollar',
    colorCode: '#00c853',
  },
  {
    cookieStoreId: 'firefox-container-4',
    name: 'Shopping',
    color: 'pink',
    icon: 'cart',
    colorCode: '#ff4b55',
  },
];

export const EMPTY_CONTAINERS: NativeContextualIdentity[] = [];

export const DEV_CONTAINERS: NativeContextualIdentity[] = [
  {
    cookieStoreId: 'firefox-container-10',
    name: 'AWS-Prod',
    color: 'red',
    icon: 'briefcase',
    colorCode: '#ff4b55',
  },
  {
    cookieStoreId: 'firefox-container-11',
    name: 'AWS-Staging',
    color: 'yellow',
    icon: 'briefcase',
    colorCode: '#ffe245',
  },
  {
    cookieStoreId: 'firefox-container-12',
    name: 'Client-GCP',
    color: 'turquoise',
    icon: 'circle',
    colorCode: '#00c0ff',
  },
];

export const DEFAULT_SETTINGS: FoxLaunchSettings = {
  version: 1,
  tabBehavior: 'close',
  theme: 'auto',
  cardSize: 'medium',
  firstRunDismissed: true, // Default to true in tests unless explicitly testing onboarding
  swimlaneCollapse: {
    'firefox-default': true, // Collapsed by default per pilot-plan §D6
  },
};

export const ONBOARDING_SETTINGS: FoxLaunchSettings = {
  version: 1,
  tabBehavior: 'close',
  theme: 'auto',
  cardSize: 'medium',
  firstRunDismissed: false, // Triggers onboarding walkthrough
  swimlaneCollapse: {
    'firefox-default': true,
  },
};

export function makeShortcut(
  cookieStoreId: string,
  title: string,
  url: string,
  order = 0,
  id = `shortcut-${Math.random().toString(36).substring(2, 9)}`
): ShortcutItem {
  let domain = 'example.com';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    domain = parsed.hostname;
  } catch {
    domain = url.split('/')[0] || 'example.com';
  }

  return {
    id,
    cookieStoreId,
    url,
    title,
    domain,
    createdAt: Date.now(),
    order,
  };
}

export const SAMPLE_SHORTCUTS: Record<string, ShortcutItem[]> = {
  'firefox-container-1': [
    makeShortcut('firefox-container-1', 'Personal Email', 'https://mail.proton.me', 0, 'sc-pers-1'),
    makeShortcut('firefox-container-1', 'Reddit', 'https://reddit.com', 1, 'sc-pers-2'),
    makeShortcut('firefox-container-1', 'Mastodon', 'https://mastodon.social', 2, 'sc-pers-3'),
  ],
  'firefox-container-2': [
    makeShortcut('firefox-container-2', 'GitHub', 'https://github.com', 0, 'sc-work-1'),
    makeShortcut('firefox-container-2', 'Jira Work Management', 'https://atlassian.net', 1, 'sc-work-2'),
    makeShortcut('firefox-container-2', 'Slack Web', 'https://app.slack.com', 2, 'sc-work-3'),
    makeShortcut('firefox-container-2', 'Google Docs', 'https://docs.google.com', 3, 'sc-work-4'),
  ],
  'firefox-container-3': [
    makeShortcut('firefox-container-3', 'Online Banking Portal', 'https://secure.chase.com', 0, 'sc-bank-1'),
    makeShortcut('firefox-container-3', 'Vanguard Investments', 'https://investor.vanguard.com', 1, 'sc-bank-2'),
  ],
  'firefox-container-4': [
    makeShortcut('firefox-container-4', 'Amazon Store', 'https://amazon.com', 0, 'sc-shop-1'),
    makeShortcut('firefox-container-4', 'eBay Marketplace', 'https://ebay.com', 1, 'sc-shop-2'),
  ],
  'firefox-default': [
    makeShortcut('firefox-default', 'Mozilla Developer Network', 'https://developer.mozilla.org', 0, 'sc-def-1'),
    makeShortcut('firefox-default', 'Wikipedia Knowledge', 'https://en.wikipedia.org', 1, 'sc-def-2'),
  ],
};

/**
 * Generates 100+ shortcuts across containers for Tier 2 performance stress testing.
 */
export function generate100Shortcuts(containers: NativeContextualIdentity[] = DEFAULT_MOCK_CONTAINERS): Record<string, ShortcutItem[]> {
  const result: Record<string, ShortcutItem[]> = {
    'firefox-default': [],
  };
  containers.forEach(c => {
    result[c.cookieStoreId] = [];
  });

  const allContainerIds = ['firefox-default', ...containers.map(c => c.cookieStoreId)];
  const totalShortcuts = 120;

  for (let i = 0; i < totalShortcuts; i++) {
    const containerId = allContainerIds[i % allContainerIds.length];
    const item = makeShortcut(
      containerId,
      `Stress Test Item ${i + 1} (${containerId})`,
      `https://service-${i}.example.org/dashboard/path?item=${i}`,
      result[containerId].length,
      `stress-sc-${i}`
    );
    result[containerId].push(item);
  }

  return result;
}
