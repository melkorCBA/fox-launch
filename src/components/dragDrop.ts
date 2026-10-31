/**
 * FoxLaunch — Intra-Swimlane HTML5 Drag & Drop Reordering
 */

import type { ShortcutItem } from '../types';
import { getShortcuts, reorderShortcuts } from '../services/storage';

export function setupSwimlaneDragAndDrop(
  gridElement: HTMLElement,
  cookieStoreId: string,
  onReordered: (reordered: ShortcutItem[]) => Promise<void> | void
): void {
  let draggedCard: HTMLElement | null = null;
  let sourceId: string | null = null;

  gridElement.addEventListener('dragstart', (e: DragEvent) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.shortcut-card');
    if (!card) return;

    draggedCard = card;
    sourceId = card.getAttribute('data-id');
    card.classList.add('is-dragging');

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', sourceId || '');
    }
  });

  gridElement.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    if (!draggedCard && !e.dataTransfer?.types.includes('text/plain')) return;

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    const targetCard = (e.target as HTMLElement).closest<HTMLElement>('.shortcut-card');
    if (targetCard && targetCard !== draggedCard) {
      targetCard.classList.add('drag-over');
    }
  });

  gridElement.addEventListener('dragleave', (e: DragEvent) => {
    const targetCard = (e.target as HTMLElement).closest<HTMLElement>('.shortcut-card');
    if (targetCard) {
      targetCard.classList.remove('drag-over');
    }
  });

  gridElement.addEventListener('drop', async (e: DragEvent) => {
    e.preventDefault();
    document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));

    const effectiveSourceId = sourceId || e.dataTransfer?.getData('text/plain');
    const targetCard = (e.target as HTMLElement).closest<HTMLElement>('.shortcut-card');
    if (!targetCard || !effectiveSourceId) return;

    const targetId = targetCard.getAttribute('data-id');
    if (!targetId || targetId === effectiveSourceId) return;

    try {
      const allShortcuts = await getShortcuts();
      const items = allShortcuts[cookieStoreId] ? [...allShortcuts[cookieStoreId]] : [];

      const fromIndex = items.findIndex((i) => i.id === effectiveSourceId);
      const toIndex = items.findIndex((i) => i.id === targetId);

      if (fromIndex !== -1 && toIndex !== -1) {
        const [moved] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, moved);

        const updated = await reorderShortcuts(cookieStoreId, items);
        await onReordered(updated);
      }
    } catch (err) {
      console.error('[FoxLaunch] Failed to persist drag-and-drop reorder:', err);
    }
  });

  gridElement.addEventListener('dragend', () => {
    if (draggedCard) {
      draggedCard.classList.remove('is-dragging');
      draggedCard = null;
    }
    sourceId = null;
    document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
  });
}

export function setupSwimlaneReordering(
  container: HTMLElement,
  onReordered: (cookieStoreIds: string[]) => Promise<void> | void
): void {
  let draggedSwimlane: HTMLElement | null = null;
  let grabbedSwimlane: HTMLElement | null = null;
  let originalIndex = -1;



  const getOrderedSwimlaneIds = (): string[] => {
    return Array.from(container.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('swimlane'))
      .map((lane) => lane.dataset.cookieStoreId)
      .filter((id): id is string => Boolean(id));
  };

  const announceStatus = (message: string) => {
    let liveRegion = document.getElementById('a11y-status');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'a11y-status';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.cssText =
        'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    requestAnimationFrame(() => {
      if (liveRegion) liveRegion.textContent = message;
    });
  };

  const moveSwimlane = async (swimlane: HTMLElement, handle: HTMLElement, direction: 'up' | 'down') => {
    const allSwimlanes = Array.from(container.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('swimlane')
    );
    const visibleSwimlanes = allSwimlanes.filter((lane) => lane.style.display !== 'none');
    const currentIndex = visibleSwimlanes.indexOf(swimlane);
    if (currentIndex === -1) return;
    const title = swimlane.querySelector('.swimlane-title')?.textContent || 'Swimlane';

    if (direction === 'up' && currentIndex > 0) {
      const targetSwimlane = visibleSwimlanes[currentIndex - 1];
      container.insertBefore(swimlane, targetSwimlane);
      handle.focus();
      const cookieStoreIds = getOrderedSwimlaneIds();
      try {
        await onReordered(cookieStoreIds);
      } catch (err) {
        console.error('[FoxLaunch] Failed to persist swimlane reorder:', err);
      }
      announceStatus(`${title} moved up to position ${currentIndex} of ${visibleSwimlanes.length}.`);
    } else if (direction === 'down' && currentIndex < visibleSwimlanes.length - 1) {
      const targetSwimlane = visibleSwimlanes[currentIndex + 1];
      targetSwimlane.after(swimlane);
      handle.focus();
      const cookieStoreIds = getOrderedSwimlaneIds();
      try {
        await onReordered(cookieStoreIds);
      } catch (err) {
        console.error('[FoxLaunch] Failed to persist swimlane reorder:', err);
      }
      announceStatus(`${title} moved down to position ${currentIndex + 2} of ${visibleSwimlanes.length}.`);
    }
  };

  const clearDragState = () => {
    draggedSwimlane?.classList.remove('is-dragging');
    draggedSwimlane = null;
    container.querySelectorAll('.swimlane.drag-over').forEach((lane) => lane.classList.remove('drag-over'));
  };

  container.addEventListener('dragstart', (event: DragEvent) => {
    const handle = (event.target as HTMLElement).closest<HTMLElement>('.swimlane-drag-handle');
    const swimlane = handle?.closest<HTMLElement>('.swimlane');
    if (!swimlane) return;

    draggedSwimlane = swimlane;
    swimlane.classList.add('is-dragging');

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', swimlane.dataset.cookieStoreId || '');
    }
  });

  container.addEventListener('dragover', (event: DragEvent) => {
    if (!draggedSwimlane) return;

    const target = (event.target as HTMLElement).closest<HTMLElement>('.swimlane');
    if (!target || target === draggedSwimlane || target.parentElement !== container) return;

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

    container.querySelectorAll('.swimlane.drag-over').forEach((lane) => lane.classList.remove('drag-over'));
    target.classList.add('drag-over');
  });

  container.addEventListener('drop', async (event: DragEvent) => {
    if (!draggedSwimlane) return;

    const target = (event.target as HTMLElement).closest<HTMLElement>('.swimlane');
    if (!target || target === draggedSwimlane || target.parentElement !== container) return;

    event.preventDefault();
    const bounds = target.getBoundingClientRect();
    if (event.clientY < bounds.top + bounds.height / 2) {
      container.insertBefore(draggedSwimlane, target);
    } else {
      target.after(draggedSwimlane);
    }

    const cookieStoreIds = Array.from(container.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('swimlane'))
      .map((lane) => lane.dataset.cookieStoreId)
      .filter((id): id is string => Boolean(id));

    clearDragState();
    try {
      await onReordered(cookieStoreIds);
    } catch (error) {
      console.error('[FoxLaunch] Failed to persist swimlane order:', error);
    }
  });

  container.addEventListener('dragend', clearDragState);

  container.addEventListener('keydown', async (event: KeyboardEvent) => {
    if (event.key === 'Escape' && grabbedSwimlane) {
      event.preventDefault();
      const grabbed = grabbedSwimlane;
      const grabbedHandle = grabbed.querySelector<HTMLElement>('.swimlane-drag-handle');
      const grabbedTitle = grabbed.querySelector('.swimlane-title')?.textContent || 'Swimlane';

      grabbedHandle?.setAttribute('aria-pressed', 'false');
      grabbedHandle?.classList.remove('is-grabbed');
      grabbed.classList.remove('keyboard-reordering');

      if (!container.contains(grabbed)) {
        announceStatus(`Reorder cancelled for ${grabbedTitle}.`);
        grabbedSwimlane = null;
        originalIndex = -1;
        return;
      }

      const allSwimlanes = Array.from(container.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('swimlane')
      );
      const currentIndex = allSwimlanes.indexOf(grabbed);
      if (originalIndex !== -1 && currentIndex !== -1 && currentIndex !== originalIndex) {
        if (originalIndex >= allSwimlanes.length - 1) {
          container.appendChild(grabbed);
        } else {
          const ref = allSwimlanes[originalIndex > currentIndex ? originalIndex + 1 : originalIndex];
          container.insertBefore(grabbed, ref);
        }
        await onReordered(getOrderedSwimlaneIds());
      }
      announceStatus(`Reorder cancelled for ${grabbedTitle}.`);
      grabbedSwimlane = null;
      originalIndex = -1;
      grabbedHandle?.focus();
      return;
    }

    const target = event.target as HTMLElement | null;
    const handle = target?.closest<HTMLElement>('.swimlane-drag-handle');
    if (!handle) return;

    const swimlane = handle.closest<HTMLElement>('.swimlane');
    if (!swimlane || swimlane.parentElement !== container) return;

    const title = swimlane.querySelector('.swimlane-title')?.textContent || 'Swimlane';

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      await moveSwimlane(swimlane, handle, 'up');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      await moveSwimlane(swimlane, handle, 'down');
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const isGrabbed = handle.getAttribute('aria-pressed') === 'true';
      if (!isGrabbed) {
        if (grabbedSwimlane && grabbedSwimlane !== swimlane) {
          const prevHandle = grabbedSwimlane.querySelector<HTMLElement>('.swimlane-drag-handle');
          prevHandle?.setAttribute('aria-pressed', 'false');
          prevHandle?.classList.remove('is-grabbed');
          grabbedSwimlane.classList.remove('keyboard-reordering');
        }

        grabbedSwimlane = swimlane;
        const allSwimlanes = Array.from(container.children).filter(
          (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('swimlane')
        );
        originalIndex = allSwimlanes.indexOf(swimlane);
        handle.setAttribute('aria-pressed', 'true');
        handle.classList.add('is-grabbed');
        swimlane.classList.add('keyboard-reordering');
        announceStatus(
          `Reorder mode active for ${title}. Press Arrow Up to move up, Arrow Down to move down, Enter or Space to finish, Escape to cancel.`
        );
      } else {
        handle.setAttribute('aria-pressed', 'false');
        handle.classList.remove('is-grabbed');
        swimlane.classList.remove('keyboard-reordering');
        grabbedSwimlane = null;
        originalIndex = -1;
        const allSwimlanes = Array.from(container.children).filter(
          (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('swimlane')
        );
        const visibleSwimlanes = allSwimlanes.filter((lane) => lane.style.display !== 'none');
        const newIndex = visibleSwimlanes.indexOf(swimlane);
        const total = visibleSwimlanes.length;
        announceStatus(`${title} placed at position ${newIndex + 1} of ${total}.`);
        handle.focus();
      }
    }
  });

  container.addEventListener('click', async (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const handle = target?.closest<HTMLElement>('.swimlane-drag-handle');
    if (!handle) return;
    const swimlane = handle.closest<HTMLElement>('.swimlane');
    if (!swimlane || swimlane.parentElement !== container) return;

    const title = swimlane.querySelector('.swimlane-title')?.textContent || 'Swimlane';
    const isGrabbed = handle.getAttribute('aria-pressed') === 'true';
    if (!isGrabbed) {
      if (grabbedSwimlane && grabbedSwimlane !== swimlane) {
        const prevHandle = grabbedSwimlane.querySelector<HTMLElement>('.swimlane-drag-handle');
        prevHandle?.setAttribute('aria-pressed', 'false');
        prevHandle?.classList.remove('is-grabbed');
        grabbedSwimlane.classList.remove('keyboard-reordering');
      }

      grabbedSwimlane = swimlane;
      const allSwimlanes = Array.from(container.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('swimlane')
      );
      originalIndex = allSwimlanes.indexOf(swimlane);
      handle.setAttribute('aria-pressed', 'true');
      handle.classList.add('is-grabbed');
      swimlane.classList.add('keyboard-reordering');
      announceStatus(
        `Reorder mode active for ${title}. Press Arrow Up to move up, Arrow Down to move down, Enter or Space to finish, Escape to cancel.`
      );
    } else {
      handle.setAttribute('aria-pressed', 'false');
      handle.classList.remove('is-grabbed');
      swimlane.classList.remove('keyboard-reordering');
      grabbedSwimlane = null;
      originalIndex = -1;
      const allSwimlanes = Array.from(container.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('swimlane')
      );
      const visibleSwimlanes = allSwimlanes.filter((lane) => lane.style.display !== 'none');
      const newIndex = visibleSwimlanes.indexOf(swimlane);
      const total = visibleSwimlanes.length;
      announceStatus(`${title} placed at position ${newIndex + 1} of ${total}.`);
      handle.focus();
    }
  });
}
