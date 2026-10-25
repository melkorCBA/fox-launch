/**
 * FoxLaunch — Offline Procedural SVG Avatar Generator
 *
 * Generates local SVG letter avatars derived from the shortcut domain and container palette.
 * 100% offline, zero network requests, strict CSP compliant.
 */

export const COLOR_MAP: Record<string, string> = {
  blue: '#37adff',
  turquoise: '#00c79a',
  green: '#51cf66',
  yellow: '#ffd43b',
  orange: '#ff922b',
  red: '#ff6b6b',
  pink: '#f06595',
  purple: '#cc5de8',
  toolbar: '#808080',
  default: '#808080',
};

/**
 * Resolves color strings (hex, color keywords, or CSS vars) to an exact hex code.
 */
export function resolveHexColor(colorInput?: string): string {
  if (!colorInput) return '#808080';
  const trimmed = colorInput.trim().toLowerCase();

  // If already valid 3-digit or 6-digit hex
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return trimmed;
  }

  // If CSS var format: var(--container-<name>)
  const varMatch = trimmed.match(/var\(--container-([a-z]+)\)/);
  if (varMatch && COLOR_MAP[varMatch[1]]) {
    return COLOR_MAP[varMatch[1]];
  }

  // If color name keyword
  if (COLOR_MAP[trimmed]) {
    return COLOR_MAP[trimmed];
  }

  return '#808080';
}

/**
 * Calculates perceived brightness (ITU-R BT.601) and returns high-contrast text color
 * for WCAG AA compliance (#15141a for light backgrounds, #ffffff for dark backgrounds).
 */
export function getContrastTextColor(hexColor: string): string {
  let cleanHex = hexColor.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  // Relative luminance formula (ITU-R BT.601 perceived brightness)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 165 ? '#15141a' : '#ffffff';
}

/**
 * Escapes characters for safe inclusion in SVG XML attributes and text nodes.
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Extracts a single uppercase initial character from a domain name.
 * Strips schemes (https://, http://, about:) and subdomains (www., m.).
 * Returns '?' if no alphanumeric character is found.
 */
export function getDomainInitial(domain?: string): string {
  if (!domain) return '?';

  const cleanDomain = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^about:/i, '')
    .replace(/^www\./i, '')
    .replace(/^m\./i, '');

  for (let i = 0; i < cleanDomain.length; i++) {
    const char = cleanDomain.charAt(i);
    if (/[a-z0-9]/i.test(char)) {
      return char.toUpperCase();
    }
  }

  return '?';
}

/**
 * Generates an offline SVG data URL avatar from domain name and container color.
 *
 * @param domain Hostname or domain string (e.g. "github.com", "about:config")
 * @param containerColorCode Hex code, CSS variable (var(--container-*)), or color keyword
 * @returns Clean SVG data URL: "data:image/svg+xml;utf8,..."
 */
export function generateAvatarSvg(domain: string, containerColorCode?: string): string {
  const initial = getDomainInitial(domain);
  const bgColor = resolveHexColor(containerColorCode);
  const textColor = getContrastTextColor(bgColor);

  // Encode '#' as '%23' to prevent URL fragment cutoff in data URLs
  const bgFill = bgColor.replace('#', '%23');
  const textFill = textColor.replace('#', '%23');
  const escapedInitial = escapeXml(initial);

  // 32x32 rounded rectangle avatar with 8px corner radius
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'><rect width='32' height='32' rx='8' fill='${bgFill}'/><text x='16' y='16' font-family='-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif' font-size='16' font-weight='600' fill='${textFill}' text-anchor='middle' dominant-baseline='central'>${escapedInitial}</text></svg>`;

  return `data:image/svg+xml;utf8,${svg}`;
}
