/**
 * FoxLaunch — Core Type Definitions & Interface Contracts
 *
 * Architecture: Manifest V3 Firefox New Tab WebExtension
 * References:
 * - PROJECT.md § Interface Contracts
 * - foxlaunch_specification.md
 * - pilot-plan.md § Design Decisions
 */

// ============================================================================
// 1. Storage & Persistence Schema (`browser.storage.local`)
// ============================================================================

/**
 * Individual shortcut item stored within a container swimlane.
 */
export interface ShortcutItem {
  /** Unique shortcut identifier generated via crypto.randomUUID() */
  id: string;
  /** Firefox container cookieStoreId (e.g. "firefox-container-1", "firefox-default") */
  cookieStoreId: string;
  /** Target destination URL (scheme-validated: https://, http://, about:) */
  url: string;
  /** User-defined display label */
  title: string;
  /** Extracted domain hostname used for avatar derivation */
  domain: string;
  /** Creation timestamp (milliseconds since epoch: Date.now()) */
  createdAt: number;
  /** 0-indexed display sort order within the container swimlane */
  order: number;
}

/**
 * Dispatch behavior: determines whether launcher tab closes or stays open upon opening a shortcut.
 */
export type TabBehavior = 'close' | 'keep';

/**
 * Visual theme mode: auto respects system prefers-color-scheme, light and dark force themes.
 */
export type ThemeMode = 'auto' | 'light' | 'dark';

/**
 * User preferences and persistent state.
 */
export interface FoxLaunchSettings {
  /** Schema version for forward-compatible storage migration (current: 1) */
  version: number;
  /** Tab dispatch behavior */
  tabBehavior: TabBehavior;
  /** Active UI color theme */
  theme: ThemeMode;
  /** Whether the first-run onboarding walkthrough has been completed/dismissed */
  firstRunDismissed: boolean;
  /** Map of container cookieStoreId to collapse state (true = collapsed, false = expanded) */
  swimlaneCollapse: Record<string, boolean>;
}

/**
 * Top-level storage schema in browser.storage.local.
 */
export interface StorageSchema {
  /** Map of cookieStoreId -> ordered array of ShortcutItem */
  foxlaunch_shortcuts: Record<string, ShortcutItem[]>;
  /** Application preferences and settings */
  foxlaunch_settings: FoxLaunchSettings;
}

// ============================================================================
// 2. Container Service (`src/services/containers.ts`)
// ============================================================================

/**
 * Native Firefox container color names supported by contextualIdentities API.
 */
export type FirefoxContainerColor =
  | 'blue'
  | 'turquoise'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'pink'
  | 'purple'
  | 'toolbar';

/**
 * Native Firefox container icon names supported by contextualIdentities API.
 */
export type FirefoxContainerIcon =
  | 'fingerprint'
  | 'briefcase'
  | 'dollar'
  | 'cart'
  | 'circle'
  | 'gift'
  | 'vacation'
  | 'food'
  | 'fruit'
  | 'pet'
  | 'tree'
  | 'chill'
  | 'fence';

/**
 * Normalized container identity representing either a native contextual identity
 * or the synthetic default context (`firefox-default`).
 */
export interface ContainerContext {
  /** Unique container ID: "firefox-container-X" or "firefox-default" */
  cookieStoreId: string;
  /** Human-readable container name */
  name: string;
  /** Color name keyword */
  color: FirefoxContainerColor | string;
  /** Icon name identifier */
  icon: FirefoxContainerIcon | string;
  /** Hex color code (e.g. "#37adff" or "#808080" for default) */
  colorCode: string;
  /** True if this is the uncontained base browser profile */
  isDefault: boolean;
}

// ============================================================================
// 3. Tab Dispatch Service (`src/services/tabs.ts`)
// ============================================================================

/**
 * Options configuring tab dispatch behavior.
 */
export interface DispatchOptions {
  /**
   * Whether the tab should become the active foreground tab.
   * - Left-click: active = true
   * - Middle-click / Ctrl+click / Cmd+click: active = false (background)
   */
  active?: boolean;
}

// ============================================================================
// 4. Validation & Utility Contracts (`src/utils/`)
// ============================================================================

/**
 * Result structure returned by URL validation and sanitization functions.
 */
export interface UrlValidationResult {
  /** Whether the URL string is syntactically and semantically valid */
  valid: boolean;
  /** Sanitized, normalized URL with auto-prepended scheme (if valid) */
  formattedUrl: string;
  /** User-friendly error message if invalid */
  error?: string;
}

// ============================================================================
// 5. Component & UI Interaction Contracts
// ============================================================================

/**
 * Input payload from the Add/Edit Shortcut modal form.
 */
export interface ShortcutFormData {
  title: string;
  url: string;
  cookieStoreId: string;
}

/**
 * Configuration options for the 5-second undo toast notification.
 */
export interface ToastOptions {
  message: string;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Configuration options for modal dialogs.
 */
export interface ModalConfig {
  title: string;
  content: HTMLElement;
  onClose?: () => void;
}

/**
 * State of the search/filter bar.
 */
export interface SearchFilterState {
  query: string;
}

/**
 * Drag and drop transfer payload for shortcut reordering.
 */
export interface DragReorderPayload {
  shortcutId: string;
  sourceContainerId: string;
  sourceIndex: number;
}

// ============================================================================
// 6. Global Window Augmentation
// ============================================================================

declare global {
  interface Window {
    /** Global WebExtension API handle */
    browser: typeof browser;
  }
}
