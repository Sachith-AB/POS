import { call, put, select, takeLatest, debounce } from 'redux-saga/effects';
import { api, ApiError } from '../../lib/api';
import type { RootState } from '../../app/store';
import {
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
  recentSaleCheckRequested,
  recentSaleCheckLoaded,
  uncollectedTicketsRequested,
  uncollectedTicketsLoaded,
  sendUncollectedSmsRequested,
  sendUncollectedSmsDone,
  type RepairTicket,
} from './repairsSlice';

function* fetchTicketsWorker(action: ReturnType<typeof ticketsRequested>) {
  try {
    const { status, search, page } = action.payload;
    const queryParts = [];
    if (status) queryParts.push(`status=${encodeURIComponent(status)}`);
    if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
    if (page) queryParts.push(`page=${page}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const response: { items: RepairTicket[]; total: number; page: number; pages: number } = yield call(
      api.get,
      `/repairs${query}`
    );
    yield put(ticketsLoaded(response));
  } catch (err: any) {
    yield put(ticketsRequestFailed(err.message || 'Failed to fetch tickets'));
  }
}

function* fetchTicketDetailWorker(action: ReturnType<typeof ticketDetailRequested>) {
  try {
    const ticket: RepairTicket = yield call(api.get, `/repairs/${action.payload}`);
    yield put(ticketDetailLoaded(ticket));
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to fetch ticket detail'));
  }
}

function* createTicketWorker(action: ReturnType<typeof ticketCreateRequested>) {
  try {
    const ticket: RepairTicket = yield call(api.post, '/repairs', action.payload);
    yield put(ticketCreated(ticket));
    // Re-fetch list
    const state: RootState = yield select();
    yield put(ticketsRequested(state.repairs.filters));
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to create ticket'));
  }
}

function* updateTicketWorker(action: ReturnType<typeof ticketUpdateRequested>) {
  try {
    const { id, input } = action.payload;
    const ticket: RepairTicket = yield call(api.patch, `/repairs/${id}`, input);
    yield put(ticketUpdated(ticket));
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to update ticket'));
  }
}

function* uploadPhotoWorker(action: ReturnType<typeof photoUploadRequested>) {
  try {
    const { id, file } = action.payload;
    const formData = new FormData();
    formData.append('photo', file);

    const ticket: RepairTicket = yield call(api.upload, `/repairs/${id}/photos`, formData);
    yield put(ticketUpdated(ticket));
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to upload photo'));
  }
}

function* deletePhotoWorker(action: ReturnType<typeof photoDeleteRequested>) {
  try {
    const { id, index } = action.payload;
    const ticket: RepairTicket = yield call(api.delete, `/repairs/${id}/photos/${index}`);
    yield put(ticketUpdated(ticket));
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to delete photo'));
  }
}

function* checkRecentSaleWorker(action: ReturnType<typeof recentSaleCheckRequested>) {
  try {
    const phone = action.payload;
    if (!phone || phone.length < 7) {
      yield put(recentSaleCheckLoaded({ hasRecentSale: false }));
      return;
    }
    const res: { hasRecentSale: boolean; sale?: any; firstDaysRule?: number } = yield call(
      api.get,
      `/repairs/recent-sale-check?phone=${encodeURIComponent(phone)}`
    );
    yield put(recentSaleCheckLoaded(res));
  } catch {
    yield put(recentSaleCheckLoaded({ hasRecentSale: false }));
  }
}

function* fetchUncollectedTicketsWorker() {
  try {
    const res: { thresholdDays: number; total: number; items: RepairTicket[] } = yield call(
      api.get,
      '/repairs/uncollected'
    );
    yield put(uncollectedTicketsLoaded(res));
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to fetch uncollected tickets'));
  }
}

function* sendUncollectedSmsWorker(action: ReturnType<typeof sendUncollectedSmsRequested>) {
  try {
    const ticketIds = action.payload;
    yield call(api.post, '/repairs/uncollected/send-sms', { ticketIds });
    yield put(sendUncollectedSmsDone());
    yield put(uncollectedTicketsRequested());
  } catch (err: any) {
    yield put(operationFailed(err.message || 'Failed to send SMS reminders'));
  }
}

function* onFiltersChangedWorker() {
  const state: RootState = yield select();
  yield put(ticketsRequested(state.repairs.filters));
}

export default function* repairsSaga() {
  yield takeLatest(ticketsRequested.type, fetchTicketsWorker);
  yield takeLatest(ticketDetailRequested.type, fetchTicketDetailWorker);
  yield takeLatest(ticketCreateRequested.type, createTicketWorker);
  yield takeLatest(ticketUpdateRequested.type, updateTicketWorker);
  yield takeLatest(photoUploadRequested.type, uploadPhotoWorker);
  yield takeLatest(photoDeleteRequested.type, deletePhotoWorker);
  yield takeLatest(recentSaleCheckRequested.type, checkRecentSaleWorker);
  yield takeLatest(uncollectedTicketsRequested.type, fetchUncollectedTicketsWorker);
  yield takeLatest(sendUncollectedSmsRequested.type, sendUncollectedSmsWorker);
  
  // Watcher for filter changes
  yield debounce(400, filtersChanged.type, onFiltersChangedWorker);
}
