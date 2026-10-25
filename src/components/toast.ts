/**
 * FoxLaunch — 5-Second Undo Toast Notification
 *
 * Mounts in #toast-root and provides immediate shortcut deletion restoration.
 */

export interface UndoToastOptions {
  message?: string;
  durationMs?: number;
  onUndo: () => Promise<void> | void;
}

let activeToastTimeout: number | null = null;

export function showUndoToast(options: UndoToastOptions): void {
  const toastRoot = document.getElementById('toast-root');
  if (!toastRoot) return;

  // Clear existing active timeout
  if (activeToastTimeout !== null) {
    window.clearTimeout(activeToastTimeout);
    activeToastTimeout = null;
  }
  toastRoot.replaceChildren();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('data-testid', 'toast-notification');
  toast.setAttribute('role', 'status');

  const message = document.createElement('span');
  message.className = 'toast-message';
  message.setAttribute('data-testid', 'toast-message');
  message.textContent = options.message || 'Shortcut removed';
  toast.appendChild(message);

  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.className = 'toast-undo-btn';
  undoBtn.setAttribute('data-action', 'undo-delete');
  undoBtn.textContent = 'Undo';
  toast.appendChild(undoBtn);

  toastRoot.appendChild(toast);

  const dismiss = () => {
    if (activeToastTimeout !== null) {
      window.clearTimeout(activeToastTimeout);
      activeToastTimeout = null;
    }
    toast.remove();
  };

  undoBtn.addEventListener('click', async () => {
    dismiss();
    await options.onUndo();
  });

  const duration = options.durationMs || 5000;
  activeToastTimeout = window.setTimeout(dismiss, duration);
}
