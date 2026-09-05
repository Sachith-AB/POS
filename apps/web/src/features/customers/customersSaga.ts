import { call, put, select, takeLatest } from 'redux-saga/effects';
import { api } from '../../lib/api';
import type { RootState } from '../../app/store';
import {
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
  type CustomerListItem,
  type CustomerProfile,
  type CustomerOverview,
  type CustomerCategory,
} from './customersSlice';

function* fetchCustomersWorker() {
  try {
    const state: RootState = yield select();
    const filters = state.customers.filters;

    const queryParts = [];
    if (filters.search) queryParts.push(`search=${encodeURIComponent(filters.search)}`);
    if (filters.categoryId && filters.categoryId !== 'ALL') queryParts.push(`categoryId=${encodeURIComponent(filters.categoryId)}`);
    if (filters.paymentStatus && filters.paymentStatus !== 'ALL') queryParts.push(`paymentStatus=${encodeURIComponent(filters.paymentStatus)}`);
    if (filters.sortBy) queryParts.push(`sortBy=${encodeURIComponent(filters.sortBy)}`);
    if (filters.sortDir) queryParts.push(`sortDir=${encodeURIComponent(filters.sortDir)}`);
    if (filters.page) queryParts.push(`page=${filters.page}`);

    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const response: { items: CustomerListItem[]; total: number; page: number; pages: number } = yield call(
      api.get,
      `/customers${query}`
    );
    yield put(customersLoaded(response));
  } catch (err: any) {
    yield put(customersRequestFailed(err.message || 'Failed to fetch customers'));
  }
}

function* fetchCustomerProfileWorker(action: ReturnType<typeof customerProfileRequested>) {
  try {
    const profile: CustomerProfile = yield call(api.get, `/customers/${action.payload}`);
    yield put(customerProfileLoaded(profile));
  } catch (err: any) {
    yield put(customerProfileFailed(err.message || 'Failed to fetch customer profile'));
  }
}

function* fetchOverviewWorker() {
  try {
    const overview: CustomerOverview = yield call(api.get, '/customers/overview');
    yield put(overviewLoaded(overview));
  } catch (err: any) {
    console.error('Failed to fetch customer overview:', err);
  }
}

function* fetchCategoriesWorker() {
  try {
    const categories: CustomerCategory[] = yield call(api.get, '/customer-categories');
    yield put(categoriesLoaded(categories));
  } catch (err: any) {
    console.error('Failed to fetch customer categories:', err);
  }
}

function* saveCustomerWorker(action: ReturnType<typeof customerSaveRequested>) {
  try {
    const { id, ...payload } = action.payload;
    if (id) {
      yield call(api.patch, `/customers/${id}`, payload);
    } else {
      yield call(api.post, '/customers', payload);
    }
    yield put(customerSaved());
    yield put(customersRequested());
    yield put(overviewRequested());
    if (id) {
      yield put(customerProfileRequested(id));
    }
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to save customer'));
  }
}

function* saveCategoryWorker(action: ReturnType<typeof categorySaveRequested>) {
  try {
    const { id, ...payload } = action.payload;
    if (id) {
      yield call(api.patch, `/customer-categories/${id}`, payload);
    } else {
      yield call(api.post, '/customer-categories', payload);
    }
    yield put(categorySaved());
    yield put(categoriesRequested());
    yield put(overviewRequested());
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to save category'));
  }
}

function* deleteCategoryWorker(action: ReturnType<typeof categoryDeleteRequested>) {
  try {
    yield call(api.delete, `/customer-categories/${action.payload}`);
    yield put(categoryDeleted(action.payload));
    yield put(overviewRequested());
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to delete category'));
  }
}

function* onFiltersChangedWorker() {
  yield put(customersRequested());
}

export default function* customersSaga() {
  yield takeLatest(customersRequested.type, fetchCustomersWorker);
  yield takeLatest(customerProfileRequested.type, fetchCustomerProfileWorker);
  yield takeLatest(overviewRequested.type, fetchOverviewWorker);
  yield takeLatest(categoriesRequested.type, fetchCategoriesWorker);
  yield takeLatest(customerSaveRequested.type, saveCustomerWorker);
  yield takeLatest(categorySaveRequested.type, saveCategoryWorker);
  yield takeLatest(categoryDeleteRequested.type, deleteCategoryWorker);
  yield takeLatest(filtersChanged.type, onFiltersChangedWorker);
}
