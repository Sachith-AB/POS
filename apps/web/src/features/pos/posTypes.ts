export interface CartLine {
  productId: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface BillSlot {
  saleId: string | null;
  items: CartLine[];
  discount: number;
  customerPhone: string;
  customerId: string | null;
  customerName: string | null;
}

export function emptyBillSlot(): BillSlot {
  return { saleId: null, items: [], discount: 0, customerPhone: '', customerId: null, customerName: null };
}
