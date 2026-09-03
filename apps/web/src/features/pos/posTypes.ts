export interface CartLine {
  productId: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  unitPrice: number;
  retailPrice?: number;
  wholesalePrice?: number | null;
  businessPrice?: number | null;
  priceType?: 'RETAIL' | 'WHOLESALE' | 'BUSINESS';
}

export interface BillSlot {
  saleId: string | null;
  items: CartLine[];
  discount: number;
  discountPercent?: number;
  customerPhone: string;
  customerId: string | null;
  customerName: string | null;
  warrantyPeriodId?: string | null;
  tradeInId?: string | null;
  tradeInValue?: number;
}

export function emptyBillSlot(): BillSlot {
  return {
    saleId: null,
    items: [],
    discount: 0,
    discountPercent: 0,
    customerPhone: '',
    customerId: null,
    customerName: null,
    warrantyPeriodId: null,
    tradeInId: null,
    tradeInValue: 0,
  };
}

