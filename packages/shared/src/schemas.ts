import { z } from 'zod';
import {
  BARCODE_SCANNER_MODES,
  COMMISSION_METHODS,
  DEFAULT_ACTION_TYPES,
  INSTALLMENT_PAYMENT_METHODS,
  INTEREST_METHODS,
  LATE_FEE_METHODS,
  OUTSOURCED_REPAIR_STATUSES,
  PAYMENT_METHODS,
  PRICE_TYPES,
  RECEIPT_WIDTHS,
  REPAIR_STATUSES,
  ROLES,
  SUPPLIER_RETURN_REASONS,
  SUPPLIER_TRANSACTION_TYPES,
  THEME_MODES,
  TRADE_IN_STATUSES,
} from './enums';

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'Must be a hex color like #1E40AF');

export const PIN_LENGTH = 6;
const pinField = z.string().regex(new RegExp(`^\\d{${PIN_LENGTH}}$`), `PIN must be exactly ${PIN_LENGTH} digits`);

export const shopSettingsSchema = z.object({
  companyName: z.string().min(1).max(120),
  logoUrl: z.string().nullable().optional(),
  primaryColor: hexColor,
  themeMode: z.enum(THEME_MODES),
  discountLimitPercent: z.number().min(0).max(100).default(20),
  lowStockDefaultDays: z.number().int().min(0).default(90),
  receiptPrinterType: z.string().nullable().optional(),
  receiptPrinterName: z.string().nullable().optional(),
  cashDrawerEnabled: z.boolean().default(false),
  barcodeScannerMode: z.enum(BARCODE_SCANNER_MODES).default('USB_HID'),
  receiptWidth: z.enum(RECEIPT_WIDTHS).default('80mm'),
  // Q1-Q28 Configurable Defaults
  defaultDiscountPercent: z.number().min(0).max(100).default(10),
  defaultDownPaymentPercent: z.number().min(0).max(100).default(35),
  defaultInterestMethod: z.enum(INTEREST_METHODS).default('PERCENTAGE'),
  defaultInterestValue: z.number().nonnegative().default(0),
  defaultLateFeeMethod: z.enum(LATE_FEE_METHODS).default('FIXED_AMOUNT'),
  defaultLateFeeValue: z.number().nonnegative().default(0),
  defaultCommissionMethod: z.enum(COMMISSION_METHODS).default('PERCENTAGE'),
  defaultCommissionValue: z.number().nonnegative().default(0),
  defaultTechnicianId: z.string().nullable().optional(),
  uncollectedRepairDays: z.number().int().min(1).default(30),
  firstDaysWarrantyDays: z.number().int().min(0).default(3),
  // text.lk SMS API configuration
  textlkApiToken: z.string().nullable().optional(),
  textlkSenderId: z.string().nullable().optional(),
});
export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;

export const employeeCreateSchema = z.object({
  name: z.string().min(1).max(80),
  pin: pinField,
  role: z.enum(ROLES),
});
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

/** First-run setup: creates the shop's initial Owner account. Server rejects this once any employee exists. */
export const bootstrapAccountSchema = z.object({
  name: z.string().min(1).max(80),
  pin: pinField,
});
export type BootstrapAccountInput = z.infer<typeof bootstrapAccountSchema>;

export const pinLoginSchema = z.object({
  pin: pinField,
});
export type PinLoginInput = z.infer<typeof pinLoginSchema>;

export const productCreateSchema = z.object({
  sku: z.string().min(1).max(60),
  barcode: z.string().min(1).max(60).nullable().optional(),
  name: z.string().min(1).max(160),
  costPrice: z.number().nonnegative(),
  sellPrice: z.number().nonnegative(), // Retail Price
  wholesalePrice: z.number().nonnegative().nullable().optional(),
  businessPrice: z.number().nonnegative().nullable().optional(),
  quantity: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(3),
  category: z.string().min(1).max(80),
  categoryId: z.string().nullable().optional(),
  warrantyPeriodId: z.string().nullable().optional(),
  warrantyDurationDays: z.number().int().nonnegative().nullable().optional(),
  isSerialized: z.boolean().default(false),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const stockReceiveLineSchema = z.object({
  productId: z.string().min(1),
  quantityDelta: z.number().int().positive(),
  costPriceAtTime: z.number().nonnegative().optional(),
  imeis: z.array(z.string().min(1)).optional(),
});

export const stockReceiveBatchSchema = z.object({
  supplierName: z.string().max(120).nullable().optional(),
  supplierId: z.string().nullable().optional(),
  invoiceRef: z.string().max(120).nullable().optional(),
  isCreditPurchase: z.boolean().optional().default(false),
  lines: z.array(stockReceiveLineSchema).min(1),
});
export type StockReceiveBatchInput = z.infer<typeof stockReceiveBatchSchema>;

export const quickCreateProductSchema = z.object({
  barcode: z.string().min(1).max(60),
  name: z.string().min(1).max(160),
  costPrice: z.number().nonnegative(),
  sellPrice: z.number().nonnegative(),
  wholesalePrice: z.number().nonnegative().optional(),
  businessPrice: z.number().nonnegative().optional(),
  warrantyPeriodId: z.string().nullable().optional(),
  warrantyDurationDays: z.number().int().nonnegative().optional(),
  quantity: z.number().int().nonnegative(),
  category: z.string().min(1).max(80),
});
export type QuickCreateProductInput = z.infer<typeof quickCreateProductSchema>;

export const labelPrintRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().max(500),
      })
    )
    .min(1),
  format: z.enum(['CODE128', 'QR']).default('CODE128'),
});
export type LabelPrintRequest = z.infer<typeof labelPrintRequestSchema>;

export const saleItemInputSchema = z.object({
  productId: z.string().min(1),
  serializedItemId: z.string().min(1).nullable().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  priceType: z.enum(PRICE_TYPES).optional().default('RETAIL'),
  warrantyPeriodId: z.string().nullable().optional(),
  warrantyDurationDays: z.number().int().nonnegative().nullable().optional(),
});


export const saleCreateSchema = z.object({
  customerId: z.string().min(1).nullable().optional(),
  status: z.enum(['PARKED', 'COMPLETED', 'VOID']).default('PARKED'),
  discount: z.number().nonnegative().default(0),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  warrantyPeriodId: z.string().nullable().optional(),
  tradeInId: z.string().nullable().optional(),
  items: z.array(saleItemInputSchema).default([]),
});
export type SaleCreateInput = z.infer<typeof saleCreateSchema>;

export const paymentCreateSchema = z.object({
  saleId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(PAYMENT_METHODS),
});
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;

export const customerUpsertSchema = z.object({
  phone: z.string().min(7).max(20),
  name: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type CustomerUpsertInput = z.infer<typeof customerUpsertSchema>;

export const repairTicketCreateSchema = z.object({
  phone: z.string().min(7).max(20),
  customerName: z.string().max(120).nullable().optional(),
  deviceInfo: z.string().min(1).max(200),
  issue: z.string().min(1).max(2000),
  technicianId: z.string().nullable().optional(),
  commissionMethod: z.enum(COMMISSION_METHODS).optional(),
  commissionValue: z.number().nonnegative().optional(),
  advancePayment: z.number().nonnegative().optional().default(0),
  warrantyPeriodId: z.string().nullable().optional(),
});
export type RepairTicketCreateInput = z.infer<typeof repairTicketCreateSchema>;

export const repairTicketUpdateSchema = z.object({
  status: z.enum(REPAIR_STATUSES).optional(),
  estimate: z.number().nonnegative().nullable().optional(),
  partsJson: z.unknown().optional(),
  technicianId: z.string().nullable().optional(),
  commissionMethod: z.enum(COMMISSION_METHODS).optional(),
  commissionValue: z.number().nonnegative().optional(),
  advancePayment: z.number().nonnegative().optional(),
  warrantyPeriodId: z.string().nullable().optional(),
});
export type RepairTicketUpdateInput = z.infer<typeof repairTicketUpdateSchema>;

export const installmentPlanCreateSchema = z.object({
  saleId: z.string().min(1),
  downPayment: z.number().nonnegative(),
  numberOfInstallments: z.number().int().positive(),
  intervalDays: z.number().int().positive(),
  interestMethod: z.enum(INTEREST_METHODS).optional().default('PERCENTAGE'),
  interestValue: z.number().nonnegative().optional().default(0),
  guarantorName: z.string().max(120).nullable().optional(),
  guarantorNic: z.string().max(30).nullable().optional(),
  guarantorPhone: z.string().max(20).nullable().optional(),
  guarantorAddress: z.string().max(500).nullable().optional(),
  guarantorPhotoUrl: z.string().nullable().optional(),
  guarantorConsentGiven: z.boolean().optional().default(false),
});
export type InstallmentPlanCreateInput = z.infer<typeof installmentPlanCreateSchema>;

export const installmentPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(INSTALLMENT_PAYMENT_METHODS).default('CASH'),
});
export type InstallmentPaymentInput = z.infer<typeof installmentPaymentSchema>;

// Category Schema (Q14)
export const categorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(255).nullable().optional(),
});
export type CategoryInput = z.infer<typeof categorySchema>;

// Warranty Period Schema (Q5, Q20)
export const warrantyPeriodSchema = z.object({
  label: z.string().min(1).max(80),
  durationDays: z.number().int().positive(),
  isDefault: z.boolean().default(false),
  appliesToSales: z.boolean().default(true),
  appliesToRepairs: z.boolean().default(true),
});
export type WarrantyPeriodInput = z.infer<typeof warrantyPeriodSchema>;

// Supplier Schema (Q16, Q17)
export const supplierSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const supplierTransactionSchema = z.object({
  supplierId: z.string().min(1),
  type: z.enum(SUPPLIER_TRANSACTION_TYPES),
  amount: z.number().positive(),
  reference: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type SupplierTransactionInput = z.infer<typeof supplierTransactionSchema>;

// Supplier Return Schema (Q19)
export const supplierReturnSchema = z.object({
  supplierId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  reason: z.enum(SUPPLIER_RETURN_REASONS),
  serializedItemId: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type SupplierReturnInput = z.infer<typeof supplierReturnSchema>;

// Trade-In Schema (Q18)
export const tradeInSchema = z.object({
  customerId: z.string().nullable().optional(),
  customerPhone: z.string().max(20).nullable().optional(),
  customerName: z.string().max(120).nullable().optional(),
  deviceInfo: z.string().min(1).max(200),
  imei: z.string().max(60).nullable().optional(),
  condition: z.string().max(500),
  tradeInValue: z.number().positive(),
  saleId: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type TradeInInput = z.infer<typeof tradeInSchema>;

// Outsourced Repair Schema (Q22)
export const outsourcedRepairSchema = z.object({
  repairTicketId: z.string().min(1),
  outsourcedTo: z.string().min(1).max(120),
  sentDate: z.string().optional(),
  expectedReturnDate: z.string().nullable().optional(),
  status: z.enum(OUTSOURCED_REPAIR_STATUSES).default('SENT'),
  reminder: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type OutsourcedRepairInput = z.infer<typeof outsourcedRepairSchema>;

// Default Action Schema (Q11)
export const defaultActionSchema = z.object({
  triggerDaysOverdue: z.number().int().positive(),
  actionType: z.enum(DEFAULT_ACTION_TYPES),
  description: z.string().max(255),
  isActive: z.boolean().default(true),
});
export type DefaultActionInput = z.infer<typeof defaultActionSchema>;


