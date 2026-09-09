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

export interface CustomerCategoryItem {
  id: string;
  name: string;
  emoji?: string | null;
  color?: string | null;
}

export interface CustomerMatchedData {
  id: string;
  phone: string;
  name: string | null;
  nic?: string | null;
  address?: string | null;
  notes?: string | null;
  isBlocked?: boolean;
  isSuspended?: boolean;
  categories?: Array<{ category: CustomerCategoryItem }>;
}

export interface BillSlot {
  saleId: string | null;
  items: CartLine[];
  discount: number;
  discountPercent?: number;
  customerPhone: string;
  customerId: string | null;
  customerName: string | null;
  customerDetails?: CustomerMatchedData | null;
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
    customerDetails: null,
    warrantyPeriodId: null,
    tradeInId: null,
    tradeInValue: 0,
  };
}

