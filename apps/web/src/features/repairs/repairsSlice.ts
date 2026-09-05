import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface RepairTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  deviceInfo: string;
  issue: string;
  status: string;
  estimate: string | number | null;
  advancePayment?: string | number | null;
  technicianId?: string | null;
  technician?: { id: string; name: string } | null;
  commissionMethod?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  commissionValue?: string | number | null;
  commissionAmount?: string | number | null;
  warrantyPeriodId?: string | null;
  warrantyExpiresAt?: string | null;
  isThreeDayWarranty?: boolean;
  warrantySaleId?: string | null;
  outsourcedRepairs?: any[];
  partsJson: any;
  photos: string[];
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    phone: string;
    name: string | null;
    notes: string | null;
  };
  uncollectedDays?: number;
}

export interface RepairsState {
  items: RepairTicket[];
  total: number;
  page: number;
  pages: number;
  selectedTicket: RepairTicket | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  filters: {
    status: string;
    search: string;
    page: number;
  };
  // Q4 recent sale check
  recentSaleCheck: {
    hasRecentSale: boolean;
    sale?: any;
    firstDaysRule?: number;
    loading?: boolean;
  };
  // Q25 uncollected repairs
  uncollectedTickets: RepairTicket[];
  uncollectedTotal: number;
  uncollectedThresholdDays: number;
  uncollectedLoading: boolean;
  sendingSms: boolean;
}

const initialState: RepairsState = {
  items: [],
  total: 0,
  page: 1,
  pages: 1,
  selectedTicket: null,
  loading: false,
  saving: false,
  error: null,
  filters: {
    status: 'ALL',
    search: '',
    page: 1,
  },
  recentSaleCheck: {
    hasRecentSale: false,
    loading: false,
  },
  uncollectedTickets: [],
  uncollectedTotal: 0,
  uncollectedThresholdDays: 30,
  uncollectedLoading: false,
  sendingSms: false,
};

const repairsSlice = createSlice({
  name: 'repairs',
  initialState,
  reducers: {
    ticketsRequested(state, _action: PayloadAction<{ status?: string; search?: string; page?: number }>) {
      state.loading = true;
      state.error = null;
    },
    ticketsLoaded(
      state,
      action: PayloadAction<{ items: RepairTicket[]; total: number; page: number; pages: number }>
    ) {
      state.items = action.payload.items;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.pages = action.payload.pages;
      state.loading = false;
    },
    ticketsRequestFailed(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    filtersChanged(state, action: PayloadAction<{ status?: string; search?: string; page?: number }>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    ticketDetailRequested(state, _action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
    },
    ticketDetailLoaded(state, action: PayloadAction<RepairTicket>) {
      state.selectedTicket = action.payload;
      state.loading = false;
    },
    ticketCreateRequested(
      state,
      _action: PayloadAction<{
        phone: string;
        customerName?: string;
        deviceInfo: string;
        issue: string;
        technicianId?: string;
        advancePayment?: number;
        warrantyPeriodId?: string;
        commissionMethod?: 'PERCENTAGE' | 'FIXED_AMOUNT';
        commissionValue?: number;
        isThreeDayWarranty?: boolean;
        warrantySaleId?: string;
      }>
    ) {
      state.saving = true;
      state.error = null;
    },
    ticketCreated(state, action: PayloadAction<RepairTicket>) {
      state.items = [action.payload, ...state.items];
      state.saving = false;
    },
    ticketUpdateRequested(
      state,
      _action: PayloadAction<{
        id: string;
        input: {
          status?: string;
          estimate?: number;
          advancePayment?: number;
          technicianId?: string;
          commissionMethod?: 'PERCENTAGE' | 'FIXED_AMOUNT';
          commissionValue?: number;
          warrantyPeriodId?: string;
          partsJson?: any;
          isThreeDayWarranty?: boolean;
          warrantySaleId?: string;
        };
      }>
    ) {
      state.saving = true;
      state.error = null;
    },

    ticketUpdated(state, action: PayloadAction<RepairTicket>) {
      // Update in items list if present
      state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      if (state.selectedTicket?.id === action.payload.id) {
        state.selectedTicket = action.payload;
      }
      state.saving = false;
    },
    photoUploadRequested(state, _action: PayloadAction<{ id: string; file: File }>) {
      state.saving = true;
      state.error = null;
    },
    photoDeleteRequested(state, _action: PayloadAction<{ id: string; index: number }>) {
      state.saving = true;
      state.error = null;
    },
    operationFailed(state, action: PayloadAction<string>) {
      state.saving = false;
      state.loading = false;
      state.uncollectedLoading = false;
      state.sendingSms = false;
      state.error = action.payload;
    },
    clearSelectedTicket(state) {
      state.selectedTicket = null;
    },
    clearError(state) {
      state.error = null;
    },

    // Q4 Recent sale check actions
    recentSaleCheckRequested(state, _action: PayloadAction<string>) {
      state.recentSaleCheck.loading = true;
    },
    recentSaleCheckLoaded(
      state,
      action: PayloadAction<{ hasRecentSale: boolean; sale?: any; firstDaysRule?: number }>
    ) {
      state.recentSaleCheck = {
        hasRecentSale: action.payload.hasRecentSale,
        sale: action.payload.sale,
        firstDaysRule: action.payload.firstDaysRule,
        loading: false,
      };
    },
    clearRecentSaleCheck(state) {
      state.recentSaleCheck = { hasRecentSale: false, loading: false };
    },

    // Q25 Uncollected repairs actions
    uncollectedTicketsRequested(state) {
      state.uncollectedLoading = true;
    },
    uncollectedTicketsLoaded(
      state,
      action: PayloadAction<{ thresholdDays: number; total: number; items: RepairTicket[] }>
    ) {
      state.uncollectedTickets = action.payload.items;
      state.uncollectedTotal = action.payload.total;
      state.uncollectedThresholdDays = action.payload.thresholdDays;
      state.uncollectedLoading = false;
    },
    sendUncollectedSmsRequested(state, _action: PayloadAction<string[] | undefined>) {
      state.sendingSms = true;
    },
    sendUncollectedSmsDone(state) {
      state.sendingSms = false;
    },
  },
});

export const {
  ticketsRequested,
  ticketsLoaded,
  ticketsRequestFailed,
  filtersChanged,
  ticketDetailRequested,
  ticketDetailLoaded,
  ticketCreateRequested,
  ticketCreated,
  ticketUpdateRequested,
  ticketUpdated,
  photoUploadRequested,
  photoDeleteRequested,
  operationFailed,
  clearSelectedTicket,
  clearError,
  recentSaleCheckRequested,
  recentSaleCheckLoaded,
  clearRecentSaleCheck,
  uncollectedTicketsRequested,
  uncollectedTicketsLoaded,
  sendUncollectedSmsRequested,
  sendUncollectedSmsDone,
} = repairsSlice.actions;

export default repairsSlice.reducer;
