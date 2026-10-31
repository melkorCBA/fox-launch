/**
 * FoxLaunch — Shortcut Card Component
 *
 * Renders individual shortcut card with avatar, title, domain, action menu,
 * and handles foreground/background containerized tab dispatch.
 */

import type { ShortcutItem } from '../types';
import { generateAvatarSvg } from '../utils/avatar';
import { dispatchShortcut } from '../services/tabs';

export interface ShortcutCardCallbacks {
  onEdit: (shortcut: ShortcutItem) => void;
  onDelete: (shortcut: ShortcutItem) => void;
}

// Module-level tracker to enforce singleton action menu and cleanup listeners
let activeMenuCloser: (() => void) | null = null;

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

export function renderShortcutCard(
  shortcut: ShortcutItem,
  containerColorCode: string,
  callbacks: ShortcutCardCallbacks
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'shortcut-card';
  card.setAttribute('data-id', shortcut.id);
  card.setAttribute('data-cookie-store-id', shortcut.cookieStoreId);
  card.setAttribute('data-testid', 'shortcut-card');
  card.setAttribute('draggable', 'true');
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', shortcut.title);

  // 1. Procedural SVG Avatar with Favicon Support
  const avatarWrapper = document.createElement('div');
  avatarWrapper.className = 'shortcut-avatar-wrapper';

  const avatarImg = document.createElement('img');
  avatarImg.className = 'shortcut-avatar';
  avatarImg.setAttribute('data-testid', 'shortcut-avatar');
  avatarImg.alt = shortcut.title;
  avatarImg.width = 32;
  avatarImg.height = 32;

  const fallbackSvg = generateAvatarSvg(shortcut.domain, containerColorCode);

  // Only render locally available data URLs (data:image/...) to prevent remote tracking or requests
  if (shortcut.favIconUrl && shortcut.favIconUrl.startsWith('data:image/')) {
    avatarImg.src = shortcut.favIconUrl;
    avatarImg.onerror = () => {
      avatarImg.src = fallbackSvg;
    };
  } else {
    avatarImg.src = fallbackSvg;
  }

  avatarWrapper.appendChild(avatarImg);
  card.appendChild(avatarWrapper);

  // 2. Title & Domain
  const infoWrapper = document.createElement('div');
  infoWrapper.className = 'shortcut-info';

  const titleSpan = document.createElement('span');
  titleSpan.className = 'shortcut-title';
  titleSpan.setAttribute('data-testid', 'shortcut-title');
  titleSpan.textContent = shortcut.title; // Safe textContent prevents XSS
  infoWrapper.appendChild(titleSpan);

  const domainSpan = document.createElement('span');
  domainSpan.className = 'shortcut-domain';
  domainSpan.setAttribute('data-testid', 'shortcut-domain');
  domainSpan.textContent = shortcut.domain;
  infoWrapper.appendChild(domainSpan);

  card.appendChild(infoWrapper);

  // 3. Action Menu Trigger & Dynamic Dropdown
  const actionsWrapper = document.createElement('div');
  actionsWrapper.className = 'shortcut-actions';

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'btn-icon shortcut-menu-btn';
  menuBtn.setAttribute('data-action', 'shortcut-menu');
  menuBtn.setAttribute('data-testid', 'shortcut-menu-btn');
  menuBtn.setAttribute('aria-label', `Shortcut actions for ${shortcut.title}`);
  menuBtn.title = 'Actions';

  const moreSvg = createSvg({ class: 'icon-more', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'currentColor' }, [
    createSvgElement('circle', { cx: '12', cy: '5', r: '2' }),
    createSvgElement('circle', { cx: '12', cy: '12', r: '2' }),
    createSvgElement('circle', { cx: '12', cy: '19', r: '2' }),
  ]);
  menuBtn.appendChild(moreSvg);
  actionsWrapper.appendChild(menuBtn);
  card.appendChild(actionsWrapper);

  let menuDropdown: HTMLElement | null = null;

  const onDocClick = (e: MouseEvent) => {
    if (!actionsWrapper.contains(e.target as Node)) {
      closeMenu();
    }
  };

  const onDocKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
      menuBtn.focus();
    }
  };

  const closeMenu = () => {
    if (activeMenuCloser === closeMenu) {
      activeMenuCloser = null;
    }
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onDocKeydown);
    if (menuDropdown) {
      menuDropdown.remove();
      menuDropdown = null;
    }
  };

  const openMenu = () => {
    // Close any other open menus in document to enforce singleton menu
    if (activeMenuCloser) {
      activeMenuCloser();
    }
    document.querySelectorAll('.shortcut-menu').forEach((m) => m.remove());

    menuDropdown = document.createElement('div');
    menuDropdown.className = 'shortcut-menu';
    menuDropdown.setAttribute('role', 'menu');

    const editItem = document.createElement('button');
    editItem.type = 'button';
    editItem.className = 'menu-item menu-item-edit';
    editItem.setAttribute('data-action', 'edit-shortcut');
    editItem.setAttribute('data-testid', 'menu-item-edit');
    editItem.setAttribute('role', 'menuitem');
    editItem.textContent = 'Edit';

    const deleteItem = document.createElement('button');
    deleteItem.type = 'button';
    deleteItem.className = 'menu-item menu-item-delete';
    deleteItem.setAttribute('data-action', 'delete-shortcut');
    deleteItem.setAttribute('data-testid', 'menu-item-delete');
    deleteItem.setAttribute('role', 'menuitem');
    deleteItem.textContent = 'Delete';

    editItem.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenu();
      callbacks.onEdit(shortcut);
    });

    deleteItem.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenu();
      callbacks.onDelete(shortcut);
    });

    menuDropdown.appendChild(editItem);
    menuDropdown.appendChild(deleteItem);
    actionsWrapper.appendChild(menuDropdown);

    // Register listeners only while menu is open
    activeMenuCloser = closeMenu;
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKeydown);
  };

  const toggleMenu = () => {
    if (menuDropdown) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // 4. Tab Dispatch Handling (delegates directly to unified dispatchShortcut service)
  const executeDispatch = (active: boolean) => {
    dispatchShortcut(shortcut.url, shortcut.cookieStoreId, {
      active,
      shortcutId: shortcut.id,
      hasFavicon: !!shortcut.favIconUrl,
    });
  };

  // Left click / Ctrl / Meta click
  card.addEventListener('click', (e: MouseEvent) => {
    // If clicking menu trigger or inside menu, ignore card dispatch
    if (actionsWrapper.contains(e.target as Node)) {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      executeDispatch(false); // Background tab
    } else if (e.button === 0) {
      executeDispatch(true); // Foreground tab
    }
  });

  // Middle click: listen to auxclick, mouseup, and pointerup
  let lastMiddleClickTime = 0;
  const onMiddleClick = (e: MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastMiddleClickTime < 250) return;
      lastMiddleClickTime = now;
      executeDispatch(false); // Background tab
    }
  };

  card.addEventListener('auxclick', onMiddleClick);
  card.addEventListener('mouseup', onMiddleClick);

  // Keyboard navigation: Enter on card dispatches foreground; Ctrl+Enter or Cmd+Enter dispatches background
  card.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !actionsWrapper.contains(document.activeElement)) {
      e.preventDefault();
      const isBackground = e.ctrlKey || e.metaKey;
      executeDispatch(!isBackground);
    }
  });

  return card;
}
