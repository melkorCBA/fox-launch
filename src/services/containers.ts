/**
 * FoxLaunch — Container Context Service
 *
 * Discovers Firefox Multi-Account Containers and synthesizes the uncontained
 * default browser profile ('firefox-default').
 */

import type { ContainerContext, FirefoxContainerColor, FirefoxContainerIcon } from '../types';

/**
 * Synthetic default container context representing the uncontained base browser profile.
 */
export const DEFAULT_CONTAINER: ContainerContext = {
  cookieStoreId: 'firefox-default',
  name: 'Default',
  color: 'toolbar',
  icon: 'circle',
  colorCode: 'var(--container-default)',
  isDefault: true,
};

/**
 * Standard Firefox container color keyword to CSS hex color code mapping.
 * Matches values defined in src/styles/themes.css.
 */
export const CONTAINER_HEX_MAP: Record<FirefoxContainerColor | string, string> = {
  blue: '#37adff',
  turquoise: '#00c79a',
  green: '#51cf66',
  yellow: '#ffd43b',
  orange: '#ff922b',
  red: '#ff6b6b',
  pink: '#f06595',
  purple: '#cc5de8',
  toolbar: '#808080',
};

/**
 * Standard Firefox container color keyword to CSS custom property mapping.
 * Maps native colors to variables defined in themes.css.
 */
export const CONTAINER_VAR_MAP: Record<FirefoxContainerColor | string, string> = {
  blue: 'var(--container-blue)',
  turquoise: 'var(--container-turquoise)',
  green: 'var(--container-green)',
  yellow: 'var(--container-yellow)',
  orange: 'var(--container-orange)',
  red: 'var(--container-red)',
  pink: 'var(--container-pink)',
  purple: 'var(--container-purple)',
  toolbar: 'var(--container-toolbar)',
};

/**
 * Resolves a container color keyword to its corresponding hex code.
 */
export function getContainerHex(colorName: string): string {
  const normalized = (colorName || '').toLowerCase().trim();
  return CONTAINER_HEX_MAP[normalized] || '#808080';
}

/**
 * Resolves a container color keyword to its CSS variable string.
 */
export function getContainerCssVar(colorName: string): string {
  const normalized = (colorName || '').toLowerCase().trim();
  return CONTAINER_VAR_MAP[normalized] || 'var(--container-default)';
}

/**
 * Auto-discovers Firefox contextual identities (containers) and appends
 * the synthetic default uncontained context.
 *
 * If contextualIdentities API is unavailable or throws, gracefully returns
 * [DEFAULT_CONTAINER].
 */
export async function getContainers(): Promise<ContainerContext[]> {
  try {
    if (
      typeof browser === 'undefined' ||
      !browser.contextualIdentities ||
      typeof browser.contextualIdentities.query !== 'function'
    ) {
      console.warn('[FoxLaunch] browser.contextualIdentities is unavailable. Using default container only.');
      return [DEFAULT_CONTAINER];
    }

    const identities = await browser.contextualIdentities.query({});
    const discovered: ContainerContext[] = identities.map((identity) => ({
      cookieStoreId: identity.cookieStoreId,
      name: identity.name,
      color: identity.color as FirefoxContainerColor,
      icon: identity.icon as FirefoxContainerIcon,
      // Map native color to CSS custom property token from themes.css
      colorCode: getContainerCssVar(identity.color),
      isDefault: false,
    }));

    // Return discovered user containers followed by default uncontained profile
    return [...discovered, DEFAULT_CONTAINER];
  } catch (error) {
    console.error('[FoxLaunch] Error querying contextual identities:', error);
    return [DEFAULT_CONTAINER];
  }
}
