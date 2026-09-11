import type { Product } from '../../../features/products/productsSlice';

export interface WarrantyOption {
  id: string;
  label: string;
  durationDays: number;
  isDefault: boolean;
}

export interface TradeInItem {
  id: string;
  deviceInfo: string;
  imei: string | null;
  condition?: string;
  tradeInValue: number | string;
  customerName: string | null;
}

export interface SerializedItemStock {
  id: string;
  imei: string;
  status: 'IN_STOCK' | 'SOLD' | 'DEFECTIVE';
  createdAt: string;
}

export interface MobilePhoneProduct extends Product {
  isSerialized: boolean;
  serializedItems?: SerializedItemStock[];
  categoryRel?: { id: string; name: string; emoji?: string | null } | null;
}
