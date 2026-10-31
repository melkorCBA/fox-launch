import { test, expect } from '../fixtures';

test.describe('Launch footer', () => {
  test('shows the runtime manifest version and contributor copyright', async ({ openFoxLaunch, page }) => {
    await openFoxLaunch();

    const footer = page.getByRole('contentinfo');
    await expect(footer).toHaveText('FoxLaunch v9.8.7 • © FoxLaunch contributors');

    await page.evaluate(async () => {
      window.browser.runtime.getManifest = () => ({ version: '2.3.4' });
      const { renderApp } = await import('/src/app.ts');
      await renderApp();
    });
    await expect(footer).toHaveText('FoxLaunch v2.3.4 • © FoxLaunch contributors');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`stays below content with subtle styling in the ${theme} theme`, async ({ openFoxLaunch, page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await openFoxLaunch({ settings: { theme } });

      const footer = page.getByRole('contentinfo');
      await expect(footer).toHaveText('FoxLaunch v9.8.7 • © FoxLaunch contributors');
      await expect(footer).toHaveCSS('font-size', '11px');
      await expect(footer).toHaveCSS('position', 'static');
      const layout = await footer.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const mainRect = document.getElementById('main-content')!.getBoundingClientRect();
        const probe = document.createElement('span');
        probe.style.color = 'var(--text-muted)';
        element.appendChild(probe);
        const mutedColor = getComputedStyle(probe).color;
        probe.remove();
        return {
          top: rect.top,
          bottom: rect.bottom,
          mainBottom: mainRect.bottom,
          pageBottom: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
          fitsWidth: element.scrollWidth <= element.clientWidth,
          color: getComputedStyle(element).color,
          mutedColor,
        };
      });
      expect(layout.top).toBeGreaterThanOrEqual(layout.mainBottom);
      expect(layout.pageBottom).toBeGreaterThanOrEqual(layout.viewportHeight);
      expect(Math.abs(layout.pageBottom - layout.bottom - 40)).toBeLessThanOrEqual(1);
      expect(layout.fitsWidth).toBe(true);
      expect(layout.color).toBe(layout.mutedColor);

      await page.setViewportSize({ width: 1280, height: 1600 });
      const bottomGap = await footer.evaluate((element) =>
        window.innerHeight - element.getBoundingClientRect().bottom);
      expect(Math.abs(bottomGap - 40)).toBeLessThanOrEqual(1);
    });
  }

  test('still mounts in a development preview without extension APIs', async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as any).browser;
    });
    await page.goto('/newtab.html');

    await expect(page.getByRole('contentinfo')).toHaveText('FoxLaunch • © FoxLaunch contributors');
    await expect(page.locator('#swimlane-firefox-default')).toBeVisible();
  });
});
