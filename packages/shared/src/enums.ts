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

export const INSTALLMENT_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER'] as const;
export type InstallmentPaymentMethod = (typeof INSTALLMENT_PAYMENT_METHODS)[number];

export const PRICE_TYPES = ['RETAIL', 'WHOLESALE', 'BUSINESS'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const INTEREST_METHODS = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
export type InterestMethod = (typeof INTEREST_METHODS)[number];

export const LATE_FEE_METHODS = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
export type LateFeeMethod = (typeof LATE_FEE_METHODS)[number];

export const COMMISSION_METHODS = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
export type CommissionMethod = (typeof COMMISSION_METHODS)[number];

export const SUPPLIER_TRANSACTION_TYPES = ['PURCHASE', 'PAYMENT', 'RETURN_CREDIT'] as const;
export type SupplierTransactionType = (typeof SUPPLIER_TRANSACTION_TYPES)[number];

export const SUPPLIER_RETURN_REASONS = ['DEFECTIVE', 'DAMAGED', 'WRONG_ITEM'] as const;
export type SupplierReturnReason = (typeof SUPPLIER_RETURN_REASONS)[number];

export const TRADE_IN_STATUSES = ['PENDING', 'ADJUSTED', 'IN_STOCK', 'SOLD'] as const;
export type TradeInStatus = (typeof TRADE_IN_STATUSES)[number];

export const DEFAULT_ACTION_TYPES = ['WARNING', 'BLOCK', 'SUSPEND', 'CUSTOM'] as const;
export type DefaultActionType = (typeof DEFAULT_ACTION_TYPES)[number];

export const OUTSOURCED_REPAIR_STATUSES = ['SENT', 'IN_PROGRESS', 'RETURNED', 'CANCELLED'] as const;
export type OutsourcedRepairStatus = (typeof OUTSOURCED_REPAIR_STATUSES)[number];

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeModeSetting = (typeof THEME_MODES)[number];

export const BARCODE_SCANNER_MODES = ['USB_HID', 'CAMERA'] as const;
export type BarcodeScannerMode = (typeof BARCODE_SCANNER_MODES)[number];

export const RECEIPT_WIDTHS = ['58mm', '80mm'] as const;
export type ReceiptWidth = (typeof RECEIPT_WIDTHS)[number];

export const CUSTOMER_SORT_FIELDS = [
  'name',
  'totalPurchases',
  'totalPurchaseValue',
  'lastTransactionDate',
  'outstandingAmount',
  'createdAt',
] as const;
export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

export const CUSTOMER_PAYMENT_STATUSES = [
  'ALL',
  'PAID_UP',
  'HAS_OUTSTANDING',
  'OVERDUE',
  'BLOCKED',
] as const;
export type CustomerPaymentStatus = (typeof CUSTOMER_PAYMENT_STATUSES)[number];


