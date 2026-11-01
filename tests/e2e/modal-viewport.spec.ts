import type { Locator } from '@playwright/test';
import { test, expect, FoxLaunchLocators as loc, DEFAULT_MOCK_CONTAINERS, DEFAULT_SETTINGS, makeShortcut } from '../fixtures';

async function expectViewportSafeLayout(dialog: Locator): Promise<void> {
  await expect.poll(() => dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const header = element.querySelector('.modal-header')!.getBoundingClientRect();
    const footer = element.querySelector('.modal-footer')!.getBoundingClientRect();
    const body = element.querySelector('.modal-body')!.getBoundingClientRect();
    return bounds.top >= 16 && bounds.bottom <= window.innerHeight - 16
      && bounds.left >= 16 && bounds.right <= window.innerWidth - 16
      && header.top >= bounds.top && header.bottom <= body.top
      && footer.top >= body.bottom && footer.bottom <= bounds.bottom
      && body.height > 0;
  })).toBe(true);
}

async function expectInternalScrolling(dialog: Locator): Promise<void> {
  const body = dialog.locator('.modal-body');
  expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  const headerBefore = await dialog.locator('.modal-header').boundingBox();
  const footerBefore = await dialog.locator('.modal-footer').boundingBox();
  await body.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await dialog.locator('.modal-header').boundingBox()).toEqual(headerBefore);
  expect(await dialog.locator('.modal-footer').boundingBox()).toEqual(footerBefore);
  await expectViewportSafeLayout(dialog);
}

test.describe('Modal viewport bounds', () => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1280, height: 480 },
    { width: 375, height: 480 },
  ]) {
    test(`settings keeps its header and actions visible at ${viewport.width}x${viewport.height}`, async ({ openFoxLaunch, page }) => {
      await page.setViewportSize(viewport);
      const containers = Array.from({ length: 24 }, (_, index) => ({
        ...DEFAULT_MOCK_CONTAINERS[0],
        cookieStoreId: `firefox-container-${index + 1}`,
        name: `Container ${index + 1}`,
      }));
      await openFoxLaunch({
        containers,
        settings: { ...DEFAULT_SETTINGS, containerVisibility: { mode: 'hide', cookieStoreIds: [], namePatterns: [] } },
      });
      await loc.settingsButton(page).click();
      const dialog = page.getByTestId('settings-modal');
      await expectViewportSafeLayout(dialog);
      await expectInternalScrolling(dialog);
      await dialog.getByTestId('btn-reset-defaults').click();
      await expect(dialog.getByTestId('reset-confirm-panel')).toBeVisible();
      await expectViewportSafeLayout(dialog);
      await dialog.getByTestId('modal-done-btn').click();
      await expect(dialog).not.toBeVisible();
    });
  }

  for (const mode of ['add', 'edit'] as const) {
    for (const viewport of [
      { width: 1280, height: 240 },
      { width: 375, height: 320 },
    ]) {
      test(`${mode} shortcut scrolls fields without clipping actions at ${viewport.width}x${viewport.height}`, async ({ openFoxLaunch, page, mockHarness }) => {
        await page.setViewportSize(viewport);
        await openFoxLaunch({
          containers: DEFAULT_MOCK_CONTAINERS,
          shortcuts: { 'firefox-container-1': [makeShortcut('firefox-container-1', 'Example', 'https://example.com')] },
        });
        if (mode === 'add') {
          await loc.addShortcutButton(loc.swimlaneById(page, 'firefox-container-1')).click();
        } else {
          await loc.shortcutMenuButton(loc.shortcutCardByTitle(page, 'Example')).click();
          await loc.shortcutEditAction(page).click();
        }

        const dialog = loc.modalDialog(page);
        await expectViewportSafeLayout(dialog);
        await loc.modalTitleInput(page).fill('Viewport test');
        await loc.modalUrlInput(page).fill('not a url');
        await loc.modalSubmitButton(page).click();
        await expect(loc.modalValidationError(page)).toBeVisible();
        await expectViewportSafeLayout(dialog);
        await expectInternalScrolling(dialog);
        await loc.modalUrlInput(page).fill('https://example.org');
        await loc.modalSubmitButton(page).click();
        await expect(dialog).not.toBeVisible();
        const storage = await mockHarness.getStorage();
        expect(storage.foxlaunch_shortcuts['firefox-container-1'].some(
          (item: { title: string; url: string }) => item.title === 'Viewport test' && item.url === 'https://example.org'
        )).toBe(true);
      });
    }
  }

  for (const viewport of [
    { width: 1280, height: 320 },
    { width: 375, height: 360 },
  ]) {
    test(`onboarding walkthrough keeps header and actions visible at ${viewport.width}x${viewport.height}`, async ({ openFoxLaunch, page, mockHarness }) => {
      await page.setViewportSize(viewport);
      await openFoxLaunch({
        settings: { ...DEFAULT_SETTINGS, firstRunDismissed: false },
      });
      const dialog = page.locator('#onboarding-root .onboarding-modal');
      await expect(dialog).toBeVisible();
      await expectViewportSafeLayout(dialog);
      await expectInternalScrolling(dialog);

      const nextBtn = loc.onboardingNextButton(page);
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();
      await expect(page.locator('#onboarding-root .step-indicator')).toHaveText('Step 2 of 4');
      await expectViewportSafeLayout(dialog);

      const dismissBtn = loc.onboardingDismissButton(page);
      await expect(dismissBtn).toBeVisible();
      await dismissBtn.click();
      await expect(dialog).not.toBeVisible();
      const storage = await mockHarness.getStorage();
      expect(storage.foxlaunch_settings.firstRunDismissed).toBe(true);
    });
  }
});
