/**
 * FoxLaunch DOM Element Locators & Page Helpers
 *
 * Provides resilient, standardized locators matching FoxLaunch specification,
 * semantic classes, and data-testid attributes.
 */

import { Page, Locator } from '@playwright/test';

export const FoxLaunchLocators = {
  // Header & Search
  searchInput: (page: Page): Locator =>
    page.locator('#search-input, [data-testid="search-input"], input[type="search"]'),

  searchHotkeyBadge: (page: Page): Locator =>
    page.locator('.search-hotkey, [data-testid="search-hotkey"]'),

  settingsButton: (page: Page): Locator =>
    page.locator('#settings-btn, [data-testid="settings-btn"], button[title="Settings"]'),

  // Swimlanes
  swimlanesContainer: (page: Page): Locator =>
    page.locator('#swimlanes-container, [data-testid="swimlanes-container"]'),

  allSwimlanes: (page: Page): Locator =>
    page.locator('.swimlane, [data-testid="swimlane"], [data-testid^="swimlane-"], section[data-cookie-store-id]'),

  swimlaneById: (page: Page, cookieStoreId: string): Locator =>
    page.locator(`.swimlane[data-cookie-store-id="${cookieStoreId}"], [data-testid="swimlane-${cookieStoreId}"]`),

  swimlaneHeader: (swimlane: Locator): Locator =>
    swimlane.locator('.swimlane-header, [data-testid="swimlane-header"]'),

  swimlaneTitle: (swimlane: Locator): Locator =>
    swimlane.locator('.swimlane-title, [data-testid="swimlane-title"]'),

  swimlaneBadge: (swimlane: Locator): Locator =>
    swimlane.locator('.swimlane-badge, .container-badge, [data-testid="swimlane-badge"]'),

  swimlaneCount: (swimlane: Locator): Locator =>
    swimlane.locator('.swimlane-count, [data-testid="shortcut-count"]'),

  swimlaneToggle: (swimlane: Locator): Locator =>
    swimlane.locator('.swimlane-toggle, [data-action="toggle-swimlane"], button[aria-expanded]'),

  addShortcutButton: (swimlane: Locator): Locator =>
    swimlane.locator('.btn-add-shortcut, [data-action="add-shortcut"], button[aria-label*="Add shortcut"]'),

  emptyPlaceholder: (swimlane: Locator): Locator =>
    swimlane.locator('.swimlane-empty, [data-testid="empty-placeholder"], .empty-state'),

  // Shortcut Cards
  shortcutCards: (scope: Page | Locator): Locator =>
    scope.locator('.shortcut-card, [data-testid="shortcut-card"]'),

  shortcutCardByTitle: (page: Page, title: string): Locator =>
    page.locator(`.shortcut-card:has-text("${title}"), [data-testid="shortcut-card"]:has-text("${title}")`),

  shortcutTitle: (card: Locator): Locator =>
    card.locator('.shortcut-title, [data-testid="shortcut-title"]'),

  shortcutDomain: (card: Locator): Locator =>
    card.locator('.shortcut-domain, [data-testid="shortcut-domain"]'),

  shortcutAvatar: (card: Locator): Locator =>
    card.locator('.shortcut-avatar, [data-testid="shortcut-avatar"]'),

  shortcutMenuButton: (card: Locator): Locator =>
    card.locator('.shortcut-menu-btn, [data-action="shortcut-menu"], button[aria-label*="actions"]'),

  shortcutEditAction: (page: Page): Locator =>
    page.locator('.menu-item-edit, [data-action="edit-shortcut"], button:has-text("Edit")'),

  shortcutDeleteAction: (page: Page): Locator =>
    page.locator('.menu-item-delete, [data-action="delete-shortcut"], button:has-text("Delete")'),

  // Modals (Add / Edit Shortcut)
  modalRoot: (page: Page): Locator =>
    page.locator('#modal-root'),

  modalDialog: (page: Page): Locator =>
    page.locator('#modal-root .modal-dialog, [data-testid="modal-dialog"], .modal-dialog, dialog[open]'),

  modalTitleInput: (page: Page): Locator =>
    page.locator('#modal-root input[name="title"], #shortcut-title-input, [data-testid="shortcut-title-input"]'),

  modalUrlInput: (page: Page): Locator =>
    page.locator('#modal-root input[name="url"], #shortcut-url-input, [data-testid="shortcut-url-input"]'),

  modalSubmitButton: (page: Page): Locator =>
    page.locator('#modal-root button[type="submit"], [data-action="save-shortcut"], .btn-save-shortcut'),

  modalCloseButton: (page: Page): Locator =>
    page.locator('#modal-root .btn-close-modal, #modal-root [data-action="close-modal"], [data-testid="modal-close-btn"]'),

  modalCancelButton: (page: Page): Locator =>
    page.locator('#modal-root .btn-cancel, #modal-root [data-action="cancel-modal"], [data-testid="modal-cancel-btn"], #modal-root button:has-text("Cancel")'),

  modalValidationError: (page: Page): Locator =>
    page.locator('#modal-root .validation-error, [data-testid="validation-error"], .form-error'),

  // Toast Notification
  toastRoot: (page: Page): Locator =>
    page.locator('#toast-root'),

  toastNotification: (page: Page): Locator =>
    page.locator('#toast-root .toast, [data-testid="toast-notification"], .toast-notification'),

  toastUndoButton: (page: Page): Locator =>
    page.locator('#toast-root [data-action="undo-delete"], .toast-undo-btn, button:has-text("Undo")'),

  toastMessage: (page: Page): Locator =>
    page.locator('#toast-root .toast-message, [data-testid="toast-message"]'),

  // Settings Modal
  settingsModal: (page: Page): Locator =>
    page.locator('#modal-root .settings-modal, [data-testid="settings-modal"], .settings-dialog'),

  settingsTab: (page: Page, tab: 'appearance' | 'behavior' | 'containers' | 'data'): Locator =>
    page.locator(`[data-testid="nav-tab-${tab}"]`),

  settingsTabBehaviorClose: (page: Page): Locator =>
    page.locator('input[name="tabBehavior"][value="close"], [data-setting-val="close"]'),

  settingsTabBehaviorKeep: (page: Page): Locator =>
    page.locator('input[name="tabBehavior"][value="keep"], [data-setting-val="keep"]'),

  settingsThemeOption: (page: Page, theme: 'auto' | 'light' | 'dark'): Locator =>
    page.locator(`input[name="theme"][value="${theme}"], [data-theme-option="${theme}"], button[data-theme="${theme}"]`),

  // Onboarding Walkthrough
  onboardingRoot: (page: Page): Locator =>
    page.locator('#onboarding-root'),

  onboardingOverlay: (page: Page): Locator =>
    page.locator('#onboarding-root .onboarding-modal, [data-testid="onboarding-overlay"], .onboarding-overlay'),

  onboardingNextButton: (page: Page): Locator =>
    page.locator('#onboarding-root [data-action="onboarding-next"], .btn-onboarding-next, button:has-text("Next")'),

  onboardingDismissButton: (page: Page): Locator =>
    page.locator('#onboarding-root [data-action="onboarding-dismiss"], .btn-onboarding-dismiss, button:has-text("Got it"), button:has-text("Finish")'),

  onboardingStepBadge: (page: Page): Locator =>
    page.locator('#onboarding-root .step-indicator, [data-testid="step-indicator"]'),
};
