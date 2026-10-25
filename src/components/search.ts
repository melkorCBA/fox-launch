/**
 * FoxLaunch — Search and Filter Controller
 *
 * Provides real-time shortcut filtering and global '/' hotkey focus management.
 */

export interface SearchController {
  init: () => void;
  filter: (query: string) => void;
  clear: () => void;
}

export function initSearch(): SearchController {
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  const modalRoot = document.getElementById('modal-root');
  const onboardingRoot = document.getElementById('onboarding-root');

  if (!searchInput) {
    console.warn('[FoxLaunch] #search-input not found.');
    return { init: () => {}, filter: () => {}, clear: () => {} };
  }

  // 1. Global '/' Hotkey Listener
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === '/') {
      // Don't intercept if modifier keys pressed
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const activeEl = document.activeElement;
      const targetTag = (activeEl as HTMLElement)?.tagName?.toLowerCase();

      // Guard: do not intercept if typing in an input or textarea
      if (targetTag === 'input' || targetTag === 'textarea') return;

      // Guard: do not intercept if inside active modal or onboarding overlay
      if (modalRoot && modalRoot.contains(activeEl) && modalRoot.children.length > 0) return;
      if (onboardingRoot && onboardingRoot.contains(activeEl) && onboardingRoot.children.length > 0) return;

      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  // 2. Real-Time Filter Logic
  const filter = (rawQuery: string) => {
    const query = (rawQuery || '').trim().toLowerCase();
    const swimlanes = document.querySelectorAll<HTMLElement>('.swimlane');

    swimlanes.forEach((swimlane) => {
      const containerTitle = swimlane.querySelector('.swimlane-title')?.textContent?.toLowerCase() || '';
      const containerMatches = query.length > 0 && containerTitle.includes(query);
      const cards = swimlane.querySelectorAll<HTMLElement>('.shortcut-card');
      const body = swimlane.querySelector<HTMLElement>('.swimlane-body');
      const emptyPlaceholder = swimlane.querySelector<HTMLElement>('.swimlane-empty');
      const toggleBtn = swimlane.querySelector<HTMLElement>('.swimlane-toggle');

      let matchingCardsCount = 0;

      cards.forEach((card) => {
        const title = card.querySelector('.shortcut-title')?.textContent?.toLowerCase() || '';
        const domain = card.querySelector('.shortcut-domain')?.textContent?.toLowerCase() || '';
        const cardMatches = !query || containerMatches || title.includes(query) || domain.includes(query);

        if (cardMatches) {
          card.style.display = '';
          matchingCardsCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (!query) {
        // Query cleared: restore normal swimlane view and collapse states
        swimlane.style.display = '';
        if (emptyPlaceholder) {
          emptyPlaceholder.style.display = cards.length === 0 ? '' : 'none';
        }
        if (body) {
          const isCollapsed = toggleBtn?.getAttribute('aria-expanded') === 'false';
          body.style.display = isCollapsed ? 'none' : '';
        }
      } else {
        // Active search: if swimlane has matches, ensure it and its body are visible
        if (matchingCardsCount > 0 || containerMatches) {
          swimlane.style.display = '';
          if (body) body.style.display = ''; // Auto-expand to show matching cards
          if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';
        } else {
          swimlane.style.display = 'none';
        }
      }
    });
  };

  // 3. Search input events
  searchInput.addEventListener('input', () => {
    filter(searchInput.value);
  });

  searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      filter('');
      searchInput.blur();
    }
  });

  return {
    init: () => filter(searchInput.value),
    filter,
    clear: () => {
      searchInput.value = '';
      filter('');
    },
  };
}
