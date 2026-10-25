/**
 * FoxLaunch — Settings Modal Component
 *
 * Implements configurable tab dispatch behavior, appearance theme switching,
 * reset-to-defaults with two-stage confirmation, and WCAG 2.1 AA focus management.
 */

import type { FoxLaunchSettings, TabBehavior, ThemeMode } from '../types';
import { getSettings, saveSettings, resetToDefaults } from '../services/storage';

export interface SettingsModalOptions {
  currentSettings?: FoxLaunchSettings;
  triggerElement?: HTMLElement | null;
  onSettingsChanged?: (updated: FoxLaunchSettings) => void;
  onResetDefaults?: () => Promise<void> | void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvg(attrs: Record<string, string>, children?: SVGElement[]): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [key, val] of Object.entries(attrs)) {
    svg.setAttribute(key, val);
  }
  if (children) {
    children.forEach((child) => svg.appendChild(child));
  }
  return svg;
}

function createSvgElement(tag: string, attrs: Record<string, string>): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, val] of Object.entries(attrs)) {
    el.setAttribute(key, val);
  }
  return el;
}

function createCloseSvg(): SVGSVGElement {
  return createSvg(
    { width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
    [
      createSvgElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
      createSvgElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
    ]
  );
}

export function openSettingsModal(
  triggerElement?: HTMLElement | null,
  onResetDefaults?: () => Promise<void> | void
): void;
export function openSettingsModal(
  options: SettingsModalOptions
): void;
export function openSettingsModal(
  arg1?: HTMLElement | SettingsModalOptions | null,
  arg2?: () => Promise<void> | void
): void {
  let triggerElement: HTMLElement | null = null;
  let onResetDefaults: (() => Promise<void> | void) | undefined = arg2;
  let onSettingsChanged: ((updated: FoxLaunchSettings) => void) | undefined;
  let initialSettings: FoxLaunchSettings | undefined;

  if (arg1 && 'nodeType' in arg1) {
    triggerElement = arg1 as HTMLElement;
  } else if (arg1 && typeof arg1 === 'object') {
    const opts = arg1 as SettingsModalOptions;
    triggerElement = opts.triggerElement ?? null;
    onResetDefaults = opts.onResetDefaults ?? arg2;
    onSettingsChanged = opts.onSettingsChanged;
    initialSettings = opts.currentSettings;
  }

  const renderModal = (activeSettings: FoxLaunchSettings) => {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    // Clear any existing modals
    modalRoot.replaceChildren();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'settings-modal-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog settings-modal';
    dialog.setAttribute('data-testid', 'settings-modal');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'settings-modal-title');

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h3');
    title.id = 'settings-modal-title';
    title.className = 'modal-title';
    title.textContent = 'Settings';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-icon btn-close-modal';
    closeBtn.setAttribute('data-action', 'close-modal');
    closeBtn.setAttribute('data-testid', 'modal-close-btn');
    closeBtn.setAttribute('aria-label', 'Close settings');
    closeBtn.appendChild(createCloseSvg());
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    // --- Content Body ---
    const content = document.createElement('div');
    content.className = 'modal-form';

    // Section 1: Tab Dispatch Behavior
    const tabSection = document.createElement('div');
    tabSection.className = 'settings-section';
    tabSection.setAttribute('role', 'radiogroup');
    tabSection.setAttribute('aria-labelledby', 'tab-dispatch-title');

    const tabTitle = document.createElement('span');
    tabTitle.id = 'tab-dispatch-title';
    tabTitle.className = 'settings-section-title';
    tabTitle.textContent = 'Tab Dispatch Behavior';
    tabSection.appendChild(tabTitle);

    const tabOptionsGroup = document.createElement('div');
    tabOptionsGroup.className = 'settings-options-group';

    const createTabOption = (value: TabBehavior, label: string) => {
      const labelEl = document.createElement('label');
      labelEl.className = 'radio-option';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'tabBehavior';
      radio.value = value;
      radio.setAttribute('data-setting-val', value);
      radio.checked = activeSettings.tabBehavior === value;

      radio.addEventListener('change', async () => {
        if (radio.checked) {
          const updated = await saveSettings({ tabBehavior: value });
          activeSettings.tabBehavior = value;
          onSettingsChanged?.(updated);
        }
      });

      labelEl.appendChild(radio);
      labelEl.appendChild(document.createTextNode(label));
      return labelEl;
    };

    tabOptionsGroup.appendChild(createTabOption('keep', 'Keep launcher tab open'));
    tabOptionsGroup.appendChild(createTabOption('close', 'Close launcher tab'));
    tabSection.appendChild(tabOptionsGroup);
    content.appendChild(tabSection);

    // Section 2: Appearance Theme
    const themeSection = document.createElement('div');
    themeSection.className = 'settings-section';
    themeSection.setAttribute('role', 'radiogroup');
    themeSection.setAttribute('aria-labelledby', 'theme-heading-title');

    const themeTitle = document.createElement('span');
    themeTitle.id = 'theme-heading-title';
    themeTitle.className = 'settings-section-title';
    themeTitle.textContent = 'Appearance Theme';
    themeSection.appendChild(themeTitle);

    const themeOptionsGroup = document.createElement('div');
    themeOptionsGroup.className = 'settings-options-group';

    const createThemeOption = (theme: ThemeMode, label: string) => {
      const labelEl = document.createElement('label');
      labelEl.className = 'radio-option';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'theme';
      radio.value = theme;
      radio.setAttribute('data-theme-option', theme);
      radio.checked = activeSettings.theme === theme;

      radio.addEventListener('change', async () => {
        if (radio.checked) {
          if (theme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
          } else {
            document.documentElement.setAttribute('data-theme', theme);
          }
          const updated = await saveSettings({ theme });
          activeSettings.theme = theme;
          onSettingsChanged?.(updated);
        }
      });

      labelEl.appendChild(radio);
      labelEl.appendChild(document.createTextNode(label));
      return labelEl;
    };

    themeOptionsGroup.appendChild(createThemeOption('auto', 'Auto (System)'));
    themeOptionsGroup.appendChild(createThemeOption('light', 'Light'));
    themeOptionsGroup.appendChild(createThemeOption('dark', 'Dark'));
    themeSection.appendChild(themeOptionsGroup);
    content.appendChild(themeSection);

    // Section 3: Reset to Defaults (Inline Two-Stage Confirmation)
    const resetSection = document.createElement('div');
    resetSection.className = 'settings-section settings-reset-section';

    const resetTitle = document.createElement('span');
    resetTitle.className = 'settings-section-title';
    resetTitle.textContent = 'Data Management';
    resetSection.appendChild(resetTitle);

    const resetControls = document.createElement('div');
    resetControls.className = 'settings-reset-group';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn-danger btn-reset-defaults';
    resetBtn.setAttribute('data-action', 'reset-defaults');
    resetBtn.setAttribute('data-testid', 'btn-reset-defaults');
    resetBtn.textContent = 'Reset to Defaults...';

    // Inline confirmation panel (hidden by default)
    const confirmPanel = document.createElement('div');
    confirmPanel.className = 'reset-confirm-panel is-hidden';
    confirmPanel.setAttribute('data-testid', 'reset-confirm-panel');

    const confirmMsg = document.createElement('p');
    confirmMsg.className = 'reset-confirm-message';
    confirmMsg.textContent = 'Reset all shortcuts, swimlane states, and preferences to default? This cannot be undone.';

    const confirmActions = document.createElement('div');
    confirmActions.className = 'reset-confirm-actions';

    const cancelResetBtn = document.createElement('button');
    cancelResetBtn.type = 'button';
    cancelResetBtn.className = 'btn-secondary btn-cancel-reset';
    cancelResetBtn.setAttribute('data-action', 'cancel-reset');
    cancelResetBtn.setAttribute('data-testid', 'btn-cancel-reset');
    cancelResetBtn.textContent = 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn-danger btn-confirm-reset';
    confirmBtn.setAttribute('data-action', 'confirm-reset');
    confirmBtn.setAttribute('data-testid', 'btn-confirm-reset');
    confirmBtn.textContent = 'Yes, Reset Everything';

    confirmActions.appendChild(cancelResetBtn);
    confirmActions.appendChild(confirmBtn);
    confirmPanel.appendChild(confirmMsg);
    confirmPanel.appendChild(confirmActions);

    resetBtn.addEventListener('click', () => {
      resetBtn.style.display = 'none';
      confirmPanel.classList.remove('is-hidden');
      confirmBtn.focus();
    });

    cancelResetBtn.addEventListener('click', () => {
      confirmPanel.classList.add('is-hidden');
      resetBtn.style.display = '';
      resetBtn.focus();
    });

    confirmBtn.addEventListener('click', async () => {
      await resetToDefaults();
      document.documentElement.removeAttribute('data-theme');
      if (onResetDefaults) {
        await onResetDefaults();
      }
      closeModal();
    });

    resetControls.appendChild(resetBtn);
    resetControls.appendChild(confirmPanel);
    resetSection.appendChild(resetControls);
    content.appendChild(resetSection);

    // --- Footer Actions ---
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'btn-primary btn-cancel';
    doneBtn.setAttribute('data-action', 'close-modal');
    doneBtn.setAttribute('data-testid', 'modal-done-btn');
    doneBtn.textContent = 'Done';
    footer.appendChild(doneBtn);

    dialog.appendChild(content);
    dialog.appendChild(footer);
    backdrop.appendChild(dialog);
    modalRoot.appendChild(backdrop);

    // --- Dismissal & Focus Restoration ---
    const closeModal = () => {
      modalRoot.replaceChildren();
      document.removeEventListener('keydown', onKeyDown);
      if (triggerElement && typeof triggerElement.focus === 'function') {
        triggerElement.focus();
      }
    };

    closeBtn.addEventListener('click', closeModal);
    doneBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // --- WCAG AA Focus Trap & Keyboard Navigation ---
    const focusableSelector =
      'input:not([disabled]):not([type="hidden"]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }

      if (e.key === 'Tab') {
        const visibleFocusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter((el) => el.offsetParent !== null && window.getComputedStyle(el).display !== 'none');

        if (visibleFocusables.length === 0) return;

        const first = visibleFocusables[0];
        const last = visibleFocusables[visibleFocusables.length - 1];

        if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // Initial focus on Done button
    doneBtn.focus();
  };

  if (initialSettings) {
    renderModal(initialSettings);
  } else {
    getSettings().then((settings) => renderModal(settings));
  }
}
