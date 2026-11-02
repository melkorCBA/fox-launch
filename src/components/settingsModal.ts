/**
 * FoxLaunch — Settings Modal Component
 *
 * Implements Option 2: Two-Pane Preferences Studio aligned with the
 * Firefox Acorn Design System (Nova Refresh).
 *
 * Features:
 * - Master-detail 2-pane preferences studio with sidebar navigation
 * - Segmented controls for Appearance (Theme, Card Density) with live card preview
 * - Simplified container visibility controls with interactive pills & live match count
 * - Wildcard name patterns with instant feedback
 * - Reset-to-defaults with two-stage confirmation
 * - WCAG 2.1 AA focus trap and full keyboard navigation
 */

import type { CardSize, ContainerContext, ContainerVisibility, FoxLaunchSettings, TabBehavior, ThemeMode } from '../types';
import { getSettings, saveSettings, resetToDefaults } from '../services/storage';
import { getContainers } from '../services/containers';
import { matchesContainerName } from '../utils/containerVisibility';

export interface SettingsModalOptions {
  currentSettings?: FoxLaunchSettings;
  triggerElement?: HTMLElement | null;
  initialTab?: 'appearance' | 'behavior' | 'containers' | 'data';
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

function createAppearanceSvg(): SVGSVGElement {
  return createSvg(
    { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
    [
      createSvgElement('circle', { cx: '12', cy: '12', r: '4' }),
      createSvgElement('path', { d: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' }),
    ]
  );
}

function createBehaviorSvg(): SVGSVGElement {
  return createSvg(
    { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
    [
      createSvgElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }),
      createSvgElement('line', { x1: '3', y1: '9', x2: '21', y2: '9' }),
      createSvgElement('line', { x1: '9', y1: '21', x2: '9', y2: '9' }),
    ]
  );
}

function createContainersSvg(): SVGSVGElement {
  return createSvg(
    { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
    [
      createSvgElement('rect', { x: '3', y: '3', width: '7', height: '7', rx: '1' }),
      createSvgElement('rect', { x: '14', y: '3', width: '7', height: '7', rx: '1' }),
      createSvgElement('rect', { x: '14', y: '14', width: '7', height: '7', rx: '1' }),
      createSvgElement('rect', { x: '3', y: '14', width: '7', height: '7', rx: '1' }),
    ]
  );
}

function createDataSvg(): SVGSVGElement {
  return createSvg(
    { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
    [
      createSvgElement('ellipse', { cx: '12', cy: '5', rx: '9', ry: '3' }),
      createSvgElement('path', { d: 'M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' }),
      createSvgElement('path', { d: 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' }),
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
  let initialTab: 'appearance' | 'behavior' | 'containers' | 'data' = 'appearance';

  if (arg1 && 'nodeType' in arg1) {
    triggerElement = arg1 as HTMLElement;
  } else if (arg1 && typeof arg1 === 'object') {
    const opts = arg1 as SettingsModalOptions;
    triggerElement = opts.triggerElement ?? null;
    initialTab = opts.initialTab ?? 'appearance';
    onResetDefaults = opts.onResetDefaults ?? arg2;
    onSettingsChanged = opts.onSettingsChanged;
    initialSettings = opts.currentSettings;
  }

  const renderModal = (activeSettings: FoxLaunchSettings, containers: ContainerContext[]) => {
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

    // --- Content Body (Two-Pane Studio Layout) ---
    const body = document.createElement('div');
    body.className = 'modal-form modal-body';

    // 1. Sidebar Navigation
    const sidebar = document.createElement('nav');
    sidebar.className = 'studio-sidebar';
    sidebar.setAttribute('role', 'tablist');
    sidebar.setAttribute('aria-orientation', 'vertical');
    sidebar.setAttribute('aria-label', 'Settings navigation');

    interface SidebarItem {
      id: string;
      testId: string;
      label: string;
      icon: SVGSVGElement;
      sectionId: string;
    }

    const navItems: SidebarItem[] = [
      { id: 'tab-appearance', testId: 'nav-tab-appearance', label: 'Appearance', icon: createAppearanceSvg(), sectionId: 'section-appearance' },
      { id: 'tab-behavior', testId: 'nav-tab-behavior', label: 'Behavior', icon: createBehaviorSvg(), sectionId: 'section-behavior' },
      { id: 'tab-containers', testId: 'nav-tab-containers', label: 'Containers', icon: createContainersSvg(), sectionId: 'section-containers' },
      { id: 'tab-data', testId: 'nav-tab-data', label: 'Data & Reset', icon: createDataSvg(), sectionId: 'section-data' },
    ];

    const navButtons: HTMLButtonElement[] = [];

    // Forward declare sections for tab switching
    let appearanceSection: HTMLElement;
    let behaviorSection: HTMLElement;
    let visibilitySection: HTMLElement;
    let resetSection: HTMLElement;

    const switchTab = (targetSectionId: string) => {
      navButtons.forEach((btn) => {
        const isCurrent = btn.getAttribute('data-target-section') === targetSectionId;
        btn.classList.toggle('active', isCurrent);
        btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        btn.setAttribute('tabindex', isCurrent ? '0' : '-1');
      });

      const sections = [appearanceSection, behaviorSection, visibilitySection, resetSection];
      sections.forEach((sec) => {
        if (!sec) return;
        const isActive = sec.id === targetSectionId;
        sec.classList.toggle('active', isActive);
        if (isActive) {
          sec.removeAttribute('hidden');
        } else {
          sec.setAttribute('hidden', '');
        }
      });
    };

    navItems.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = item.id;
      btn.className = 'studio-nav-item';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('data-testid', item.testId);
      btn.setAttribute('data-target-section', item.sectionId);
      btn.setAttribute('aria-controls', item.sectionId);
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
      btn.appendChild(item.icon);
      btn.appendChild(document.createTextNode(item.label));

      btn.addEventListener('click', () => {
        switchTab(item.sectionId);
      });

      navButtons.push(btn);
      sidebar.appendChild(btn);
    });

    body.appendChild(sidebar);

    // 2. Main Studio Content Area
    const content = document.createElement('div');
    content.className = 'studio-content';

    // --- Section 1: Appearance (Theme & Card Density & Live Preview) ---
    appearanceSection = document.createElement('section');
    appearanceSection.id = 'section-appearance';
    appearanceSection.className = 'studio-section';
    appearanceSection.setAttribute('role', 'tabpanel');
    appearanceSection.setAttribute('aria-labelledby', 'tab-appearance');
    appearanceSection.setAttribute('tabindex', '0');

    const appearanceHeader = document.createElement('div');
    appearanceHeader.className = 'studio-section-header';
    const appearanceTitle = document.createElement('span');
    appearanceTitle.className = 'studio-section-title';
    appearanceTitle.textContent = 'Appearance & Display';
    appearanceHeader.appendChild(appearanceTitle);
    appearanceSection.appendChild(appearanceHeader);

    // Subsection: Theme
    const themeSection = document.createElement('div');
    themeSection.className = 'settings-section';
    themeSection.setAttribute('role', 'radiogroup');
    themeSection.setAttribute('aria-labelledby', 'theme-heading-title');

    const themeTitle = document.createElement('span');
    themeTitle.id = 'theme-heading-title';
    themeTitle.className = 'settings-section-title';
    themeTitle.textContent = 'Theme';
    themeSection.appendChild(themeTitle);

    const themeOptionsGroup = document.createElement('div');
    themeOptionsGroup.className = 'segmented-control';

    let previewCard: HTMLElement | null = null;
    let previewAvatar: HTMLElement | null = null;
    let previewTitle: HTMLElement | null = null;
    let previewDomain: HTMLElement | null = null;

    const updateLivePreview = (size: CardSize) => {
      if (!previewCard || !previewAvatar || !previewTitle || !previewDomain) return;
      const metrics = {
        small: { padding: '8px', avatar: '24px', title: '12px', domain: '10px' },
        medium: { padding: '12px', avatar: '32px', title: '13px', domain: '11px' },
        large: { padding: '16px', avatar: '40px', title: '15px', domain: '13px' },
      }[size];

      previewCard.style.padding = metrics.padding;
      previewCard.style.gap = metrics.padding;
      previewAvatar.style.width = metrics.avatar;
      previewAvatar.style.height = metrics.avatar;
      previewTitle.style.fontSize = metrics.title;
      previewDomain.style.fontSize = metrics.domain;
    };

    const createThemeOption = (theme: ThemeMode, label: string) => {
      const labelEl = document.createElement('label');
      labelEl.className = `segment-option ${activeSettings.theme === theme ? 'is-checked' : ''}`;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'theme';
      radio.value = theme;
      radio.setAttribute('data-theme-option', theme);
      radio.checked = activeSettings.theme === theme;

      radio.addEventListener('change', async () => {
        if (radio.checked) {
          themeOptionsGroup.querySelectorAll('.segment-option').forEach((el) => el.classList.remove('is-checked'));
          labelEl.classList.add('is-checked');
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
    appearanceSection.appendChild(themeSection);

    // Subsection: Card Size
    const cardSizeSection = document.createElement('div');
    cardSizeSection.className = 'settings-section';
    cardSizeSection.setAttribute('role', 'radiogroup');
    cardSizeSection.setAttribute('aria-labelledby', 'card-size-title');

    const cardSizeTitle = document.createElement('span');
    cardSizeTitle.id = 'card-size-title';
    cardSizeTitle.className = 'settings-section-title';
    cardSizeTitle.textContent = 'Card Size';
    cardSizeSection.appendChild(cardSizeTitle);

    const cardSizeOptionsGroup = document.createElement('div');
    cardSizeOptionsGroup.className = 'segmented-control';

    const createCardSizeOption = (cardSize: CardSize, label: string) => {
      const labelEl = document.createElement('label');
      labelEl.className = `segment-option ${activeSettings.cardSize === cardSize ? 'is-checked' : ''}`;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'cardSize';
      radio.value = cardSize;
      radio.checked = activeSettings.cardSize === cardSize;

      radio.addEventListener('change', async () => {
        if (radio.checked) {
          cardSizeOptionsGroup.querySelectorAll('.segment-option').forEach((el) => el.classList.remove('is-checked'));
          labelEl.classList.add('is-checked');
          document.documentElement.setAttribute('data-card-size', cardSize);
          updateLivePreview(cardSize);
          const updated = await saveSettings({ cardSize });
          activeSettings.cardSize = cardSize;
          onSettingsChanged?.(updated);
        }
      });

      labelEl.appendChild(radio);
      labelEl.appendChild(document.createTextNode(label));
      return labelEl;
    };

    cardSizeOptionsGroup.appendChild(createCardSizeOption('small', 'Small'));
    cardSizeOptionsGroup.appendChild(createCardSizeOption('medium', 'Medium (default)'));
    cardSizeOptionsGroup.appendChild(createCardSizeOption('large', 'Large'));
    cardSizeSection.appendChild(cardSizeOptionsGroup);
    appearanceSection.appendChild(cardSizeSection);

    // Subsection: Live Card Preview Box
    const previewBox = document.createElement('div');
    previewBox.className = 'studio-preview-box';
    const previewHeader = document.createElement('span');
    previewHeader.className = 'studio-preview-label';
    previewHeader.textContent = 'Live Card Preview';
    previewBox.appendChild(previewHeader);

    previewCard = document.createElement('div');
    previewCard.className = 'studio-preview-card';
    previewAvatar = document.createElement('div');
    previewAvatar.className = 'studio-preview-avatar';
    previewAvatar.textContent = 'FX';

    const previewText = document.createElement('div');
    previewText.className = 'studio-preview-text';
    previewTitle = document.createElement('span');
    previewTitle.className = 'studio-preview-title';
    previewTitle.textContent = 'Firefox Add-ons';
    previewDomain = document.createElement('span');
    previewDomain.className = 'studio-preview-domain';
    previewDomain.textContent = 'addons.mozilla.org';
    previewText.append(previewTitle, previewDomain);

    previewCard.append(previewAvatar, previewText);
    previewBox.appendChild(previewCard);
    appearanceSection.appendChild(previewBox);

    updateLivePreview(activeSettings.cardSize);
    content.appendChild(appearanceSection);

    // --- Section 2: Behavior & Tab Dispatch ---
    behaviorSection = document.createElement('section');
    behaviorSection.id = 'section-behavior';
    behaviorSection.className = 'studio-section';
    behaviorSection.setAttribute('role', 'tabpanel');
    behaviorSection.setAttribute('aria-labelledby', 'tab-behavior');
    behaviorSection.setAttribute('tabindex', '0');

    const behaviorHeader = document.createElement('div');
    behaviorHeader.className = 'studio-section-header';
    const behaviorTitle = document.createElement('span');
    behaviorTitle.className = 'studio-section-title';
    behaviorTitle.textContent = 'Behavior & Tabs';
    behaviorHeader.appendChild(behaviorTitle);
    behaviorSection.appendChild(behaviorHeader);

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
    tabOptionsGroup.className = 'segmented-control';

    const createTabOption = (value: TabBehavior, label: string) => {
      const labelEl = document.createElement('label');
      labelEl.className = `segment-option ${activeSettings.tabBehavior === value ? 'is-checked' : ''}`;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'tabBehavior';
      radio.value = value;
      radio.setAttribute('data-setting-val', value);
      radio.checked = activeSettings.tabBehavior === value;

      radio.addEventListener('change', async () => {
        if (radio.checked) {
          tabOptionsGroup.querySelectorAll('.segment-option').forEach((el) => el.classList.remove('is-checked'));
          labelEl.classList.add('is-checked');
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
    behaviorSection.appendChild(tabSection);
    content.appendChild(behaviorSection);

    // --- Section 3: Containers & Wildcard Visibility ---
    visibilitySection = document.createElement('section');
    visibilitySection.id = 'section-containers';
    visibilitySection.className = 'studio-section';
    visibilitySection.setAttribute('role', 'tabpanel');
    visibilitySection.setAttribute('aria-labelledby', 'tab-containers');
    visibilitySection.setAttribute('tabindex', '0');

    const visibilityHeader = document.createElement('div');
    visibilityHeader.className = 'studio-section-header';
    const visibilityTitle = document.createElement('span');
    visibilityTitle.id = 'container-visibility-title';
    visibilityTitle.className = 'studio-section-title';
    visibilityTitle.textContent = 'Container Swimlane Visibility';

    const matchBadge = document.createElement('span');
    matchBadge.id = 'container-match-count';
    matchBadge.className = 'studio-count-badge';
    visibilityHeader.append(visibilityTitle, matchBadge);
    visibilitySection.appendChild(visibilityHeader);

    // Mode Selector
    const visibilityOptions = document.createElement('div');
    visibilityOptions.className = 'segmented-control';
    visibilityOptions.setAttribute('role', 'radiogroup');
    visibilityOptions.setAttribute('aria-labelledby', visibilityTitle.id);

    const filterControls = document.createElement('fieldset');
    filterControls.className = 'settings-container-filters';
    filterControls.disabled = activeSettings.containerVisibility.mode === 'all';
    const legend = document.createElement('legend');
    legend.className = 'form-label';
    legend.textContent = 'Match selected containers or name patterns';
    filterControls.appendChild(legend);

    let visibility = activeSettings.containerVisibility;
    const nonDefaultContainers = containers.filter((c) => !c.isDefault);

    const updateMatchBadge = () => {
      if (visibility.mode === 'all') {
        matchBadge.textContent = `All ${nonDefaultContainers.length} containers visible`;
        matchBadge.style.color = 'var(--text-muted)';
        matchBadge.style.background = 'var(--bg-secondary)';
        return;
      }

      const matched = new Set<string>();
      nonDefaultContainers.forEach((c) => {
        const matchesId = visibility.cookieStoreIds.includes(c.cookieStoreId);
        const matchesPattern = visibility.namePatterns.some((p) => matchesContainerName(c.name, p));
        if (matchesId || matchesPattern) {
          matched.add(c.cookieStoreId);
        }
      });

      const count = matched.size;
      matchBadge.style.background = 'rgba(255, 113, 57, 0.12)';
      if (visibility.mode === 'only') {
        matchBadge.style.color = 'var(--fx-orange)';
        matchBadge.textContent = `Matching ${count} of ${nonDefaultContainers.length} container${nonDefaultContainers.length === 1 ? '' : 's'}`;
      } else {
        matchBadge.style.color = '#ff6b6b';
        matchBadge.textContent = `Hiding ${count} of ${nonDefaultContainers.length} container${nonDefaultContainers.length === 1 ? '' : 's'}`;
      }
    };

    const persistVisibility = async () => {
      const snapshot = { ...visibility, cookieStoreIds: [...visibility.cookieStoreIds] };
      try {
        const updated = await saveSettings({ containerVisibility: snapshot });
        activeSettings.containerVisibility = snapshot;
        onSettingsChanged?.(updated);
        updateMatchBadge();
      } catch (error) {
        console.error('[FoxLaunch] Error saving container visibility:', error);
      }
    };

    const createVisibilityOption = (mode: ContainerVisibility['mode'], label: string) => {
      const labelEl = document.createElement('label');
      labelEl.className = `segment-option ${visibility.mode === mode ? 'is-checked' : ''}`;
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'containerVisibility';
      radio.value = mode;
      radio.checked = visibility.mode === mode;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        visibilityOptions.querySelectorAll('.segment-option').forEach((el) => el.classList.remove('is-checked'));
        labelEl.classList.add('is-checked');
        visibility = { ...visibility, mode };
        filterControls.disabled = mode === 'all';
        persistVisibility();
      });
      labelEl.append(radio, document.createTextNode(label));
      return labelEl;
    };

    visibilityOptions.append(
      createVisibilityOption('all', 'Show all'),
      createVisibilityOption('only', 'Only show these'),
      createVisibilityOption('hide', 'Hide these')
    );
    visibilitySection.appendChild(visibilityOptions);

    // Container Pills
    const containerPillsWrap = document.createElement('div');
    containerPillsWrap.className = 'studio-container-pills';

    nonDefaultContainers.forEach((container) => {
      const label = document.createElement('label');
      label.className = `studio-pill-badge ${visibility.cookieStoreIds.includes(container.cookieStoreId) ? 'active' : ''}`;
      label.style.setProperty('--pill-color', container.colorCode || 'var(--fx-orange)');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = container.cookieStoreId;
      checkbox.checked = visibility.cookieStoreIds.includes(container.cookieStoreId);
      checkbox.addEventListener('change', () => {
        const ids = visibility.cookieStoreIds.filter((id) => id !== container.cookieStoreId);
        if (checkbox.checked) {
          ids.push(container.cookieStoreId);
          label.classList.add('active');
        } else {
          label.classList.remove('active');
        }
        visibility = { ...visibility, cookieStoreIds: ids };
        persistVisibility();
      });

      const dot = document.createElement('span');
      dot.className = 'studio-pill-dot';
      dot.setAttribute('aria-hidden', 'true');
      dot.style.background = container.colorCode || 'var(--fx-orange)';

      const name = document.createElement('span');
      name.textContent = container.name;

      const check = document.createElement('span');
      check.className = 'studio-pill-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';

      label.append(checkbox, dot, name, check);
      containerPillsWrap.appendChild(label);
    });
    filterControls.appendChild(containerPillsWrap);

    // Wildcard Pattern Textarea (Accessible & Fully Backward-Compatible)
    const patternLabel = document.createElement('label');
    patternLabel.className = 'form-label';
    patternLabel.htmlFor = 'container-name-patterns';
    patternLabel.textContent = 'Container name patterns';

    const patterns = document.createElement('textarea');
    patterns.id = patternLabel.htmlFor;
    patterns.className = 'form-input container-name-patterns';
    patterns.rows = 2;
    patterns.placeholder = 'Work*\nDev-*';
    patterns.value = visibility.namePatterns.join('\n');
    patterns.setAttribute('aria-describedby', 'container-pattern-help');
    patterns.addEventListener('input', () => {
      visibility = {
        ...visibility,
        namePatterns: patterns.value.split('\n').map((pattern) => pattern.trim()).filter(Boolean),
      };
      persistVisibility();
    });

    const patternHelp = document.createElement('p');
    patternHelp.id = 'container-pattern-help';
    patternHelp.className = 'form-label';
    patternHelp.style.fontSize = 'var(--text-xs)';
    patternHelp.textContent = 'One pattern per line. * matches any text; names match case-insensitively. The default context always remains visible. Changes save locally.';

    filterControls.append(patternLabel, patterns, patternHelp);
    visibilitySection.appendChild(filterControls);
    content.appendChild(visibilitySection);
    updateMatchBadge();

    // --- Section 4: Data Management & Reset to Defaults ---
    resetSection = document.createElement('section');
    resetSection.id = 'section-data';
    resetSection.className = 'studio-section settings-reset-section';
    resetSection.setAttribute('role', 'tabpanel');
    resetSection.setAttribute('aria-labelledby', 'tab-data');
    resetSection.setAttribute('tabindex', '0');

    const resetHeader = document.createElement('div');
    resetHeader.className = 'studio-section-header';
    const resetTitle = document.createElement('span');
    resetTitle.className = 'studio-section-title';
    resetTitle.textContent = 'Data Management';
    resetHeader.appendChild(resetTitle);
    resetSection.appendChild(resetHeader);

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
      document.documentElement.setAttribute('data-card-size', 'medium');
      if (onResetDefaults) {
        await onResetDefaults();
      }
      closeModal();
    });

    resetControls.appendChild(resetBtn);
    resetControls.appendChild(confirmPanel);
    resetSection.appendChild(resetControls);
    content.appendChild(resetSection);

    body.appendChild(content);

    // Activate initial tab
    switchTab(`section-${initialTab}`);

    // --- Footer Actions ---
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const footerHint = document.createElement('span');
    footerHint.className = 'studio-footer-hint';
    footerHint.textContent = '✓ Changes saved automatically';
    footer.appendChild(footerHint);

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'btn-primary btn-cancel';
    doneBtn.setAttribute('data-action', 'close-modal');
    doneBtn.setAttribute('data-testid', 'modal-done-btn');
    doneBtn.textContent = 'Done';
    footer.appendChild(doneBtn);

    dialog.appendChild(body);
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
      'input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }

      // Sidebar arrow key navigation
      if (document.activeElement && sidebar.contains(document.activeElement)) {
        const curIdx = navButtons.indexOf(document.activeElement as HTMLButtonElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIdx = (curIdx + 1) % navButtons.length;
          navButtons[nextIdx].focus();
          navButtons[nextIdx].click();
          return;
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIdx = (curIdx - 1 + navButtons.length) % navButtons.length;
          navButtons[prevIdx].focus();
          navButtons[prevIdx].click();
          return;
        }
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

  Promise.all([initialSettings ?? getSettings(), getContainers()])
    .then(([settings, containers]) => renderModal(settings, containers));
}
