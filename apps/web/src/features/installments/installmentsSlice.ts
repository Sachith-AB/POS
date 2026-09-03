import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface InstallmentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidAt: string | null;
  paidAmount?: number;
}

export interface InstallmentPlan {
  id: string;
  saleId: string;
  scheduleJson: any; // InstallmentScheduleItem[]
  remainingBalance: string | number;
  totalPayable?: string | number | null;
  downPaymentPercent?: string | number | null;
  interestMethod?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  interestValue?: string | number;
  interestAmount?: string | number;
  lateFeeAmount?: string | number;
  agreementBarcode?: string | null;
  guarantorPhotoUrl?: string | null;
  guarantorConsentGiven?: boolean;
  status: string;
  guarantorName: string | null;
  guarantorNic: string | null;
  guarantorPhone: string | null;
  guarantorAddress: string | null;
  createdAt: string;
  updatedAt: string;
  sale?: {

    id: string;
    total: string | number;
    subtotal: string | number;
    discount: string | number;
    createdAt: string;
    customer?: {
      id: string;
      name: string | null;
      phone: string;
    } | null;
    payments?: {
      id: string;
      amount: string | number;
      method: string;
      createdAt: string;
    }[];
    items?: {
      id: string;
      quantity: number;
      unitPrice: string | number;
      product: {
        name: string;
      };
    }[];
  };
}

export interface InstallmentsState {
  items: InstallmentPlan[];
  total: number;
  page: number;
  pages: number;
  selectedPlan: InstallmentPlan | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  filters: {
    status: string;
    page: number;
  };
}

const initialState: InstallmentsState = {
  items: [],
  total: 0,
  page: 1,
  pages: 1,
  selectedPlan: null,
  loading: false,
  saving: false,
  error: null,
  filters: {
    status: 'ALL',
    page: 1,
  },
};

const installmentsSlice = createSlice({
  name: 'installments',
  initialState,
  reducers: {
    plansRequested(state, _action: PayloadAction<{ status?: string; page?: number }>) {
      state.loading = true;
      state.error = null;
    },
    plansLoaded(
      state,
      action: PayloadAction<{ items: InstallmentPlan[]; total: number; page: number; pages: number }>
    ) {
      state.items = action.payload.items;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.pages = action.payload.pages;
      state.loading = false;
    },
    plansRequestFailed(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    filtersChanged(state, action: PayloadAction<{ status?: string; page?: number }>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    planDetailRequested(state, _action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
    },
    planDetailLoaded(state, action: PayloadAction<InstallmentPlan>) {
      state.selectedPlan = action.payload;
      state.loading = false;
    },
    planCreateRequested(
      state,
      _action: PayloadAction<{
        saleId: string;
        downPayment: number;
        numberOfInstallments: number;
        intervalDays: number;
        interestMethod?: 'PERCENTAGE' | 'FIXED_AMOUNT';
        interestValue?: number;
        guarantorName?: string;
        guarantorNic?: string;
        guarantorPhone?: string;
        guarantorAddress?: string;
        guarantorPhotoUrl?: string;
        guarantorConsentGiven?: boolean;
      }>
    ) {
      state.saving = true;
      state.error = null;
    },

    planCreated(state, action: PayloadAction<InstallmentPlan>) {
      state.items = [action.payload, ...state.items];
      state.saving = false;
    },
    paymentRecordRequested(
      state,
      _action: PayloadAction<{ planId: string; amount: number; method: string }>
    ) {
      state.saving = true;
      state.error = null;
    },
    paymentRecorded(state, action: PayloadAction<InstallmentPlan>) {
      state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      if (state.selectedPlan?.id === action.payload.id) {
        state.selectedPlan = action.payload;
      }
      state.saving = false;
    },
    operationFailed(state, action: PayloadAction<string>) {
      state.saving = false;
      state.loading = false;
      state.error = action.payload;
    },
    clearSelectedPlan(state) {
      state.selectedPlan = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const {
  plansRequested,
  plansLoaded,
  plansRequestFailed,
  filtersChanged,
  planDetailRequested,
  planDetailLoaded,
  planCreateRequested,
  planCreated,
  paymentRecordRequested,
  paymentRecorded,
  operationFailed,
  clearSelectedPlan,
  clearError,
} = installmentsSlice.actions;

export default installmentsSlice.reducer;
