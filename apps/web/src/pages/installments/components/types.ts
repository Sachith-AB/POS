export interface CustomerDetails {
  id: string;
  name: string | null;
  phone: string;
  nic?: string | null;
  address?: string | null;
  notes?: string | null;
  categories?: {
    category: {
      id: string;
      name: string;
      emoji?: string | null;
      color?: string | null;
    };
  }[];
}

export interface SaleMinimal {
  id: string;
  total: string;
  createdAt: string;
  customer?: {
    id?: string;
    name: string | null;
    phone: string;
    nic?: string | null;
    address?: string | null;
    categories?: {
      category: {
        id: string;
        name: string;
        emoji?: string | null;
        color?: string | null;
      };
    }[];
  } | null;
  items?: {
    id: string;
    quantity: number;
    unitPrice: number | string;
    lineTotal?: number | string;
    product?: {
      id?: string;
      name: string;
    };
  }[];
}

export interface ScheduleItem {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidAmount?: number;
  paidAt?: string | null;
  earlySettlement?: boolean;
  lateFee?: number;
}

export interface AgreementProductItem {
  productId: string;
  name: string;
  sku?: string;
  barcode?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  isSerialized?: boolean;
  serializedItemId?: string | null;
  imei?: string | null;
  availableImeis?: { id: string; imei: string }[];
}

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  COMPLETE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  OVERDUE: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

export function getImageUrl(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const serverHost = apiBase.replace(/\/api\/?$/, '');
  return `${serverHost}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function parseSchedule(scheduleJson: any): ScheduleItem[] {
  try {
    return Array.isArray(scheduleJson)
      ? scheduleJson
      : JSON.parse(scheduleJson as string);
  } catch {
    return [];
  }
}
