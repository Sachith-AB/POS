import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface CustomerCategory {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { assignments: number };
}

export interface CustomerListItem {
  id: string;
  phone: string;
  name: string | null;
  nic: string | null;
  address: string | null;
  notes: string | null;
  isBlocked: boolean;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
  categories: CustomerCategory[];
  totalPurchases: number;
  totalPurchaseValue: number;
  outstandingAmount: number;
  lastTransactionDate: string;
  hasOverdue: boolean;
  isInstallmentCustomer: boolean;
}

export interface CustomerProfile extends CustomerListItem {
  sales: any[];
  repairTickets: any[];
  tradeIns: any[];
  imeiHistory: Array<{
    imei: string;
    productName: string;
    saleId: string;
    date: string;
  }>;
  stats: {
    totalPurchases: number;
    totalPurchaseValue: number;
    totalPaidAmount: number;
    outstandingAmount: number;
    latePaymentCount: number;
    lastTransactionDate: string;
  };
}

export interface CustomerOverview {
  totalCustomers: number;
  bestCustomers: number;
  regularCustomers: number;
  installmentCustomers: number;
  overdueCustomers: number;
  problemRiskCustomers: number;
  blockedCustomers: number;
  categoryCounts: Array<{
    id: string;
    name: string;
    emoji: string | null;
    color: string | null;
    count: number;
  }>;
}

export interface CustomersState {
  items: CustomerListItem[];
  total: number;
  page: number;
  pages: number;
  selectedCustomer: CustomerProfile | null;
  overview: CustomerOverview | null;
  categories: CustomerCategory[];
  loading: boolean;
  profileLoading: boolean;
  overviewLoading: boolean;
  categoriesLoading: boolean;
  saving: boolean;
  error: string | null;
  filters: {
    search: string;
    categoryId: string;
    paymentStatus: string;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    page: number;
  };
}

const initialState: CustomersState = {
  items: [],
  total: 0,
  page: 1,
  pages: 1,
  selectedCustomer: null,
  overview: null,
  categories: [],
  loading: false,
  profileLoading: false,
  overviewLoading: false,
  categoriesLoading: false,
  saving: false,
  error: null,
  filters: {
    search: '',
    categoryId: 'ALL',
    paymentStatus: 'ALL',
    sortBy: 'createdAt',
    sortDir: 'desc',
    page: 1,
  },
};

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    customersRequested(state) {
      state.loading = true;
      state.error = null;
    },
    customersLoaded(
      state,
      action: PayloadAction<{ items: CustomerListItem[]; total: number; page: number; pages: number }>
    ) {
      state.items = action.payload.items;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.pages = action.payload.pages;
      state.loading = false;
    },
    customersRequestFailed(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },

    customerProfileRequested(state, _action: PayloadAction<string>) {
      state.profileLoading = true;
      state.error = null;
    },
    customerProfileLoaded(state, action: PayloadAction<CustomerProfile>) {
      state.selectedCustomer = action.payload;
      state.profileLoading = false;
    },
    customerProfileFailed(state, action: PayloadAction<string>) {
      state.profileLoading = false;
      state.error = action.payload;
    },

    overviewRequested(state) {
      state.overviewLoading = true;
    },
    overviewLoaded(state, action: PayloadAction<CustomerOverview>) {
      state.overview = action.payload;
      state.overviewLoading = false;
    },

    categoriesRequested(state) {
      state.categoriesLoading = true;
    },
    categoriesLoaded(state, action: PayloadAction<CustomerCategory[]>) {
      state.categories = action.payload;
      state.categoriesLoading = false;
    },

    filtersChanged(
      state,
      action: PayloadAction<Partial<CustomersState['filters']>>
    ) {
      state.filters = { ...state.filters, ...action.payload };
    },

    customerSaveRequested(
      state,
      _action: PayloadAction<{
        id?: string;
        phone: string;
        name?: string | null;
        nic?: string | null;
        address?: string | null;
        notes?: string | null;
        isBlocked?: boolean;
        isSuspended?: boolean;
        categoryIds?: string[];
      }>
    ) {
      state.saving = true;
      state.error = null;
    },
    customerSaved(state) {
      state.saving = false;
    },

    categorySaveRequested(
      state,
      _action: PayloadAction<{
        id?: string;
        name: string;
        emoji?: string | null;
        color?: string | null;
        description?: string | null;
        sortOrder?: number;
      }>
    ) {
      state.saving = true;
      state.error = null;
    },
    categorySaved(state) {
      state.saving = false;
    },

    categoryDeleteRequested(state, _action: PayloadAction<string>) {
      state.saving = true;
      state.error = null;
    },
    categoryDeleted(state, action: PayloadAction<string>) {
      state.categories = state.categories.filter((c) => c.id !== action.payload);
      state.saving = false;
    },

    operationFailed(state, action: PayloadAction<string>) {
      state.saving = false;
      state.loading = false;
      state.profileLoading = false;
      state.error = action.payload;
    },

    clearSelectedCustomer(state) {
      state.selectedCustomer = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const {
  customersRequested,
  customersLoaded,
  customersRequestFailed,
  customerProfileRequested,
  customerProfileLoaded,
  customerProfileFailed,
  overviewRequested,
  overviewLoaded,
  categoriesRequested,
  categoriesLoaded,
  filtersChanged,
  customerSaveRequested,
  customerSaved,
  categorySaveRequested,
  categorySaved,
  categoryDeleteRequested,
  categoryDeleted,
  operationFailed,
  clearSelectedCustomer,
  clearError,
} = customersSlice.actions;

export default customersSlice.reducer;
