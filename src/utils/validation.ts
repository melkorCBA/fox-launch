/**
 * FoxLaunch — URL Validation & Normalization Utility
 *
 * Validates schemes, auto-prepends https://, extracts domains, and rejects dangerous protocols.
 * 100% offline, zero network requests.
 */

import type { UrlValidationResult as BaseUrlValidationResult } from '../types';

export interface UrlValidationResult extends BaseUrlValidationResult {
  domain: string;
}

const DISALLOWED_SCHEMES = ['javascript:', 'data:', 'file:', 'vbscript:', 'blob:'];

/**
 * Extracts domain hostname (and port if non-standard) from a URL string.
 * Supports web URLs, IP addresses, and about: paths.
 */
export function extractDomain(url: string): string {
  try {
    const trimmed = (url || '').trim();
    if (!trimmed) return '';

    if (trimmed.toLowerCase().startsWith('about:')) {
      return trimmed.split('?')[0].split('#')[0];
    }

    const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    return parsed.hostname + (parsed.port ? `:${parsed.port}` : '');
  } catch {
    return (url || '').replace(/^[a-zA-Z]+:\/\//, '').split('/')[0].split('?')[0].split('#')[0] || url;
  }
}

/**
 * Validates and normalizes user URL input.
 *
 * - Auto-prepends "https://" if scheme is omitted.
 * - Allows https://, http://, and about:
 * - Strictly rejects javascript:, data:, file:, vbscript:, blob:
 * - Returns { valid: boolean, formattedUrl: string, domain: string, error?: string }
 */
export function validateAndFormatUrl(input: string): UrlValidationResult {
  if (!input || !input.trim()) {
    return {
      valid: false,
      formattedUrl: '',
      domain: '',
      error: 'URL cannot be empty.',
    };
  }

  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Reject dangerous schemes
  for (const blocked of DISALLOWED_SCHEMES) {
    if (lower.startsWith(blocked)) {
      return {
        valid: false,
        formattedUrl: '',
        domain: '',
        error: `Disallowed URL scheme "${blocked}". Only https://, http://, and about: are permitted.`,
      };
    }
  }

  // Handle about: URLs (e.g. about:config, about:addons)
  if (lower.startsWith('about:')) {
    const aboutPath = trimmed.substring(6).trim();
    const mainSection = aboutPath.split(/[?#]/)[0];
    if (!aboutPath || !mainSection || !/^[a-z0-9_-]+$/i.test(mainSection)) {
      return {
        valid: false,
        formattedUrl: '',
        domain: '',
        error: 'Invalid about: URL format.',
      };
    }
    return {
      valid: true,
      formattedUrl: `about:${aboutPath}`,
      domain: `about:${mainSection}`,
    };
  }

  // Check if scheme is explicitly provided (scheme followed by colon not followed by digits)
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):(?!\d)/);
  let candidate = trimmed;

  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== 'https' && scheme !== 'http') {
      return {
        valid: false,
        formattedUrl: '',
        domain: '',
        error: `Unsupported scheme "${scheme}:". Only https://, http://, and about: are permitted.`,
      };
    }
  } else {
    // Auto-prepend https://
    candidate = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        valid: false,
        formattedUrl: '',
        domain: '',
        error: 'Only https://, http://, and about: URLs are permitted.',
      };
    }

    if (!parsed.hostname || parsed.hostname.length === 0) {
      return {
        valid: false,
        formattedUrl: '',
        domain: '',
        error: 'URL must contain a valid hostname.',
      };
    }

    // Hostnames cannot contain spaces
    if (/\s/.test(parsed.hostname)) {
      return {
        valid: false,
        formattedUrl: '',
        domain: '',
        error: 'Hostname cannot contain spaces.',
      };
    }

    const domain = parsed.hostname + (parsed.port ? `:${parsed.port}` : '');

    return {
      valid: true,
      formattedUrl: parsed.href,
      domain,
    };
  } catch {
    return {
      valid: false,
      formattedUrl: '',
      domain: '',
      error: 'Invalid URL format.',
    };
  }
}
