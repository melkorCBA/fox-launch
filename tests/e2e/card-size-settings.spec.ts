import { test, expect, DEFAULT_SETTINGS, SAMPLE_SHORTCUTS } from '../fixtures';

test.describe('Card size settings', () => {
  test('older settings default to the existing medium styling', async ({ openFoxLaunch, page }) => {
    const { cardSize: _cardSize, ...legacySettings } = DEFAULT_SETTINGS;
    await openFoxLaunch({ settings: legacySettings, shortcuts: SAMPLE_SHORTCUTS });
    await expect(page.locator('html')).toHaveAttribute('data-card-size', 'medium');
    const card = page.locator('.shortcut-card').first();
    await expect(card).toHaveCSS('padding', '12px');
    await expect(card.locator('.shortcut-avatar')).toHaveCSS('width', '32px');
    await expect(card.locator('.shortcut-title')).toHaveCSS('font-size', '13px');
    await expect(card.locator('.shortcut-domain')).toHaveCSS('font-size', '11px');
    await page.locator('#settings-btn').click();
    const group = page.getByRole('radiogroup', { name: 'Card Size' });
    await expect(group.getByRole('radio')).toHaveCount(3);
    await expect(group.getByRole('radio', { name: 'Medium (default)', exact: true })).toBeChecked();
  });

  test('resizes cards live in every lane and persists across reload', async ({ openFoxLaunch, page, mockHarness }) => {
    await page.setViewportSize({ width: 740, height: 900 });
    await openFoxLaunch({
      shortcuts: SAMPLE_SHORTCUTS,
      settings: { ...DEFAULT_SETTINGS, swimlaneCollapse: { 'firefox-default': false } },
    });
    await expect(page.locator('.shortcut-card')).toHaveCount(13);
    const widths: number[] = [];
    const heights: number[] = [];
    await page.locator('#settings-btn').click();
    for (const size of [
      { value: 'small', label: 'Small', padding: '8px', avatar: '24px', title: '12px', domain: '10px', icon: '14px' },
      { value: 'medium', label: 'Medium (default)', padding: '12px', avatar: '32px', title: '13px', domain: '11px', icon: '16px' },
      { value: 'large', label: 'Large', padding: '16px', avatar: '40px', title: '15px', domain: '13px', icon: '20px' },
    ]) {
      await page.getByRole('radiogroup', { name: 'Card Size' }).getByRole('radio', { name: size.label, exact: true }).check();
      await expect.poll(async () => (await mockHarness.getStorage()).foxlaunch_settings.cardSize).toBe(size.value);
      for (const card of await page.locator('.shortcut-card').all()) {
        await expect(card).toHaveCSS('padding', size.padding);
        await expect(card).toHaveCSS('gap', size.padding);
        await expect(card.locator('.shortcut-avatar')).toHaveCSS('width', size.avatar);
        await expect(card.locator('.shortcut-avatar')).toHaveCSS('height', size.avatar);
        await expect(card.locator('.shortcut-title')).toHaveCSS('font-size', size.title);
        await expect(card.locator('.shortcut-domain')).toHaveCSS('font-size', size.domain);
        await expect(card.locator('.shortcut-menu-btn svg')).toHaveCSS('width', size.icon);
      }
      const bounds = await page.locator('.shortcut-card').first().boundingBox();
      widths.push(bounds!.width);
      heights.push(bounds!.height);
    }
    expect(widths[0]).toBeLessThan(widths[1]);
    expect(widths[1]).toBeLessThan(widths[2]);
    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);
    await page.getByTestId('modal-done-btn').click();
    await mockHarness.reloadPage();
    await expect(page.locator('html')).toHaveAttribute('data-card-size', 'large');
    await expect(page.locator('.shortcut-avatar').first()).toHaveCSS('width', '40px');
    await page.locator('#settings-btn').click();
    await expect(page.getByRole('radio', { name: 'Large', exact: true })).toBeChecked();
  });

  test('reset restores medium card size', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({ settings: { ...DEFAULT_SETTINGS, cardSize: 'small' }, shortcuts: SAMPLE_SHORTCUTS });
    await expect(page.locator('html')).toHaveAttribute('data-card-size', 'small');
    await page.locator('#settings-btn').click();
    await page.getByTestId('btn-reset-defaults').click();
    await page.getByTestId('btn-confirm-reset').click();
    await expect(page.locator('html')).toHaveAttribute('data-card-size', 'medium');
    await expect.poll(async () => (await mockHarness.getStorage()).foxlaunch_settings.cardSize).toBe('medium');
  });

  test('overlapping saves between card size and theme do not discard card size selection', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({ settings: { ...DEFAULT_SETTINGS, cardSize: 'medium', theme: 'light' } });
    await page.locator('#settings-btn').click();

    // Rapidly change card size to small, then change theme to dark without waiting
    await page.getByRole('radiogroup', { name: 'Card Size' }).getByRole('radio', { name: 'Small', exact: true }).check();
    await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: 'Dark', exact: true }).check();

    // Verify storage has both updates preserved
    await expect.poll(async () => {
      const storage = await mockHarness.getStorage();
      return { cardSize: storage.foxlaunch_settings.cardSize, theme: storage.foxlaunch_settings.theme };
    }).toEqual({ cardSize: 'small', theme: 'dark' });

    // Close and reload to ensure persistent state matches
    await page.getByTestId('modal-done-btn').click();
    await mockHarness.reloadPage();
    await expect(page.locator('html')).toHaveAttribute('data-card-size', 'small');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
