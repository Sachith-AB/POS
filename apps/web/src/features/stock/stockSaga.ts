import { call, put, select, takeLatest } from 'redux-saga/effects';
import { api, ApiError } from '../../lib/api';
import type { RootState } from '../../app/store';
import type { Product } from '../products/productsSlice';
import {
  barcodeEntered,
  batchSubmitFailed,
  batchSubmitRequested,
  batchSubmitted,
  lineAdded,
  productMatched,
  productNotFound,
  quickCreateRequested,
} from './stockSlice';

function* barcodeWorker(action: ReturnType<typeof barcodeEntered>) {
  const barcode = action.payload;
  try {
    const product: Product = yield call(api.get, `/products/barcode/${encodeURIComponent(barcode)}`);
    yield put(productMatched(product));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      yield put(productNotFound(barcode));
    }
  }
}

function* quickCreateWorker(action: ReturnType<typeof quickCreateRequested>) {
  const product: Product = yield call(api.post, '/stock-movements/quick-create-product', action.payload);
  yield put(
    lineAdded({
      productId: product.id,
      name: product.name,
      quantityDelta: action.payload.quantity,
      costPriceAtTime: action.payload.costPrice,
      imeis: [],
    })
  );
}

import { toast } from 'react-toastify';

function* batchSubmitWorker() {
  const state: RootState = yield select();
  const { pendingLines, supplierName, supplierId, invoiceRef, isCreditPurchase } = state.stock;
  try {
    yield call(api.post, '/stock-movements/receive', {
      supplierId: supplierId || null,
      supplierName: supplierName || null,
      invoiceRef: invoiceRef || null,
      isCreditPurchase: Boolean(isCreditPurchase),
      lines: pendingLines.map((l) => ({
        productId: l.productId,
        quantityDelta: l.quantityDelta,
        costPriceAtTime: l.costPriceAtTime,
        imeis: l.imeis.length ? l.imeis : undefined,
      })),
    });
    yield put(batchSubmitted());
    toast.success('Stock intake batch finalized and inventory updated!');
  } catch (err: any) {
    yield put(batchSubmitFailed());
    toast.error(err.message || 'Failed to submit stock intake batch');
  }
}

export default function* stockSaga() {
  yield takeLatest(barcodeEntered.type, barcodeWorker);
  yield takeLatest(quickCreateRequested.type, quickCreateWorker);
  yield takeLatest(batchSubmitRequested.type, batchSubmitWorker);
}
