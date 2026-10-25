import { test, expect } from '@playwright/test';
import { validateAndFormatUrl, extractDomain } from '../../src/utils/validation';
import {
  generateAvatarSvg,
  resolveHexColor,
  getContrastTextColor,
  getDomainInitial,
  COLOR_MAP,
} from '../../src/utils/avatar';

test.describe('Adversarial Stress-Testing: URL Validation Utility (src/utils/validation.ts)', () => {
  test('Attack 1.1: Malicious XSS and Script Execution Schemes', () => {
    const maliciousSchemes = [
      'javascript:alert(1)',
      'javascript:void(0)',
      'JAVASCRIPT:alert(document.cookie)',
      'JaVaScRiPt:prompt(1)',
      'javascript://test%0Aalert(1)',
      'javascript:/*--></title></style></textarea></script>*/<svg/onload=alert(1)>',
      'javascript:/*\n*/alert(1)',
      'vbscript:msgbox(1)',
      'VBSCRIPT:alert(1)',
      'VbScRiPt:Execute("MsgBox 1")',
    ];

    for (const url of maliciousSchemes) {
      const res = validateAndFormatUrl(url);
      expect(res.valid, `Expected "${url}" to be rejected`).toBe(false);
      expect(res.formattedUrl).toBe('');
      expect(res.error).toBeDefined();
    }
  });

  test('Attack 1.2: Obfuscated and Entity Bypass Vectors', () => {
    const obfuscatedVectors = [
      'jav&#x09;ascript:alert(1)',
      'jav&#0000009ascript:alert(1)',
      'jav&#x0A;ascript:alert(1)',
      'jav&#x0D;ascript:alert(1)',
      'javascript\t:alert(1)',
      'javascript\n:alert(1)',
      'javascript\r\n:alert(1)',
      'java\0script:alert(1)',
      'javascript%3aalert(1)',
      'javascript%3Aalert(1)',
      '&#106;avascript:alert(1)',
    ];

    for (const vector of obfuscatedVectors) {
      const res = validateAndFormatUrl(vector);
      // The result must either be completely rejected (valid === false),
      // OR if auto-prepended to https://, the protocol MUST be https: and never execute as javascript
      if (res.valid) {
        expect(res.formattedUrl.startsWith('https://'), `Valid formattedUrl must start with https://, got "${res.formattedUrl}"`).toBe(true);
        expect(res.formattedUrl.toLowerCase()).not.toContain('javascript:');
      } else {
        expect(res.valid).toBe(false);
      }
    }
  });

  test('Attack 1.3: Data and Blob URI Injections', () => {
    const dataAndBlobUrls = [
      'data:text/html,<script>alert(1)</script>',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'data:image/svg+xml,<svg onload=alert(1)>',
      'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+',
      'DATA:text/html,<script>alert(1)</script>',
      'Data:application/javascript,alert(1)',
      'blob:https://example.com/4a85239a-7c91-4cf4-b8e7-e31bbce3439b',
      'blob:d3b07384-d113-46d4-a71f-4043022d37d6',
      'BLOB:http://attacker.com/uuid',
    ];

    for (const url of dataAndBlobUrls) {
      const res = validateAndFormatUrl(url);
      expect(res.valid, `Expected data/blob "${url}" to be rejected`).toBe(false);
      expect(res.formattedUrl).toBe('');
    }
  });

  test('Attack 1.4: Local Filesystem and Internal Browser Schemes', () => {
    const internalUrls = [
      'file:///C:/Windows/System32/drivers/etc/hosts',
      'file:///etc/passwd',
      'FILE:///localhost/foo',
      'chrome://settings',
      'chrome://version',
      'moz-extension://a478b845-f09b-4bf1-bf63-54be1cb9e931/manifest.json',
      'resource://gre/modules/Services.jsm',
      'jar:file:///path/to/archive.jar!/content.html',
      'view-source:https://example.com',
      'view-source:about:config',
      'feed:https://example.com/rss',
      'ftp://files.server.org/secret.pdf',
      'sftp://internal.backup.net',
      'gopher://gopher.floodgap.com',
    ];

    for (const url of internalUrls) {
      const res = validateAndFormatUrl(url);
      expect(res.valid, `Expected internal scheme "${url}" to be rejected`).toBe(false);
      expect(res.formattedUrl).toBe('');
    }
  });

  test('Attack 1.5: Malformed and Injection about: URLs', () => {
    const malformedAboutUrls = [
      'about:',
      'about:   ',
      'about: \t ',
      'about:<script>alert(1)</script>',
      'about:alert(1)',
      'about:javascript:alert(1)',
      'about:" onclick="alert(1)',
      'about:preferences/foo/bar', // Slashes in path
      'about:addons\\malicious',   // Backslashes
      'about:config;alert(1)',     // Semicolons
      'about:addons/extension?x=1',
    ];

    for (const url of malformedAboutUrls) {
      const res = validateAndFormatUrl(url);
      expect(res.valid, `Expected malformed about: URL "${url}" to be rejected`).toBe(false);
    }

    // Valid about: URLs with allowed query or hash
    const validAboutUrls = [
      'about:config',
      'about:addons',
      'about:preferences',
      'about:debugging',
      'about:processes',
      'about:blank',
      'about:config?filter=network',
      'about:preferences#privacy',
      'about:about',
    ];

    for (const url of validAboutUrls) {
      const res = validateAndFormatUrl(url);
      expect(res.valid, `Expected valid about URL "${url}" to pass`).toBe(true);
      expect(res.formattedUrl).toBe(url);
    }
  });

  test('Attack 1.6: Invalid Ports and Numeric Boundary Probing', () => {
    // Port out of range (> 65535)
    expect(validateAndFormatUrl('https://example.com:999999').valid).toBe(false);
    expect(validateAndFormatUrl('example.com:999999').valid).toBe(false);
    expect(validateAndFormatUrl('http://localhost:65536').valid).toBe(false);

    // Negative port
    expect(validateAndFormatUrl('https://example.com:-1').valid).toBe(false);
    expect(validateAndFormatUrl('example.com:-1').valid).toBe(false);

    // Port with letters or special characters
    expect(validateAndFormatUrl('https://example.com:80a').valid).toBe(false);
    expect(validateAndFormatUrl('https://example.com:80/').valid).toBe(true);
    expect(validateAndFormatUrl('example.com:port').valid).toBe(false);

    // Valid boundary ports
    const validP1 = validateAndFormatUrl('https://example.com:65535');
    expect(validP1.valid).toBe(true);
    expect(validP1.formattedUrl).toBe('https://example.com:65535/');

    const validP2 = validateAndFormatUrl('http://localhost:8080');
    expect(validP2.valid).toBe(true);
    expect(validP2.domain).toBe('localhost:8080');

    const validP3 = validateAndFormatUrl('127.0.0.1:3000');
    expect(validP3.valid).toBe(true);
    expect(validP3.formattedUrl).toBe('https://127.0.0.1:3000/');
    expect(validP3.domain).toBe('127.0.0.1:3000');
  });

  test('Attack 1.7: IPv6 Addresses and Formats', () => {
    // Valid IPv6 loopback
    const ipv6Loopback = validateAndFormatUrl('http://[::1]:8080');
    expect(ipv6Loopback.valid).toBe(true);
    expect(ipv6Loopback.formattedUrl).toBe('http://[::1]:8080/');
    expect(ipv6Loopback.domain).toBe('[::1]:8080');

    // Valid full IPv6 with explicit scheme
    const ipv6Full = validateAndFormatUrl('https://[2001:db8:85a3:0:0:8a2e:370:7334]:443');
    expect(ipv6Full.valid).toBe(true);
    expect(ipv6Full.domain).toBe('[2001:db8:85a3:0:0:8a2e:370:7334]');

    // Omitted scheme with IPv6 bracket format
    const ipv6Omitted = validateAndFormatUrl('[::1]:8080');
    expect(ipv6Omitted.valid).toBe(true);
    expect(ipv6Omitted.formattedUrl).toBe('https://[::1]:8080/');
    expect(ipv6Omitted.domain).toBe('[::1]:8080');

    // Invalid IPv6 addresses
    expect(validateAndFormatUrl('http://[:::1]').valid).toBe(false);
    expect(validateAndFormatUrl('http://[2001:xyz]').valid).toBe(false);
    expect(validateAndFormatUrl('[::1').valid).toBe(false); // Unclosed bracket
    expect(validateAndFormatUrl('::1').valid).toBe(false);   // Raw colons without brackets
  });

  test('Attack 1.8: Punycode, Internationalized Domains (IDN), and Unicode', () => {
    // Punycode domains
    const punycodeRes = validateAndFormatUrl('https://xn--mnchen-3ya.de');
    expect(punycodeRes.valid).toBe(true);
    expect(punycodeRes.domain).toBe('xn--mnchen-3ya.de');

    const punycodeOmitted = validateAndFormatUrl('xn--e1afmkfd.xn--p1ai');
    expect(punycodeOmitted.valid).toBe(true);
    expect(punycodeOmitted.formattedUrl).toBe('https://xn--e1afmkfd.xn--p1ai/');

    // IDN Umlaut (German)
    const idnUmlaut = validateAndFormatUrl('münchen.de');
    expect(idnUmlaut.valid).toBe(true);
    // Node / WHATWG URL normalizes Unicode host to punycode
    expect(idnUmlaut.formattedUrl).toContain('xn--mnchen-3ya.de');

    // Emoji Domain
    const emojiRes = validateAndFormatUrl('https://☕.example.com');
    expect(emojiRes.valid).toBe(true);
    expect(emojiRes.formattedUrl).toBe('https://xn--53h.example.com/');

    // Cyrillic domain
    const cyrillicRes = validateAndFormatUrl('яндекс.рф');
    expect(cyrillicRes.valid).toBe(true);
    expect(cyrillicRes.formattedUrl).toContain('xn--');

    // Arabic domain
    const arabicRes = validateAndFormatUrl('https://مثال.إختبار');
    expect(arabicRes.valid).toBe(true);
    expect(arabicRes.formattedUrl).toContain('xn--');
  });

  test('Attack 1.9: Extreme Strings, Whitespace, and Structural Edges', () => {
    // 10,000 character URL path
    const hugePath = 'https://example.com/' + 'a'.repeat(10000);
    const hugeRes = validateAndFormatUrl(hugePath);
    expect(hugeRes.valid).toBe(true);
    expect(hugeRes.domain).toBe('example.com');

    // Hostname containing internal spaces must fail
    expect(validateAndFormatUrl('https://foo bar.com').valid).toBe(false);
    expect(validateAndFormatUrl('foo bar.com').valid).toBe(false);

    // Whitespace in query / path gets encoded
    const pathWithSpaces = validateAndFormatUrl('https://example.com/my page?query=foo bar');
    expect(pathWithSpaces.valid).toBe(true);
    expect(pathWithSpaces.formattedUrl).toBe('https://example.com/my%20page?query=foo%20bar');

    // Incomplete schemes
    expect(validateAndFormatUrl('https:').valid).toBe(false);
    expect(validateAndFormatUrl('http:').valid).toBe(false);
    expect(validateAndFormatUrl('https://').valid).toBe(false);
    expect(validateAndFormatUrl('http://').valid).toBe(false);
    expect(validateAndFormatUrl('http:///').valid).toBe(false);

    // Protocol-relative URLs
    const protoRelative = validateAndFormatUrl('//example.com');
    // When prepended with https: -> https:////example.com (empty hostname)
    expect(protoRelative.valid).toBe(false);

    // Only slashes and dots
    expect(validateAndFormatUrl('///').valid).toBe(false);
    expect(validateAndFormatUrl('....').valid).toBe(false);
    expect(validateAndFormatUrl('..').valid).toBe(false);
  });

  test('Attack 1.10: extractDomain edge case robustness', () => {
    expect(extractDomain('')).toBe('');
    expect(extractDomain('   ')).toBe('');
    expect(extractDomain('about:preferences#privacy')).toBe('about:preferences');
    expect(extractDomain('about:config?filter=test')).toBe('about:config');
    expect(extractDomain('https://[::1]:8080/path')).toBe('[::1]:8080');
    expect(extractDomain('http://192.168.1.100:3000')).toBe('192.168.1.100:3000');
    expect(extractDomain('example.com/path/to/page')).toBe('example.com');
    expect(extractDomain('xn--mnchen-3ya.de/foo')).toBe('xn--mnchen-3ya.de');
  });
});

test.describe('Adversarial Stress-Testing: Procedural SVG Avatar Generator (src/utils/avatar.ts)', () => {
  test('Attack 2.1: Empty, Undefined, Null, and Non-Alphanumeric Domains', () => {
    const invalidDomains: any[] = [
      '',
      '   ',
      '\t\n',
      null,
      undefined,
      '---',
      '***',
      '###',
      '???',
      '!@#$%^&*()_+',
    ];

    for (const d of invalidDomains) {
      const svgUrl = generateAvatarSvg(d, '#37adff');
      expect(svgUrl.startsWith('data:image/svg+xml;utf8,<svg')).toBe(true);
      expect(svgUrl).toContain('>?<'); // Falls back cleanly to '?'
    }
  });

  test('Attack 2.2: Emoji, RTL, and Unicode Domains Handling', () => {
    // Emoji domain without latin characters falls back to '?'
    const emojiOnly = generateAvatarSvg('☕🦁🎉', '#ff922b');
    expect(emojiOnly).toContain('>?<');

    // Emoji subdomain with latin characters extracts the first alphanumeric letter
    const emojiSubdomain = generateAvatarSvg('☕.example.com', '#ff922b');
    expect(emojiSubdomain).toContain('>E<');

    // Cyrillic domain without latin characters falls back to '?'
    const cyrillicDomain = generateAvatarSvg('яндекс.рф', '#ff6b6b');
    expect(cyrillicDomain).toContain('>?<');

    // Arabic domain without latin characters falls back to '?'
    const arabicDomain = generateAvatarSvg('مثال.إختبار', '#ffd43b');
    expect(arabicDomain).toContain('>?<');

    // German domain with initial Umlaut
    const umlautDomain = generateAvatarSvg('über.de', '#00c79a');
    expect(umlautDomain).toContain('>B<'); // 'b' is first latin alphanumeric

    // Numeric initial
    const numericDomain = generateAvatarSvg('4chan.org', '#51cf66');
    expect(numericDomain).toContain('>4<');
  });

  test('Attack 2.3: SVG XML Injection and Attribute Breakout Prevention', () => {
    const maliciousDomains = [
      '"><script>alert(1)</script><text>',
      "' onmouseover='alert(1)'",
      '</text><image href="https://malicious.com/leak.png"/>',
      '<script src="https://evil.com/xss.js"></script>',
      'test.com" style="display:none" onload="alert(1)"',
      '"><svg onload=alert(1)>',
    ];

    for (const malDomain of maliciousDomains) {
      const svgUrl = generateAvatarSvg(malDomain, '#37adff');
      // Must NOT contain unescaped script tag or external network link
      expect(svgUrl).not.toContain('<script');
      expect(svgUrl).not.toContain('<image');
      expect(svgUrl).not.toContain('onmouseover');
      expect(svgUrl).not.toContain('onload');

      // The initial should be an alphanumeric character or '?'
      const match = svgUrl.match(/<text[^>]*>(.*?)<\/text>/);
      expect(match).not.toBeNull();
      const textContent = match![1];
      expect(textContent.length).toBe(1);
      expect(/^[A-Z0-9?]$/.test(textContent)).toBe(true);
    }
  });

  test('Attack 2.4: Malicious Container Color Inputs & Fallback', () => {
    const maliciousColors: any[] = [
      '',
      '   ',
      null,
      undefined,
      'invalid-color',
      'rgb(255, 0, 0)',
      '#ff6b6b\' onload=\'alert(1)',
      '#ff6b6b"><script>alert(1)</script>',
      'var(--container-invalid)',
      'var(--container-blue); background: url(http://leak.com)',
      '#12',       // Invalid length
      '#1234',     // 4 chars
      '#1234567',  // 7 chars
      '#gggggg',   // Non-hex characters
    ];

    for (const color of maliciousColors) {
      const resolved = resolveHexColor(color);
      expect(resolved).toBe('#808080'); // Clean fallback to default grey

      const svgUrl = generateAvatarSvg('example.com', color);
      expect(svgUrl).toContain("fill='%23808080'");
      expect(svgUrl).not.toContain('alert');
      expect(svgUrl).not.toContain('leak.com');
    }
  });

  test('Attack 2.5: Valid Named Colors, CSS Variables, and Case Sensitivity', () => {
    const testCases: [string, string][] = [
      ['blue', '#37adff'],
      ['BLUE', '#37adff'],
      ['  green  ', '#51cf66'],
      ['yellow', '#ffd43b'],
      ['orange', '#ff922b'],
      ['red', '#ff6b6b'],
      ['pink', '#f06595'],
      ['purple', '#cc5de8'],
      ['toolbar', '#808080'],
      ['default', '#808080'],
      ['#37adff', '#37adff'],
      ['#37ADFF', '#37adff'],
      ['#fff', '#fff'],
      ['#000', '#000'],
      ['var(--container-turquoise)', '#00c79a'],
      ['VAR(--CONTAINER-YELLOW)', '#ffd43b'],
      ['  var(--container-red)  ', '#ff6b6b'],
    ];

    for (const [input, expected] of testCases) {
      expect(resolveHexColor(input)).toBe(expected);
    }
  });

  test('Attack 2.6: WCAG AA Text Contrast Computation on Extremes', () => {
    // Pure white background -> Dark text
    expect(getContrastTextColor('#ffffff')).toBe('#15141a');
    expect(getContrastTextColor('#fff')).toBe('#15141a');

    // Pure black background -> White text
    expect(getContrastTextColor('#000000')).toBe('#ffffff');
    expect(getContrastTextColor('#000')).toBe('#ffffff');

    // Bright yellow (#ffd43b) -> Dark text
    expect(getContrastTextColor('#ffd43b')).toBe('#15141a');

    // High brightness pastel green (#a9ff94, luminance > 165) -> Dark text
    expect(getContrastTextColor('#a9ff94')).toBe('#15141a');

    // Dark navy (#0a192f) -> White text
    expect(getContrastTextColor('#0a192f')).toBe('#ffffff');

    // Default container grey (#808080: luminance ~ 128 < 165) -> White text
    expect(getContrastTextColor('#808080')).toBe('#ffffff');
  });

  test('Attack 2.7: SVG XML Structure and Data URL Integrity', () => {
    const avatar = generateAvatarSvg('developer.mozilla.org', 'var(--container-purple)');

    // 1. Prefix must be exact
    expect(avatar.startsWith('data:image/svg+xml;utf8,')).toBe(true);

    // 2. Extract SVG string
    const svgContent = avatar.replace('data:image/svg+xml;utf8,', '');

    // 3. Must be well-formed XML tags
    expect(svgContent.startsWith('<svg')).toBe(true);
    expect(svgContent.endsWith('</svg>')).toBe(true);
    expect(svgContent).toContain("xmlns='http://www.w3.org/2000/svg'");
    expect(svgContent).toContain("viewBox='0 0 32 32'");
    expect(svgContent).toContain("width='32'");
    expect(svgContent).toContain("height='32'");

    // 4. Fill values must be escaped (%23)
    expect(svgContent).toContain("fill='%23cc5de8'");
    expect(svgContent).toContain("fill='%23ffffff'");
    expect(svgContent).not.toContain("fill='#");

    // 5. Letter initial
    expect(svgContent).toContain('>D<');

    // 6. Zero external network resources
    const externalUrlPatterns = /https?:\/\/(?!www\.w3\.org\/2000\/svg)/i;
    expect(externalUrlPatterns.test(svgContent)).toBe(false);
  });
});
