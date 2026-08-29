export const ROLES = ['OWNER', 'EMPLOYEE', 'TECHNICIAN'] as const;
export type Role = (typeof ROLES)[number];

export const SALE_STATUSES = ['PARKED', 'COMPLETED', 'VOID'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const SERIALIZED_ITEM_STATUSES = ['IN_STOCK', 'SOLD'] as const;
export type SerializedItemStatus = (typeof SERIALIZED_ITEM_STATUSES)[number];

export const STOCK_MOVEMENT_TYPES = ['RECEIVE', 'SALE', 'ADJUSTMENT', 'RETURN'] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const INSTALLMENT_STATUSES = ['ACTIVE', 'COMPLETE', 'OVERDUE'] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export const REPAIR_STATUSES = [
  'RECEIVED',
  'DIAGNOSING',
  'AWAITING_PARTS',
  'REPAIRED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export const OUTBOX_TYPES = ['BACKUP', 'SMS', 'DASHBOARD_SYNC'] as const;
export type OutboxType = (typeof OUTBOX_TYPES)[number];

export const OUTBOX_STATUSES = ['PENDING', 'SENT', 'FAILED'] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'EZ_CASH_ONLINE'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeModeSetting = (typeof THEME_MODES)[number];

export const BARCODE_SCANNER_MODES = ['USB_HID', 'CAMERA'] as const;
export type BarcodeScannerMode = (typeof BARCODE_SCANNER_MODES)[number];

export const RECEIPT_WIDTHS = ['58mm', '80mm'] as const;
export type ReceiptWidth = (typeof RECEIPT_WIDTHS)[number];
