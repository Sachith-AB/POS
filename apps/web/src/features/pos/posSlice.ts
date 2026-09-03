import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { MAX_PARKED_BILLS } from '@pos/shared';
import { loggedOut } from '../auth/authSlice';
import { type BillSlot, type CartLine, emptyBillSlot } from './posTypes';

export interface PosState {
  bills: BillSlot[];
  activeIndex: number;
  priceCheckMode: boolean;
  saving: boolean;
  completing: boolean;
  lastRemoved: { billIndex: number; line: CartLine } | null;
  lastCompleted: ReceiptSnapshot | null;
  error: string | null;
}

export interface ReceiptSnapshot {
  id: string;
  items: CartLine[];
  discount: number;
  total: number;
  customerName: string | null;
  completedAt: string;
}


const initialState: PosState = {
  bills: Array.from({ length: MAX_PARKED_BILLS }, emptyBillSlot),
  activeIndex: 0,
  priceCheckMode: false,
  saving: false,
  completing: false,
  lastRemoved: null,
  lastCompleted: null,
  error: null,
};

const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    itemScanned(
      state,
      action: PayloadAction<{
        productId: string;
        name: string;
        barcode?: string | null;
        unitPrice: number;
        retailPrice?: number;
        wholesalePrice?: number | null;
        businessPrice?: number | null;
        priceType?: 'RETAIL' | 'WHOLESALE' | 'BUSINESS';
      }>
    ) {
      const bill = state.bills[state.activeIndex];
      const existing = bill.items.find((i) => i.productId === action.payload.productId);
      if (existing) {
        existing.quantity += 1;
      } else {
        bill.items.push({
          ...action.payload,
          quantity: 1,
          retailPrice: action.payload.retailPrice ?? action.payload.unitPrice,
          priceType: action.payload.priceType ?? 'RETAIL',
        });
      }
    },
    lineQuantityChanged(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const bill = state.bills[state.activeIndex];
      const line = bill.items.find((i) => i.productId === action.payload.productId);
      if (line) line.quantity = Math.max(1, action.payload.quantity);
    },
    linePriceChanged(state, action: PayloadAction<{ productId: string; unitPrice: number }>) {
      const bill = state.bills[state.activeIndex];
      const line = bill.items.find((i) => i.productId === action.payload.productId);
      if (line) line.unitPrice = Math.max(0, action.payload.unitPrice);
    },
    linePriceTypeChanged(
      state,
      action: PayloadAction<{ productId: string; priceType: 'RETAIL' | 'WHOLESALE' | 'BUSINESS' }>
    ) {
      const bill = state.bills[state.activeIndex];
      const line = bill.items.find((i) => i.productId === action.payload.productId);
      if (line) {
        line.priceType = action.payload.priceType;
        if (action.payload.priceType === 'WHOLESALE' && line.wholesalePrice != null) {
          line.unitPrice = Number(line.wholesalePrice);
        } else if (action.payload.priceType === 'BUSINESS' && line.businessPrice != null) {
          line.unitPrice = Number(line.businessPrice);
        } else if (line.retailPrice != null) {
          line.unitPrice = Number(line.retailPrice);
        }
      }
    },
    lineRemoved(state, action: PayloadAction<{ productId: string }>) {
      const bill = state.bills[state.activeIndex];
      const idx = bill.items.findIndex((i) => i.productId === action.payload.productId);
      if (idx >= 0) {
        state.lastRemoved = { billIndex: state.activeIndex, line: bill.items[idx] };
        bill.items.splice(idx, 1);
      }
    },
    lineRestored(state) {
      if (!state.lastRemoved) return;
      const { billIndex, line } = state.lastRemoved;
      state.bills[billIndex].items.push(line);
      state.lastRemoved = null;
    },
    lastRemovedCleared(state) {
      state.lastRemoved = null;
    },
    discountChanged(state, action: PayloadAction<number>) {
      const bill = state.bills[state.activeIndex];
      bill.discount = Math.max(0, action.payload);
      const subtotal = bill.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      bill.discountPercent = subtotal > 0 ? (bill.discount / subtotal) * 100 : 0;
    },
    discountPercentChanged(state, action: PayloadAction<number>) {
      const bill = state.bills[state.activeIndex];
      bill.discountPercent = Math.max(0, Math.min(100, action.payload));
      const subtotal = bill.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      bill.discount = Math.round(((subtotal * bill.discountPercent) / 100) * 100) / 100;
    },
    warrantySelected(state, action: PayloadAction<string | null>) {
      state.bills[state.activeIndex].warrantyPeriodId = action.payload;
    },
    tradeInApplied(state, action: PayloadAction<{ tradeInId: string | null; tradeInValue: number }>) {
      const bill = state.bills[state.activeIndex];
      bill.tradeInId = action.payload.tradeInId;
      bill.tradeInValue = action.payload.tradeInValue;
    },
    customerPhoneChanged(state, action: PayloadAction<string>) {
      state.bills[state.activeIndex].customerPhone = action.payload;
    },
    customerMatched(state, action: PayloadAction<{ id: string; name: string | null } | null>) {
      const bill = state.bills[state.activeIndex];
      bill.customerId = action.payload?.id ?? null;
      bill.customerName = action.payload?.name ?? null;
    },
    activeBillSwitched(state, action: PayloadAction<number>) {
      state.activeIndex = action.payload;
    },
    billSaleIdAssigned(state, action: PayloadAction<{ billIndex: number; saleId: string }>) {
      state.bills[action.payload.billIndex].saleId = action.payload.saleId;
    },
    billCleared(state, action: PayloadAction<number>) {
      state.bills[action.payload] = emptyBillSlot();
    },
    billResumed(state, action: PayloadAction<{ billIndex: number; bill: BillSlot }>) {
      state.bills[action.payload.billIndex] = action.payload.bill;
      state.activeIndex = action.payload.billIndex;
    },
    priceCheckToggled(state) {
      state.priceCheckMode = !state.priceCheckMode;
    },

    savingStarted(state) {
      state.saving = true;
    },
    savingFinished(state) {
      state.saving = false;
    },
    saleCompleteRequested(_state, _action: PayloadAction<{ amount: number; method: string }>) {},
    completingStarted(state) {
      state.completing = true;
      state.error = null;
    },
    saleCompleted(state, action: PayloadAction<ReceiptSnapshot>) {
      state.completing = false;
      state.lastCompleted = action.payload;
      state.bills[state.activeIndex] = emptyBillSlot();
    },
    saleCompleteFailed(state, action: PayloadAction<string>) {
      state.completing = false;
      state.error = action.payload;
    },
    lastCompletedCleared(state) {
      state.lastCompleted = null;
    },
    cartAutosaveRequested() {},
  },
  // Switching cashiers must never leave the outgoing employee's in-progress
  // cart, discount, or customer lookup visible/editable by the next login.
  extraReducers: (builder) => {
    builder.addCase(loggedOut, () => initialState);
  },
});

export const {
  itemScanned,
  lineQuantityChanged,
  linePriceChanged,
  linePriceTypeChanged,
  lineRemoved,
  lineRestored,
  lastRemovedCleared,
  discountChanged,
  discountPercentChanged,
  warrantySelected,
  tradeInApplied,
  customerPhoneChanged,
  customerMatched,
  activeBillSwitched,
  billSaleIdAssigned,
  billCleared,
  billResumed,
  priceCheckToggled,
  savingStarted,
  savingFinished,
  saleCompleteRequested,
  completingStarted,
  saleCompleted,
  saleCompleteFailed,
  lastCompletedCleared,
  cartAutosaveRequested,
} = posSlice.actions;


export default posSlice.reducer;
