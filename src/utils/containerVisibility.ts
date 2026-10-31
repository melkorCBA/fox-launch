import type { ContainerContext, ContainerVisibility } from '../types';

/**
 * Matches entire names case-insensitively with only '*' treated as a wildcard.
 * Ordered literal segments avoid interpreting user input as regular expressions.
 */
export function matchesContainerName(name: string, pattern: string): boolean {
  const normalizedPattern = pattern.trim().toLowerCase();
  if (!normalizedPattern) return false;
  const normalizedName = name.toLowerCase();
  const parts = normalizedPattern.split('*');
  if (parts.length === 1) return normalizedName === normalizedPattern;
  if (!normalizedName.startsWith(parts[0])) return false;

  let position = parts[0].length;
  for (const part of parts.slice(1, -1)) {
    const index = normalizedName.indexOf(part, position);
    if (index === -1) return false;
    position = index + part.length;
  }

  const suffix = parts[parts.length - 1];
  return normalizedName.endsWith(suffix) && normalizedName.length - suffix.length >= position;
}

export function isContainerVisible(
  container: ContainerContext,
  visibility: ContainerVisibility
): boolean {
  if (container.isDefault || visibility.mode === 'all') return true;
  const matches = visibility.cookieStoreIds.includes(container.cookieStoreId)
    || visibility.namePatterns.some((pattern) => matchesContainerName(container.name, pattern));
  return visibility.mode === 'only' ? matches : !matches;
}
