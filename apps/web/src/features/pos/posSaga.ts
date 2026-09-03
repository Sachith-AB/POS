import { all, call, debounce, put, select, takeLatest } from 'redux-saga/effects';
import { AUTOSAVE_DEBOUNCE_MS, CUSTOMER_LOOKUP_DEBOUNCE_MS } from '@pos/shared';
import { api } from '../../lib/api';
import type { RootState } from '../../app/store';
import {
  billSaleIdAssigned,
  customerMatched,
  customerPhoneChanged,
  discountChanged,
  itemScanned,
  lineQuantityChanged,
  lineRemoved,
  lineRestored,
  saleCompleted,
  saleCompleteFailed,
  saleCompleteRequested,
  savingFinished,
  savingStarted,
  completingStarted,
} from './posSlice';
import type { BillSlot, CartLine } from './posTypes';

function toItemsInput(items: CartLine[]) {
  return items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    priceType: i.priceType || 'RETAIL',
  }));
}

/** Creates the parked sale on first save, or PATCHes it afterwards. Returns the saleId. */
function* ensureSaleSaved(billIndex: number) {
  const state: RootState = yield select();
  const bill: BillSlot = state.pos.bills[billIndex];
  if (bill.items.length === 0 && !bill.saleId) return null;

  if (!bill.saleId) {
    const created: { id: string } = yield call(api.post, '/sales', {
      status: 'PARKED',
      discount: bill.discount,
      discountPercent: bill.discountPercent,
      customerId: bill.customerId,
      warrantyPeriodId: bill.warrantyPeriodId,
      tradeInId: bill.tradeInId,
      items: toItemsInput(bill.items),
    });
    yield put(billSaleIdAssigned({ billIndex, saleId: created.id }));
    return created.id;
  }

  yield call(api.patch, `/sales/${bill.saleId}`, {
    discount: bill.discount,
    discountPercent: bill.discountPercent,
    customerId: bill.customerId,
    warrantyPeriodId: bill.warrantyPeriodId,
    tradeInId: bill.tradeInId,
    items: toItemsInput(bill.items),
  });
  return bill.saleId;
}


function* autosaveWorker() {
  const state: RootState = yield select();
  yield put(savingStarted());
  try {
    yield call(ensureSaleSaved, state.pos.activeIndex);
  } finally {
    yield put(savingFinished());
  }
}

function* customerLookupWorker() {
  const state: RootState = yield select();
  const phone = state.pos.bills[state.pos.activeIndex].customerPhone;
  if (phone.length < 7) {
    yield put(customerMatched(null));
    return;
  }
  try {
    const customer: { id: string; name: string | null } | null = yield call(
      api.get,
      `/customers/lookup?phone=${encodeURIComponent(phone)}`
    );
    yield put(customerMatched(customer));
  } catch {
    yield put(customerMatched(null));
  }
}

function* completeWorker(action: ReturnType<typeof saleCompleteRequested>) {
  const state: RootState = yield select();
  const billIndex = state.pos.activeIndex;
  const bill: BillSlot = state.pos.bills[billIndex];
  yield put(completingStarted());
  try {
    const saleId: string | null = yield call(ensureSaleSaved, billIndex);
    if (!saleId) throw new Error('Cannot complete an empty sale');
    const result: { id: string; total: string | number } = yield call(
      api.post,
      `/sales/${saleId}/complete`,
      action.payload
    );
    yield put(
      saleCompleted({
        id: result.id,
        items: bill.items,
        discount: bill.discount,
        total: Number(result.total),
        customerName: bill.customerName,
        completedAt: new Date().toISOString(),
      })
    );

  } catch (err) {
    yield put(saleCompleteFailed(err instanceof Error ? err.message : 'Failed to complete sale'));
  }
}

import {
  linePriceChanged,
  linePriceTypeChanged,
  discountPercentChanged,
  warrantySelected,
  tradeInApplied,
} from './posSlice';

const AUTOSAVE_TRIGGERS = [
  itemScanned.type,
  lineQuantityChanged.type,
  linePriceChanged.type,
  linePriceTypeChanged.type,
  lineRemoved.type,
  lineRestored.type,
  discountChanged.type,
  discountPercentChanged.type,
  warrantySelected.type,
  tradeInApplied.type,
];

export default function* posSaga() {
  yield all([
    debounce(AUTOSAVE_DEBOUNCE_MS, AUTOSAVE_TRIGGERS, autosaveWorker),
    debounce(CUSTOMER_LOOKUP_DEBOUNCE_MS, customerPhoneChanged.type, customerLookupWorker),
    takeLatest(saleCompleteRequested.type, completeWorker),
  ]);
}

