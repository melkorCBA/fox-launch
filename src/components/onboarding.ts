/**
 * FoxLaunch — First-Run Onboarding Walkthrough Component
 *
 * Provides a 4-step interactive walkthrough explaining Firefox Multi-Account
 * Containers, dynamic swimlanes, shortcut management, and tab dispatch.
 * Fully WCAG AA accessible with native focus trapping and Escape dismissal.
 */

import '../styles/onboarding.css';
import { saveSettings } from '../services/storage';

export interface OnboardingOptions {
  triggerElement?: HTMLElement | null;
  onDismiss?: () => void;
}

export interface OnboardingStep {
  title: string;
  badge: string;
  heading: string;
  body: string;
  tips: string[];
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to FoxLaunch',
    badge: 'Overview',
    heading: 'Role-Isolated Firefox Containers',
    body: 'FoxLaunch organizes your shortcuts into isolated Firefox Multi-Account Container contexts. Seamlessly switch workflows with role-isolated browsing, zero cross-context cookie leakage, and zero network tracking.',
    tips: [
      'Strict offline privacy: zero telemetry, zero remote requests.',
      'Cold dashboard render engine optimized for instant new-tab launches.',
    ],
  },
  {
    title: 'Container Swimlanes',
    badge: 'Layout',
    heading: 'Color Badges & Collapsible Swimlanes',
    body: 'FoxLaunch auto-discovers your user containers upon startup. Each container receives a dedicated swimlane displaying its native Firefox color badge, container icon, and saved shortcuts.',
    tips: [
      'Click the collapse icon on any swimlane header to minimize or expand.',
      'Includes an uncontained Default context (collapsed by default).',
    ],
  },
  {
    title: 'Managing Shortcuts',
    badge: 'Shortcuts',
    heading: 'URL Validation & 5-Second Undo Toast',
    body: 'Add, edit, or drag-and-drop reorder shortcuts directly within container swimlanes. FoxLaunch automatically validates URLs (https, http, about), generates offline SVG domain avatars, and protects against accidental deletion.',
    tips: [
      'Accidentally deleted a shortcut? A 5-second undo toast lets you restore it instantly.',
      'Drag shortcut cards within a swimlane to customize your preferred order.',
    ],
  },
  {
    title: 'Container Tab Dispatch',
    badge: 'Dispatch',
    heading: 'One-Click Isolated Browsing',
    body: 'Left-click any shortcut or press Enter to launch directly into its isolated container tab. Middle-click or Ctrl+click opens tabs in the background without stealing focus.',
    tips: [
      'Press "/" anywhere on the page to instantly search across all shortcuts.',
      'Configure tab behavior in Settings: keep the launcher tab or close it automatically.',
    ],
  },
];

const SVG_NS = 'http://www.w3.org/2000/svg';

function createCloseSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const l1 = document.createElementNS(SVG_NS, 'line');
  l1.setAttribute('x1', '18');
  l1.setAttribute('y1', '6');
  l1.setAttribute('x2', '6');
  l1.setAttribute('y2', '18');

  const l2 = document.createElementNS(SVG_NS, 'line');
  l2.setAttribute('x1', '6');
  l2.setAttribute('y1', '6');
  l2.setAttribute('x2', '18');
  l2.setAttribute('y2', '18');

  svg.appendChild(l1);
  svg.appendChild(l2);
  return svg;
}

export function openOnboardingOverlay(options?: OnboardingOptions): void;
export function openOnboardingOverlay(triggerElement?: HTMLElement | null): void;
export function openOnboardingOverlay(
  optionsOrTrigger?: HTMLElement | OnboardingOptions | null
): void {
  const onboardingRoot = document.getElementById('onboarding-root');
  if (!onboardingRoot) return;

  let triggerElement: HTMLElement | null = null;
  let onDismiss: (() => void) | undefined;

  if (optionsOrTrigger && 'nodeType' in optionsOrTrigger) {
    triggerElement = optionsOrTrigger as HTMLElement;
  } else if (optionsOrTrigger && typeof optionsOrTrigger === 'object') {
    const opts = optionsOrTrigger as OnboardingOptions;
    triggerElement = opts.triggerElement ?? null;
    onDismiss = opts.onDismiss;
  }

  onboardingRoot.replaceChildren();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'onboarding-modal modal-dialog';
  dialog.setAttribute('data-testid', 'onboarding-overlay');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'onboarding-title');
  dialog.setAttribute('aria-describedby', 'onboarding-desc');
  dialog.tabIndex = -1;

  let currentStep = 0;
  let isDismissing = false;

  // Header
  const header = document.createElement('div');
  header.className = 'onboarding-header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'onboarding-title-wrap';

  const badgeEl = document.createElement('span');
  badgeEl.className = 'onboarding-badge';

  const titleEl = document.createElement('h3');
  titleEl.id = 'onboarding-title';
  titleEl.className = 'onboarding-title';

  titleWrap.appendChild(badgeEl);
  titleWrap.appendChild(titleEl);
  header.appendChild(titleWrap);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn-icon btn-close-modal';
  closeBtn.setAttribute('data-action', 'close-onboarding');
  closeBtn.setAttribute('aria-label', 'Close walkthrough');
  closeBtn.appendChild(createCloseSvg());
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.className = 'onboarding-content';

  const stepHeading = document.createElement('h4');
  stepHeading.id = 'onboarding-step-heading';
  stepHeading.className = 'onboarding-step-heading';

  const stepText = document.createElement('p');
  stepText.id = 'onboarding-desc';
  stepText.className = 'onboarding-step-body';

  const tipsList = document.createElement('ul');
  tipsList.className = 'onboarding-tips-list';

  content.appendChild(stepHeading);
  content.appendChild(stepText);
  content.appendChild(tipsList);
  dialog.appendChild(content);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'onboarding-footer';

  const progressWrap = document.createElement('div');
  progressWrap.className = 'onboarding-progress-wrap';

  const stepBadge = document.createElement('span');
  stepBadge.className = 'step-indicator';
  stepBadge.setAttribute('data-testid', 'step-indicator');
  stepBadge.setAttribute('aria-live', 'polite');

  const stepDots = document.createElement('div');
  stepDots.className = 'step-dots';
  stepDots.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
    const dot = document.createElement('span');
    dot.className = `step-dot${i === 0 ? ' is-active' : ''}`;
    stepDots.appendChild(dot);
  }

  progressWrap.appendChild(stepBadge);
  progressWrap.appendChild(stepDots);
  footer.appendChild(progressWrap);

  // Button actions
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'onboarding-buttons';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'btn-secondary btn-onboarding-back';
  backBtn.setAttribute('data-action', 'onboarding-back');
  backBtn.textContent = 'Back';

  const dismissBtn = document.createElement('button');
  dismissBtn.type = 'button';
  dismissBtn.className = 'btn-secondary btn-onboarding-dismiss';
  dismissBtn.setAttribute('data-action', 'onboarding-dismiss');
  dismissBtn.textContent = 'Skip';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'btn-primary btn-onboarding-next';
  nextBtn.setAttribute('data-action', 'onboarding-next');
  nextBtn.textContent = 'Next';

  buttonGroup.appendChild(backBtn);
  buttonGroup.appendChild(dismissBtn);
  buttonGroup.appendChild(nextBtn);
  footer.appendChild(buttonGroup);

  dialog.appendChild(footer);
  backdrop.appendChild(dialog);
  onboardingRoot.appendChild(backdrop);

  // Step Rendering Logic
  const renderStep = (idx: number) => {
    const step = ONBOARDING_STEPS[idx];
    titleEl.textContent = step.title;
    badgeEl.textContent = step.badge;
    stepHeading.textContent = step.heading;
    stepText.textContent = step.body;
    stepBadge.textContent = `Step ${idx + 1} of ${ONBOARDING_STEPS.length}`;

    // Update Tips List
    tipsList.replaceChildren();
    step.tips.forEach((tipText) => {
      const li = document.createElement('li');
      li.textContent = tipText;
      tipsList.appendChild(li);
    });

    // Update Dots
    const dots = stepDots.querySelectorAll('.step-dot');
    dots.forEach((dot, dotIdx) => {
      dot.classList.toggle('is-active', dotIdx === idx);
    });

    // Navigation Buttons State
    if (idx === 0) {
      backBtn.style.display = 'none';
    } else {
      backBtn.style.display = '';
    }

    if (idx === ONBOARDING_STEPS.length - 1) {
      nextBtn.style.display = 'none';
      dismissBtn.className = 'btn-primary btn-onboarding-dismiss';
      dismissBtn.textContent = 'Get Started';
      dismissBtn.focus();
    } else {
      nextBtn.style.display = '';
      dismissBtn.className = 'btn-secondary btn-onboarding-dismiss';
      dismissBtn.textContent = 'Skip';
      nextBtn.focus();
    }
  };

  // Dismiss Handler & Focus Restoration
  const handleDismiss = async () => {
    if (isDismissing) return;
    isDismissing = true;

    document.removeEventListener('keydown', onKeyDown);

    try {
      await saveSettings({ firstRunDismissed: true });
    } catch (err) {
      console.error('[FoxLaunch] Failed to persist firstRunDismissed setting:', err);
    }

    onboardingRoot.replaceChildren();
    onDismiss?.();

    // Clean focus restoration
    if (triggerElement && typeof triggerElement.focus === 'function') {
      triggerElement.focus();
    } else {
      const searchInput = document.getElementById('search-input');
      if (searchInput && typeof searchInput.focus === 'function') {
        searchInput.focus();
      }
    }
  };

  // Button Listeners
  nextBtn.addEventListener('click', () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      currentStep++;
      renderStep(currentStep);
    }
  });

  backBtn.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      renderStep(currentStep);
    }
  });

  dismissBtn.addEventListener('click', handleDismiss);
  closeBtn.addEventListener('click', handleDismiss);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) handleDismiss();
  });

  // WCAG AA Focus Trap & Keyboard Handling
  const focusableSelector = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleDismiss();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((el) => el.offsetParent !== null && window.getComputedStyle(el).display !== 'none');

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !dialog.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !dialog.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  document.addEventListener('keydown', onKeyDown);

  // Initialize Step 0
  renderStep(0);
}
