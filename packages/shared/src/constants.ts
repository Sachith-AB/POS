/** Number of concurrent bills that can be parked at once (Section 4.1). */
export const MAX_PARKED_BILLS = 5;

/** Number of configurable quick-buttons on the POS screen (Section 4.1). */
export const QUICK_BUTTON_COUNT = 20;

/** Duration (ms) the undo toast stays actionable before a destructive action is committed (Section 2). */
export const UNDO_TOAST_MS = 5000;

/** Debounce (ms) applied to autosave writes and customer-phone lookups. */
export const AUTOSAVE_DEBOUNCE_MS = 400;
export const CUSTOMER_LOOKUP_DEBOUNCE_MS = 300;

/** Default "dead stock" window in months if not overridden in shop_settings. */
export const DEFAULT_DEAD_STOCK_MONTHS = 3;

export const KEYBOARD_SHORTCUTS = {
  FOCUS_SEARCH: 'F1',
  GO_TO_PAYMENT: 'F2',
  PRINT_BILL: 'F12',
  CANCEL: 'Escape',
} as const;

export const DEFAULT_PRIMARY_COLOR = '#1E40AF';
