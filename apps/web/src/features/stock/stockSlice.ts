import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { loggedOut } from '../auth/authSlice';
import type { Product } from '../products/productsSlice';

export interface PendingReceiveLine {
  productId: string;
  name: string;
  quantityDelta: number;
  costPriceAtTime?: number;
  imeis: string[];
}

export interface StockState {
  matchedProduct: Product | null;
  notFoundBarcode: string | null;
  pendingLines: PendingReceiveLine[];
  supplierName: string;
  invoiceRef: string;
  submitting: boolean;
  lastBatchCount: number | null;
}

const initialState: StockState = {
  matchedProduct: null,
  notFoundBarcode: null,
  pendingLines: [],
  supplierName: '',
  invoiceRef: '',
  submitting: false,
  lastBatchCount: null,
};

const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {
    barcodeEntered(state, _action: PayloadAction<string>) {
      state.matchedProduct = null;
      state.notFoundBarcode = null;
    },
    productMatched(state, action: PayloadAction<Product>) {
      state.matchedProduct = action.payload;
      state.notFoundBarcode = null;
    },
    productNotFound(state, action: PayloadAction<string>) {
      state.matchedProduct = null;
      state.notFoundBarcode = action.payload;
    },
    quickCreateRequested(
      _state,
      _action: PayloadAction<{
        barcode: string;
        name: string;
        costPrice: number;
        sellPrice: number;
        wholesalePrice?: number;
        businessPrice?: number;
        warrantyPeriodId?: string;
        warrantyDurationDays?: number;
        quantity: number;
        category: string;
      }>
    ) {},

    lineAdded(state, action: PayloadAction<PendingReceiveLine>) {
      const existing = state.pendingLines.find((l) => l.productId === action.payload.productId);
      if (existing) {
        existing.quantityDelta += action.payload.quantityDelta;
        existing.imeis.push(...action.payload.imeis);
      } else {
        state.pendingLines.push(action.payload);
      }
      state.matchedProduct = null;
    },
    lineRemoved(state, action: PayloadAction<string>) {
      state.pendingLines = state.pendingLines.filter((l) => l.productId !== action.payload);
    },
    supplierNameChanged(state, action: PayloadAction<string>) {
      state.supplierName = action.payload;
    },
    invoiceRefChanged(state, action: PayloadAction<string>) {
      state.invoiceRef = action.payload;
    },
    batchSubmitRequested(state) {
      state.submitting = true;
    },
    batchSubmitted(state) {
      state.submitting = false;
      state.lastBatchCount = state.pendingLines.length;
      state.pendingLines = [];
      state.supplierName = '';
      state.invoiceRef = '';
    },
    batchSubmitFailed(state) {
      state.submitting = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loggedOut, () => initialState);
  },
});

export const {
  barcodeEntered,
  productMatched,
  productNotFound,
  quickCreateRequested,
  lineAdded,
  lineRemoved,
  supplierNameChanged,
  invoiceRefChanged,
  batchSubmitRequested,
  batchSubmitted,
  batchSubmitFailed,
} = stockSlice.actions;
export default stockSlice.reducer;
