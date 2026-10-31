/**
 * FoxLaunch — Container Swimlane Component
 *
 * Renders container swimlane row with header, badge, collapsible toggle,
 * shortcut card grid, and empty state placeholder.
 */

import type { ContainerContext, ShortcutItem, FoxLaunchSettings } from '../types';
import { saveSettings } from '../services/storage';
import { renderShortcutCard } from './shortcutCard';
import { setupSwimlaneDragAndDrop } from './dragDrop';

export interface SwimlaneCallbacks {
  onAddShortcut: (cookieStoreId: string) => void;
  onEditShortcut: (shortcut: ShortcutItem) => void;
  onDeleteShortcut: (shortcut: ShortcutItem) => void;
  onReorderShortcuts?: (cookieStoreId: string, items: ShortcutItem[]) => void;
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

export function createContainerIcon(iconName: string): SVGElement {
  switch (iconName) {
    case 'fingerprint':
      return createSvg({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'currentColor' }, [
        createSvgElement('path', { d: 'M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.41 3.12 7.24l1.44-1.44C4.94 16.34 4 14.28 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.28-.94 4.34-2.56 5.8l1.44 1.44C20.8 17.41 22 14.85 22 12c0-5.52-4.48-10-10-10zm0 4c-3.31 0-6 2.69-6 6 0 1.71.72 3.25 1.88 4.35l1.44-1.44C8.54 14.15 8 13.14 8 12c0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.14-.54 2.15-1.32 2.91l1.44 1.44C17.28 15.25 18 13.71 18 12c0-3.31-2.69-6-6-6z' }),
      ]);
    case 'briefcase':
      return createSvg({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
        createSvgElement('rect', { x: '2', y: '7', width: '20', height: '14', rx: '2', ry: '2' }),
        createSvgElement('path', { d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' }),
      ]);
    case 'dollar':
      return createSvg({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
        createSvgElement('line', { x1: '12', y1: '1', x2: '12', y2: '23' }),
        createSvgElement('path', { d: 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' }),
      ]);
    case 'cart':
      return createSvg({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
        createSvgElement('circle', { cx: '9', cy: '21', r: '1' }),
        createSvgElement('circle', { cx: '20', cy: '21', r: '1' }),
        createSvgElement('path', { d: 'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6' }),
      ]);
    case 'gift':
      return createSvg({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
        createSvgElement('polyline', { points: '20 12 20 22 4 22 4 12' }),
        createSvgElement('rect', { x: '2', y: '7', width: '20', height: '5' }),
        createSvgElement('line', { x1: '12', y1: '22', x2: '12', y2: '7' }),
      ]);
    case 'vacation':
      return createSvg({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
        createSvgElement('path', { d: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z' }),
      ]);
    case 'food':
      return createSvg({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
        createSvgElement('path', { d: 'M18 8h1a4 4 0 0 1 0 8h-1' }),
        createSvgElement('path', { d: 'M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z' }),
        createSvgElement('line', { x1: '6', y1: '1', x2: '6', y2: '4' }),
        createSvgElement('line', { x1: '10', y1: '1', x2: '10', y2: '4' }),
        createSvgElement('line', { x1: '14', y1: '1', x2: '14', y2: '4' }),
      ]);
    case 'tree':
      return createSvg({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
        createSvgElement('polygon', { points: '12 2 4 12 9 12 6 18 18 18 15 12 20 12 12 2' }),
        createSvgElement('line', { x1: '12', y1: '18', x2: '12', y2: '22' }),
      ]);
    case 'pet':
      return createSvg({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'currentColor' }, [
        createSvgElement('circle', { cx: '12', cy: '14', r: '5' }),
        createSvgElement('circle', { cx: '7', cy: '8', r: '2.5' }),
        createSvgElement('circle', { cx: '17', cy: '8', r: '2.5' }),
        createSvgElement('circle', { cx: '12', cy: '6', r: '2' }),
      ]);
    case 'circle':
    default:
      return createSvg({ viewBox: '0 0 24 24', width: '16', height: '16', fill: 'currentColor' }, [
        createSvgElement('circle', { cx: '12', cy: '12', r: '7' }),
      ]);
  }
}

export function renderSwimlane(
  container: ContainerContext,
  shortcuts: ShortcutItem[],
  settings: FoxLaunchSettings,
  callbacks: SwimlaneCallbacks
): HTMLElement {
  const isDefault = container.isDefault || container.cookieStoreId === 'firefox-default';

  // Collapse state: priority from settings, default container defaults to true (collapsed)
  const isCollapsed = settings.swimlaneCollapse[container.cookieStoreId] !== undefined
    ? settings.swimlaneCollapse[container.cookieStoreId]
    : isDefault;

  const section = document.createElement('section');
  section.className = 'swimlane';
  section.id = `swimlane-${container.cookieStoreId}`;
  section.setAttribute('data-cookie-store-id', container.cookieStoreId);
  section.setAttribute('data-testid', `swimlane-${container.cookieStoreId}`);

  // 1. Header
  const header = document.createElement('div');
  header.className = 'swimlane-header';
  header.setAttribute('data-testid', 'swimlane-header');

  const left = document.createElement('div');
  left.className = 'swimlane-header-left';

  const badge = document.createElement('span');
  badge.className = 'swimlane-badge container-badge';
  badge.setAttribute('data-testid', 'swimlane-badge');
  badge.style.backgroundColor = container.colorCode;

  const iconWrapper = document.createElement('span');
  iconWrapper.className = 'swimlane-icon';
  iconWrapper.setAttribute('aria-hidden', 'true');
  iconWrapper.appendChild(createContainerIcon(container.icon));
  badge.appendChild(iconWrapper);
  left.appendChild(badge);

  const title = document.createElement('h2');
  title.className = 'swimlane-title';
  title.setAttribute('data-testid', 'swimlane-title');
  title.textContent = container.name;
  left.appendChild(title);

  const countBadge = document.createElement('span');
  countBadge.className = 'swimlane-count';
  countBadge.setAttribute('data-testid', 'shortcut-count');
  countBadge.textContent = shortcuts.length.toString();
  countBadge.setAttribute('aria-label', `${shortcuts.length} shortcuts`);
  left.appendChild(countBadge);

  header.appendChild(left);

  // 2. Action Buttons
  const actions = document.createElement('div');
  actions.className = 'swimlane-header-actions';

  const dragHandle = document.createElement('button');
  dragHandle.type = 'button';
  dragHandle.className = 'btn-icon swimlane-drag-handle';
  dragHandle.draggable = true;
  dragHandle.setAttribute('aria-label', `Reorder ${container.name} swimlane`);
  dragHandle.title = 'Drag or press Enter/Space then Arrow keys to reorder';
  dragHandle.setAttribute('aria-roledescription', 'sortable');
  dragHandle.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
  dragHandle.setAttribute('aria-pressed', 'false');
  const gripSvg = createSvg({ width: '16', height: '16', viewBox: '0 0 16 16', fill: 'currentColor', 'aria-hidden': 'true' }, [
    createSvgElement('circle', { cx: '5', cy: '3', r: '1' }),
    createSvgElement('circle', { cx: '11', cy: '3', r: '1' }),
    createSvgElement('circle', { cx: '5', cy: '8', r: '1' }),
    createSvgElement('circle', { cx: '11', cy: '8', r: '1' }),
    createSvgElement('circle', { cx: '5', cy: '13', r: '1' }),
    createSvgElement('circle', { cx: '11', cy: '13', r: '1' }),
  ]);
  dragHandle.appendChild(gripSvg);
  actions.appendChild(dragHandle);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-icon btn-add-shortcut';
  addBtn.setAttribute('data-action', 'add-shortcut');
  addBtn.setAttribute('aria-label', `Add shortcut to ${container.name}`);
  addBtn.title = 'Add shortcut';
  const plusSvg = createSvg({ class: 'icon-plus', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    createSvgElement('line', { x1: '12', y1: '5', x2: '12', y2: '19' }),
    createSvgElement('line', { x1: '5', y1: '12', x2: '19', y2: '12' }),
  ]);
  addBtn.appendChild(plusSvg);
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onAddShortcut(container.cookieStoreId);
  });
  actions.appendChild(addBtn);

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'btn-icon swimlane-toggle';
  toggleBtn.setAttribute('data-action', 'toggle-swimlane');
  toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
  toggleBtn.setAttribute('aria-label', `Toggle ${container.name} swimlane`);
  toggleBtn.title = isCollapsed ? 'Expand swimlane' : 'Collapse swimlane';
  const chevronSvg = createSvg({ class: 'icon-chevron', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    createSvgElement('polyline', { points: '6 9 12 15 18 9' }),
  ]);
  toggleBtn.appendChild(chevronSvg);
  actions.appendChild(toggleBtn);

  header.appendChild(actions);
  section.appendChild(header);

  // 3. Body: Card Grid & Empty State
  const body = document.createElement('div');
  body.className = 'swimlane-body';
  if (isCollapsed) {
    body.style.display = 'none';
  }

  const grid = document.createElement('div');
  grid.className = 'swimlane-grid';

  const emptyPlaceholder = document.createElement('div');
  emptyPlaceholder.className = 'swimlane-empty empty-state';
  emptyPlaceholder.setAttribute('data-testid', 'empty-placeholder');

  const emptyText = document.createElement('p');
  emptyText.className = 'empty-text';
  emptyText.textContent = 'No shortcuts yet. Add a shortcut to get started.';
  emptyPlaceholder.appendChild(emptyText);

  const emptyAddBtn = document.createElement('button');
  emptyAddBtn.type = 'button';
  emptyAddBtn.className = 'btn-secondary empty-add-btn';
  emptyAddBtn.textContent = 'Add a shortcut';
  emptyAddBtn.addEventListener('click', () => {
    callbacks.onAddShortcut(container.cookieStoreId);
  });
  emptyPlaceholder.appendChild(emptyAddBtn);

  if (shortcuts.length === 0) {
    grid.style.display = 'none';
    emptyPlaceholder.style.display = '';
  } else {
    grid.style.display = '';
    emptyPlaceholder.style.display = 'none';
    shortcuts.forEach((sc) => {
      const card = renderShortcutCard(sc, container.colorCode, {
        onEdit: callbacks.onEditShortcut,
        onDelete: callbacks.onDeleteShortcut,
      });
      grid.appendChild(card);
    });
  }

  body.appendChild(grid);
  body.appendChild(emptyPlaceholder);
  section.appendChild(body);

  // 4. Toggle Interaction & State Persistence
  toggleBtn.addEventListener('click', async () => {
    const currentlyExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !currentlyExpanded;
    toggleBtn.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
    toggleBtn.title = nextExpanded ? 'Collapse swimlane' : 'Expand swimlane';
    body.style.display = nextExpanded ? '' : 'none';

    // Persist to storage
    await saveSettings({
      swimlaneCollapse: {
        [container.cookieStoreId]: !nextExpanded,
      },
    });
  });

  // 5. Wire HTML5 Drag & Drop Reordering
  setupSwimlaneDragAndDrop(grid, container.cookieStoreId, async (reorderedItems) => {
    callbacks.onReorderShortcuts?.(container.cookieStoreId, reorderedItems);
  });

  return section;
}
