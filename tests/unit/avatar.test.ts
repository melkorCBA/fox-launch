import { test, expect } from '@playwright/test';
import {
  generateAvatarSvg,
  resolveHexColor,
  getContrastTextColor,
  getDomainInitial,
} from '../../src/utils/avatar';

test.describe('Offline Procedural SVG Avatar Generator', () => {
  test('returns clean data URL starting with data:image/svg+xml;utf8,<svg', () => {
    const avatar = generateAvatarSvg('github.com', '#37adff');
    expect(avatar.startsWith('data:image/svg+xml;utf8,<svg')).toBe(true);
    expect(avatar).toContain("xmlns='http://www.w3.org/2000/svg'");
    expect(avatar).toContain("viewBox='0 0 32 32'");
  });

  test('strips www. and m. prefixes to extract brand initial', () => {
    const avatarWww = generateAvatarSvg('www.github.com', '#37adff');
    expect(avatarWww).toContain('>G<');

    const avatarM = generateAvatarSvg('m.wikipedia.org', '#37adff');
    expect(avatarM).toContain('>W<');
  });

  test('handles numeric domains and IP addresses', () => {
    const avatarIp = generateAvatarSvg('192.168.1.1', '#808080');
    expect(avatarIp).toContain('>1<');

    const avatar99 = generateAvatarSvg('99designs.com', '#808080');
    expect(avatar99).toContain('>9<');
  });

  test('handles about: pages properly', () => {
    const avatarAboutConfig = generateAvatarSvg('about:config', '#808080');
    expect(avatarAboutConfig).toContain('>C<');

    const avatarAboutAddons = generateAvatarSvg('about:addons', '#808080');
    expect(avatarAboutAddons).toContain('>A<');
  });

  test('falls back to ? for empty or non-alphanumeric domain input', () => {
    expect(generateAvatarSvg('', '#808080')).toContain('>?<');
    expect(generateAvatarSvg('   ', '#808080')).toContain('>?<');
    expect(generateAvatarSvg('---', '#808080')).toContain('>?<');
    expect(generateAvatarSvg('***', '#808080')).toContain('>?<');
  });

  test('getDomainInitial extracts correct uppercase character', () => {
    expect(getDomainInitial('https://news.ycombinator.com')).toBe('N');
    expect(getDomainInitial('mozilla.org')).toBe('M');
    expect(getDomainInitial('www.reddit.com')).toBe('R');
    expect(getDomainInitial('m.youtube.com')).toBe('Y');
    expect(getDomainInitial('about:debugging')).toBe('D');
    expect(getDomainInitial('')).toBe('?');
  });

  test('computes dark text for high brightness yellow backgrounds', () => {
    const yellowHex = '#ffd43b';
    expect(getContrastTextColor(yellowHex)).toBe('#15141a');

    const avatarYellow = generateAvatarSvg('amazon.com', yellowHex);
    expect(avatarYellow).toContain('%2315141a');
  });

  test('computes white text for darker backgrounds (blue, purple, red, toolbar)', () => {
    expect(getContrastTextColor('#37adff')).toBe('#ffffff');
    expect(getContrastTextColor('#cc5de8')).toBe('#ffffff');
    expect(getContrastTextColor('#ff6b6b')).toBe('#ffffff');
    expect(getContrastTextColor('#808080')).toBe('#ffffff');

    const avatarBlue = generateAvatarSvg('azure.com', '#37adff');
    expect(avatarBlue).toContain('%23ffffff');
  });

  test('resolveHexColor handles hex codes, named colors, and CSS variables', () => {
    expect(resolveHexColor('#37adff')).toBe('#37adff');
    expect(resolveHexColor('blue')).toBe('#37adff');
    expect(resolveHexColor('turquoise')).toBe('#00c79a');
    expect(resolveHexColor('var(--container-turquoise)')).toBe('#00c79a');
    expect(resolveHexColor('var(--container-yellow)')).toBe('#ffd43b');
    expect(resolveHexColor('var(--container-default)')).toBe('#808080');
    expect(resolveHexColor(undefined)).toBe('#808080');
    expect(resolveHexColor('')).toBe('#808080');
  });

  test('encodes # character as %23 for browser data URL safety', () => {
    const avatar = generateAvatarSvg('github.com', '#37adff');
    expect(avatar).not.toContain("fill='#");
    expect(avatar).toContain("fill='%2337adff'");
  });
});
