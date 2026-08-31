import { call, put, select, takeLatest } from 'redux-saga/effects';
import { api } from '../../lib/api';
import type { RootState } from '../../app/store';
import {
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
  type InstallmentPlan,
} from './installmentsSlice';

function* fetchPlansWorker(action: ReturnType<typeof plansRequested>) {
  try {
    const { status, page } = action.payload;
    const queryParts = [];
    if (status) queryParts.push(`status=${encodeURIComponent(status)}`);
    if (page) queryParts.push(`page=${page}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const response: { items: InstallmentPlan[]; total: number; page: number; pages: number } = yield call(
      api.get,
      `/installments${query}`
    );
    yield put(plansLoaded(response));
  } catch (err: any) {
    yield put(plansRequestFailed(err.message || 'Failed to fetch installment plans'));
  }
}

function* fetchPlanDetailWorker(action: ReturnType<typeof planDetailRequested>) {
  try {
    const plan: InstallmentPlan = yield call(api.get, `/installments/${action.payload}`);
    yield put(planDetailLoaded(plan));
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to fetch installment plan detail'));
  }
}

function* createPlanWorker(action: ReturnType<typeof planCreateRequested>) {
  try {
    const plan: InstallmentPlan = yield call(api.post, '/installments', action.payload);
    yield put(planCreated(plan));
    
    // Refresh the list
    const state: RootState = yield select();
    yield put(plansRequested(state.installments.filters));
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to create installment plan'));
  }
}

function* recordPaymentWorker(action: ReturnType<typeof paymentRecordRequested>) {
  try {
    const { planId, amount, method } = action.payload;
    const plan: InstallmentPlan = yield call(api.post, `/installments/${planId}/pay`, { amount, method });
    yield put(paymentRecorded(plan));
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to record payment'));
  }
}

function* onFiltersChangedWorker() {
  const state: RootState = yield select();
  yield put(plansRequested(state.installments.filters));
}

export default function* installmentsSaga() {
  yield takeLatest(plansRequested.type, fetchPlansWorker);
  yield takeLatest(planDetailRequested.type, fetchPlanDetailWorker);
  yield takeLatest(planCreateRequested.type, createPlanWorker);
  yield takeLatest(paymentRecordRequested.type, recordPaymentWorker);
  yield takeLatest(filtersChanged.type, onFiltersChangedWorker);
}
