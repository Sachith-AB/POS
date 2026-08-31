import { z } from 'zod';
import {
  BARCODE_SCANNER_MODES,
  PAYMENT_METHODS,
  RECEIPT_WIDTHS,
  REPAIR_STATUSES,
  ROLES,
  THEME_MODES,
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
  sellPrice: z.number().nonnegative(),
  quantity: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(3),
  category: z.string().min(1).max(80),
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
  invoiceRef: z.string().max(120).nullable().optional(),
  lines: z.array(stockReceiveLineSchema).min(1),
});
export type StockReceiveBatchInput = z.infer<typeof stockReceiveBatchSchema>;

export const quickCreateProductSchema = z.object({
  barcode: z.string().min(1).max(60),
  name: z.string().min(1).max(160),
  costPrice: z.number().nonnegative(),
  sellPrice: z.number().nonnegative(),
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
});

export const saleCreateSchema = z.object({
  customerId: z.string().min(1).nullable().optional(),
  status: z.enum(['PARKED', 'COMPLETED', 'VOID']).default('PARKED'),
  discount: z.number().nonnegative().default(0),
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
});
export type RepairTicketCreateInput = z.infer<typeof repairTicketCreateSchema>;

export const repairTicketUpdateSchema = z.object({
  status: z.enum(REPAIR_STATUSES).optional(),
  estimate: z.number().nonnegative().nullable().optional(),
  partsJson: z.unknown().optional(),
});
export type RepairTicketUpdateInput = z.infer<typeof repairTicketUpdateSchema>;

export const installmentPlanCreateSchema = z.object({
  saleId: z.string().min(1),
  downPayment: z.number().nonnegative(),
  numberOfInstallments: z.number().int().positive(),
  intervalDays: z.number().int().positive(),
  guarantorName: z.string().max(120).nullable().optional(),
  guarantorNic: z.string().max(30).nullable().optional(),
  guarantorPhone: z.string().max(20).nullable().optional(),
  guarantorAddress: z.string().max(500).nullable().optional(),
});
export type InstallmentPlanCreateInput = z.infer<typeof installmentPlanCreateSchema>;

export const installmentPaymentSchema = z.object({
  amount: z.number().positive(),
});
export type InstallmentPaymentInput = z.infer<typeof installmentPaymentSchema>;

