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
}
