export interface CategoryItem {
  id: string;
  name: string;
}

export interface WarrantyOption {
  id: string;
  label: string;
  durationDays: number;
}

export interface SupplierItem {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  contactPerson?: string | null;
  address?: string | null;
  notes?: string | null;
  totalPayable: number | string;
  paidAmount: number | string;
  outstandingBalance: number | string;
  transactions?: any[];
}

export interface StockMovementItem {
  id: string;
  productId: string;
  supplierId: string | null;
  type: 'RECEIVE' | 'SALE' | 'RETURN' | 'ADJUSTMENT';
  quantityDelta: number;
  costPriceAtTime: number | string | null;
  supplierName: string | null;
  invoiceRef: string | null;
  employeeId: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    sellPrice: number | string;
  };
  supplier?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  employee?: {
    id: string;
    name: string;
  };
}

export interface SupplierTransactionRecord {
  id: string;
  supplierId: string;
  type: 'PURCHASE' | 'PAYMENT' | 'RETURN_CREDIT';
  amount: number | string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  supplier?: {
    id: string;
    name: string;
    phone: string | null;
  };
}

export interface TradeInItem {
  id: string;
  deviceInfo: string;
  imei: string | null;
  condition: string;
  tradeInValue: number | string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
}

export type StockTab =
  | 'receiving'
  | 'products'
  | 'suppliers'
  | 'history'
  | 'returns'
  | 'tradeins'
  | 'labels';
