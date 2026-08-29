import { call, debounce, put, select, takeLatest } from 'redux-saga/effects';
import { CUSTOMER_LOOKUP_DEBOUNCE_MS } from '@pos/shared';
import { api, ApiError } from '../../lib/api';
import type { RootState } from '../../app/store';
import { itemScanned } from '../pos/posSlice';
import {
  barcodeNotFound,
  barcodeScanRequested,
  searchLoading,
  searchResultsLoaded,
  searchTermChanged,
  quickButtonsLoaded,
  quickButtonsRequested,
  type Product,
} from './productsSlice';

function* searchWorker() {
  const state: RootState = yield select();
  const term = state.products.searchTerm.trim();
  if (!term) {
    yield put(searchResultsLoaded([]));
    return;
  }
  yield put(searchLoading());
  const results: Product[] = yield call(api.get, `/products?search=${encodeURIComponent(term)}`);
  yield put(searchResultsLoaded(results));
}

function* barcodeWorker(action: ReturnType<typeof barcodeScanRequested>) {
  const barcode = action.payload;
  try {
    const product: Product = yield call(api.get, `/products/barcode/${encodeURIComponent(barcode)}`);
    yield put(
      itemScanned({
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        unitPrice: Number(product.sellPrice),
      })
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      yield put(barcodeNotFound(barcode));
    }
  }
}

function* quickButtonsWorker() {
  try {
    const results: Product[] = yield call(api.get, '/products?category=');
    yield put(quickButtonsLoaded(results.slice(0, 20)));
  } catch {
    yield put(quickButtonsLoaded([]));
  }
}

export default function* productsSaga() {
  yield debounce(CUSTOMER_LOOKUP_DEBOUNCE_MS, searchTermChanged.type, searchWorker);
  yield takeLatest(barcodeScanRequested.type, barcodeWorker);
  yield takeLatest(quickButtonsRequested.type, quickButtonsWorker);
}
