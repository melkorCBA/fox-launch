/**
 * FoxLaunch — Modal Dialog & Overlay Components
 *
 * Implements accessible Add/Edit shortcut modal, Settings modal,
 * and first-run Onboarding walkthrough overlay.
 */

import type { ShortcutItem } from '../types';
import { validateAndFormatUrl } from '../utils/validation';

export interface ShortcutModalOptions {
  mode: 'add' | 'edit';
  cookieStoreId: string;
  containerName?: string;
  initialData?: Partial<ShortcutItem>;
  triggerElement?: HTMLElement | null;
  onSubmit: (formData: { title: string; url: string; cookieStoreId: string }) => Promise<void> | void;
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
  return createSvg({ width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
    createSvgElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
    createSvgElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
  ]);
}

export function openShortcutModal(options: ShortcutModalOptions): void {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  // Clear any existing modals
  modalRoot.replaceChildren();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'shortcut-modal-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';
  dialog.setAttribute('data-testid', 'modal-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'modal-title');

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';

  const title = document.createElement('h3');
  title.id = 'modal-title';
  title.className = 'modal-title';
  title.textContent = options.mode === 'add'
    ? `Add Shortcut${options.containerName ? ` (${options.containerName})` : ''}`
    : 'Edit Shortcut';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn-icon btn-close-modal';
  closeBtn.setAttribute('data-action', 'close-modal');
  closeBtn.setAttribute('data-testid', 'modal-close-btn');
  closeBtn.setAttribute('aria-label', 'Close modal');
  closeBtn.appendChild(createCloseSvg());
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  // Form
  const form = document.createElement('form');
  form.className = 'modal-form';
  form.id = 'shortcut-form';

  const body = document.createElement('div');
  body.className = 'modal-body';

  // Title input
  const titleGroup = document.createElement('div');
  titleGroup.className = 'form-group';
  const titleLabel = document.createElement('label');
  titleLabel.htmlFor = 'shortcut-title-input';
  titleLabel.className = 'form-label';
  titleLabel.textContent = 'Title';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.id = 'shortcut-title-input';
  titleInput.name = 'title';
  titleInput.className = 'form-input';
  titleInput.setAttribute('data-testid', 'shortcut-title-input');
  titleInput.placeholder = 'e.g. GitHub';
  titleInput.value = options.initialData?.title || '';
  titleInput.autocomplete = 'off';
  titleGroup.appendChild(titleLabel);
  titleGroup.appendChild(titleInput);
  body.appendChild(titleGroup);

  // URL input
  const urlGroup = document.createElement('div');
  urlGroup.className = 'form-group';
  const urlLabel = document.createElement('label');
  urlLabel.htmlFor = 'shortcut-url-input';
  urlLabel.className = 'form-label';
  urlLabel.textContent = 'URL';
  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.id = 'shortcut-url-input';
  urlInput.name = 'url';
  urlInput.className = 'form-input';
  urlInput.setAttribute('data-testid', 'shortcut-url-input');
  urlInput.placeholder = 'e.g. github.com';
  urlInput.value = options.initialData?.url || '';
  urlInput.autocomplete = 'off';
  urlGroup.appendChild(urlLabel);
  urlGroup.appendChild(urlInput);
  body.appendChild(urlGroup);

  // Validation Error Box
  const errorBox = document.createElement('div');
  errorBox.className = 'validation-error is-hidden';
  errorBox.setAttribute('data-testid', 'validation-error');
  errorBox.setAttribute('role', 'alert');
  body.appendChild(errorBox);
  form.appendChild(body);

  // Footer Actions
  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn-secondary btn-cancel';
  cancelBtn.setAttribute('data-action', 'cancel-modal');
  cancelBtn.setAttribute('data-testid', 'modal-cancel-btn');
  cancelBtn.textContent = 'Cancel';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn-primary btn-save-shortcut';
  submitBtn.setAttribute('data-action', 'save-shortcut');
  submitBtn.textContent = options.mode === 'add' ? 'Add Shortcut' : 'Save Changes';

  footer.appendChild(cancelBtn);
  footer.appendChild(submitBtn);
  form.appendChild(footer);
  dialog.appendChild(form);
  backdrop.appendChild(dialog);
  modalRoot.appendChild(backdrop);

  // Dismissal & focus restoration
  const closeModal = () => {
    modalRoot.replaceChildren();
    document.removeEventListener('keydown', onKeyDown);
    if (options.triggerElement && typeof options.triggerElement.focus === 'function') {
      options.triggerElement.focus();
    }
  };

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Focus trap & keyboard navigation
  const focusableSelector = 'input:not([disabled]), button:not([disabled])';
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKeyDown);

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawUrl = urlInput.value.trim();
    const rawTitle = titleInput.value.trim();

    const validation = validateAndFormatUrl(rawUrl);
    if (!validation.valid) {
      errorBox.textContent = validation.error || 'Invalid URL.';
      errorBox.classList.remove('is-hidden');
      urlInput.focus();
      return;
    }

    errorBox.classList.add('is-hidden');
    const finalTitle = rawTitle || validation.domain || 'Shortcut';

    // Normalize URL: avoid unwanted trailing slash if user didn't enter one
    let finalUrl = validation.formattedUrl;
    if (finalUrl.endsWith('/') && !rawUrl.endsWith('/')) {
      finalUrl = finalUrl.slice(0, -1);
    }

    await options.onSubmit({
      title: finalTitle,
      url: finalUrl,
      cookieStoreId: options.cookieStoreId,
    });

    closeModal();
  });

  titleInput.focus();
}

// Re-export settings modal for backwards compatibility
export { openSettingsModal, type SettingsModalOptions } from './settingsModal';



// Re-export onboarding overlay for backwards compatibility
export { openOnboardingOverlay, type OnboardingOptions } from './onboarding';
