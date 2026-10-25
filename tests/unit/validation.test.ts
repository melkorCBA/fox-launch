import { test, expect } from '@playwright/test';
import { validateAndFormatUrl, extractDomain } from '../../src/utils/validation';

test.describe('URL Validation & Normalization Utility', () => {
  test('rejects empty and whitespace-only strings', () => {
    expect(validateAndFormatUrl('').valid).toBe(false);
    expect(validateAndFormatUrl('').error).toBeDefined();
    expect(validateAndFormatUrl('   ').valid).toBe(false);
    expect(validateAndFormatUrl('\t\n').valid).toBe(false);
  });

  test('auto-prepends https:// when scheme is omitted', () => {
    const res1 = validateAndFormatUrl('github.com');
    expect(res1.valid).toBe(true);
    expect(res1.formattedUrl).toBe('https://github.com/');
    expect(res1.domain).toBe('github.com');

    const res2 = validateAndFormatUrl('subdomain.example.org/path?q=1');
    expect(res2.valid).toBe(true);
    expect(res2.formattedUrl).toBe('https://subdomain.example.org/path?q=1');
    expect(res2.domain).toBe('subdomain.example.org');

    const res3 = validateAndFormatUrl('localhost:3000');
    expect(res3.valid).toBe(true);
    expect(res3.formattedUrl).toBe('https://localhost:3000/');
    expect(res3.domain).toBe('localhost:3000');
  });

  test('preserves explicit https:// and http:// schemes', () => {
    const httpsRes = validateAndFormatUrl('https://mozilla.org');
    expect(httpsRes.valid).toBe(true);
    expect(httpsRes.formattedUrl).toBe('https://mozilla.org/');
    expect(httpsRes.domain).toBe('mozilla.org');

    const httpRes = validateAndFormatUrl('http://localhost:8080/dashboard');
    expect(httpRes.valid).toBe(true);
    expect(httpRes.formattedUrl).toBe('http://localhost:8080/dashboard');
    expect(httpRes.domain).toBe('localhost:8080');
  });

  test('accepts valid about: URLs', () => {
    const res1 = validateAndFormatUrl('about:config');
    expect(res1.valid).toBe(true);
    expect(res1.formattedUrl).toBe('about:config');
    expect(res1.domain).toBe('about:config');

    const res2 = validateAndFormatUrl('about:addons');
    expect(res2.valid).toBe(true);
    expect(res2.formattedUrl).toBe('about:addons');
    expect(res2.domain).toBe('about:addons');

    const res3 = validateAndFormatUrl('about:preferences');
    expect(res3.valid).toBe(true);
    expect(res3.formattedUrl).toBe('about:preferences');
    expect(res3.domain).toBe('about:preferences');
  });

  test('rejects malformed about: URLs', () => {
    expect(validateAndFormatUrl('about:').valid).toBe(false);
    expect(validateAndFormatUrl('about:   ').valid).toBe(false);
    expect(validateAndFormatUrl('about:invalid path').valid).toBe(false);
  });

  test('strictly blocks dangerous schemes regardless of casing', () => {
    expect(validateAndFormatUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateAndFormatUrl('JAVASCRIPT:void(0)').valid).toBe(false);
    expect(validateAndFormatUrl('JavaScript:prompt(1)').valid).toBe(false);
    expect(validateAndFormatUrl('data:text/html,<script>alert(1)</script>').valid).toBe(false);
    expect(validateAndFormatUrl('DATA:application/json,{}').valid).toBe(false);
    expect(validateAndFormatUrl('file:///C:/Windows/System32').valid).toBe(false);
    expect(validateAndFormatUrl('FILE:///etc/passwd').valid).toBe(false);
    expect(validateAndFormatUrl('blob:https://example.com/uuid').valid).toBe(false);
    expect(validateAndFormatUrl('vbscript:msgbox(1)').valid).toBe(false);
    expect(validateAndFormatUrl('VBSCRIPT:test').valid).toBe(false);
  });

  test('rejects unsupported protocols', () => {
    expect(validateAndFormatUrl('ftp://files.example.com').valid).toBe(false);
    expect(validateAndFormatUrl('ssh://git@github.com').valid).toBe(false);
    expect(validateAndFormatUrl('mailto:test@example.com').valid).toBe(false);
    expect(validateAndFormatUrl('ws://localhost:8080').valid).toBe(false);
  });

  test('rejects invalid hostnames containing spaces', () => {
    expect(validateAndFormatUrl('not a valid url').valid).toBe(false);
    expect(validateAndFormatUrl('https://foo bar.com').valid).toBe(false);
  });

  test('extractDomain correctly parses hostnames, subdomains, and ports', () => {
    expect(extractDomain('https://console.aws.amazon.com/ec2/home')).toBe('console.aws.amazon.com');
    expect(extractDomain('http://localhost:8080/dashboard')).toBe('localhost:8080');
    expect(extractDomain('about:config')).toBe('about:config');
    expect(extractDomain('https://github.com')).toBe('github.com');
    expect(extractDomain('gitlab.com/user/repo')).toBe('gitlab.com');
    expect(extractDomain('')).toBe('');
  });
});
